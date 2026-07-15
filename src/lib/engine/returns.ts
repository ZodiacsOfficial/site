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
import { bodyLongitude } from './full.js';
import { findLongitudeCrossingsWith } from './longitude-crossings.js';
import type { LongitudeCrossing } from './longitude-crossings';
import type { BodyName } from './types';

const DAY = 86400_000;

/** Signed shortest angular distance a→b, degrees (−180, 180]. */
function delta(a: number, b: number): number {
  const d = (((b - a) % 360) + 360) % 360;
  return d > 180 ? d - 360 : d;
}

export type Crossing = LongitudeCrossing;

export interface ReturnSeason {
  /** 1 = first return (~29), 2 = second (~58)… */
  index: number;
  crossings: Crossing[];
  first: Date;
  last: Date;
}

/**
 * Every instant in (from, to] when `body` sits exactly on `targetLon`.
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
  return findLongitudeCrossingsWith(bodyLongitude, body, targetLon, from, to, stepDays);
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
