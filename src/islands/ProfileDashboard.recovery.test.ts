import type { VNode } from 'preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SavedChart } from '../lib/profile/schema';

const harness = vi.hoisted(() => ({
  slots: [] as unknown[], cursor: 0,
  effects: [] as Array<{ dependencies: unknown[]; cleanup?: () => void }>,
  pending: [] as Array<() => void>, effectCursor: 0,
  charts: [] as SavedChart[], allowed: true,
  writes: vi.fn(), load: vi.fn(), scan: vi.fn(),
}));
vi.mock('../lib/hooks/useProfile', () => ({ useProfile: () => ({ profile: { charts: harness.charts }, ready: true }) }));
vi.mock('../lib/account-v2/profile-access-reader', () => ({ profileAccessAllowed: () => harness.allowed }));
vi.mock('../lib/module-load', async (importOriginal) => ({
  ...await importOriginal<object>(),
  loadModule: (load: () => Promise<unknown>) => harness.load(load),
}));
vi.mock('preact/hooks', () => ({
  useState: (initial: unknown) => {
    const slot = harness.cursor++;
    if (!(slot in harness.slots)) harness.slots[slot] = initial;
    return [harness.slots[slot], (value: unknown) => {
      harness.writes(slot, value);
      harness.slots[slot] = typeof value === 'function' ? value(harness.slots[slot]) : value;
    }];
  },
  useRef: (initial: unknown) => {
    const slot = harness.cursor++;
    if (!(slot in harness.slots)) harness.slots[slot] = { current: initial };
    return harness.slots[slot];
  },
  useMemo: (factory: () => unknown) => factory(),
  useEffect: (effect: () => void | (() => void), dependencies: unknown[]) => {
    const index = harness.effectCursor++;
    const prior = harness.effects[index];
    if (prior && dependencies.every((value, i) => Object.is(value, prior.dependencies[i]))) return;
    harness.pending.push(() => {
      prior?.cleanup?.();
      const cleanup = effect();
      harness.effects[index] = { dependencies, cleanup: typeof cleanup === 'function' ? cleanup : undefined };
    });
  },
}));

import ProfileDashboard from './ProfileDashboard';
import CalculationReload, { calculationLoadMessage } from './CalculationReload';
import { ModuleLoadError } from '../lib/module-load';
import { YEAR_AHEAD_CACHE_KEY } from '../lib/year-ahead';
import { t } from '../lib/i18n';

const chart = (): SavedChart => ({
  id: 'saved-chart', name: 'Saved chart', createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z',
  birth: { date: '1989-12-20', time: '11:30', timeKnown: true, place: null },
  summary: {
    engineVersion: 'test-engine', utcISO: '1989-12-20T05:30:00Z', houseSystem: 'whole', flags: [],
    angles: { asc: 45, mc: 270 },
    bodies: [{ body: 'Sun', lon: 268, retrograde: false }, { body: 'Moon', lon: 170, retrograde: false }],
  },
});
const scan = () => ({ solarReturns: ['2026-12-20T05:30:00Z'], aspects: [], saturnSeasons: [] });
let storage: Map<string, string>;
let setItem: ReturnType<typeof vi.fn>;
let events: EventTarget;
const flushEffects = () => harness.pending.splice(0).forEach((effect) => effect());
function render(deferEffects = false) {
  harness.cursor = 0;
  harness.effectCursor = 0;
  const view = ProfileDashboard({ locale: 'en' });
  if (!deferEffects) flushEffects();
  return view;
}
function nodes(value: unknown): VNode<Record<string, any>>[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== 'object' || !('props' in value)) return [];
  const node = value as VNode<Record<string, any>>;
  return [node, ...nodes(node.props.children)];
}
const status = () => nodes(render()).find((node) => node.props.role === 'status');
const alert = () => nodes(render()).find((node) => node.props.role === 'alert');
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
function pendingLoad() {
  let resolve!: (value: unknown) => void;
  let reject!: (error: unknown) => void;
  harness.load.mockImplementationOnce(() => new Promise((done, fail) => { resolve = done; reject = fail; }));
  return { resolve: () => resolve({ yearScan: harness.scan }), reject: (error: unknown) => reject(error) };
}
function select(id: string) {
  nodes(render()).find((node) => node.type === 'select')!.props.onChange({ target: { value: id } });
  render();
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-05T12:00:00Z'));
  harness.slots = []; harness.cursor = 0; harness.effects = []; harness.pending = []; harness.effectCursor = 0;
  harness.charts = [chart()]; harness.allowed = true;
  harness.writes.mockClear();
  harness.scan.mockReset().mockImplementation(scan);
  harness.load.mockReset().mockResolvedValue({ yearScan: harness.scan });
  storage = new Map();
  setItem = vi.fn((key: string, value: string) => { storage.set(key, value); });
  vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem });
  events = new EventTarget();
  vi.stubGlobal('window', events);
});
afterEach(() => {
  harness.effects.forEach((effect) => effect.cleanup?.());
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('saved-chart year scan recovery', () => {
  it('announces pending calculation before the first scan effect has run', () => {
    const view = nodes(render(true));
    expect(view.some((node) => node.props.role === 'status')).toBe(true);
    expect(view.some((node) => node.props.children === t('en', 'pfdQuietAhead'))).toBe(false);
    expect(harness.load).not.toHaveBeenCalled();
    flushEffects();
  });

  it('starts a fresh scan after access is revoked and restored before the next render', async () => {
    const pending = pendingLoad();
    render();
    harness.allowed = false;
    events.dispatchEvent(new Event('zodiacs:profile-access'));
    harness.allowed = true;
    events.dispatchEvent(new Event('zodiacs:profile-access'));
    const writes = harness.writes.mock.calls.length;
    // Repeated access notifications do not queue extra attempts, and the old
    // request cannot adopt the restored access even before the next render.
    events.dispatchEvent(new Event('zodiacs:profile-access'));
    pending.resolve();
    await flush();
    expect(harness.writes).toHaveBeenCalledTimes(writes);
    expect(harness.scan).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
    render();
    await flush();
    expect(harness.load).toHaveBeenCalledTimes(2);
    expect(harness.scan).toHaveBeenCalledOnce();
    expect(setItem).toHaveBeenCalledOnce();
    expect(status()).toBeUndefined();
    expect(alert()).toBeUndefined();
  });

  it('does not restart a revoked scan after the dashboard unmounts', async () => {
    const pending = pendingLoad();
    render();
    harness.allowed = false;
    events.dispatchEvent(new Event('zodiacs:profile-access'));
    harness.effects.forEach((effect) => effect.cleanup?.());
    const writes = harness.writes.mock.calls.length;
    harness.allowed = true;
    events.dispatchEvent(new Event('zodiacs:profile-access'));
    pending.resolve();
    await flush();
    expect(harness.writes).toHaveBeenCalledTimes(writes);
    expect(harness.load).toHaveBeenCalledOnce();
    expect(harness.scan).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
  });

  it('reports a failed module load with retry and explicit reload, then recovers', async () => {
    harness.load.mockRejectedValueOnce(new ModuleLoadError('offline'));
    render();
    expect(status()).toBeDefined();
    await flush();
    expect(status()).toBeUndefined();
    expect(alert()?.props.children).toBe(calculationLoadMessage('en'));
    const view = nodes(render());
    expect(view.some((node) => node.props.children === t('en', 'pfdQuietAhead'))).toBe(false);
    const reload = view.find((node) => node.type === CalculationReload)!;
    expect(CalculationReload({ error: reload.props.error, locale: 'en' })).not.toBeNull();
    view.find((node) => node.type === 'button' && node.props.children === t('en', 'calculationRetry'))!.props.onClick();
    render();
    await flush();
    expect(alert()).toBeUndefined();
    expect(status()).toBeUndefined();
    expect(harness.scan).toHaveBeenCalledOnce();
    expect(setItem).toHaveBeenCalledOnce();
  });

  it('reports a calculation failure without implying an empty forecast or file-load failure', async () => {
    harness.scan.mockImplementationOnce(() => { throw new RangeError('calculation'); });
    render();
    await flush();
    expect(alert()?.props.children).toBe(t('en', 'pfdYearError'));
    expect(alert()).toBeDefined();
    expect(status()).toBeUndefined();
    expect(setItem).not.toHaveBeenCalled();
    const reload = nodes(render()).find((node) => node.type === CalculationReload)!;
    expect(CalculationReload({ error: reload.props.error, locale: 'en' })).toBeNull();
  });

  it('settles a chart missing its Sun without downloading the engine or staying busy', async () => {
    harness.charts[0].summary.bodies = [];
    render();
    await flush();
    expect(alert()).toBeDefined();
    expect(status()).toBeUndefined();
    expect(harness.load).not.toHaveBeenCalled();
    expect(harness.scan).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
  });

  it('clears busy when switching from a pending chart to an existing cached chart', async () => {
    render();
    await flush();
    const other = { ...chart(), id: 'other', name: 'Other', updatedAt: '2026-09-04T00:00:00Z' };
    harness.charts = [chart(), other];
    const pending = pendingLoad();
    select('other');
    expect(status()).toBeDefined();
    select('saved-chart');
    expect(status()).toBeUndefined();
    const writes = harness.writes.mock.calls.length;
    pending.resolve();
    await flush();
    expect(harness.writes).toHaveBeenCalledTimes(writes);
    expect(harness.scan).toHaveBeenCalledOnce();
    expect(setItem).toHaveBeenCalledOnce();
  });

  it('does not reuse cached or rendered scan results after same-id chart inputs change', async () => {
    render();
    await flush();
    expect(nodes(render()).some((node) => typeof node.props.children === 'string' && node.props.children.startsWith('Your solar return'))).toBe(true);
    const edited = chart();
    edited.summary.bodies[0].lon = 100;
    edited.summary.utcISO = '1990-07-02T05:30:00Z';
    harness.charts = [edited];
    const pending = pendingLoad();
    const staleFrame = nodes(render(true));
    expect(staleFrame.some((node) => typeof node.props.children === 'string' && node.props.children.startsWith('Your solar return'))).toBe(false);
    flushEffects();
    expect(status()).toBeDefined();
    pending.resolve();
    await flush();
    expect(harness.scan).toHaveBeenLastCalledWith(expect.objectContaining({ sunLon: 100, birthUtc: new Date(edited.summary.utcISO) }), expect.any(Date), expect.any(Date));
    expect(setItem).toHaveBeenCalledTimes(2);
  });

  it('invalidates older cache entries that lack calculation-input identity', async () => {
    storage.set(YEAR_AHEAD_CACHE_KEY, JSON.stringify({ 'saved-chart': {
      engineVersion: 'test-engine', computedAt: new Date().toISOString(), scan: scan(),
    } }));
    render();
    await flush();
    expect(harness.scan).toHaveBeenCalledOnce();
    expect(JSON.parse(storage.get(YEAR_AHEAD_CACHE_KEY)!)['saved-chart'].chartKey).toContain('test-engine');
  });

  it.each(['empty', 'unmount', 'revoke', 'revoke-restore'])('suppresses a pending result after %s', async (reason) => {
    const pending = pendingLoad();
    render();
    if (reason === 'empty') { harness.charts = []; render(); }
    else if (reason === 'unmount') harness.effects.forEach((effect) => effect.cleanup?.());
    else {
      harness.allowed = false;
      events.dispatchEvent(new Event('zodiacs:profile-access'));
      if (reason === 'revoke-restore') harness.allowed = true;
    }
    const writes = harness.writes.mock.calls.length;
    pending.resolve();
    await flush();
    expect(harness.writes).toHaveBeenCalledTimes(writes);
    expect(harness.scan).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
    if (reason === 'empty') expect(status()).toBeUndefined();
  });

  it('suppresses a rejected import after access is revoked', async () => {
    const pending = pendingLoad();
    render();
    harness.allowed = false;
    const writes = harness.writes.mock.calls.length;
    pending.reject(new ModuleLoadError('offline'));
    await flush();
    expect(harness.writes).toHaveBeenCalledTimes(writes);
    expect(setItem).not.toHaveBeenCalled();
  });

  it('does not download a scan or touch storage without profile access', async () => {
    harness.allowed = false;
    render();
    await flush();
    expect(harness.load).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
  });
});
