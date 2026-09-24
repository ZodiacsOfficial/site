import { findLongitudeCrossings } from './returns';
import { computeChart } from './full';
import { clipToReferenceSpan } from './reference-span';
import type { Chart, HouseSystem } from './types';

const DAY_MS = 86_400_000;

/**
 * The instant the transiting Sun returns to the natal Sun longitude nearest
 * to `near`. Scans ±200 days around `near` (a solar return is always within
 * ~183 days of any date) and picks the crossing closest to it.
 */
export function solarReturnInstant(natalSunLon: number, near: Date): Date {
  const requested = { from: new Date(near.getTime() - 200 * DAY_MS), to: new Date(near.getTime() + 200 * DAY_MS) };
  const window = clipToReferenceSpan(requested.from, requested.to);
  const crossings = window ? findLongitudeCrossings('Sun', natalSunLon, window.from, window.to, 1) : [];
  if (!window || crossings.length === 0) throw new RangeError('No solar return found in the scan window.');

  const closest = crossings.reduce((best, crossing) =>
    Math.abs(crossing.at.getTime() - near.getTime())
      < Math.abs(best.at.getTime() - near.getTime())
      ? crossing
      : best).at;
  // A clipped window can hide a nearer return beyond the span; refuse then.
  const distance = Math.abs(closest.getTime() - near.getTime());
  const edges = [
    window.from.getTime() !== requested.from.getTime() ? near.getTime() - window.from.getTime() : Infinity,
    window.to.getTime() !== requested.to.getTime() ? window.to.getTime() - near.getTime() : Infinity,
  ];
  if (distance > Math.min(...edges)) throw new RangeError('No solar return found in the scan window.');
  return closest;
}

/** The latest solar return at or before `at`, used for the birthday-year in progress. */
export function mostRecentSolarReturnInstant(natalSunLon: number, at: Date): Date {
  const window = clipToReferenceSpan(new Date(at.getTime() - 370 * DAY_MS), at);
  const crossings = (window ? findLongitudeCrossings('Sun', natalSunLon, window.from, window.to, 1) : [])
    .filter((crossing) => crossing.at.getTime() <= at.getTime());
  if (crossings.length === 0) throw new RangeError('No previous solar return found in the scan window.');
  return crossings[crossings.length - 1].at;
}

/**
 * The solar-return chart for the return nearest `near`. With a location the
 * chart carries angles and houses; without one it is planets-only
 * (angles/houses null), matching the Chart contract.
 */
export function solarReturnChart(
  natalSunLon: number,
  near: Date,
  location: { latitude: number; longitude: number } | null,
  houseSystem: HouseSystem,
  selection: 'nearest' | 'most-recent' = 'nearest',
): Chart {
  const utc = selection === 'most-recent'
    ? mostRecentSolarReturnInstant(natalSunLon, near)
    : solarReturnInstant(natalSunLon, near);
  return computeChart({
    utc,
    ...(location ?? {}),
    houseSystem,
    timeKnown: true,
  });
}
