import { beforeAll, describe, expect, it } from 'vitest';
import { parseNatalEnvelope } from '@zodiacs/engine/receipt';
import lmtEras from '../../data/tz-lmt.json';
import { computeCalculatorReceipt } from '../engine/calculator-receipt';
import { offsetAt, prepareLocalTime, resolveLocalToUtc } from './localToUtc';

/*
 * Every wall minute within 26 hours of a zone's local mean time era end,
 * for towns east and west of the zone's reference meridian (and the
 * reference city itself), checked against a separate model of the
 * birthplace's clock: before the end, wall = t + the town's mean time; from
 * the end, wall = t + the zone's legal offset from Intl, except that where
 * Intl records the change up to 36 hours late, its later offset applies from
 * the end. One reading is the
 * answer; two are a fold and take the earlier with `dst-fold`; none is a gap,
 * moved forward by the offset in force just before, with `dst-gap`. Sampled
 * results must also make portable receipts that validate.
 */
const eras: Record<string, number> = lmtEras.eras;
const CASES: [zone: string, town: string, longitude: number][] = [
  ['America/New_York', 'Buffalo', -78.88],
  ['America/New_York', 'Hartford', -72.69],
  ['America/New_York', 'New York', -74.01],
  ['America/Chicago', 'Omaha', -95.94],
  ['Europe/Paris', 'Brest', -4.49],
  ['Europe/Paris', 'Strasbourg', 7.75],
  ['Europe/Dublin', 'Galway', -9.05],
  ['Europe/London', 'Norwich', 1.3],
  ['Europe/Oslo', 'Bergen', 5.32],
  ['America/Toronto', 'Montreal', -73.57],
  ['America/Toronto', 'Thunder Bay', -89.25],
  ['Asia/Kolkata', 'Mumbai', 72.88],
  ['America/Mexico_City', 'Merida', -89.62],
  ['America/Sitka', 'Sitka', -135.33],
  // Intl changes offset after the table's era end in these two.
  ['Africa/Maseru', 'Butha-Buthe', 28.25],
  ['Africa/Ouagadougou', 'Aribinda', -0.87],
];

/** The first instant within 36 h after the era end at which Intl's offset changes, or the end itself. */
function catchUp(zone: string, endMs: number): number {
  const atEnd = offsetAt(zone, endMs);
  for (let t = endMs; t <= endMs + 36 * 3_600_000; t += 60_000) {
    if (offsetAt(zone, t) !== atEnd) {
      let lo = t - 60_000;
      let hi = t;
      while (hi - lo > 1) {
        const mid = Math.floor((lo + hi) / 2);
        if (offsetAt(zone, mid) === atEnd) lo = mid;
        else hi = mid;
      }
      return hi;
    }
  }
  return endMs;
}

function wallParts(ms: number): [string, string] {
  const iso = new Date(ms).toISOString();
  return [iso.slice(0, 10), iso.slice(11, 16)];
}

describe('the birthplace clock at the end of its local mean time era', () => {
  beforeAll(() => prepareLocalTime('1800-01-01'));

  it.each(CASES)('%s: %s', (zone, _town, longitude) => {
    const endMs = eras[zone] * 1000;
    const legalFrom = catchUp(zone, endMs);
    const legalAt = (t: number) => offsetAt(zone, Math.max(t, legalFrom));
    const meanSeconds = Math.round(longitude * 240);
    const zoneBefore = offsetAt(zone, endMs - 1000) * 60;
    const place = (meanSeconds + Math.round((zoneBefore - meanSeconds) / 86_400) * 86_400) / 60;
    const endWall = endMs + Math.round(place * 60_000);
    const start = Math.floor((endWall - 26 * 3_600_000) / 60_000) * 60_000;
    const failures: string[] = [];
    let receipts = 0;
    for (let wall = start; wall <= endWall + 26 * 3_600_000; wall += 60_000) {
      const readings: { t: number; offset: number }[] = [];
      const inEra = wall - Math.round(place * 60_000);
      if (inEra < endMs) readings.push({ t: inEra, offset: place });
      const legal = new Set([endMs, legalFrom, wall - 36 * 3_600_000, wall, wall + 36 * 3_600_000, endMs + 86_400_000]
        .map(legalAt));
      for (const offset of legal) {
        const t = wall - Math.round(offset * 60_000);
        if (t >= endMs && Math.abs(legalAt(t) - offset) < 1e-9 && !readings.some((r) => r.t === t)) {
          readings.push({ t, offset });
        }
      }
      readings.sort((a, b) => a.t - b.t);
      const expected = readings.length === 0
        ? { t: inEra, offset: legalAt(inEra), flag: 'dst-gap' }
        : { t: readings[0].t, offset: readings[0].offset, flag: readings.length > 1 ? 'dst-fold' : '' };

      const [date, time] = wallParts(wall);
      const resolved = resolveLocalToUtc(date, time, zone, { longitude });
      const flag = resolved.flags.filter((f) => f !== 'lmt').join(',');
      const lmtFlagAgrees = resolved.flags.includes('lmt') === (Math.abs(resolved.offsetMinutes % 1) > 1e-9);
      if (resolved.utc.getTime() !== expected.t || Math.abs(resolved.offsetMinutes - expected.offset) > 1e-9
        || flag !== expected.flag || !lmtFlagAgrees) {
        failures.push(`${date} ${time}: got ${resolved.utc.toISOString()} ${resolved.offsetMinutes} [${resolved.flags}], `
          + `expected ${new Date(expected.t).toISOString()} ${expected.offset} [${expected.flag}]`);
      }
      if (flag || (wall - start) % (60 * 60_000) === 0) {
        receipts += 1;
        const captured = computeCalculatorReceipt({
          utc: resolved.utc, latitude: 40, longitude, houseSystem: 'placidus', timeKnown: true, flags: resolved.flags,
        }, { date, time, timeZone: zone, offsetMinutes: resolved.offsetMinutes, reference: 'supplied-instant' });
        if (!captured || !parseNatalEnvelope(captured.envelopeJson).ok) failures.push(`${date} ${time}: receipt did not validate`);
      }
    }
    expect(receipts).toBeGreaterThan(40);
    expect(failures.slice(0, 5)).toEqual([]);
  });
});
