import type { VNode } from 'preact';
import type { Profile, SavedChart } from '../../lib/profile/schema';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => ({
  profile: { profile: {} as Profile, ready: false },
  slots: [] as unknown[],
  cursor: 0,
  memos: [] as Array<{ dependencies: unknown[]; value: unknown }>,
  memoCursor: 0,
  effects: [] as Array<{ dependencies: unknown[]; cleanup?: () => void }>,
  effectCursor: 0,
  pending: [] as Array<() => void>,
  writes: vi.fn(),
  load: vi.fn(),
  track: vi.fn(),
  savedHint: false,
}));

vi.mock('../../lib/hooks/useProfile', () => ({ useProfile: () => harness.profile }));
vi.mock('preact/hooks', () => ({
  useState: (initial: unknown) => {
    const slot = harness.cursor++;
    if (!(slot in harness.slots)) harness.slots[slot] = initial;
    return [harness.slots[slot], (value: unknown) => {
      harness.writes(slot, value);
      harness.slots[slot] = typeof value === 'function' ? value(harness.slots[slot]) : value;
    }];
  },
  useMemo: (compute: () => unknown, dependencies: unknown[]) => {
    const index = harness.memoCursor++;
    const prior = harness.memos[index];
    if (prior && dependencies.length === prior.dependencies.length
      && dependencies.every((value, i) => Object.is(value, prior.dependencies[i]))) return prior.value;
    const value = compute();
    harness.memos[index] = { dependencies, value };
    return value;
  },
  useEffect: (effect: () => void | (() => void), dependencies: unknown[]) => {
    const index = harness.effectCursor++;
    const prior = harness.effects[index];
    if (prior && dependencies.length === prior.dependencies.length
      && dependencies.every((value, i) => Object.is(value, prior.dependencies[i]))) return;
    harness.pending.push(() => {
      prior?.cleanup?.();
      const cleanup = effect();
      harness.effects[index] = { dependencies, cleanup: typeof cleanup === 'function' ? cleanup : undefined };
    });
  },
}));

type TodayBriefComponent = typeof import('./TodayBrief')['default'];
let TodayBrief: TodayBriefComponent;

const moduleValue = {
  TRANSIT_ORB: 3,
  transitLine: () => 'Fixture contact reading.',
  contactReceipt: () => 'Fixture contact receipt.',
};
const readings = Object.fromEntries([
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
].map((sign) => [sign, { text: `${sign} edition note.`, receipt: 'Fixture receipt.' }]));

function chart(id: string): SavedChart {
  return {
    id,
    name: `Chart ${id}`,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    birth: { date: '1990-01-01', time: '12:00', timeKnown: true, place: null },
    summary: {
      engineVersion: 'fixture', utcISO: '1990-01-01T12:00:00.000Z', houseSystem: 'whole',
      bodies: [{ body: 'Sun', lon: id === 'A' ? 100 : 200, retrograde: false }],
      angles: null, flags: [],
    },
  };
}

function profile(charts: SavedChart[], ready = true) {
  harness.profile = {
    profile: { version: 1, settings: { houseSystem: 'whole' }, charts },
    ready,
  };
}

function render() {
  harness.cursor = 0;
  harness.memoCursor = 0;
  harness.effectCursor = 0;
  const view = TodayBrief({ sunSignReadings: readings, generatorVersion: 'fixture' });
  harness.pending.splice(0).forEach((effect) => effect());
  return view;
}

function nodes(value: unknown): VNode<Record<string, any>>[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== 'object' || !('props' in value)) return [];
  const node = value as VNode<Record<string, any>>;
  return [node, ...nodes(node.props.children)];
}

function comparisonUnavailable(view: unknown): boolean {
  const fallback = nodes(view).find((node) => 'comparisonUnavailable' in node.props);
  return fallback?.props.comparisonUnavailable === true;
}

function deferredLoad() {
  let resolve!: (value: typeof moduleValue) => void;
  let reject!: (cause: Error) => void;
  harness.load.mockReturnValue(new Promise<typeof moduleValue>((done, fail) => {
    resolve = done;
    reject = fail;
  }));
  return { resolve: () => resolve(moduleValue), reject: () => reject(new Error('offline')) };
}

async function started() {
  await vi.waitFor(() => expect(harness.load).toHaveBeenCalledOnce());
}

beforeEach(async () => {
  vi.resetModules();
  harness.slots = [];
  harness.cursor = 0;
  harness.memos = [];
  harness.memoCursor = 0;
  harness.effects = [];
  harness.effectCursor = 0;
  harness.pending = [];
  harness.savedHint = false;
  harness.writes.mockClear();
  harness.load.mockReset().mockResolvedValue(moduleValue);
  harness.track.mockClear();
  profile([], false);
  const stored = new Map<string, string>();
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => stored.set(key, value),
    },
    zodiacsAnalytics: { track: harness.track },
  });
  vi.stubGlobal('document', {
    documentElement: { hasAttribute: (name: string) => name === 'data-today-saved-chart' && harness.savedHint },
  });
  vi.doMock('../../lib/transits', () => harness.load());
  TodayBrief = (await import('./TodayBrief')).default;
});

afterEach(() => {
  harness.effects.forEach((effect) => effect.cleanup?.());
  vi.doUnmock('../../lib/transits');
  vi.unstubAllGlobals();
});

describe('Today saved-chart transit loading', () => {
  it('keeps transit code unloaded for an empty profile while recording the visit once', async () => {
    render();
    profile([]);
    const view = render();
    render();
    await vi.dynamicImportSettled();
    expect(harness.load).not.toHaveBeenCalled();
    expect(view.props['data-today-state']).toBe('empty');
    expect(comparisonUnavailable(view)).toBe(false);
    expect(harness.track).toHaveBeenCalledExactlyOnceWith('today_view', {});
    const streak = JSON.parse(window.localStorage.getItem('zodiacs.today.v1')!);
    expect(streak.count).toBe(1);
  });

  it('waits for profile readiness even when a chart is already present', async () => {
    profile([chart('A')], false);
    render();
    await vi.dynamicImportSettled();
    expect(harness.load).not.toHaveBeenCalled();
    profile([chart('A')]);
    render();
    await vi.dynamicImportSettled();
    expect(harness.load).toHaveBeenCalledOnce();
    expect(render().props['data-today-state']).toBe('chart');
  });

  it('starts personalization when a saved chart arrives after an empty first render', async () => {
    profile([]);
    render();
    await vi.dynamicImportSettled();
    expect(harness.load).not.toHaveBeenCalled();
    profile([chart('A')]);
    render();
    await vi.dynamicImportSettled();
    const view = render();
    expect(view.props['data-today-state']).toBe('chart');
    expect(nodes(view).some((node) => node.props['aria-label'] === 'For Chart A')).toBe(true);
    expect(harness.track).toHaveBeenCalledOnce();
  });

  it('reuses the pending module when the selected chart changes from A to B', async () => {
    const pending = deferredLoad();
    profile([chart('A')]);
    render();
    await started();
    profile([chart('B')]);
    render();
    pending.resolve();
    await vi.dynamicImportSettled();
    const view = render();
    expect(harness.load).toHaveBeenCalledOnce();
    expect(view.props['data-today-state']).toBe('chart');
    expect(nodes(view).some((node) => node.props['aria-label'] === 'For Chart B')).toBe(true);
    expect(nodes(view).some((node) => node.props['aria-label'] === 'For Chart A')).toBe(false);
  });

  it.each([
    ['cleared profile', true],
    ['revoked profile access', false],
  ] as const)('ignores a late module after %s', async (_reason, ready) => {
    const pending = deferredLoad();
    profile([chart('A')]);
    render();
    await started();
    profile([], ready);
    render();
    const writes = harness.writes.mock.calls.length;
    pending.resolve();
    await vi.dynamicImportSettled();
    expect(harness.writes).toHaveBeenCalledTimes(writes);
    const view = render();
    expect(view.props['data-today-state']).not.toBe('chart');
    expect(comparisonUnavailable(view)).toBe(false);
  });

  it.each(['resolve', 'reject'] as const)('ignores a late %s after unmount', async (outcome) => {
    const pending = deferredLoad();
    profile([chart('A')]);
    render();
    await started();
    harness.effects.forEach((effect) => effect.cleanup?.());
    const writes = harness.writes.mock.calls.length;
    pending[outcome]();
    await vi.dynamicImportSettled();
    expect(harness.writes).toHaveBeenCalledTimes(writes);
  });

  it('shows an import failure only for a chart that needs it, without a retry loop', async () => {
    const pending = deferredLoad();
    profile([chart('A')]);
    expect(comparisonUnavailable(render())).toBe(false);
    await started();
    pending.reject();
    await vi.dynamicImportSettled();
    expect(comparisonUnavailable(render())).toBe(true);
    render();
    render();
    await vi.dynamicImportSettled();
    expect(harness.load).toHaveBeenCalledOnce();
    profile([]);
    expect(comparisonUnavailable(render())).toBe(false);
    profile([chart('B')]);
    // A later chart must not inherit the previous failure for one paint while
    // its new passive loading effect is still waiting to run.
    expect(comparisonUnavailable(render())).toBe(false);
    await vi.dynamicImportSettled();
  });

  it('preserves the malformed-profile DOM-hint fallback without loading transit code', async () => {
    profile([{ id: 'malformed', name: 'Incomplete chart' } as SavedChart]);
    harness.savedHint = true;
    const view = render();
    await vi.dynamicImportSettled();
    expect(harness.load).not.toHaveBeenCalled();
    expect(view.props['data-today-state']).toBe('empty');
    expect(comparisonUnavailable(view)).toBe(true);
  });
});
