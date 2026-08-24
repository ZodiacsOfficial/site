/**
 * Dynamic chart-engine boundary.
 *
 * The implementation lives in the exact vendored @zodiacs/engine package;
 * this adapter preserves the site's established data shape while keeping the
 * ephemeris behind the existing `import('../engine/full')` split point.
 */
import {
  bodyLongitude as engineBodyLongitude,
  computeBodies as engineComputeBodies,
  computeChart as engineComputeChart,
  longitudeSpeed as engineLongitudeSpeed,
} from '@zodiacs/engine/internal';

import { correctRisingIntersection, wholeSignCusps } from './houses';
import type {
  Aspect,
  BodyName,
  BodyPosition,
  Chart,
  ChartFlag,
  ChartInput,
} from './types';

const adaptBody = (position: {
  body: BodyName;
  lon: number;
  lat: number;
  speed: number;
  retrograde: boolean;
}): BodyPosition => ({
  body: position.body,
  lon: position.lon,
  lat: position.lat,
  speed: position.speed,
  retrograde: position.retrograde,
});

/** Scanner-oriented single-body primitive; intentionally not a public SDK API. */
export function bodyLongitude(name: BodyName, date: Date): number {
  return engineBodyLongitude(name, date);
}

/** Longitude speed in degrees/day by central difference (±6h). */
export function longitudeSpeed(name: BodyName, date: Date): number {
  return engineLongitudeSpeed(name, date);
}

export function computeBodies(date: Date): BodyPosition[] {
  return engineComputeBodies(date).map(adaptBody);
}

export function computeChart(input: ChartInput): Chart {
  const chart = engineComputeChart(input);
  const angles = chart.angles ? correctRisingIntersection(chart.angles) : chart.angles;
  let houses = chart.houses;
  const flags = [...chart.flags] as ChartFlag[];
  if (angles && chart.angles && angles.asc !== chart.angles.asc && houses) {
    // The package derived cusps from the setting intersection; re-anchor them
    // to the corrected ascendant. Placidus cannot legitimately survive at the
    // latitudes where the flip occurs, so any non-whole system falls back.
    if (houses.system !== 'whole' && !flags.includes('polar-fallback')) {
      flags.push('polar-fallback');
    }
    houses = { system: 'whole', cusps: wholeSignCusps(angles.asc) };
  }
  return {
    input,
    bodies: chart.bodies.map(adaptBody),
    angles,
    houses,
    aspects: chart.aspects as Aspect[],
    flags,
    engineVersion: chart.engineVersion,
  };
}
