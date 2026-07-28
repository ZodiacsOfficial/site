/**
 * The turning sky.
 *
 * A birth chart is a photograph of a sky that was moving. The planets were
 * barely moving — the Moon, the fastest, covers about half a degree an hour
 * — but the Earth was turning under them at roughly fifteen degrees an
 * hour, which is why the ascendant changes sign every couple of hours and
 * why a birth time matters at all. This module recomputes the observer's
 * half of the chart for any minute near birth so that fact can be seen
 * rather than asserted.
 *
 * No ephemeris. The angles come from the engine's own pure-math house
 * routines driven by a sidereal-time model, and the planets are advanced
 * along the zodiac at the rates the chart already carries.
 *
 * Everything displayed is anchored as a *delta* against the engine's real
 * angles at birth, so a scrub of zero returns exactly what the calculator
 * computed — the model's own small error cancels at the anchor and never
 * shows as a jump.
 */
import {
  computeAngles,
  meanObliquity,
  placidusCusps,
  ramcOf,
  wholeSignCusps,
} from '../../lib/engine/houses';
import type { Angles, HouseSystem } from '../../lib/engine/types';
import {
  gmstHours,
  julianCenturies,
  norm360,
  zenithOf,
  type EclipticPoint,
} from '../../lib/wheel/ecliptic3d';

const MS_PER_MINUTE = 60_000;

export interface TurnInput {
  /** The chart's own instant. */
  utcMs: number;
  latitude: number;
  longitude: number;
  /** The engine's angles at birth — the anchor everything is measured from. */
  baseline: Angles;
  /** The engine's cusps at birth, when the reader has the houses layer on. */
  baselineCusps: number[] | null;
  houseSystem: HouseSystem;
  /** True when the engine already fell back to whole sign for this chart. */
  polarFallback: boolean;
}

export interface TurnFrame {
  angles: Angles;
  cusps: number[] | null;
  /** Overhead point at this minute — the horizon follows from it. */
  zenith: EclipticPoint;
  /** True when the live floor is whole-sign because Placidus gave out. */
  fellBack: boolean;
}

/** Signed shortest way round from one longitude to another, −180…180. */
export function angleDelta(from: number, to: number): number {
  let d = (norm360(to) - norm360(from)) % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

/**
 * Where a body sits after a scrub, along the zodiac only.
 *
 * The chart carries longitude speed and nothing else — there is no rate of
 * change for ecliptic latitude anywhere in the data — so latitude is held
 * and the caller says so. Over half a day the error stays well inside the
 * width of the disc that draws it.
 */
export function bodyLonAt(lon: number, speedDegPerDay = 0, dtMinutes = 0): number {
  return norm360(lon + speedDegPerDay * (dtMinutes / 1440));
}

function modelAt(input: TurnInput, utcMs: number) {
  const obliquity = meanObliquity(julianCenturies(utcMs));
  const gastHours = gmstHours(utcMs);
  const angleInput = {
    gastHours,
    latitude: input.latitude,
    longitude: input.longitude,
    obliquity,
  };
  return {
    angleInput,
    obliquity,
    ramc: ramcOf({ gastHours, longitude: input.longitude }),
    angles: computeAngles(angleInput),
  };
}

/**
 * The observer's chart at `dtMinutes` from birth: angles, a live house
 * floor, and the overhead point the horizon hangs from.
 */
export function turnFrame(input: TurnInput, dtMinutes: number): TurnFrame {
  const base = modelAt(input, input.utcMs);

  if (dtMinutes === 0) {
    // Exactly the engine's own chart — no model error, no jump.
    return {
      angles: input.baseline,
      cusps: input.baselineCusps,
      zenith: zenithOf(base.ramc, input.latitude, base.obliquity),
      fellBack: input.polarFallback,
    };
  }

  const now = modelAt(input, input.utcMs + dtMinutes * MS_PER_MINUTE);

  const angles: Angles = {
    asc: norm360(input.baseline.asc + angleDelta(base.angles.asc, now.angles.asc)),
    mc: norm360(input.baseline.mc + angleDelta(base.angles.mc, now.angles.mc)),
    dsc: norm360(input.baseline.dsc + angleDelta(base.angles.dsc, now.angles.dsc)),
    ic: norm360(input.baseline.ic + angleDelta(base.angles.ic, now.angles.ic)),
  };

  const zenith = zenithOf(now.ramc, input.latitude, now.obliquity);

  if (input.baselineCusps === null) {
    return { angles, cusps: null, zenith, fellBack: input.polarFallback };
  }

  // Whole sign follows the ascendant exactly, so it needs no anchoring.
  if (input.houseSystem === 'whole' || input.polarFallback) {
    return { angles, cusps: wholeSignCusps(angles.asc), zenith, fellBack: input.polarFallback };
  }

  const nowCusps = placidusCusps(now.angleInput, now.angles);
  const baseCusps = placidusCusps(base.angleInput, base.angles);

  // A cusp can go circumpolar part-way through a scrub. Falling the whole
  // scrub to whole sign is steadier than flipping systems mid-drag.
  if (!nowCusps || !baseCusps || nowCusps.length !== 12 || baseCusps.length !== 12) {
    return { angles, cusps: wholeSignCusps(angles.asc), zenith, fellBack: true };
  }

  const cusps = input.baselineCusps.map((cusp, i) =>
    norm360(cusp + angleDelta(baseCusps[i], nowCusps[i])));

  return { angles, cusps, zenith, fellBack: false };
}
