import { findLongitudeCrossings } from './returns';
import { computeChart } from './full';
import type { Chart, HouseSystem } from './types';

const DAY_MS = 86_400_000;

/**
 * The instant the transiting Sun returns to the natal Sun longitude nearest
 * to `near`. Scans ±200 days around `near` (a solar return is always within
 * ~183 days of any date) and picks the crossing closest to it.
 */
export function solarReturnInstant(natalSunLon: number, near: Date): Date {
  const from = new Date(near.getTime() - 200 * DAY_MS);
  const to = new Date(near.getTime() + 200 * DAY_MS);
  const crossings = findLongitudeCrossings('Sun', natalSunLon, from, to, 1);
  if (crossings.length === 0) throw new RangeError('No solar return found in the scan window.');

  return crossings.reduce((closest, crossing) =>
    Math.abs(crossing.at.getTime() - near.getTime())
      < Math.abs(closest.at.getTime() - near.getTime())
      ? crossing
      : closest).at;
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
): Chart {
  const utc = solarReturnInstant(natalSunLon, near);
  return computeChart({
    utc,
    ...(location ?? {}),
    houseSystem,
    timeKnown: true,
  });
}
