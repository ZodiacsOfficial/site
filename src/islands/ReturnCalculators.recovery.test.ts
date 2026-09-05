import type { VNode } from 'preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => ({
  slots: [] as unknown[], cursor: 0,
  effects: [] as Array<{ dependencies: unknown[]; cleanup?: () => void }>,
  effectCursor: 0, pending: [] as Array<() => void>,
  writes: vi.fn(), returnsImport: vi.fn(), loadReturns: vi.fn(), solarImport: vi.fn(),
  access: { current: 0 },
  compute: vi.fn(),
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
vi.mock('../lib/hooks/useProfile', () => ({
  useProfile: () => ({ profile: { charts: [], settings: { houseSystem: 'whole' } }, ready: true }),
}));
vi.mock('../lib/hooks/useProfileAccessGeneration', () => ({ useProfileAccessGeneration: () => harness.access }));
vi.mock('../lib/hooks/useEngine', () => ({ useEngine: () => async () => ({
  computeChart: harness.compute, computeBodies: () => [],
}) }));
vi.mock('../lib/module-load', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/module-load')>();
  return {
    ...actual,
    loadModule: () => actual.loadModule(harness.solarImport),
    createModuleLoader: () => () => harness.loadReturns(),
  };
});

import SaturnReturnCalculator from './SaturnReturnCalculator';
import SolarReturnCalculator from './SolarReturnCalculator';
import TransitTracker from './TransitTracker';
import { BirthFields } from './BirthFields';
import CalculationReload, { calculationLoadMessage } from './CalculationReload';

const city = { name: 'London', lat: 51.5, lon: -0.12, tz: 'Europe/London', country: 'GB', admin1: '', pop: 1 };
function render(component: () => VNode<any>) {
  harness.cursor = 0; harness.effectCursor = 0;
  const view = component();
  harness.pending.splice(0).forEach((effect) => effect());
  return view;
}
function nodes(value: unknown): VNode<Record<string, any>>[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== 'object' || !('props' in value)) return [];
  const node = value as VNode<Record<string, any>>;
  return [node, ...nodes(node.props.children)];
}
const saturn = () => SaturnReturnCalculator({ locale: 'en' });
const solar = () => SolarReturnCalculator();
const transit = () => TransitTracker({ locale: 'en' });
const submit = (component: () => VNode<any>) => nodes(render(component)).find((node) => node.type === 'form')!
  .props.onSubmit({ preventDefault() {} });
const error = (component: () => VNode<any>) => nodes(render(component)).find((node) => node.props.role === 'alert')?.props.children;

beforeEach(async () => {
  harness.slots = []; harness.cursor = 0;
  harness.effects = []; harness.effectCursor = 0; harness.pending = [];
  harness.writes.mockClear(); harness.access.current = 0;
  harness.returnsImport.mockReset(); harness.solarImport.mockReset();
  harness.compute.mockReset();
  vi.stubGlobal('window', new EventTarget());
  const actual = await vi.importActual<typeof import('../lib/module-load')>('../lib/module-load');
  harness.loadReturns.mockReset().mockImplementation(actual.createModuleLoader(harness.returnsImport));
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  harness.effects.forEach((effect) => effect.cleanup?.());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('return calculator file recovery', () => {
  it('observes a failed Saturn warm-up, explains download failure and retries without clearing the date', async () => {
    harness.returnsImport.mockRejectedValueOnce(new Error('warm-up offline'))
      .mockRejectedValueOnce(new Error('still offline'))
      .mockResolvedValue({ saturnReturns: () => ({ natalLon: 90, natalRetrograde: false, seasons: [] }) });
    const input = nodes(render(saturn)).find((node) => node.props.id === 'sr-date')!;
    input.props.onInput({ target: { value: '1990-01-01' } });
    input.props.onFocus();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await submit(saturn);
    expect(error(saturn)).toBe(calculationLoadMessage('en'));
    expect(nodes(render(saturn)).find((node) => node.type === CalculationReload)?.props.error).toBe(calculationLoadMessage('en'));
    expect(nodes(render(saturn)).find((node) => node.props.id === 'sr-date')?.props.value).toBe('1990-01-01');
    await submit(saturn);
    expect(error(saturn)).toBeUndefined();
    expect(nodes(render(saturn)).some((node) => node.props.class === 'calc__result')).toBe(true);
    expect(harness.returnsImport).toHaveBeenCalledTimes(3);
  });

  it('does not report a Saturn calculation rejection as a missing module', async () => {
    harness.returnsImport.mockResolvedValue({ saturnReturns: () => { throw new RangeError('invalid date'); } });
    nodes(render(saturn)).find((node) => node.props.id === 'sr-date')!.props.onInput({ target: { value: 'bad-date' } });
    await submit(saturn);
    expect(error(saturn)).toBeTruthy();
    expect(error(saturn)).not.toBe(calculationLoadMessage('en'));
  });

  it('offers solar-return file recovery, then calculates from the unchanged form', async () => {
    const result = { chart: { input: { utc: new Date('2026-01-01T00:00:00Z') } } };
    const compute = vi.fn(() => result);
    const Result = () => null;
    harness.solarImport.mockRejectedValueOnce(new Error('offline')).mockResolvedValue([
      { computeSolarReturn: compute }, { SolarReturnResult: Result }, { StaticWheel: () => null },
    ]);
    const fields = nodes(render(solar)).find((node) => node.type === BirthFields)!.props;
    fields.onDateChange('1990-01-01'); fields.onTimeChange('12:00'); fields.onCityChange(city);
    await submit(solar);
    expect(error(solar)).toBe(calculationLoadMessage('en'));
    expect(compute).not.toHaveBeenCalled();
    expect(nodes(render(solar)).find((node) => node.type === CalculationReload)?.props.error).toBe(calculationLoadMessage('en'));
    await submit(solar);
    expect(error(solar)).toBeUndefined();
    expect(compute).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ birthDate: '1990-01-01', birthplace: city }));
    expect(nodes(render(solar)).find((node) => node.type === Result)?.props.result).toBe(result);
  });

  it('keeps solar-return calculation errors distinct from download failures', async () => {
    harness.solarImport.mockResolvedValue([
      { computeSolarReturn: () => { throw new RangeError('invalid input'); } },
      { SolarReturnResult: () => null }, { StaticWheel: () => null },
    ]);
    const fields = nodes(render(solar)).find((node) => node.type === BirthFields)!.props;
    fields.onDateChange('1990-01-01'); fields.onTimeChange('12:00'); fields.onCityChange(city);
    await submit(solar);
    expect(error(solar)).toBe('The solar return could not be computed. Check the details and try again.');
  });

  for (const [name, component] of [['solar return', solar], ['transit', transit]] as const) {
    const dependencies = () => {
      const chart = {
        input: { utc: new Date('2026-01-01T00:00:00Z') },
        bodies: [{ body: 'Sun', lon: 30 }], angles: null, houses: null, engineVersion: 'test',
      };
      harness.compute.mockReturnValue(name === 'solar return' ? { chart } : chart);
      return name === 'solar return'
        ? [{ computeSolarReturn: harness.compute }, { SolarReturnResult: () => null }, { StaticWheel: () => null }]
        : { default: () => null };
    };
    const fill = () => {
      const fields = nodes(render(component)).find((node) => node.type === BirthFields)!.props;
      fields.onDateChange('1990-01-01'); fields.onTimeChange('12:00'); fields.onCityChange(city);
    };

    it(`${name} releases a cancelled access request and protects a newer calculation`, async () => {
      const modules = dependencies();
      let resolve!: (value: unknown) => void;
      const pending = new Promise((done) => { resolve = done; });
      harness.solarImport.mockReturnValueOnce(pending).mockResolvedValue(modules);
      fill();
      const stale = submit(component);
      expect(nodes(render(component)).find((node) => node.type === 'form')!.props['aria-busy']).toBe(true);
      harness.access.current += 1;
      window.dispatchEvent(new Event('zodiacs:profile-access'));
      expect(nodes(render(component)).find((node) => node.type === 'form')!.props['aria-busy']).toBe(false);
      await submit(component);
      expect(harness.compute).toHaveBeenCalledOnce();
      const writes = harness.writes.mock.calls.length;
      resolve(modules);
      await stale;
      expect(harness.writes).toHaveBeenCalledTimes(writes);
      expect(harness.compute).toHaveBeenCalledOnce();
    });

    it(`${name} ignores late failures and stale submit handlers after unmount`, async () => {
      let reject!: (cause: unknown) => void;
      harness.solarImport.mockReturnValue(new Promise((_done, fail) => { reject = fail; }));
      fill();
      const handler = nodes(render(component)).find((node) => node.type === 'form')!.props.onSubmit;
      const stale = handler({ preventDefault() {} });
      harness.effects.forEach((effect) => effect.cleanup?.());
      const writes = harness.writes.mock.calls.length;
      reject(new Error('offline'));
      await stale;
      await handler({ preventDefault() {} });
      expect(harness.solarImport).toHaveBeenCalledOnce();
      expect(harness.writes).toHaveBeenCalledTimes(writes);
      expect(harness.compute).not.toHaveBeenCalled();
    });

    it(`${name} shares the pending request across rapid duplicate submissions`, async () => {
      const modules = dependencies();
      let resolve!: (value: unknown) => void;
      harness.solarImport.mockReturnValue(new Promise((done) => { resolve = done; }));
      fill();
      const handler = nodes(render(component)).find((node) => node.type === 'form')!.props.onSubmit;
      const first = handler({ preventDefault() {} });
      await handler({ preventDefault() {} });
      expect(harness.solarImport).toHaveBeenCalledOnce();
      resolve(modules);
      await first;
      expect(harness.compute).toHaveBeenCalledOnce();
    });
  }
});
