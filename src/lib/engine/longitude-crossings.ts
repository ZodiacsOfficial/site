import type { BodyName } from './types';

const DAY = 86_400_000;

export interface LongitudeCrossing {
  at: Date;
  /** True when the body was moving backward through the degree. */
  retrograde: boolean;
}

export type BodyLongitudeAt = (body: BodyName, date: Date) => number;

/** Signed shortest angular distance a→b, degrees (−180, 180]. */
function delta(a: number, b: number): number {
  const d = (((b - a) % 360) + 360) % 360;
  return d > 180 ? d - 360 : d;
}

/**
 * Every instant in (from, to] when `body` sits exactly on `targetLon`.
 * Coarse scan at `stepDays`, then 24-iteration bisection per crossing.
 */
export function findLongitudeCrossingsWith(
  bodyLongitude: BodyLongitudeAt,
  body: BodyName,
  targetLon: number,
  from: Date,
  to: Date,
  stepDays = 5,
): LongitudeCrossing[] {
  const out: LongitudeCrossing[] = [];
  const step = stepDays * DAY;
  if (!Number.isFinite(step) || step <= 0) throw new RangeError('stepDays must be positive.');

  let prevT = from.getTime();
  let prev = delta(targetLon, bodyLongitude(body, from));
  const toT = to.getTime();

  while (prevT < toT) {
    const t = Math.min(prevT + step, toT);
    const date = new Date(t);
    const cur = delta(targetLon, bodyLongitude(body, date));

    // An exact sampled endpoint belongs to this interval once. Skipping a
    // zero previous sample also keeps the lower bound of (from, to] excluded.
    // Retain the ±180-wrap guard (opposite side of the zodiac).
    if (cur === 0 && prev !== 0 && Math.abs(prev) < 90) {
      out.push({ at: date, retrograde: prev > 0 });
    } else if (prev !== 0 && cur !== 0 && Math.sign(cur) !== Math.sign(prev)
      && Math.abs(cur) < 90 && Math.abs(prev) < 90) {
      let lo = prevT;
      let hi = t;
      const rising = cur > prev;
      for (let i = 0; i < 24; i += 1) {
        const mid = (lo + hi) / 2;
        const d = delta(targetLon, bodyLongitude(body, new Date(mid)));
        if ((d > 0) === rising) hi = mid;
        else lo = mid;
      }
      const at = new Date(hi);
      // Direction through the degree: longitude increasing = direct.
      out.push({ at, retrograde: !rising });
    }

    prevT = t;
    prev = cur;
  }

  return out;
}
