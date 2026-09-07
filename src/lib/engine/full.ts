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
  return {
    input,
    bodies: chart.bodies.map(adaptBody),
    angles: chart.angles,
    houses: chart.houses,
    aspects: chart.aspects as Aspect[],
    flags: [...chart.flags] as ChartFlag[],
    engineVersion: chart.engineVersion,
  };
}
