import type { VNode } from 'preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LunarReturnExportModel } from './export-model';

const harness = vi.hoisted(() => ({
  slots: [] as unknown[], cursor: 0, effectCursor: 0,
  effects: [] as Array<{ dependencies: unknown[]; cleanup?: () => void }>, pending: [] as Array<() => void>,
  writes: vi.fn(), imageLoad: vi.fn(), calendarLoad: vi.fn(), prepare: vi.fn(), share: vi.fn(), download: vi.fn(),
  buildCalendar: vi.fn(), calendarFilename: vi.fn(), downloadCalendar: vi.fn(),
}));
vi.mock('preact/hooks', () => ({
  useState: (initial: unknown) => {
    const slot = harness.cursor++;
    if (!(slot in harness.slots)) harness.slots[slot] = typeof initial === 'function' ? initial() : initial;
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
      previous?.cleanup?.(); const cleanup = effect();
      harness.effects[slot] = { dependencies, cleanup: typeof cleanup === 'function' ? cleanup : undefined };
    });
  },
}));
vi.mock('../../lib/module-load', async (original) => {
  const actual = await original<typeof import('../../lib/module-load')>();
  return { ...actual, loadModule: (loader: () => unknown) => actual.loadModule(
    loader.toString().includes('lunar-return-card') ? harness.imageLoad : harness.calendarLoad,
  ) };
});
import LunarReturnActions from './LunarReturnActions';
import CalculationReload from '../CalculationReload';

const model: LunarReturnExportModel = {
  title: 'Lunar return', instantUtc: '2026-09-24T13:14:15.678Z', referenceUtc: '2026-09-05T10:00:00.000Z', engineVersion: '9.3.0',
  wheel: { bodies: [], angles: null, houses: null, aspects: [] }, reading: [], readingBasis: [], notes: [],
};
const file = { blob: new Blob(['lunar return'], { type: 'image/png' }), filename: 'lunar-a.png' };
const imageModule = () => ({ prepareLunarReturnCard: harness.prepare, shareLunarReturnCard: harness.share, downloadLunarReturnCard: harness.download });
const calendarModule = () => [{ buildLunarReturnCalendar: harness.buildCalendar, lunarReturnCalendarFilename: harness.calendarFilename }, { downloadCalendarFile: harness.downloadCalendar }];
function nodes(value: unknown): VNode<Record<string, any>>[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== 'object' || !('props' in value)) return [];
  const node = value as VNode<Record<string, any>>;
  return [node, ...nodes(node.props.children)];
}
function render(current = model, effects = true) {
  harness.cursor = 0; harness.effectCursor = 0;
  const tree = LunarReturnActions({ model: current });
  if (effects) harness.pending.splice(0).forEach((effect) => effect());
  return nodes(tree);
}
const marker = (name: string, current = model) => render(current).find((node) => Object.hasOwn(node.props, name));
const click = (name: string, current = model) => marker(name, current)!.props.onClick();
const unmount = () => harness.effects.forEach((effect) => effect.cleanup?.());
const flush = async () => { for (let step = 0; step < 36; step++) await Promise.resolve(); };
beforeEach(() => {
  harness.slots = []; harness.cursor = 0; harness.effectCursor = 0; harness.effects = []; harness.pending = [];
  harness.writes.mockClear(); harness.imageLoad.mockReset().mockResolvedValue(imageModule());
  harness.calendarLoad.mockReset().mockResolvedValue(calendarModule());
  harness.prepare.mockReset().mockResolvedValue(file); harness.share.mockReset().mockResolvedValue('shared');
  harness.download.mockReset().mockReturnValue('downloaded'); harness.downloadCalendar.mockReset();
  harness.buildCalendar.mockReset().mockReturnValue('BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n');
  harness.calendarFilename.mockReset().mockReturnValue('lunar.ics');
  let serial = 0;
  vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:lunar-${++serial}`);
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});
afterEach(() => { unmount(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('lunar image and calendar actions', () => {
  it('prepares on request, shares the exact prepared file, and keeps the calendar independent', async () => {
    render(); expect(harness.imageLoad).not.toHaveBeenCalled(); expect(harness.calendarLoad).not.toHaveBeenCalled();
    await click('data-lr-calendar');
    expect(harness.buildCalendar).toHaveBeenCalledWith(model, expect.any(Date));
    expect(harness.downloadCalendar).toHaveBeenCalledWith('BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n', 'lunar.ics');
    const pending = click('data-lr-create-image');
    expect(marker('data-lr-create-image')?.props.disabled).toBe(true); expect(marker('data-lr-share')).toBeUndefined();
    await pending;
    expect(harness.prepare).toHaveBeenCalledWith(model, expect.any(AbortSignal));
    expect(marker('data-lr-image')?.props.src).toBe('blob:lunar-1');
    const sharing = click('data-lr-share');
    expect(harness.share).toHaveBeenCalledWith(file, expect.any(Function)); await sharing;
    expect(marker('data-lr-image-status')?.props.children).toBe('Image shared.');
    expect(marker('data-lr-calendar-status')?.props.children).toBe('Calendar download started.');
  });
  it('retains prepared images after native cancellation or a retryable download error', async () => {
    render(); await click('data-lr-create-image'); harness.share.mockResolvedValue('cancelled');
    await click('data-lr-share');
    expect(marker('data-lr-image-status')?.props.children).toBe(''); expect(harness.download).not.toHaveBeenCalled();
    harness.download.mockImplementationOnce(() => { throw new Error('download failed'); }).mockReturnValue('downloaded');
    click('data-lr-download'); expect(marker('data-lr-image-error')?.props.children).toContain('Try Save image again');
    expect(marker('data-lr-image')).toBeDefined(); click('data-lr-download');
    expect(marker('data-lr-image-error')).toBeUndefined(); expect(harness.prepare).toHaveBeenCalledOnce();
  });
  it('retries a failed image module and preserves calendar success', async () => {
    harness.imageLoad.mockRejectedValueOnce(new Error('module unavailable')).mockResolvedValue(imageModule());
    render(); await click('data-lr-calendar'); await click('data-lr-create-image');
    expect(marker('data-lr-image-error')?.props.children).toContain('Your return chart and calendar are still available');
    expect(render().find((node) => node.type === CalculationReload)?.props.error).toBeTruthy();
    await click('data-lr-create-image');
    expect(marker('data-lr-image-error')).toBeUndefined(); expect(marker('data-lr-image')).toBeDefined();
    expect(marker('data-lr-calendar-status')?.props.children).toBe('Calendar download started.');
  });
  it('retries image encoding without requiring a module reload', async () => {
    harness.prepare.mockRejectedValueOnce(new Error('encoding failed')).mockResolvedValue(file);
    render(); await click('data-lr-create-image');
    expect(render().find((node) => node.type === CalculationReload)?.props.error).toBe('');
    await click('data-lr-create-image'); expect(marker('data-lr-image')).toBeDefined();
  });
  it('retains the image across calendar failure and retries the calendar independently', async () => {
    harness.calendarLoad.mockRejectedValueOnce(new Error('calendar module failed')).mockResolvedValue(calendarModule());
    render(); await click('data-lr-create-image'); await click('data-lr-calendar');
    expect(marker('data-lr-calendar-error')).toBeDefined(); expect(marker('data-lr-image')).toBeDefined();
    await click('data-lr-calendar');
    expect(marker('data-lr-calendar-error')).toBeUndefined(); expect(marker('data-lr-image')?.props.src).toBe('blob:lunar-1');
    expect(harness.prepare).toHaveBeenCalledOnce();
  });
  it('blocks duplicate prepare/share/calendar taps before rerender', async () => {
    let finishImage!: (value: unknown) => void, finishCalendar!: (value: unknown) => void;
    harness.prepare.mockReturnValue(new Promise((resolve) => { finishImage = resolve; }));
    harness.calendarLoad.mockReturnValue(new Promise((resolve) => { finishCalendar = resolve; }));
    render(); const create = marker('data-lr-create-image')!.props.onClick, calendar = marker('data-lr-calendar')!.props.onClick;
    const pending = create(), cal = calendar(); await create(); await calendar(); await flush();
    expect(harness.prepare).toHaveBeenCalledOnce(); expect(harness.calendarLoad).toHaveBeenCalledOnce();
    finishImage(file); finishCalendar(calendarModule()); await pending; await cal;
    let finishShare!: (value: unknown) => void;
    harness.share.mockReturnValue(new Promise((resolve) => { finishShare = resolve; }));
    const share = marker('data-lr-share')!.props.onClick, save = marker('data-lr-download')!.props.onClick;
    const sharing = share(); await share(); save();
    expect(harness.share).toHaveBeenCalledOnce(); expect(harness.download).not.toHaveBeenCalled();
    finishShare('shared'); await sharing;
  });
  it('revokes the preview on close, blocks old preview handlers and restores focus', async () => {
    render(); await click('data-lr-create-image');
    const share = marker('data-lr-share')!.props.onClick, save = marker('data-lr-download')!.props.onClick;
    const focus = vi.fn(), ref = marker('data-lr-create-image')!.ref;
    if (!ref || typeof ref === 'function') throw new Error('Native trigger ref missing');
    ref.current = { focus }; click('data-lr-close-image');
    expect(focus).toHaveBeenCalledWith({ preventScroll: true }); expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:lunar-1');
    await share(); save(); expect(harness.share).not.toHaveBeenCalled(); expect(harness.download).not.toHaveBeenCalled();
  });
  it('immediately removes stale image and status while model rendering precedes effect cleanup', async () => {
    render(); await click('data-lr-create-image'); await click('data-lr-calendar');
    const share = marker('data-lr-share')!.props.onClick, save = marker('data-lr-download')!.props.onClick;
    const next = { ...model, wheel: { ...model.wheel } };
    const tree = render(next, false);
    expect(tree.find((node) => Object.hasOwn(node.props, 'data-lr-image'))).toBeUndefined();
    expect(tree.find((node) => Object.hasOwn(node.props, 'data-lr-calendar-status'))?.props.children).toBe('');
    await share(); save(); expect(harness.share).not.toHaveBeenCalled(); expect(harness.download).not.toHaveBeenCalled();
    harness.pending.splice(0).forEach((effect) => effect());
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:lunar-1');
  });
  it('aborts both pending imports on model change and ignores late files/downloads', async () => {
    let finishImage!: (value: unknown) => void, finishCalendar!: (value: unknown) => void;
    harness.imageLoad.mockReturnValueOnce(new Promise((resolve) => { finishImage = resolve; }));
    harness.calendarLoad.mockReturnValueOnce(new Promise((resolve) => { finishCalendar = resolve; }));
    render(); const image = click('data-lr-create-image'), calendar = click('data-lr-calendar'); await flush();
    render({ ...model }); await image; await calendar; const writes = harness.writes.mock.calls.length;
    finishImage(imageModule()); finishCalendar(calendarModule()); await flush();
    expect(harness.prepare).not.toHaveBeenCalled(); expect(harness.downloadCalendar).not.toHaveBeenCalled();
    expect(URL.createObjectURL).not.toHaveBeenCalled(); expect(harness.writes).toHaveBeenCalledTimes(writes);
  });
  it('makes a pending native-share liveness guard false on source change', async () => {
    let finish!: (value: unknown) => void;
    harness.share.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    render(); await click('data-lr-create-image'); const sharing = click('data-lr-share');
    const isCurrent = harness.share.mock.calls[0][1]; expect(isCurrent()).toBe(true);
    render({ ...model }); expect(isCurrent()).toBe(false); const writes = harness.writes.mock.calls.length;
    finish('cancelled'); await sharing; expect(harness.writes).toHaveBeenCalledTimes(writes);
  });
  it('cancels active renderer work on unmount without allocating a late preview', async () => {
    let finish!: (value: unknown) => void;
    harness.prepare.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    render(); const pending = click('data-lr-create-image'); await flush();
    const signal = harness.prepare.mock.calls[0][1] as AbortSignal; unmount(); expect(signal.aborted).toBe(true);
    await pending; const writes = harness.writes.mock.calls.length; finish(file); await flush();
    expect(URL.createObjectURL).not.toHaveBeenCalled(); expect(harness.writes).toHaveBeenCalledTimes(writes);
  });
  it('counts import and rendering inside the same finite window and permits a retry', async () => {
    vi.useFakeTimers(); let finish!: (value: unknown) => void;
    harness.imageLoad.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; })).mockResolvedValue(imageModule());
    harness.prepare.mockReturnValueOnce(new Promise(() => {})).mockResolvedValue(file);
    render(); const pending = click('data-lr-create-image');
    await vi.advanceTimersByTimeAsync(14_000); finish(imageModule()); await vi.advanceTimersByTimeAsync(0);
    expect(harness.prepare).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1000); await pending;
    expect((harness.prepare.mock.calls[0][1] as AbortSignal).aborted).toBe(true);
    expect(marker('data-lr-image-error')).toBeDefined(); expect(vi.getTimerCount()).toBe(0);
    await click('data-lr-create-image'); expect(marker('data-lr-image')).toBeDefined();
  });
  it('bounds held calendar modules and rejects their late completion after a successful retry', async () => {
    vi.useFakeTimers(); let finish!: (value: unknown) => void;
    harness.calendarLoad.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; })).mockResolvedValue(calendarModule());
    render(); const pending = click('data-lr-calendar');
    await vi.advanceTimersByTimeAsync(15_000); await pending;
    expect(marker('data-lr-calendar')?.props.disabled).toBe(false); expect(marker('data-lr-calendar-error')).toBeDefined();
    await click('data-lr-calendar'); const writes = harness.writes.mock.calls.length;
    finish(calendarModule()); await flush();
    expect(harness.downloadCalendar).toHaveBeenCalledOnce(); expect(harness.writes).toHaveBeenCalledTimes(writes);
    expect(vi.getTimerCount()).toBe(0);
  });
});
