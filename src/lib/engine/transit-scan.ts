/** Browser-facing transit scanner backed by the vendored Zodiacs engine. */
import { bodyLongitude, computeBodies, longitudeSpeed } from './full.js';
import { findLongitudeCrossings } from './returns.js';
import {
  createTransitScanner,
  type NatalTransitChart,
} from './transit-scan-core.js';
import { TRANSIT_BODY_ORDER, type TransitBody } from './transit-scan-shared.js';
import type { Angles } from './types';

export {
  aspectTargetLongitudes,
  natalTransitPoints,
} from './transit-scan-core.js';
export type {
  NatalTransitChart,
  NatalTransitPoint,
  TransitContact,
  TransitScanOptions,
} from './transit-scan-core';
export {
  DEFAULT_TRANSIT_BODIES,
  MAJOR_ASPECT_ORDER,
  NATAL_POINT_ORDER,
  SLOW_TRANSIT_BODIES,
  TRANSIT_BODY_ORDER,
} from './transit-scan-shared.js';
export type { NatalPoint, TransitBody } from './transit-scan-shared';

const TRANSIT_BODY_SET = new Set<string>(TRANSIT_BODY_ORDER);

/** Convenience for callers that have an instant and already-computed angles. */
export function computeNatalTransitChart(
  utc: Date,
  angles: Pick<Angles, 'asc' | 'mc'> | null = null,
): NatalTransitChart {
  if (!Number.isFinite(utc.getTime())) throw new RangeError('Natal chart date must be valid.');
  return {
    bodies: computeBodies(utc).filter((position) =>
      TRANSIT_BODY_SET.has(position.body as TransitBody)),
    angles,
  };
}

export const { scanTransitContacts } = createTransitScanner({
  bodyLongitude,
  findLongitudeCrossings,
  longitudeSpeed,
});
