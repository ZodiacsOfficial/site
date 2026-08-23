/**
 * Engine accuracy gate.
 *
 * Reference longitudes are apparent geocentric TRUE-OF-DATE ecliptic
 * coordinates from JPL Horizons (QUANTITIES='31', CENTER='500@399') —
 * the same frame the engine computes. Fetched 2026-07-05.
 */
import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  Body, Observer, SearchHourAngle, SearchRiseSet, MakeTime, SiderealTime,
} from 'astronomy-engine';

import { computeBodies, computeChart } from './full';
import { computeAngles, meanObliquity, placidusCusps, wholeSignCusps, houseOf, norm } from './houses';
import { findAspects, separation } from './aspects';
import { sunLongitude, moonLongitude, moonPhaseAngle } from './lite';
import { resolveLocalToUtc } from '../time/localToUtc';
import { formatLongitude, signForLongitude } from '../signs';
import type { BodyPosition } from './types';

const lonOf = (bodies: BodyPosition[], name: string) =>
  bodies.find((b) => b.body === name)!.lon;

const angleDiff = (a: number, b: number) => {
  const d = Math.abs(norm(a - b));
  return d > 180 ? 360 - d : d;
};

/**
 * Independent angle/house vectors generated 2026-07-10 with Astrodienst's
 * Swiss Ephemeris 2.10.03 through the unmodified pyswisseph 2.10.3.2 wrapper.
 * For each UTC instant below the reference call was:
 *
 *   jd = swe.julday(year, month, day, decimalUtcHour, swe.GREG_CAL)
 *   cusps, ascmc = swe.houses_ex(jd, latitude, eastPositiveLongitude, b'P', 0)
 *
 * `b'P'` selects Placidus and flag 0 selects the tropical ecliptic of date;
 * `ascmc[0]` is ASC and `ascmc[1]` is MC. Constants are direct returned
 * degrees rounded to 9 decimal places, not output from this project's engine.
 * API contract: https://www.astro.com/swisseph/swephprg.htm (section 13).
 */
const SWISS_HOUSE_VECTORS = [
  {
    name: 'NYC 1990',
    utc: '1990-06-15T12:30:00Z',
    latitude: 40.7128,
    longitude: -74.0060,
    asc: 122.577748878,
    mc: 18.457835773,
    cusps: [
      122.577748878, 142.874013293, 167.446689884, 198.457835773,
      235.135794644, 271.491695053, 302.577748878, 322.874013293,
      347.446689884, 18.457835773, 55.135794644, 91.491695053,
    ],
  },
  {
    name: 'Tokyo 1985',
    utc: '1985-03-21T04:15:00Z',
    latitude: 35.6762,
    longitude: 139.6503,
    asc: 124.189836381,
    mc: 23.798605462,
    cusps: [
      124.189836381, 146.057778606, 172.134943407, 203.798605462,
      239.289316156, 273.753375166, 304.189836381, 326.057778606,
      352.134943407, 23.798605462, 59.289316156, 93.753375166,
    ],
  },
  {
    name: 'Sydney 1970',
    utc: '1970-09-23T18:45:00Z',
    latitude: -33.8688,
    longitude: 151.2093,
    asc: 156.812448064,
    mc: 75.871452802,
    cusps: [
      156.812448064, 199.630917386, 231.308710485, 255.871452802,
      278.350303110, 303.221743887, 336.812448064, 19.630917386,
      51.308710485, 75.871452802, 98.350303110, 123.221743887,
    ],
  },
  {
    name: 'Helsinki 2000',
    utc: '2000-06-21T22:10:00Z',
    latitude: 60.1699,
    longitude: 24.9384,
    asc: 350.431165002,
    mc: 268.021716480,
    cusps: [
      350.431165002, 54.719871463, 74.620817722, 88.021716480,
      100.981856435, 118.741378047, 170.431165002, 234.719871463,
      254.620817722, 268.021716480, 280.981856435, 298.741378047,
    ],
  },
  {
    name: 'Quito 2010',
    utc: '2010-12-21T05:55:00Z',
    latitude: -0.1807,
    longitude: -78.4678,
    asc: 190.878598861,
    mc: 99.177012595,
    cusps: [
      190.878598861, 222.464856523, 251.543940183, 279.177012595,
      307.558439396, 338.328060538, 10.878598861, 42.464856523,
      71.543940183, 99.177012595, 127.558439396, 158.328060538,
    ],
  },
] as const;

// ── 1. Modern vector: JPL Horizons, 2020-01-01 00:00 UTC ─────────────
const HORIZONS_2020: Record<string, number> = {
  Sun: 280.0094920,
  Moon: 346.1383767,
  Mercury: 274.3833145,
  Venus: 314.4094923,
  Mars: 238.3846079,
  Jupiter: 276.6703386,
  Saturn: 291.3949664,
  Uranus: 32.6940395,
  Neptune: 346.2645218,
  Pluto: 292.3855818,
};

describe('ephemeris vs JPL Horizons (2020-01-01)', () => {
  const bodies = computeBodies(new Date('2020-01-01T00:00:00Z'));
  for (const [name, expected] of Object.entries(HORIZONS_2020)) {
    it(`${name} within tolerance`, () => {
      const tol = name === 'Moon' ? 0.15 : 0.05;
      expect(angleDiff(lonOf(bodies, name), expected)).toBeLessThan(tol);
    });
  }
});

// ── 2. Historic vector: Horizons, 1907-07-06 15:07 UTC ───────────────
// (Frida Kahlo's birth instant ± half a minute — 08:30 LMT Coyoacán.)
describe('ephemeris vs JPL Horizons (1907-07-06)', () => {
  const bodies = computeBodies(new Date('1907-07-06T15:07:00Z'));
  it('Sun 13° Cancer', () => {
    expect(angleDiff(lonOf(bodies, 'Sun'), 103.3759585)).toBeLessThan(0.05);
    expect(signForLongitude(lonOf(bodies, 'Sun')).slug).toBe('cancer');
  });
  it('Moon 29° Taurus', () => {
    expect(angleDiff(lonOf(bodies, 'Moon'), 59.7147970)).toBeLessThan(0.2);
    expect(signForLongitude(lonOf(bodies, 'Moon')).slug).toBe('taurus');
  });
  it('Mars 13° Capricorn', () => {
    expect(angleDiff(lonOf(bodies, 'Mars'), 283.3944410)).toBeLessThan(0.05);
  });
});

// ── 3. Angles: self-grounding sky invariants ─────────────────────────
describe('angles', () => {
  const nyc = new Observer(40.7128, -74.0060, 10);

  function anglesAt(date: Date, lat: number, lon: number) {
    const gastHours = SiderealTime(MakeTime(date));
    const obliquity = meanObliquity(
      (date.getTime() - Date.UTC(2000, 0, 1, 12)) / (86400_000 * 36525)
    );
    return computeAngles({ gastHours, latitude: lat, longitude: lon, obliquity });
  }

  it('ASC ≈ Sun longitude at sunrise (NYC)', () => {
    const rise = SearchRiseSet(Body.Sun, nyc, +1, MakeTime(new Date('2024-06-01T00:00:00Z')), 2);
    expect(rise).toBeTruthy();
    const bodies = computeBodies(rise!.date);
    const a = anglesAt(rise!.date, 40.7128, -74.0060);
    expect(angleDiff(a.asc, lonOf(bodies, 'Sun'))).toBeLessThan(2.5);
  });

  it('MC ≈ Sun longitude at solar culmination (NYC)', () => {
    const culm = SearchHourAngle(Body.Sun, nyc, 0, MakeTime(new Date('2024-06-01T00:00:00Z')), 1);
    const bodies = computeBodies(culm.time.date);
    const a = anglesAt(culm.time.date, 40.7128, -74.0060);
    expect(angleDiff(a.mc, lonOf(bodies, 'Sun'))).toBeLessThan(0.2);
  });

  it('southern hemisphere ASC ≈ Sun at Sydney sunrise', () => {
    const sydney = new Observer(-33.8688, 151.2093, 20);
    const rise = SearchRiseSet(Body.Sun, sydney, +1, MakeTime(new Date('2024-06-01T00:00:00Z')), 2);
    const bodies = computeBodies(rise!.date);
    const a = anglesAt(rise!.date, -33.8688, 151.2093);
    expect(angleDiff(a.asc, lonOf(bodies, 'Sun'))).toBeLessThan(2.5);
  });
});

// ── 4. Houses ────────────────────────────────────────────────────────
describe('houses', () => {
  const date = new Date('1990-02-01T18:45:00Z');
  const gastHours = SiderealTime(MakeTime(date));
  const obliquity = meanObliquity(
    (date.getTime() - Date.UTC(2000, 0, 1, 12)) / (86400_000 * 36525)
  );

  it('whole sign cusps start at the ASC sign boundary', () => {
    const cusps = wholeSignCusps(197.4);
    expect(cusps[0]).toBe(180);
    expect(cusps[11]).toBe(150);
  });

  it('Placidus cusps are ordered and anchored to the angles (London)', () => {
    const input = { gastHours, latitude: 51.5074, longitude: -0.1278, obliquity };
    const angles = computeAngles(input);
    const cusps = placidusCusps(input, angles)!;
    expect(cusps).toHaveLength(12);
    expect(angleDiff(cusps[0], angles.asc)).toBeLessThan(1e-9);
    expect(angleDiff(cusps[9], angles.mc)).toBeLessThan(1e-9);
    // Each cusp advances eastward: total forward spans sum to 360.
    let total = 0;
    for (let i = 0; i < 12; i += 1) total += norm(cusps[(i + 1) % 12] - cusps[i]);
    expect(total).toBeCloseTo(360, 6);
    // Intermediate cusps sit strictly between their angles.
    expect(norm(cusps[10] - cusps[9])).toBeLessThan(90);
    expect(norm(cusps[11] - cusps[10])).toBeLessThan(90);
  });

  it('at the equator, Placidus RA offsets are exact 30° steps', () => {
    const input = { gastHours, latitude: 0, longitude: 12.5, obliquity };
    const angles = computeAngles(input);
    const cusps = placidusCusps(input, angles)!;
    // AD = 0 at φ=0 so cusp 11 is the ecliptic point at RAMC+30 exactly.
    const ramc = norm(gastHours * 15 + 12.5);
    const expected = norm(
      (Math.atan2(
        Math.sin(((ramc + 30) * Math.PI) / 180),
        Math.cos(((ramc + 30) * Math.PI) / 180) * Math.cos((obliquity * Math.PI) / 180)
      ) * 180) / Math.PI
    );
    expect(angleDiff(cusps[10], expected)).toBeLessThan(1e-6);
  });

  it('falls back to whole sign above the polar circle (Tromsø)', () => {
    const chart = computeChart({
      utc: new Date('2001-12-21T09:30:00Z'),
      latitude: 69.6492,
      longitude: 18.9553,
      houseSystem: 'placidus',
      timeKnown: true,
    });
    expect(chart.houses?.system).toBe('whole');
    expect(chart.flags).toContain('polar-fallback');
  });

  it('houseOf places longitudes into forward spans', () => {
    const cusps = wholeSignCusps(15); // ASC 15° Aries → cusp 1 at 0° Aries
    expect(houseOf(20, cusps)).toBe(1);
    expect(houseOf(35, cusps)).toBe(2);
    expect(houseOf(359, cusps)).toBe(12);
  });
});

describe('angles and Placidus houses vs Swiss Ephemeris', () => {
  for (const reference of SWISS_HOUSE_VECTORS) {
    it(`${reference.name} stays inside the external accuracy gate`, () => {
      const chart = computeChart({
        utc: new Date(reference.utc),
        latitude: reference.latitude,
        longitude: reference.longitude,
        houseSystem: 'placidus',
        timeKnown: true,
      });

      expect(chart.angles).not.toBeNull();
      expect(chart.houses?.system).toBe('placidus');
      expect(chart.houses?.cusps).toHaveLength(12);
      expect(angleDiff(chart.angles!.asc, reference.asc)).toBeLessThanOrEqual(0.1);
      expect(angleDiff(chart.angles!.mc, reference.mc)).toBeLessThanOrEqual(0.1);
      reference.cusps.forEach((expected, index) => {
        expect(angleDiff(chart.houses!.cusps[index], expected)).toBeLessThanOrEqual(0.2);
      });
    });
  }
});

// ── 5. True node sanity vs Meeus mean node ───────────────────────────
describe('true node', () => {
  it('oscillates within 2° of the mean node and moves slowly', () => {
    for (const iso of ['2005-03-15T00:00:00Z', '2020-01-01T00:00:00Z', '2026-07-01T00:00:00Z']) {
      const date = new Date(iso);
      const bodies = computeBodies(date);
      const node = bodies.find((b) => b.body === 'North Node')!;
      const n = (date.getTime() - Date.UTC(2000, 0, 1, 12)) / 86400_000;
      const meanNode = norm(125.04452 - 0.05295377 * n);
      expect(angleDiff(node.lon, meanNode)).toBeLessThan(2);
      expect(Math.abs(node.speed)).toBeLessThan(0.3);
    }
  });
});

// ── 6. lite.ts stays honest against the full engine ──────────────────
describe('lite approximations', () => {
  for (const iso of ['2026-07-05T12:00:00Z', '2027-01-15T03:00:00Z', '2026-11-01T22:00:00Z']) {
    it(`Sun/Moon at ${iso}`, () => {
      const date = new Date(iso);
      const bodies = computeBodies(date);
      expect(angleDiff(sunLongitude(date), lonOf(bodies, 'Sun'))).toBeLessThan(0.1);
      expect(angleDiff(moonLongitude(date), lonOf(bodies, 'Moon'))).toBeLessThan(0.5);
      expect(moonPhaseAngle(date)).toBeGreaterThanOrEqual(0);
    });
  }
});

// ── 7. Aspects ───────────────────────────────────────────────────────
describe('aspects', () => {
  const mk = (body: string, lon: number, speed = 1): BodyPosition =>
    ({ body: body as BodyPosition['body'], lon, lat: 0, speed, retrograde: speed < 0 });

  it('finds a tightening square with luminary orb', () => {
    // Moon at 10°, Mars at 102° — separation 92°, Moon faster: applying.
    const aspects = findAspects([mk('Moon', 10, 13), mk('Mars', 102, 0.5)]);
    expect(aspects).toHaveLength(1);
    expect(aspects[0].type).toBe('square');
    expect(aspects[0].orb).toBeCloseTo(2, 5);
    expect(aspects[0].applying).toBe(true);
  });

  it('respects tighter non-luminary orbs', () => {
    // Mercury–Venus at 65° apart: 5° from sextile > 4° orb → nothing.
    expect(findAspects([mk('Mercury', 0), mk('Venus', 65)])).toHaveLength(0);
  });

  it('separation is symmetric and wraps', () => {
    expect(separation(350, 10)).toBe(20);
    expect(separation(10, 350)).toBe(20);
  });
});

// ── 8. The full pipeline: Frida Kahlo fixture ────────────────────────
describe('Frida Kahlo chart (the demo fixture)', () => {
  const resolved = resolveLocalToUtc('1907-07-06', '08:30', 'America/Mexico_City');
  const chart = computeChart({
    utc: resolved.utc,
    latitude: 19.35,   // Coyoacán
    longitude: -99.16,
    houseSystem: 'whole',
    timeKnown: true,
    flags: resolved.flags,
  });

  it('big three land on the documented signs', () => {
    expect(signForLongitude(lonOf(chart.bodies, 'Sun')).slug).toBe('cancer');
    expect(signForLongitude(lonOf(chart.bodies, 'Moon')).slug).toBe('taurus');
    expect(signForLongitude(chart.angles!.asc).slug).toBe('leo');
  });

  it('carries the lmt flag through', () => {
    expect(chart.flags).toContain('lmt');
  });

  it('formats longitudes for display', () => {
    expect(formatLongitude(lonOf(chart.bodies, 'Sun'))).toMatch(/^13°\d{2}′ Cancer$/);
  });

  it('writes the homepage fixture when asked', () => {
    if (!process.env.GENERATE_FIXTURE) return;
    const out = resolve(process.cwd(), 'src/data/demo-chart-frida.json');
    mkdirSync(resolve(process.cwd(), 'src/data'), { recursive: true });
    writeFileSync(
      out,
      JSON.stringify(
        {
          name: 'Frida Kahlo',
          birth: 'July 6, 1907 · 8:30 AM · Coyoacán, Mexico',
          utc: chart.input.utc.toISOString(),
          bodies: chart.bodies.map((b) => ({
            body: b.body,
            lon: Number(b.lon.toFixed(4)),
            lat: Number(b.lat.toFixed(4)),
            speed: Number(b.speed.toFixed(6)),
            retrograde: b.retrograde,
          })),
          angles: {
            asc: Number(chart.angles!.asc.toFixed(4)),
            mc: Number(chart.angles!.mc.toFixed(4)),
          },
          houses: chart.houses,
          flags: chart.flags,
        },
        null,
        2
      ) + '\n'
    );
  });
});
