import { describe, expect, it } from 'vitest';
import { detectAspectPatterns, type PatternPoint, type PatternEdgeInput } from './aspect-patterns';
import { matchAspect } from './aspects';

const triangle = [{ body: 'Mercury', lon: 0 }, { body: 'Venus', lon: 120 }, { body: 'Mars', lon: 240 }];
const cross = [{ body: 'Mercury', lon: 0 }, { body: 'Venus', lon: 90 }, { body: 'Mars', lon: 180 }, { body: 'Jupiter', lon: 270 }];
const kite = [...triangle, { body: 'Jupiter', lon: 180 }];
const tSquare = [{ body: 'Mercury', lon: 0 }, { body: 'Venus', lon: 180 }, { body: 'Mars', lon: 90 }];
// The owning edge adapter is exercised separately from handwritten pattern expectations.
export const fixtureEdges = (points: readonly PatternPoint[]): PatternEdgeInput[] => points.flatMap((a, i) => points.slice(i + 1).flatMap((b) => {
  const match = matchAspect(a.body, a.lon, b.body, b.lon);
  return match ? [{ a: a.body, b: b.body, type: match.def.type, orb: match.orb }] : [];
}));
const patterns = (points: PatternPoint[], edges = fixtureEdges(points)) => {
  const result = detectAspectPatterns(points, edges);
  expect(result.status).toBe('ready');
  return result.status === 'ready' ? result.patterns : [];
};

describe('complete aspect pattern graphs', () => {
  it('recognizes exact triangle, square apex, opposition partitions and kite roles', () => {
    expect(patterns(triangle).map((p) => [p.kind, p.members, p.edges.length])).toEqual([['grand-trine', ['Mercury', 'Venus', 'Mars'], 3]]);
    expect(patterns(tSquare)[0]).toMatchObject({ kind: 't-square', apex: 'Mars', oppositions: [['Mercury', 'Venus']] });
    expect(patterns(cross).map((p) => p.kind)).toEqual(['grand-cross', 't-square', 't-square', 't-square', 't-square']);
    expect(patterns(cross)[0].oppositions).toEqual([['Mercury', 'Mars'], ['Venus', 'Jupiter']]);
    expect(patterns(kite).find((p) => p.kind === 'kite')).toMatchObject({ triangle: ['Mercury', 'Venus', 'Mars'], axisVertex: 'Mercury', opposedVertex: 'Jupiter' });
  });
  it.each([[triangle, 'grand-trine'], [tSquare, 't-square'], [cross, 'grand-cross'], [kite, 'kite']] as const)('requires each edge of %s', (positions, kind) => {
    const all = fixtureEdges(positions);
    for (let index = 0; index < all.length; index++) expect(patterns([...positions], all.filter((_e, i) => i !== index)).some((p) => p.kind === kind)).toBe(false);
  });
  it('returns a valid absence instead of resembling a minor-aspect figure', () => {
    expect(patterns([{ body: 'Mercury', lon: 0 }, { body: 'Venus', lon: 20 }, { body: 'Mars', lon: 45 }, { body: 'Jupiter', lon: 70 }])).toEqual([]);
  });
  it.each([['Mars', 97, 7], ['Sun', 98, 8]] as const)('keeps inclusive square limits for %s', (body, longitude, orb) => {
    const points = [{ body: 'Mercury', lon: 0 }, { body: 'Venus', lon: 180 }, { body, lon: longitude }];
    expect(patterns(points)[0].edges.filter((e) => e.type === 'square').map((e) => [e.orb, e.limit])).toEqual([[orb, orb], [orb, orb]]);
    expect(patterns(points.map((p) => p.body === body ? { ...p, lon: longitude + 1e-8 } : p))).toEqual([]);
    expect(patterns(points.map((p) => p.body === body ? { ...p, lon: longitude - 1e-8 } : p))).toHaveLength(1);
  });
  it.each([['Jupiter', 184, 4], ['Sun', 185, 5]] as const)('keeps inclusive sextile limits for %s', (body, lon, limit) => {
    const points = [...triangle, { body, lon }];
    expect(patterns(points).find((p) => p.kind === 'kite')!.edges.filter((e) => e.type === 'sextile').every((e) => e.orb === limit && e.limit === limit)).toBe(true);
    expect(patterns([...triangle, { body, lon: lon + 1e-8 }]).map((p) => p.kind)).toEqual(['grand-trine']);
  });
  it('uses wide full-graph edges beyond the main-wheel cutoff', () => {
    const points = [{ body: 'Mercury', lon: 0 }, { body: 'Venus', lon: 127 }, { body: 'Mars', lon: 240 }];
    expect(patterns(points)[0].edges.filter((e) => e.orb === 7)).toHaveLength(2);
  });
  it.each([triangle, tSquare, cross, kite].map((points) => ({ points })))('is invariant under input/pair permutation, rotation, mirror and wrap', ({ points }) => {
    const ids = patterns(points).map((p) => p.id);
    for (const [rotation, direction] of [[0, 1], [359, 1], [63.3, -1], [-720, -1]]) {
      const shifted = points.map((p) => ({ ...p, lon: p.lon * direction + rotation })).reverse();
      const edges = fixtureEdges(shifted).reverse().map((e) => ({ ...e, a: e.b, b: e.a, sourceId: `source:${e.b}:${e.a}` }));
      expect(patterns(shifted, edges).map((p) => p.id)).toEqual(ids);
      expect(patterns(shifted, edges).every((p) => p.edges.every((e) => e.sourceIds[0].startsWith('source:')))).toBe(true);
    }
  });
  it('retains distinct bodies, overlapping kites and one triangle with multiple parents', () => {
    const found = patterns([...kite, { body: 'Saturn', lon: 180 }]);
    expect(found.filter((p) => p.kind === 'grand-trine')).toHaveLength(1);
    expect(found.filter((p) => p.kind === 'kite')).toHaveLength(2);
    expect(new Set(found.map((p) => p.id)).size).toBe(3);
    expect(patterns([...triangle, { body: 'Saturn', lon: 0 }]).filter((p) => p.kind === 'grand-trine')).toHaveLength(2);
  });
  it('distinguishes malformed data, an empty admitted scope and excluded node figures', () => {
    for (const points of [[...triangle, triangle[0]], [{ body: 'Mercury', lon: NaN }], [], [{ body: 'ASC', lon: 0 }]]) expect(detectAspectPatterns(points, []).status).toBe('unavailable');
    const edges = fixtureEdges(triangle);
    for (const bad of [{ ...edges[0], orb: NaN }, { ...edges[0], type: 'square' as const }, { ...edges[0], b: 'Sun' }]) expect(detectAspectPatterns(triangle, [...edges, bad]).status).toBe('unavailable');
    expect(patterns(triangle.map((p) => p.body === 'Mars' ? { ...p, body: 'North Node' } : p))).toEqual([]);
  });
  it('accepts equivalent reversed receipts once while retaining both source IDs', () => {
    const edges = fixtureEdges(triangle);
    const duplicate = { ...edges[0], a: edges[0].b, b: edges[0].a, sourceId: 'reversed' };
    expect(patterns(triangle, [...edges, duplicate])[0].edges.find((e) => e.sourceIds.includes('reversed'))!.sourceIds).toHaveLength(2);
  });
});
