/**
 * Planetary returns: when a transiting body comes back to its natal
 * longitude. Built for Saturn (the ~29.4-year cycle) but generic over
 * any slow body. Retrograde triple passes are real events — crossings
 * are grouped into "seasons" so a return with three exact hits reads as
 * one season with three dates, not three separate returns.
 *
 * Lives beside full.ts and is only ever lazy-loaded with it — the
 * ephemeris stays out of every eager bundle.
 */
import { bodyLongitude } from './full';
import type { BodyName } from './types';

const DAY = 86400_000;

/** Signed shortest angular distance a→b, degrees (−180, 180]. */
function delta(a: number, b: number): number {
  const d = (((b - a) % 360) + 360) % 360;
  return d > 180 ? d - 360 : d;
}

export interface Crossing {
  at: Date;
  /** True when the body was moving backward through the degree. */
  retrograde: boolean;
}

export interface ReturnSeason {
  /** 1 = first return (~29), 2 = second (~58)… */
  index: number;
  crossings: Crossing[];
  first: Date;
  last: Date;
}

/**
 * Every instant in [from, to) when `body` sits exactly on `targetLon`.
 * Coarse scan at `stepDays`, then 24-iteration bisection per crossing.
 * The default 5-day step is safe for Saturn (≤0.13°/day → ≤0.65°/step
 * against a 360° lap; a triple pass spans months, never 5 days).
 */
export function findLongitudeCrossings(
  body: BodyName,
  targetLon: number,
  from: Date,
  to: Date,
  stepDays = 5,
): Crossing[] {
  const out: Crossing[] = [];
  const step = stepDays * DAY;

  let prevT = from.getTime();
  let prev = delta(targetLon, bodyLongitude(body, from));

  for (let t = prevT + step; t <= to.getTime(); t += step) {
    const date = new Date(t);
    const cur = delta(targetLon, bodyLongitude(body, date));

    // Sign change without the ±180 wrap (opposite side of the zodiac).
    if (Math.sign(cur) !== Math.sign(prev) && Math.abs(cur) < 90 && Math.abs(prev) < 90) {
      let lo = prevT;
      let hi = t;
      const rising = cur > prev;
      for (let i = 0; i < 24; i += 1) {
        const mid = (lo + hi) / 2;
        const d = delta(targetLon, bodyLongitude(body, new Date(mid)));
        if ((d > 0) === rising) hi = mid; else lo = mid;
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

/**
 * Group a body's crossings of one natal degree into return seasons.
 * Crossings within `gapDays` of each other belong to the same season
 * (a Saturn triple pass spans ≤ ~11 months; successive returns are
 * ~29 years apart, so any sane gap separates them).
 */
export function groupIntoSeasons(crossings: Crossing[], gapDays = 400): ReturnSeason[] {
  const seasons: ReturnSeason[] = [];
  for (const c of crossings) {
    const cur = seasons[seasons.length - 1];
    if (cur && c.at.getTime() - cur.last.getTime() <= gapDays * DAY) {
      cur.crossings.push(c);
      cur.last = c.at;
    } else {
      seasons.push({ index: seasons.length + 1, crossings: [c], first: c.at, last: c.at });
    }
  }
  return seasons;
}

export interface SaturnReturnResult {
  /** Natal Saturn longitude, degrees. */
  natalLon: number;
  natalRetrograde: boolean;
  seasons: ReturnSeason[];
}

/**
 * Natal Saturn plus every return season through the third (~age 90).
 * ~6,600 single-body samples ≈ well under a second in the browser.
 */
export function saturnReturns(birthUtc: Date): SaturnReturnResult {
  const natalLon = bodyLongitude('Saturn', birthUtc);
  const speed =
    delta(
      bodyLongitude('Saturn', new Date(birthUtc.getTime() - DAY)),
      bodyLongitude('Saturn', new Date(birthUtc.getTime() + DAY)),
    ) / 2;

  // Scan +26y..+92y: the first return can't land before ~28y, but a
  // retrograde first pass can lead the exact-age mark by many months.
  const from = new Date(birthUtc.getTime() + 26 * 365.25 * DAY);
  const to = new Date(birthUtc.getTime() + 92 * 365.25 * DAY);
  const crossings = findLongitudeCrossings('Saturn', natalLon, from, to);

  return {
    natalLon,
    natalRetrograde: speed < 0,
    seasons: groupIntoSeasons(crossings),
  };
}
