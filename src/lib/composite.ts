import { ASPECT_BODIES, matchAspect } from './engine/aspects';
import type { AspectType, BodyName } from './engine/types';

export interface CompositePoint { body: BodyName; lon: number }
export interface CompositeAspect { a: BodyName; b: BodyName; type: AspectType; orb: number }

function norm(lon: number): number {
  return ((lon % 360) + 360) % 360;
}

/**
 * Shorter-arc midpoints of the bodies present in BOTH charts, in chart-a
 * order. Exact opposites (180.000° apart) take the midpoint of the arc
 * running eastward (increasing longitude) from a's position — a documented
 * convention, asserted in tests.
 */
export function compositeMidpoints(
  a: readonly { body: BodyName; lon: number }[],
  b: readonly { body: BodyName; lon: number }[],
): CompositePoint[] {
  const bByBody = new Map(b.map((point) => [point.body, point.lon]));
  const points: CompositePoint[] = [];

  for (const point of a) {
    const otherLon = bByBody.get(point.body);
    if (otherLon === undefined) continue;

    const eastward = norm(otherLon - point.lon);
    const midpoint = eastward <= 180
      ? point.lon + eastward / 2
      : point.lon - (360 - eastward) / 2;
    points.push({ body: point.body, lon: norm(midpoint) });
  }

  return points;
}

/**
 * Aspects between composite points via the natal aspect definitions.
 * No applying/separating — composite points have no speeds.
 */
export function compositeAspects(points: readonly CompositePoint[]): CompositeAspect[] {
  const list = points.filter((point) => ASPECT_BODIES.has(point.body));
  const out: CompositeAspect[] = [];

  for (let i = 0; i < list.length; i += 1) {
    for (let j = i + 1; j < list.length; j += 1) {
      const A = list[i];
      const B = list[j];
      const best = matchAspect(A.body, A.lon, B.body, B.lon);
      if (!best) continue;
      out.push({ a: A.body, b: B.body, type: best.def.type, orb: best.orb });
    }
  }

  return out.sort((x, y) => x.orb - y.orb);
}
