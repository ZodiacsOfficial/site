import { describe, expect, it } from 'vitest';
import { computeChart } from './engine/full';
import { computeAngles, meanObliquity } from './engine/houses';
import {
  decodePositionsLink,
  encodePositionsLink,
  encodeSharedPositionsLink,
  POSITION_BODY_ORDER,
  type PositionsShareInput,
  wholeDegreeAngle,
} from './share-positions';

function input(angles: PositionsShareInput['angles']): PositionsShareInput {
  return {
    bodies: POSITION_BODY_ORDER.map((body, index) => ({ body, lon: (index * 29.9876 + 0.12345) % 360 })),
    angles,
    houseSystem: 'whole',
    engineVersion: 'zodiacs-1.0.0',
  };
}

describe('shared positions code', () => {
  it('keeps ASC and MC to the middle of their whole degree and every body to 0.001°', () => {
    const shared = decodePositionsLink(encodeSharedPositionsLink(input({ asc: 29.999, mc: 359.9996 }))!)!;
    // 29.999° stays in Aries and 359.9996° stays in Pisces: the sign and the
    // whole degree are kept, and the error is at most 0.5°.
    expect(shared.angles).toEqual({ asc: 29.5, mc: 359.5 });
    expect(shared.bodies.map(({ lon }) => lon))
      .toEqual(decodePositionsLink(encodePositionsLink(input(null))!)!.bodies.map(({ lon }) => lon));
    expect(shared.bodies.find(({ body }) => body === 'Sun')?.lon).toBe(0.123);

    // Rounding a code again changes nothing, so the feed can round every code it receives.
    expect(decodePositionsLink(encodeSharedPositionsLink(input(shared.angles))!)!.angles).toEqual(shared.angles);
    expect([0, 0.5, 12.25, 123.999, 359.4].map(wholeDegreeAngle)).toEqual([0.5, 0.5, 12.5, 123.5, 359.5]);
  });

  it('leaves no-time codes angle-free and rejects what the exact encoder rejects', () => {
    expect(decodePositionsLink(encodeSharedPositionsLink(input(null))!)!.angles).toBeNull();
    for (const angles of [
      { asc: '12' as unknown as number, mc: 40 },
      { asc: Number.NaN, mc: 40 },
      { asc: 360, mc: 40 },
      { asc: -0.5, mc: 40 },
      undefined as unknown as PositionsShareInput['angles'],
    ]) {
      expect(encodeSharedPositionsLink(input(angles))).toBeNull();
      expect(encodePositionsLink(input(angles))).toBeNull();
    }
  });

  it('keeps the exact angles for the encoder that charts kept on the device use', () => {
    expect(decodePositionsLink(encodePositionsLink(input({ asc: 29.999, mc: 359.9996 }))!)!.angles)
      .toEqual({ asc: 29.999, mc: 0 });
  });
});

/*
 * What a shared code still gives away. The planets, the Moon and the nodes
 * are geocentric and stay at 0.001°, so the birth date and the UTC birth time
 * can still be worked out from any shared code: the Moon alone pins the time
 * to about 6 seconds. The angles are the only values that depend on the
 * birthplace, and they are kept to the whole degree. This test takes the birth
 * instant as known and measures the region of places whose MC and ASC fall in
 * the same whole degrees as the shared ones, over a seeded sample of 300
 * births from 1950 to 2008 in 40 cities between 37°S and 64°N.
 */
const CITIES: ReadonlyArray<readonly [number, number]> = [
  [41.8781, -87.6298], [40.7128, -74.006], [34.0522, -118.2437], [19.4326, -99.1332],
  [-23.5505, -46.6333], [-34.6037, -58.3816], [4.711, -74.0721], [-12.0464, -77.0428],
  [51.5074, -0.1278], [48.8566, 2.3522], [40.4168, -3.7038], [41.9028, 12.4964],
  [52.52, 13.405], [59.3293, 18.0686], [55.7558, 37.6173], [41.0082, 28.9784],
  [30.0444, 31.2357], [6.5244, 3.3792], [-1.2921, 36.8219], [-26.2041, 28.0473],
  [19.076, 72.8777], [28.7041, 77.1025], [23.8103, 90.4125], [13.7563, 100.5018],
  [1.3521, 103.8198], [-6.2088, 106.8456], [14.5995, 120.9842], [31.2304, 121.4737],
  [37.5665, 126.978], [35.6762, 139.6503], [-33.8688, 151.2093], [-36.8485, 174.7633],
  [43.6532, -79.3832], [49.2827, -123.1207], [61.2181, -149.9003], [21.3069, -157.8583],
  [64.1466, -21.9426], [38.7223, -9.1393], [35.6892, 51.389], [-31.9505, 115.8605],
];

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DEG = Math.PI / 180;
const KM_PER_DEGREE_LATITUDE = 110.57;
const KM_PER_DEGREE_LONGITUDE_AT_EQUATOR = 111.32;
const norm = (value: number) => ((value % 360) + 360) % 360;
const signed = (value: number) => norm(value + 180) - 180;

interface PlaceRegion {
  eastWestKm: number;
  northSouthKm: number;
  eastWestDegrees: number;
  containsBirthplace: boolean;
}

function placeRegion(utc: Date, latitude: number, longitude: number): PlaceRegion {
  const chart = computeChart({ utc, latitude, longitude, houseSystem: 'whole', timeKnown: true });
  const shared = decodePositionsLink(encodeSharedPositionsLink({
    bodies: chart.bodies,
    angles: chart.angles,
    houseSystem: 'whole',
    engineVersion: chart.engineVersion,
  })!)!;
  const ascDegree = Math.floor(shared.angles!.asc);
  const mcDegree = Math.floor(shared.angles!.mc);

  // Sidereal time and obliquity follow from the instant, which the Moon gives.
  const obliquity = meanObliquity((utc.getTime() - Date.UTC(2000, 0, 1, 12)) / (864e5 * 36525));
  const ramcOfMc = (mc: number) => norm(
    Math.atan2(Math.sin(mc * DEG) * Math.cos(obliquity * DEG), Math.cos(mc * DEG)) / DEG,
  );
  const birthRamc = ramcOfMc(chart.angles!.mc);
  const gastHours = (birthRamc - longitude) / 15;
  const ascAt = (lon: number, lat: number) => computeAngles({ gastHours, latitude: lat, longitude: lon, obliquity }).asc;
  const inAscDegree = (lon: number, lat: number) => Math.floor(ascAt(lon, lat)) === ascDegree;

  // The MC depends on longitude alone: its whole degree allows one span.
  const lowRamc = ramcOfMc(mcDegree);
  const eastWestDegrees = norm(ramcOfMc(mcDegree + 1) - lowRamc);
  const west = longitude + signed(lowRamc - birthRamc);

  // Across that span, the latitudes whose ASC falls in the shared degree.
  const LIMIT = 75;
  const STEP = 0.1;
  const edge = (lon: number, inside: number, outside: number) => {
    let a = inside;
    let b = outside;
    for (let i = 0; i < 24; i += 1) {
      const middle = (a + b) / 2;
      if (inAscDegree(lon, middle)) a = middle; else b = middle;
    }
    return a;
  };
  let south = Infinity;
  let north = -Infinity;
  for (let k = 0; k <= 8; k += 1) {
    const lon = west + eastWestDegrees * (0.001 + (0.998 * k) / 8);
    let first = Number.NaN;
    let last = Number.NaN;
    for (let step = 0; step <= (2 * LIMIT) / STEP; step += 1) {
      const lat = -LIMIT + step * STEP;
      if (!inAscDegree(lon, lat)) continue;
      if (Number.isNaN(first)) first = lat;
      last = lat;
    }
    if (Number.isNaN(first)) continue;
    south = Math.min(south, first > -LIMIT ? edge(lon, first, first - STEP) : first);
    north = Math.max(north, last < LIMIT ? edge(lon, last, last + STEP) : last);
  }

  return {
    eastWestKm: eastWestDegrees * KM_PER_DEGREE_LONGITUDE_AT_EQUATOR * Math.cos(latitude * DEG),
    northSouthKm: (north - south) * KM_PER_DEGREE_LATITUDE,
    eastWestDegrees,
    containsBirthplace: inAscDegree(longitude, latitude)
      && latitude >= south && latitude <= north
      && signed(longitude - west) >= 0 && signed(longitude - west) <= eastWestDegrees,
  };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = (sorted.length - 1) / 2;
  return (sorted[Math.floor(middle)] + sorted[Math.ceil(middle)]) / 2;
}

describe('what a shared positions code leaves of the birthplace', () => {
  it('leaves the birthplace inside a region at least 70 km across, about 500 km at the median, over 300 seeded births', () => {
    const random = seededRandom(20260923);
    const start = Date.UTC(1950, 0, 1);
    const end = Date.UTC(2008, 11, 31);
    const regions: Array<PlaceRegion & { latitude: number }> = [];
    for (let i = 0; i < 300; i += 1) {
      const utc = new Date(Math.floor(start + random() * (end - start)));
      const [latitude, longitude] = CITIES[Math.floor(random() * CITIES.length)];
      regions.push({ ...placeRegion(utc, latitude, longitude), latitude });
    }
    const longSides = regions.map((region) => Math.max(region.eastWestKm, region.northSouthKm));
    const nearEquator = regions.filter((region) => Math.abs(region.latitude) < 45)
      .map((region) => Math.max(region.eastWestKm, region.northSouthKm));

    // Measured: long side 74 km at the smallest (Anchorage, 61°N) and 515 km
    // at the median; 242 km at the smallest within 45° of the equator. East to
    // west the MC's degree leaves 0.92° to 1.09° of longitude, 92 km at the
    // median; north to south the ASC's degree leaves 515 km at the median.
    expect(regions.every((region) => region.containsBirthplace)).toBe(true);
    expect(Math.min(...longSides)).toBeGreaterThanOrEqual(70);
    expect(median(longSides)).toBeGreaterThanOrEqual(500);
    expect(median(longSides)).toBeLessThan(550);
    expect(nearEquator.length).toBeGreaterThan(200);
    expect(Math.min(...nearEquator)).toBeGreaterThanOrEqual(240);
    expect(Math.min(...regions.map((region) => region.eastWestDegrees))).toBeGreaterThanOrEqual(0.9);
  }, 60_000);
});
