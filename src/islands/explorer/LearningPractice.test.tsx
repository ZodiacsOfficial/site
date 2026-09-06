import type { VNode } from 'preact';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const h = vi.hoisted(() => ({ slots: [] as any[], cursor: 0, effects: [] as any[], pending: [] as (() => void)[],
  sourceCurrent: true, access: { current: 0 }, reset: 0, actions: [] as any[], queue: [] as any[],
  sources: [{ id: 'saved-id', identity: 'private-input' }] }));
vi.mock('preact/hooks', () => ({
  useRef: (value: unknown) => { const i = h.cursor++; if (!(i in h.slots)) h.slots[i] = { current: value }; return h.slots[i]; },
  useState: (value: unknown) => { const i = h.cursor++; if (!(i in h.slots)) h.slots[i] = value; return [h.slots[i], (next: unknown) => { h.slots[i] = next; }]; },
  useMemo: (fn: () => unknown, deps: unknown[]) => { const i = h.cursor++; const old = h.slots[i];
    if (!old || deps.some((v, n) => v !== old.deps[n])) h.slots[i] = { deps, value: fn() }; return h.slots[i].value; },
  useLayoutEffect: (fn: () => void | (() => void), deps: unknown[]) => { const i = h.cursor++; const old = h.effects[i];
    if (!old || deps.some((v, n) => v !== old.deps[n])) { old?.cleanup?.(); h.pending.push(() => { h.effects[i] = { deps, cleanup: fn() }; }); } },
}));
vi.mock('../../lib/learning-source', () => ({ learningSourceCurrent: () => h.sourceCurrent }));
vi.mock('../../lib/use-learning-sources', () => ({ useLearningSources: () => ({ sources: h.sources, accessGeneration: h.access }) }));
vi.mock('../../lib/use-learning-progress', () => ({ useLearningProgress: () => ({
  progress: { started: [], completed: [], pageOnly: false }, resetRevision: h.reset,
  act: (action: unknown, guard: () => boolean) => new Promise<boolean>((resolve) => h.queue.push(() => {
    const accepted = guard(); if (accepted) h.actions.push(action); resolve(accepted);
  })),
}) }));
import LearningPractice from './LearningPractice';
let revision: number;
let props: Parameters<typeof LearningPractice>[0];
function nodes(value: any): VNode<any>[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  return value && typeof value === 'object' && 'props' in value ? [value, ...nodes(value.props.children)] : [];
}
function render() { h.cursor = 0; const view = LearningPractice(props); h.pending.splice(0).forEach((f) => f()); return view; }
const all = () => nodes(render());
function button(text: string) { const result = all().find((node) => node.type === 'button' && node.props.children === text); if (!result) throw new Error(`Missing ${text}`); return result; }
function radio(value: string) { return all().find((node) => node.type === 'input' && node.props.type === 'radio' && node.props.value === value)!; }
async function settle() { h.queue.splice(0).forEach((f) => f()); for (let i = 0; i < 5; i++) await Promise.resolve(); }
async function begin() { button('Begin this exercise').props.onClick(); await settle(); }
async function answerCorrect() {
  await begin(); radio('Aries').props.onChange(); button('Check my answer').props.onClick();
  all().find((node) => node.type === 'input' && node.props.type === 'checkbox')!.props.onChange({ currentTarget: { checked: true } });
}
beforeEach(() => {
  h.slots = []; h.effects = []; h.pending = []; h.actions = []; h.queue = []; h.sourceCurrent = true; h.access.current = 0; h.reset = 0;
  revision = 1;
  props = { source: { id: 'saved-id', identity: 'private-input', run: 1, inputRevision: 1, isCurrent: (_, value) => value === revision },
    placements: [{ body: 'Sun', lon: 15, house: 3 }], topAspects: [], timeKnown: true, risingLon: 90, housesKnown: true,
    effectiveHouseSystem: 'whole', requestedHouseSystem: null, polarFallback: false, onShow: vi.fn() };
  render();
});
describe('private practice interaction lifetime', () => {
  it('rendering starts nothing; a correct answer still requires separate reflection and completion', async () => {
    expect(h.actions).toEqual([]); await answerCorrect(); expect(h.actions).toEqual([{ type: 'start', id: 'big-three' }]);
    button('Mark this lesson complete').props.onClick(); await settle();
    expect(h.actions.at(-1)).toEqual({ type: 'complete', id: 'big-three' });
  });
  it('an incorrect answer never exposes completion', async () => {
    await begin(); radio('Taurus').props.onChange(); button('Check my answer').props.onClick();
    expect(all().some((node) => node.props.children === 'Mark this lesson complete')).toBe(false);
  });
  it.each(['input', 'access', 'source'])('rejects retained handlers synchronously on %s invalidation', async (boundary) => {
    await answerCorrect(); const show = button('Show on chart').props.onClick; const complete = button('Mark this lesson complete').props.onClick;
    if (boundary === 'input') revision = 2;
    if (boundary === 'access') h.access.current += 1;
    if (boundary === 'source') h.sourceCurrent = false;
    show(); complete(); await settle(); expect(props.onShow).not.toHaveBeenCalled(); expect(h.actions).toHaveLength(1);
  });
  it('does not commit a queued completion after the answer or reflection changes', async () => {
    await answerCorrect(); button('Mark this lesson complete').props.onClick(); radio('Taurus').props.onChange();
    await settle(); expect(h.actions).toHaveLength(1);
  });
  it('changing the exercise cancels a pending start', async () => {
    button('Begin this exercise').props.onClick(); all().find((node) => node.type === 'select')!.props.onChange({ currentTarget: { value: 'aspects' } });
    await settle(); expect(h.actions).toEqual([]);
  });
  it('same-document restart and identical recompute clear prior attempt controls', async () => {
    await answerCorrect(); h.reset += 1; render(); expect(button('Begin this exercise')).toBeDefined();
    await answerCorrect(); revision = 2; props.source = { ...props.source, run: 2, inputRevision: 2 }; render();
    expect(button('Begin this exercise')).toBeDefined();
  });
  it('unmount rejects an already queued completion', async () => {
    await answerCorrect(); button('Mark this lesson complete').props.onClick(); h.effects.forEach((effect) => effect?.cleanup?.());
    await settle(); expect(h.actions).toHaveLength(1);
  });
});
