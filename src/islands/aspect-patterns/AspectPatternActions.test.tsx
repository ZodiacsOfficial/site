import type { VNode } from 'preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SelectedPatternCard } from '../../lib/aspect-pattern-model';

const harness = vi.hoisted(() => ({
  slots: [] as unknown[], cursor: 0, effectCursor: 0,
  effects: [] as Array<{ dependencies: unknown[]; cleanup?: () => void }>,
  pending: [] as Array<() => void>, writes: vi.fn(), load: vi.fn(), prepare: vi.fn(), share: vi.fn(), download: vi.fn(),
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
  useEffect: (effect: () => void | (() => void), dependencies: unknown[]) => {
    const slot = harness.effectCursor++, previous = harness.effects[slot];
    if (previous && dependencies.every((value, i) => Object.is(value, previous.dependencies[i]))) return;
    harness.pending.push(() => {
      previous?.cleanup?.();
      const cleanup = effect();
      harness.effects[slot] = { dependencies, cleanup: typeof cleanup === 'function' ? cleanup : undefined };
    });
  },
}));
vi.mock('../../lib/module-load', async (original) => {
  const actual = await original<typeof import('../../lib/module-load')>();
  return { ...actual, loadModule: () => actual.loadModule(harness.load) };
});
import AspectPatternActions from './AspectPatternActions';
import CalculationReload from '../CalculationReload';

const card: SelectedPatternCard = {
  identity: 'selected-source-a:grand-cross', title: 'Grand cross', context: 'natal', locale: 'en',
  pattern: { id: 'grand-cross:fixture', kind: 'grand-cross', members: ['Mercury', 'Venus', 'Mars', 'Jupiter'], edges: [], oppositions: [] },
  points: [], scope: 'Timed natal positions.', reading: 'Selected reading.', receipt: [],
};
const file = { blob: new Blob(['selected pattern'], { type: 'image/png' }), filename: 'pattern-a.png' };
const imageModule = () => ({ prepareAspectPatternCard: harness.prepare, shareAspectPatternCard: harness.share, downloadAspectPatternCard: harness.download });
function nodes(value: unknown): VNode<Record<string, any>>[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== 'object' || !('props' in value)) return [];
  const node = value as VNode<Record<string, any>>;
  return [node, ...nodes(node.props.children)];
}
function render(current = card, effects = true) {
  harness.cursor = 0; harness.effectCursor = 0;
  const tree = AspectPatternActions({ card: current });
  if (effects) harness.pending.splice(0).forEach((effect) => effect());
  return nodes(tree);
}
const marker = (name: string, current = card) => render(current).find((node) => Object.hasOwn(node.props, name));
const click = (name: string, current = card) => marker(name, current)!.props.onClick();
const unmount = () => harness.effects.forEach((effect) => effect.cleanup?.());
const flush = async () => { for (let step = 0; step < 24; step++) await Promise.resolve(); };

beforeEach(() => {
  harness.slots = []; harness.cursor = 0; harness.effectCursor = 0; harness.effects = []; harness.pending = [];
  harness.writes.mockClear(); harness.load.mockReset().mockResolvedValue(imageModule());
  harness.prepare.mockReset().mockResolvedValue(file); harness.share.mockReset().mockResolvedValue('shared');
  harness.download.mockReset().mockReturnValue('downloaded');
  let serial = 0;
  vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:pattern-${++serial}`);
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});
afterEach(() => { unmount(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('selected image actions', () => {
  it('waits for a request, then prepares the exact selected snapshot before sharing', async () => {
    render(); expect(harness.load).not.toHaveBeenCalled(); expect(marker('data-pattern-image')).toBeUndefined();
    const pending = click('data-pattern-export');
    expect(marker('data-pattern-export')?.props.disabled).toBe(true);
    expect(marker('data-pattern-share')).toBeUndefined();
    await pending;
    expect(harness.prepare).toHaveBeenCalledWith(card, expect.any(AbortSignal));
    expect(marker('data-pattern-image')?.props.src).toBe('blob:pattern-1');
    expect(marker('data-pattern-export-status')?.props.children).toBe('Your selected pattern image is ready.');
    const sharing = click('data-pattern-share');
    expect(harness.share).toHaveBeenCalledWith(file, expect.any(Function));
    await sharing; expect(marker('data-pattern-export-status')?.props.children).toBe('Image shared.');
  });

  it('keeps a cancelled share neutral and retains the explicit download', async () => {
    render(); await click('data-pattern-export'); harness.share.mockResolvedValue('cancelled');
    await click('data-pattern-share');
    expect(marker('data-pattern-export-status')?.props.children).toBe('');
    expect(harness.download).not.toHaveBeenCalled();
    click('data-pattern-download'); expect(harness.download).toHaveBeenCalledExactlyOnceWith(file);
  });

  it('retries preparation after a failure and offers warned reload for a module failure', async () => {
    harness.load.mockRejectedValueOnce(new Error('chunk unavailable')).mockResolvedValue(imageModule());
    render(); await click('data-pattern-export');
    expect(marker('data-pattern-export-error')?.props.children).toContain('Your chart and pattern reading are still available');
    expect(render().find((node) => node.type === CalculationReload)?.props.error).toBeTruthy();
    await click('data-pattern-export');
    expect(marker('data-pattern-export-error')).toBeUndefined(); expect(marker('data-pattern-image')).toBeDefined();
    expect(harness.load).toHaveBeenCalledTimes(2);
  });

  it('treats a raster failure as retryable without requiring a module reload', async () => {
    harness.prepare.mockRejectedValueOnce(new Error('raster unavailable')).mockResolvedValue(file);
    render(); await click('data-pattern-export');
    expect(render().find((node) => node.type === CalculationReload)?.props.error).toBe('');
    await click('data-pattern-export'); expect(marker('data-pattern-image')).toBeDefined();
    expect(harness.prepare).toHaveBeenCalledTimes(2);
  });

  it('blocks duplicate preparation taps before the next render', async () => {
    let finish!: (value: unknown) => void;
    harness.prepare.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    render(); const start = marker('data-pattern-export')!.props.onClick;
    const pending = start(); await start(); await flush();
    expect(harness.prepare).toHaveBeenCalledOnce(); finish(file); await pending;
  });

  it('revokes the preview on close and returns focus to its native trigger', async () => {
    render(); await click('data-pattern-export');
    const focus = vi.fn(), ref = marker('data-pattern-export')!.ref;
    if (!ref || typeof ref === 'function') throw new Error('Native trigger ref missing');
    ref.current = { focus };
    click('data-pattern-export-close');
    expect(URL.revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:pattern-1');
    expect(focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true });
    expect(marker('data-pattern-image')).toBeUndefined();
    await click('data-pattern-export'); expect(marker('data-pattern-image')?.props.src).toBe('blob:pattern-2');
  });

  it('drops a pending preparation when the selected source changes, even with identical geometry', async () => {
    let finish!: (value: unknown) => void;
    harness.prepare.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; })).mockResolvedValue({ ...file, filename: 'pattern-b.png' });
    render(); const first = click('data-pattern-export'); await flush();
    const signal = harness.prepare.mock.calls[0][1] as AbortSignal;
    const next = { ...card, identity: 'selected-source-b:grand-cross' };
    render(next); expect(signal.aborted).toBe(true);
    await click('data-pattern-export', next);
    const writes = harness.writes.mock.calls.length;
    finish(file); await first; await flush();
    expect(harness.writes).toHaveBeenCalledTimes(writes);
    click('data-pattern-download', next);
    expect(harness.download).toHaveBeenCalledWith(expect.objectContaining({ filename: 'pattern-b.png' }));
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
  });

  it('invalidates old handlers immediately when source rendering precedes effect cleanup', async () => {
    render(); await click('data-pattern-export');
    const oldShare = marker('data-pattern-share')!.props.onClick, oldSave = marker('data-pattern-download')!.props.onClick;
    const next = { ...card, identity: 'revised-source' };
    const tree = render(next, false);
    expect(tree.find((node) => Object.hasOwn(node.props, 'data-pattern-image'))).toBeUndefined();
    await oldShare(); oldSave();
    expect(harness.share).not.toHaveBeenCalled(); expect(harness.download).not.toHaveBeenCalled();
    harness.pending.splice(0).forEach((effect) => effect());
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:pattern-1');
  });

  it('makes the late-share liveness guard false after close and ignores its completion', async () => {
    let finish!: (value: unknown) => void;
    harness.share.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    render(); await click('data-pattern-export');
    const share = marker('data-pattern-share')!.props.onClick, save = marker('data-pattern-download')!.props.onClick;
    const pending = share(); await share(); save();
    expect(harness.share).toHaveBeenCalledOnce(); expect(harness.download).not.toHaveBeenCalled();
    const isCurrent = harness.share.mock.calls[0][1]; expect(isCurrent()).toBe(true);
    click('data-pattern-export-close'); expect(isCurrent()).toBe(false);
    const writes = harness.writes.mock.calls.length;
    finish('downloaded'); await pending;
    expect(harness.writes).toHaveBeenCalledTimes(writes);
  });

  it('aborts pending work on unmount without a later preview, message or URL allocation', async () => {
    let finish!: (value: unknown) => void;
    harness.prepare.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    render(); const pending = click('data-pattern-export'); await flush();
    unmount(); const writes = harness.writes.mock.calls.length;
    finish(file); await pending;
    expect(URL.createObjectURL).not.toHaveBeenCalled(); expect(harness.writes).toHaveBeenCalledTimes(writes);
  });

  it('counts module load and rendering inside the same fifteen-second deadline', async () => {
    vi.useFakeTimers();
    let load!: (value: unknown) => void;
    harness.load.mockReturnValue(new Promise((resolve) => { load = resolve; }));
    harness.prepare.mockReturnValue(new Promise(() => {}));
    render(); const pending = click('data-pattern-export');
    await vi.advanceTimersByTimeAsync(14_000); load(imageModule()); await vi.advanceTimersByTimeAsync(0);
    expect(harness.prepare).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1000); await pending;
    expect((harness.prepare.mock.calls[0][1] as AbortSignal).aborted).toBe(true);
    expect(marker('data-pattern-export-error')).toBeDefined();
    expect(marker('data-pattern-export')?.props.disabled).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('allows retry after a held module reaches the deadline and rejects its late completion', async () => {
    vi.useFakeTimers(); let finish!: (value: unknown) => void;
    harness.load.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; })).mockResolvedValue(imageModule());
    render(); const pending = click('data-pattern-export');
    await vi.advanceTimersByTimeAsync(15_000); await pending;
    expect(render().find((node) => node.type === CalculationReload)?.props.error).toBeTruthy();
    await click('data-pattern-export'); const writes = harness.writes.mock.calls.length;
    finish(imageModule()); await flush();
    expect(harness.prepare).toHaveBeenCalledOnce(); expect(harness.writes).toHaveBeenCalledTimes(writes);
  });
});
