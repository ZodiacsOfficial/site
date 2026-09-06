import { describe, expect, it } from 'vitest';
import { buildAspectPatternModel, patternContainment, selectedPatternCard } from './aspect-pattern-model';
import { matchAspect } from './engine/aspects';
import type { PatternPoint, PatternEdgeInput } from './engine/aspect-patterns';
const edges = (points: PatternPoint[]): PatternEdgeInput[] => points.flatMap((a, i) => points.slice(i + 1).flatMap((b) => {
  const match = matchAspect(a.body, a.lon, b.body, b.lon);
  return match ? [{ a: a.body, b: b.body, type: match.def.type, orb: match.orb }] : [];
}));
const positions = [{ body: 'Mercury', lon: 0 }, { body: 'Venus', lon: 90 }, { body: 'Mars', lon: 180 }, { body: 'Jupiter', lon: 270 }];
const input = { context: 'natal' as const, points: positions, aspects: edges(positions), timeKnown: true, sourceKey: 'completed-1' };

describe('pattern scope, containment and share ownership', () => {
  it('presents a cross once and all four included T-squares separately', () => {
    const model = buildAspectPatternModel(input);
    expect(model.roots.map((p) => p.kind)).toEqual(['grand-cross']);
    expect(model.included[model.roots[0].id].map((p) => p.kind)).toEqual(['t-square', 't-square', 't-square', 't-square']);
  });
  it('preserves multiple containment parents and requires edges as well as members', () => {
    const points = [{ body: 'Mercury', lon: 0 }, { body: 'Venus', lon: 120 }, { body: 'Mars', lon: 240 }, { body: 'Jupiter', lon: 180 }, { body: 'Saturn', lon: 180 }];
    const model = buildAspectPatternModel({ ...input, points, aspects: edges(points) });
    expect(model.roots.map((p) => p.kind)).toEqual(['kite', 'kite']);
    expect(model.roots.map((p) => model.included[p.id][0].id)[0]).toBe(model.roots.map((p) => model.included[p.id][0].id)[1]);
    const outer = model.roots[0], inner = model.included[outer.id][0];
    expect(patternContainment([outer, { ...inner, edges: [{ ...inner.edges[0], key: 'different-edge' }] }]).roots).toHaveLength(2);
  });
  it.each(['natal', 'composite'] as const)('withholds Moon geometry and all readings/export at unknown %s times', (context) => {
    const points = [{ body: 'Moon', lon: 0 }, { body: 'Venus', lon: 120 }, { body: 'Mars', lon: 240 }];
    const timed = buildAspectPatternModel({ ...input, context, points, aspects: edges(points) });
    expect(timed.roots).toHaveLength(1);
    const unknown = buildAspectPatternModel({ ...input, context, points, aspects: edges(points), timeKnown: false });
    expect(unknown.roots).toHaveLength(0);
    expect(unknown.scope).toContain('Moon excluded');
    expect(unknown.absence).toContain('reference positions');
    const referenceCross = buildAspectPatternModel({ ...input, context, timeKnown: false });
    expect(referenceCross.roots).toHaveLength(1);
    expect(selectedPatternCard(referenceCross, referenceCross.roots[0].id)).toBeNull();
  });
  it('keeps source changes distinct even when geometry is identical and snapshots the selected graph', () => {
    const model = buildAspectPatternModel(input);
    const first = selectedPatternCard(model, model.roots[0].id)!;
    const next = buildAspectPatternModel({ ...input, sourceKey: 'completed-2' });
    expect(selectedPatternCard(next, next.roots[0].id)!.identity).not.toBe(first.identity);
    expect(first.pattern.edges).toHaveLength(6);
    expect(first.receipt).toHaveLength(6);
    expect(Object.isFrozen(first.pattern.edges[0])).toBe(true);
    expect(first.pattern).not.toBe(model.roots[0]);
    expect(selectedPatternCard(model, model.included[model.roots[0].id][0].id)!.identity).not.toBe(first.identity);
  });
  it('has distinct natal and composite reflection without inferring an element or modality', () => {
    const natal = buildAspectPatternModel(input), composite = buildAspectPatternModel({ ...input, context: 'composite' });
    const natalCard = selectedPatternCard(natal, natal.roots[0].id)!, compositeCard = selectedPatternCard(composite, composite.roots[0].id)!;
    expect(natalCard.reading).toContain('Mercury opposite Mars');
    expect(compositeCard.reading).toContain('shared priorities');
    expect(natalCard.reading).not.toBe(compositeCard.reading);
    expect(natalCard.reading).not.toMatch(/fire|earth|cardinal|fixed|mutable/u);
  });
});
