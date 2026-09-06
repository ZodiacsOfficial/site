import type { VNode } from 'preact';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { matchAspect } from '../../lib/engine/aspects';
import { buildAspectPatternModel, type AspectPatternInput } from '../../lib/aspect-pattern-model';

const hooks = vi.hoisted(() => ({ slots: [] as unknown[], cursor: 0 }));
vi.mock('preact/hooks', () => ({
  useMemo: (fn: () => unknown) => fn(),
  useState: (initial: unknown) => {
    const i = hooks.cursor++;
    if (!(i in hooks.slots)) hooks.slots[i] = initial;
    return [hooks.slots[i], (value: unknown) => { hooks.slots[i] = value; }];
  },
}));
import AspectPatternPanel, { PatternSelection } from './AspectPatternPanel';
import AspectPatternActions from './AspectPatternActions';
import { AspectPatternDiagram, patternDiagramGeometry } from './AspectPatternDiagram';

const points = [
  { body: 'Mercury', lon: 0 }, { body: 'Venus', lon: 90 },
  { body: 'Mars', lon: 180 }, { body: 'Jupiter', lon: 270 },
];
const aspects = points.flatMap((a, i) => points.slice(i + 1).flatMap((b) => {
  const m = matchAspect(a.body, a.lon, b.body, b.lon);
  return m ? [{ a: a.body, b: b.body, type: m.def.type, orb: m.orb }] : [];
}));
const input: AspectPatternInput = { context: 'natal', points, aspects, timeKnown: true, sourceKey: 'first' };
function nodes(value: unknown): VNode<Record<string, any>>[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== 'object' || !('props' in value)) return [];
  const n = value as VNode<Record<string, any>>;
  return [n, ...nodes(n.props.children)];
}
const marked = (tree: VNode<Record<string, any>>[], name: string) => tree.filter(n => Object.hasOwn(n.props, name));
const selectBody = vi.fn();
function render(current = input) {
  hooks.cursor = 0;
  return nodes(PatternSelection({ model: buildAspectPatternModel(current), onSelectBody: selectBody }));
}
beforeEach(() => { hooks.slots = []; hooks.cursor = 0; selectBody.mockClear(); });

describe('pattern selection and scope', () => {
  it('starts with the containing cross and makes all four T-squares selectable', () => {
    const tree = render();
    expect(marked(tree, 'data-pattern-title')[0].props.children).toBe('Grand cross');
    expect(tree.filter(n => n.type === 'option')).toHaveLength(5);
    expect(marked(tree, 'data-pattern-edge')).toHaveLength(6);
    const card = tree.find(n => n.type === AspectPatternActions)!.props.card;
    expect(card.pattern.kind).toBe('grand-cross');
    expect(card.pattern.edges).toHaveLength(6);
  });

  it('changes the selected image and clears an old highlighted edge when selecting an included pattern', () => {
    let tree = render();
    marked(tree, 'data-pattern-edge')[0].props.onClick();
    tree = render();
    expect(marked(tree, 'data-pattern-edge').filter(n => n.props['aria-pressed'])).toHaveLength(1);
    const included = tree.filter(n => n.type === 'option')[1].props.value;
    marked(tree, 'data-pattern-select')[0].props.onChange({ currentTarget: { value: included } });
    tree = render();
    expect(marked(tree, 'data-pattern-title')[0].props.children).toBe('T-square');
    expect(marked(tree, 'data-pattern-edge')).toHaveLength(3);
    expect(marked(tree, 'data-pattern-edge').every(n => !n.props['aria-pressed'])).toBe(true);
    expect(tree.find(n => n.type === AspectPatternActions)!.props.card.pattern.id).toBe(included);
    expect(marked(tree, 'data-pattern-parents')).toHaveLength(1);
  });

  it('uses a native member action and keeps edge selection local to the pattern diagram', () => {
    let tree = render();
    marked(tree, 'data-pattern-body')[0].props.onClick();
    expect(selectBody).toHaveBeenCalledExactlyOnceWith('Mercury');
    selectBody.mockClear();
    const edge = marked(tree, 'data-pattern-edge')[0];
    edge.props.onClick(); tree = render();
    expect(selectBody).not.toHaveBeenCalled();
    expect(tree.find(n => n.type === AspectPatternDiagram)!.props.selectedEdge).toBe(edge.props['data-pattern-edge']);
    expect(marked(tree, 'data-pattern-announcement')[0].props.role).toBe('status');
  });

  it.each(['natal', 'composite'] as const)('withholds reading and export for unknown %s time while preserving non-Moon geometry', context => {
    const tree = render({ ...input, context, timeKnown: false });
    expect(marked(tree, 'data-pattern-title')).toHaveLength(1);
    expect(marked(tree, 'data-pattern-withheld')).toHaveLength(1);
    expect(marked(tree, 'data-pattern-reading')).toHaveLength(0);
    expect(tree.find(n => n.type === AspectPatternActions)).toBeUndefined();
  });

  it('distinguishes unavailable input from an honest absence and renders neither a reading nor export', () => {
    for (const current of [{ ...input, points: [{ body: 'Sun', lon: NaN }] }, { ...input, points: [points[0]], aspects: [] }]) {
      hooks.slots = [];
      const tree = render(current);
      expect(marked(tree, Number.isNaN(current.points[0].lon) ? 'data-pattern-unavailable' : 'data-pattern-absence')).toHaveLength(1);
      expect(marked(tree, 'data-pattern-reading')).toHaveLength(0);
      expect(tree.find(n => n.type === AspectPatternActions)).toBeUndefined();
    }
  });

  it('replaces selection state at a new completed-source boundary even with identical geometry', () => {
    const a = AspectPatternPanel({ ...input, onSelectBody: selectBody });
    const b = AspectPatternPanel({ ...input, sourceKey: 'second', onSelectBody: selectBody });
    expect(a.key).not.toBe(b.key);
  });
});

describe('true-position diagram', () => {
  it('fans crowded labels while retaining exact longitude chord coordinates', () => {
    const marks = patternDiagramGeometry([{ body: 'Mercury', lon: 0 }, { body: 'Venus', lon: 1 }]);
    expect(marks[0].x).toBe(60); expect(marks[0].y).toBe(200);
    expect(marks[1].x).toBeCloseTo(200 - 140 * Math.cos(Math.PI / 180), 12);
    expect(marks[1].y).toBeCloseTo(200 + 140 * Math.sin(Math.PI / 180), 12);
    expect(marks.some(p => Math.abs(Math.hypot(p.labelX - 200, p.labelY - 200) - 164) < 1e-9)).toBe(true);
    expect(marks[0].labelY).not.toBe(200);
  });

  it('renders all six required cross edges and exposes their receipt keys without extra tab stops', () => {
    const model = buildAspectPatternModel(input);
    if (model.detection.status !== 'ready') throw new Error('Fixture invalid');
    const pattern = model.roots[0], selectedEdge = pattern.edges[0].key;
    const tree = nodes(AspectPatternDiagram({ pattern, points: model.detection.points, selectedEdge }));
    expect(tree[0].props['aria-hidden']).toBe('true');
    expect(tree[0].props.focusable).toBe('false');
    const chords = marked(tree, 'data-pattern-chord');
    expect(chords).toHaveLength(6);
    expect(chords.filter(n => n.props['data-selected'] === 'true')).toHaveLength(1);
    expect(chords.every(n => [n.props.x1, n.props.x2, n.props.y1, n.props.y2].every(Number.isFinite))).toBe(true);
  });
});
