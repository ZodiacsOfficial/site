import { describe, expect, it } from 'vitest';
import { offsetAt, resolveLocalToUtc } from './localToUtc';

/*
 * The engine audit's all-zone round-trip scan (docs/platform/evidence/
 * engine-audit-2026-09-22, finding time-9), kept as a test. It finds every
 * offset change the host's Intl data knows in every IANA zone from 1850 to
 * 2100, resolves wall minutes around each on the zone's clock, and compares
 * the result with a brute-force reading: every offset in force near the
 * change is tried, one match is the answer, two are a fold (the earlier, with
 * `dst-fold`), none is a gap (moved forward by the offset just before, with
 * `dst-gap`).
 *
 * The default run steps two weeks at a time to find changes, and tests the
 * minute before, at and after each edge of every gap or fold, plus points
 * inside it. TZ_SCAN=full repeats the audit's scope: a daily step, which also
 * finds a change undone within two weeks, and wider sampling, about five
 * minutes in all.
 */
const FULL = process.env.TZ_SCAN === 'full';
const START = Date.UTC(1850, 0, 1);
const END = Date.UTC(2101, 0, 1);
const STEP = (FULL ? 1 : 14) * 86_400_000;
const MINUTE = 60_000;
const HOUR = 3_600_000;

interface Change { at: number; before: number; after: number }

/** First instant in (lo, hi] whose offset differs from lo's. */
function firstChange(tz: string, lo: number, hi: number): number {
  const from = offsetAt(tz, lo);
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (offsetAt(tz, mid) === from) lo = mid;
    else hi = mid;
  }
  return hi;
}

function changes(tz: string): Change[] {
  const found: Change[] = [];
  let previous = offsetAt(tz, START);
  for (let t = START + STEP; t <= END; t += STEP) {
    const current = offsetAt(tz, t);
    if (current === previous) continue;
    // Several changes inside one step are found one after another.
    for (let lo = t - STEP; offsetAt(tz, lo) !== current;) {
      const at = firstChange(tz, lo, t);
      found.push({ at, before: offsetAt(tz, at - 1), after: offsetAt(tz, at) });
      lo = at;
    }
    previous = current;
  }
  return found;
}

function wallMinutes(change: Change): number[] {
  const low = change.at + Math.min(change.before, change.after) * MINUTE;
  const high = change.at + Math.max(change.before, change.after) * MINUTE;
  const deltas = FULL ? [-120, -60, -30, -2, -1, 0, 1, 2, 30, 60, 120] : [-1, 0, 1];
  const walls = new Set<number>();
  for (const edge of [low, high]) for (const delta of deltas) walls.add(edge + delta * MINUTE);
  if (FULL) {
    for (let wall = low - 2 * HOUR; wall <= high + 2 * HOUR; wall += 10 * MINUTE) walls.add(wall);
  } else {
    for (const fraction of [0.25, 0.5, 0.75]) walls.add(low + (high - low) * fraction);
  }
  return [...walls].map((wall) => Math.floor(wall / MINUTE) * MINUTE).filter((wall) => wall >= START && wall < END);
}

const ZONES = Intl.supportedValuesOf('timeZone');
const GROUPS = Array.from({ length: 12 }, (_, group) => ZONES.filter((_, index) => index % 12 === group));
const totals = { transitions: 0, tested: 0 };

describe('resolveLocalToUtc on the zone clock, around every offset change, 1850-2100', () => {
  // Groups of zones, so the worker reports between them on a long full scan.
  it.each(GROUPS.map((zones, group) => [group + 1, zones] as const))('round-trips zone group %i of 12', (_group, zones) => {
    const failures: string[] = [];
    for (const tz of zones) {
      const list = changes(tz);
      totals.transitions += list.length;
      for (const change of list) {
        const near = new Set<number>([offsetAt(tz, change.at - 50 * HOUR), offsetAt(tz, change.at + 50 * HOUR)]);
        for (const other of list) {
          if (Math.abs(other.at - change.at) < 60 * HOUR) near.add(other.before).add(other.after);
        }
        for (const wall of wallMinutes(change)) {
          const matches = [...near]
            .map((offset) => wall - Math.round(offset * MINUTE))
            .filter((utc) => Math.abs(offsetAt(tz, utc) * MINUTE - (wall - utc)) < 1)
            .sort((a, b) => a - b);
          const expected = matches.length === 0
            ? { utc: wall - Math.round(offsetAt(tz, change.at - 1) * MINUTE), flag: 'dst-gap' }
            : { utc: matches[0], flag: matches.length > 1 ? 'dst-fold' : null };
          const iso = new Date(wall).toISOString();
          const resolved = resolveLocalToUtc(iso.slice(0, 10), iso.slice(11, 16), tz);
          const flag = resolved.flags.find((f) => f === 'dst-gap' || f === 'dst-fold') ?? null;
          if (resolved.utc.getTime() !== expected.utc || flag !== expected.flag) {
            failures.push(`${tz} ${iso.slice(0, 16)}: got ${resolved.utc.toISOString()} ${flag}, expected ${new Date(expected.utc).toISOString()} ${expected.flag}`);
          }
          totals.tested += 1;
        }
      }
    }
    expect(failures.slice(0, 10)).toEqual([]);
  }, FULL ? 300_000 : 60_000);

  it('covered every zone and every offset change it found', () => {
    expect(ZONES.length).toBeGreaterThan(400);
    expect(totals.transitions).toBeGreaterThan(40_000);
    expect(totals.tested).toBeGreaterThan(FULL ? 1_600_000 : 300_000);
  });
});
