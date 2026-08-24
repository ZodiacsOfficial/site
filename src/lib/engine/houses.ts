/**
 * Site-compatible house and angle API backed by @zodiacs/engine.
 * The lightweight internal math entry contains no astronomical ephemeris.
 */
import {
  computeAngles as engineComputeAngles,
  computeHouses as engineComputeHouses,
  houseOf as engineHouseOf,
  meanObliquity,
  normalizeLongitude,
  placidusCusps as enginePlacidusCusps,
  ramcOf as engineRamcOf,
  wholeSignCusps,
} from '@zodiacs/engine/internal/math';
import type { AngleInput } from '@zodiacs/engine/internal/math';

import type { Angles, Houses, HouseSystem } from './types';

export type { AngleInput };
export { meanObliquity, wholeSignCusps };

/** Normalize an angle to [0, 360). Retained for existing site consumers. */
export const norm = normalizeLongitude;

export function ramcOf(input: Pick<AngleInput, 'gastHours' | 'longitude'>): number {
  return engineRamcOf(input);
}

/**
 * The atan2 ascendant formula returns one of the two ecliptic–horizon
 * intersections without checking which one is rising. Below the polar circle
 * it is always the rising one; above ~66.5° latitude the setting intersection
 * comes back for a large fraction of each sidereal day. The true ascendant
 * always lies east of the meridian — norm(asc − mc) strictly inside
 * (0, 180) — so an out-of-range result is the descendant: swap the axis.
 */
export function correctRisingIntersection(angles: Angles): Angles {
  if (normalizeLongitude(angles.asc - angles.mc) < 180) return angles;
  return { ...angles, asc: angles.dsc, dsc: angles.asc };
}

export function computeAngles(input: AngleInput): Angles {
  return correctRisingIntersection(engineComputeAngles(input));
}

export function placidusCusps(input: AngleInput, angles: Angles): number[] | null {
  return enginePlacidusCusps(input, angles);
}

export function computeHouses(
  system: HouseSystem,
  input: AngleInput,
  angles: Angles,
): { houses: Houses; fellBack: boolean } {
  return engineComputeHouses(system, input, angles);
}

/** House index (1–12) of an ecliptic longitude given cusp longitudes. */
export function houseOf(longitude: number, cusps: number[]): number {
  return engineHouseOf(longitude, cusps);
}
