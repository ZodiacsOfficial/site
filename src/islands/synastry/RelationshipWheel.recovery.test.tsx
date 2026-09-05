import type { VNode } from 'preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => ({
  slots: [] as unknown[], cursor: 0,
  effects: [] as Array<{ dependencies: unknown[]; cleanup?: () => void }>,
  effectCursor: 0, pending: [] as Array<() => void>,
  writes: vi.fn(), importSphere: vi.fn(),
}));

vi.mock('preact/hooks', () => ({
  useState: (initial: unknown) => {
    const slot = harness.cursor++;
    if (!(slot in harness.slots)) harness.slots[slot] = initial;
    return [harness.slots[slot], (next: unknown) => {
      harness.writes(slot, next);
      harness.slots[slot] = typeof next === 'function' ? next(harness.slots[slot]) : next;
    }];
  },
  useRef: (initial: unknown) => {
    const slot = harness.cursor++;
    if (!(slot in harness.slots)) harness.slots[slot] = { current: initial };
    return harness.slots[slot];
  },
  useMemo: (compute: () => unknown) => compute(),
  useEffect: (effect: () => void | (() => void), dependencies: unknown[]) => {
    const index = harness.effectCursor++;
    const previous = harness.effects[index];
    if (previous && dependencies.every((value, i) => Object.is(value, previous.dependencies[i]))) return;
    harness.pending.push(() => {
      previous?.cleanup?.();
      const cleanup = effect();
      harness.effects[index] = { dependencies, cleanup: typeof cleanup === 'function' ? cleanup : undefined };
    });
  },
}));
vi.mock('../../lib/module-load', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/module-load')>();
  return { ...actual, loadModule: () => actual.loadModule(harness.importSphere) };
});

import RelationshipWheel, { type WheelPerson } from './RelationshipWheel';
import CalculationReload, { calculationLoadMessage } from '../CalculationReload';
import { summarizePair } from '../../lib/engine/synastry';

const a: WheelPerson = {
  label: 'Chart A', bodies: [{ body: 'Sun', lon: 90 }, { body: 'Moon', lon: 30 }],
  asc: null, mc: null, cusps: null, timeKnown: false,
};
const b: WheelPerson = { ...a, label: 'Chart B', bodies: [{ body: 'Sun', lon: 180 }, { body: 'Moon', lon: 20 }] };
const sphere = { default: () => null };
function render() {
  harness.cursor = 0;
  harness.effectCursor = 0;
  const view = RelationshipWheel({ locale: 'en', a, b, summary: summarizePair(a.bodies, b.bodies) });
  harness.pending.splice(0).forEach((effect) => effect());
  return view;
}
function nodes(value: unknown): VNode<Record<string, any>>[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== 'object' || !('props' in value)) return [];
  const node = value as VNode<Record<string, any>>;
  return [node, ...nodes(node.props.children)];
}
function choose(tab: string) {
  nodes(render()).find((node) => node.props['data-relationship-tab'] === tab)!.props.onClick();
  return render();
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };
beforeEach(() => {
  harness.slots = []; harness.cursor = 0;
  harness.effects = []; harness.effectCursor = 0; harness.pending = [];
  harness.writes.mockClear(); harness.importSphere.mockReset();
});
afterEach(() => harness.effects.forEach((effect) => effect.cleanup?.()));

describe('relationship 3D download recovery', () => {
  it('leaves 2D views available, explains a failed 3D download and retries on request', async () => {
    harness.importSphere.mockRejectedValueOnce(new TypeError('offline')).mockResolvedValue(sphere);
    render();
    expect(harness.importSphere).not.toHaveBeenCalled();
    choose('depth');
    await flush();
    const failed = nodes(render());
    expect(failed.find((node) => node.props.role === 'alert')?.props.children).toBe(calculationLoadMessage('en'));
    expect(failed.find((node) => node.type === CalculationReload)?.props.error).toBe(calculationLoadMessage('en'));
    expect(failed.filter((node) => node.props.role === 'tab')).toHaveLength(4);
    failed.find((node) => node.type === 'button' && node.props.children === 'Try again')!.props.onClick();
    render();
    await flush();
    expect(nodes(render()).some((node) => node.type === sphere.default)).toBe(true);
    expect(harness.importSphere).toHaveBeenCalledTimes(2);
  });

  it.each(['tab change', 'unmount'])('ignores a late rejection after %s', async (leave) => {
    let reject!: (cause: Error) => void;
    harness.importSphere.mockReturnValue(new Promise((_resolve, fail) => { reject = fail; }));
    choose('depth');
    if (leave === 'tab change') choose('wheel');
    else harness.effects.forEach((effect) => effect.cleanup?.());
    const writes = harness.writes.mock.calls.length;
    reject(new Error('late network failure'));
    await flush();
    expect(harness.writes).toHaveBeenCalledTimes(writes);
  });
});
