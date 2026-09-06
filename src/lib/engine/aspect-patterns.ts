/** Pure all-match graph detection. Positions and edges belong to the caller. */
import { matchAspect, ASPECTS } from './aspects';
import type { AspectType } from './types';

export const PATTERN_BODIES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'] as const;
export type PatternBody = typeof PATTERN_BODIES[number];
export type PatternKind = 'grand-trine' | 't-square' | 'grand-cross' | 'kite';
export interface PatternPoint { body: string; lon: number }
export interface PatternEdgeInput { a: string; b: string; type: AspectType; orb: number; sourceId?: string }
export interface PatternEdge { a: PatternBody; b: PatternBody; type: AspectType; orb: number; limit: number; key: string; sourceIds: readonly string[] }
export interface AspectPattern {
  id: string;
  kind: PatternKind;
  members: readonly PatternBody[];
  edges: readonly PatternEdge[];
  /** Canonical structural roles; none imply a privileged drawing direction. */
  oppositions: readonly (readonly [PatternBody, PatternBody])[];
  apex?: PatternBody;
  triangle?: readonly PatternBody[];
  axisVertex?: PatternBody;
  opposedVertex?: PatternBody;
}
export type PatternDetection =
  | { status: 'ready'; points: readonly { body: PatternBody; lon: number }[]; patterns: readonly AspectPattern[] }
  | { status: 'unavailable'; reason: string };

const rank = (body: string) => PATTERN_BODIES.indexOf(body as PatternBody);
const ordered = (bodies: readonly PatternBody[]) => [...bodies].sort((a, b) => rank(a) - rank(b));
const pair = (a: PatternBody, b: PatternBody): [PatternBody, PatternBody] => rank(a) < rank(b) ? [a, b] : [b, a];
const pairKey = (a: PatternBody, b: PatternBody) => pair(a, b).join('|');
export const patternEdgeKey = (a: PatternBody, b: PatternBody, type: AspectType) => `${pairKey(a, b)}|${type}`;
const normalize = (lon: number) => ((lon % 360) + 360) % 360;
const unavailable = (reason: string): PatternDetection => ({ status: 'unavailable', reason });

/**
 * Reuse the owning inclusive aspect thresholds without rounding or scene cuts.
 * Missing edges are not inferred: each complete required graph must be present.
 * Static geometry validates supplied records; speeds/applying state are irrelevant.
 */
export function detectAspectPatterns(points: readonly PatternPoint[], aspects: readonly PatternEdgeInput[]): PatternDetection {
  const seen = new Set<string>();
  for (const point of points) {
    if (!point.body || seen.has(point.body) || !Number.isFinite(point.lon)) return unavailable('Invalid or duplicate body positions.');
    seen.add(point.body);
  }
  const admitted = points.filter((p): p is { body: PatternBody; lon: number } => rank(p.body) >= 0)
    .map((p) => ({ body: p.body, lon: normalize(p.lon) })).sort((a, b) => rank(a.body) - rank(b.body));
  if (!admitted.length) return unavailable('No eligible body positions.');
  const byBody = new Map(admitted.map((p) => [p.body, p.lon]));
  const graph = new Map<string, PatternEdge>();
  for (const aspect of aspects) {
    if (!Number.isFinite(aspect.orb) || aspect.orb < 0 || !ASPECTS.some((d) => d.type === aspect.type)) return unavailable('Invalid aspect data.');
    if (rank(aspect.a) < 0 || rank(aspect.b) < 0) continue;
    const a = aspect.a as PatternBody, b = aspect.b as PatternBody;
    if (a === b || !byBody.has(a) || !byBody.has(b)) return unavailable('An aspect has missing or repeated members.');
    const match = matchAspect(a, byBody.get(a)!, b, byBody.get(b)!);
    // Tolerance only compares the supplied receipt with recomputed floating point
    // arithmetic. Admission itself is the unchanged owning matchAspect result.
    if (!match || match.def.type !== aspect.type || Math.abs(match.orb - aspect.orb) > 1e-9) return unavailable('Aspect records disagree with the positions.');
    const key = pairKey(a, b);
    const previous = graph.get(key);
    const sourceId = aspect.sourceId ?? `aspect:${aspect.a}-${aspect.type}-${aspect.b}`;
    if (previous) {
      if (previous.type !== aspect.type || previous.orb !== aspect.orb) return unavailable('Contradictory duplicate aspect records.');
      previous.sourceIds = [...new Set([...previous.sourceIds, sourceId])].sort();
    } else {
      const [first, second] = pair(a, b);
      graph.set(key, { a: first, b: second, type: aspect.type, orb: aspect.orb,
        limit: a === 'Sun' || a === 'Moon' || b === 'Sun' || b === 'Moon' ? match.def.orbLuminary : match.def.orb,
        key: patternEdgeKey(a, b, aspect.type), sourceIds: [sourceId] });
    }
  }
  const edge = (a: PatternBody, b: PatternBody, type: AspectType) => {
    const found = graph.get(pairKey(a, b));
    return found?.type === type ? found : undefined;
  };
  const patterns = new Map<string, AspectPattern>();
  function add(kind: PatternKind, members: PatternBody[], required: (PatternEdge | undefined)[], roles: Partial<AspectPattern> = {}) {
    if (required.some((e) => !e)) return;
    const sorted = ordered(members);
    const oppositions = required.filter((e): e is PatternEdge => e?.type === 'opposition')
      .map((e) => pair(e.a, e.b)).sort((a, b) => rank(a[0]) - rank(b[0]) || rank(a[1]) - rank(b[1]));
    const suffix = kind === 't-square' ? `apex:${roles.apex}`
      : kind === 'grand-cross' ? `oppositions:${oppositions.map((p) => p.join(',')).join(';')}`
        : kind === 'kite' ? `triangle:${roles.triangle?.join(',')};axis:${roles.axisVertex};opposed:${roles.opposedVertex}` : '';
    const id = `${kind}:${sorted.join(',')}${suffix ? `:${suffix}` : ''}`;
    patterns.set(id, { id, kind, members: sorted, edges: (required as PatternEdge[]).sort((a, b) => a.key.localeCompare(b.key)), oppositions, ...roles });
  }
  const bodies = admitted.map((p) => p.body);
  for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) for (let k = j + 1; k < bodies.length; k++) {
    const triangle = [bodies[i], bodies[j], bodies[k]];
    const [a, b, c] = triangle;
    const trines = [edge(a, b, 'trine'), edge(a, c, 'trine'), edge(b, c, 'trine')];
    add('grand-trine', triangle, trines);
    for (const apex of triangle) {
      const [left, right] = triangle.filter((body) => body !== apex);
      add('t-square', triangle, [edge(left, right, 'opposition'), edge(left, apex, 'square'), edge(right, apex, 'square')], { apex });
    }
    if (trines.every(Boolean)) for (const axisVertex of triangle) for (const opposedVertex of bodies.filter((body) => !triangle.includes(body))) {
      const others = triangle.filter((body) => body !== axisVertex);
      add('kite', [...triangle, opposedVertex], [...trines, edge(axisVertex, opposedVertex, 'opposition'), ...others.map((body) => edge(body, opposedVertex, 'sextile'))],
        { triangle, axisVertex, opposedVertex });
    }
    for (let l = k + 1; l < bodies.length; l++) {
      const d = bodies[l];
      for (const opposite of [b, c, d]) {
        const [left, right] = [b, c, d].filter((body) => body !== opposite);
        add('grand-cross', [a, b, c, d], [edge(a, opposite, 'opposition'), edge(left, right, 'opposition'),
          edge(a, left, 'square'), edge(a, right, 'square'), edge(opposite, left, 'square'), edge(opposite, right, 'square')]);
      }
    }
  }
  return { status: 'ready', points: admitted, patterns: [...patterns.values()].sort((a, b) => a.id.localeCompare(b.id)) };
}
