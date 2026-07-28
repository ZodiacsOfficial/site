/**
 * The claim the horizon ring rests on: the eastern point where the horizon
 * cuts the ecliptic IS the ascendant. If that is not true to the arcminute
 * against the engine's own angles, the drawing is decoration.
 *
 * These fixtures are the three charts the demo ships, computed by the real
 * engine (Placidus, known birth times).
 */
import { describe, expect, it } from 'vitest';
import { computeAngles, meanObliquity, ramcOf } from '../engine/houses';
import {
  altitudeOf,
  gmstHours,
  horizonCircle,
  julianCenturies,
  norm360,
  separation,
  zenithOf,
} from './ecliptic3d';

interface Fixture {
  name: string;
  utc: string;
  latitude: number;
  longitude: number;
  /** Engine truth. */
  asc: number;
  mc: number;
  sunLon: number;
  daylight: boolean;
}

const FIXTURES: Fixture[] = [
  {
    name: 'Frida Kahlo, Coyoacán',
    utc: '1907-07-06T20:30:00Z',
    latitude: 19.35,
    longitude: -99.16,
    asc: 219.169,
    mc: 129.564,
    sunLon: 103.59,
    // 20:30 UTC is early afternoon in Mexico — the Sun is well up.
    daylight: true,
  },
  {
    name: 'Ada Lovelace, London',
    utc: '1815-12-10T12:00:00Z',
    latitude: 51.51,
    longitude: -0.13,
    asc: 332.784,
    mc: 259.163,
    sunLon: 257.629,
    daylight: true,
  },
  {
    name: 'Greenwich noon, 2026',
    utc: '2026-07-28T12:00:00Z',
    latitude: 51.48,
    longitude: 0,
    asc: 205.447,
    mc: 123.853,
    sunLon: 125.443,
    daylight: true,
  },
];

/**
 * Error budget, all of it in the sidereal-time model rather than the
 * geometry: the equation of the equinoxes (GMST standing in for GAST) is at
 * most ~1.1 s, UT1−UTC under 0.9 s, and mean-vs-true obliquity under
 * 0.003°. Together under ~0.01° of right ascension, which the ascendant
 * amplifies by at most a few times away from the poles. A tenth of a degree
 * is a wide margin over the ~0.05° this should actually show.
 */
const TOLERANCE = 0.1;

function frame(f: Fixture) {
  const utcMs = Date.parse(f.utc);
  const obliquity = meanObliquity(julianCenturies(utcMs));
  const gastHours = gmstHours(utcMs);
  const ramc = ramcOf({ gastHours, longitude: f.longitude });
  const angles = computeAngles({
    gastHours,
    latitude: f.latitude,
    longitude: f.longitude,
    obliquity,
  });
  return { obliquity, ramc, angles, zenith: zenithOf(ramc, f.latitude, obliquity) };
}

/** Where a horizon crosses the ecliptic, by scanning for latitude sign changes. */
function eclipticCrossings(zenith: ReturnType<typeof frame>['zenith']): number[] {
  const ring = horizonCircle(zenith, 0.25);
  const found: number[] = [];
  for (let i = 1; i < ring.length; i += 1) {
    const a = ring[i - 1];
    const b = ring[i];
    if (a.lat === 0) found.push(a.lon);
    if ((a.lat < 0 && b.lat > 0) || (a.lat > 0 && b.lat < 0)) {
      const t = Math.abs(a.lat) / (Math.abs(a.lat) + Math.abs(b.lat));
      // Interpolate the short way round so a wrap through 0° cannot skew it.
      let step = b.lon - a.lon;
      if (step > 180) step -= 360;
      if (step < -180) step += 360;
      found.push(norm360(a.lon + step * t));
    }
  }
  return found;
}

describe('the horizon reproduces the engine’s angles', () => {
  for (const f of FIXTURES) {
    describe(f.name, () => {
      it('models the ascendant and midheaven the engine computed', () => {
        const { angles } = frame(f);
        expect(separation(angles.asc, f.asc)).toBeLessThan(TOLERANCE);
        expect(separation(angles.mc, f.mc)).toBeLessThan(TOLERANCE);
      });

      it('cuts the ecliptic at the ascendant and the descendant', () => {
        const { zenith } = frame(f);
        const crossings = eclipticCrossings(zenith);
        expect(crossings).toHaveLength(2);

        const nearestToAsc = Math.min(...crossings.map((c) => separation(c, f.asc)));
        const nearestToDsc = Math.min(...crossings.map((c) => separation(c, f.asc + 180)));
        expect(nearestToAsc).toBeLessThan(TOLERANCE);
        expect(nearestToDsc).toBeLessThan(TOLERANCE);
      });

      it('places the ascendant on the horizon itself', () => {
        const { zenith } = frame(f);
        expect(altitudeOf(f.asc, 0, zenith)).toBeCloseTo(0, 2);
      });

      it('reads the Sun above or below that horizon', () => {
        const { zenith } = frame(f);
        const altitude = altitudeOf(f.sunLon, 0, zenith);
        expect(altitude > 0).toBe(f.daylight);
      });
    });
  }

  it('finds night on the far side of the same day', () => {
    // Twelve hours from Greenwich noon puts the Sun under the horizon —
    // the same geometry, the opposite verdict.
    const f = FIXTURES[2];
    const midnight = { ...f, utc: '2026-07-29T00:00:00Z' };
    const { zenith } = frame(midnight);
    expect(altitudeOf(f.sunLon, 0, zenith)).toBeLessThan(0);
  });
});
