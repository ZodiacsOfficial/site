import type { SavedChart } from '../profile/schema';
import { signForLongitude } from '../signs';
import type { BodyName } from '../engine/types';
import {
  POSITION_BODY_ORDER,
  decodePositionsLink,
  encodePositionsLink,
} from '../share-positions';
import { isAccountChartLabel } from './chart-label';

export interface SelfChartPutWire {
  deviceId: string;
  chartId: string;
  baseRevision: number;
  mutationId: string;
  label: string;
  subjectKind: 'self';
  selfAttestation: true;
  birth: SavedChart['birth'];
  derived: {
    positions: {
      b: number[];
      a?: [number, number];
      h: 'w' | 'p';
      v: string;
    };
    timeKnown: boolean;
    sunSign: string;
    engineVersion: string;
    houseSystem: 'whole' | 'placidus';
  };
}

/**
 * Builds the sole browser upload shape. The positions codec acts as a strict
 * canonicalizer; invalid/stale summaries never reach the account API.
 */
export function selfChartPutWire(
  chart: SavedChart,
  deviceId: string,
  mutationId: string,
  baseRevision: number,
): SelfChartPutWire | null {
  if (!Number.isSafeInteger(baseRevision)
    || baseRevision < 0
    || !isAccountChartLabel(chart.name)) return null;
  const bodies: Array<{ body: BodyName; lon: number }> = [];
  for (const body of chart.summary.bodies) {
    if (!POSITION_BODY_ORDER.includes(body.body as BodyName)) return null;
    bodies.push({ body: body.body as BodyName, lon: body.lon });
  }
  const token = encodePositionsLink({
    bodies,
    angles: chart.summary.angles,
    houseSystem: chart.summary.houseSystem,
    engineVersion: chart.summary.engineVersion,
  });
  const canonical = token ? decodePositionsLink(token) : null;
  if (!canonical) return null;
  if (Boolean(canonical.angles) !== chart.birth.timeKnown) return null;

  const sun = canonical.bodies.find((body) => body.body === 'Sun');
  if (!sun) return null;
  const positions: SelfChartPutWire['derived']['positions'] = {
    b: canonical.bodies.map((body) => body.lon),
    h: canonical.houseSystem === 'whole' ? 'w' : 'p',
    v: canonical.engineVersion,
  };
  if (canonical.angles) positions.a = [canonical.angles.asc, canonical.angles.mc];

  return {
    deviceId,
    chartId: chart.id,
    baseRevision,
    mutationId,
    label: chart.name,
    subjectKind: 'self',
    selfAttestation: true,
    birth: structuredClone(chart.birth),
    derived: {
      positions,
      timeKnown: chart.birth.timeKnown,
      sunSign: signForLongitude(sun.lon).slug,
      engineVersion: canonical.engineVersion,
      houseSystem: canonical.houseSystem,
    },
  };
}
