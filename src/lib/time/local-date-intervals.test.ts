import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createNativeTemporalTransitionProvider,
  resolveLocalDateIntervals,
  type CompleteTransitionProvider,
} from './local-date-intervals';

const DAY = 86_400_000;
const HOUR = 3_600_000;
const epoch = (value: string) => Date.parse(value);
type Change = readonly [number, number];

function schedule(initial: number, changes: readonly Change[] = []): CompleteTransitionProvider {
  return {
    completeness: 'complete-transitions-v1',
    offsetMilliseconds(_zone, instant) {
      let offset = initial;
      for (const [at, after] of changes) if (at <= instant) offset = after;
      return offset;
    },
    nextTransitionMilliseconds(_zone, after) {
      return changes.find(([at]) => at > after)?.[0] ?? null;
    },
  };
}

function display(date: string, provider: CompleteTransitionProvider) {
  const result = resolveLocalDateIntervals(date, 'Synthetic/Complete', provider);
  if (result.status !== 'existing') return result;
  return result.intervals.map(({ start, endExclusive }) => [
    new Date(start).toISOString(), new Date(endExclusive).toISOString(),
  ]);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('complete transition interval algebra', () => {
  it.each([
    ['0000-01-01', '0000-01-02T00:00:00.000Z'],
    ['0000-02-29', '0000-03-01T00:00:00.000Z'],
    ['0099-12-31', '0100-01-01T00:00:00.000Z'],
    ['9999-12-31', '+010000-01-01T00:00:00.000Z'],
  ])('preserves Gregorian rollover for %s', (date, next) => {
    expect(display(date, schedule(0))).toEqual([[`${date}T00:00:00.000Z`, next]]);
  });

  it.each([
    ['UTC', 0, '1990-06-15T00:00:00.000Z', '1990-06-16T00:00:00.000Z'],
    ['Tokyo', 9 * HOUR, '1990-06-14T15:00:00.000Z', '1990-06-15T15:00:00.000Z'],
    ['negative fixed', -150 * 60_000, '1990-06-15T02:30:00.000Z', '1990-06-16T02:30:00.000Z'],
    ['historical seconds', -23_796_000, '1990-06-15T06:36:36.000Z', '1990-06-16T06:36:36.000Z'],
  ])('handles %s offset without a midnight policy', (_name, offset, first, end) => {
    expect(display('1990-06-15', schedule(offset))).toEqual([[first, end]]);
  });

  it.each([
    ['2024-03-10', -5 * HOUR, '2024-03-10T07:00:00Z', -4 * HOUR, '2024-03-10T05:00:00.000Z', '2024-03-11T04:00:00.000Z'],
    ['2024-11-03', -4 * HOUR, '2024-11-03T06:00:00Z', -5 * HOUR, '2024-11-03T04:00:00.000Z', '2024-11-04T05:00:00.000Z'],
    ['1919-03-31', -5 * HOUR, '1919-03-31T04:30:00Z', -4 * HOUR, '1919-03-31T04:30:00.000Z', '1919-04-01T04:00:00.000Z'],
    ['1919-03-30', -5 * HOUR, '1919-03-31T04:30:00Z', -4 * HOUR, '1919-03-30T05:00:00.000Z', '1919-03-31T04:30:00.000Z'],
    ['1914-01-01', -14_404_000, '1914-01-01T04:00:04Z', -4 * HOUR, '1914-01-01T04:00:04.000Z', '1914-01-02T04:00:00.000Z'],
  ])('handles complete transition fixture %s', (date, before, at, after, first, end) => {
    expect(display(date, schedule(before, [[epoch(at), after]]))).toEqual([[first, end]]);
  });

  it('represents a skipped date explicitly, without either adjacent date', () => {
    const provider = schedule(-10 * HOUR, [[epoch('2011-12-30T10:00:00Z'), 14 * HOUR]]);
    expect(display('2011-12-30', provider)).toEqual({ status: 'empty', intervals: [] });
    expect(display('2011-12-29', provider)).toEqual([['2011-12-29T10:00:00.000Z', '2011-12-30T10:00:00.000Z']]);
    expect(display('2011-12-31', provider)).toEqual([['2011-12-30T10:00:00.000Z', '2011-12-31T10:00:00.000Z']]);
  });

  it('preserves both St_Johns date segments and the intervening other date', () => {
    const provider = schedule(-150 * 60_000, [[epoch('2009-11-01T02:31:00Z'), -210 * 60_000]]);
    expect(display('2009-10-31', provider)).toEqual([
      ['2009-10-31T02:30:00.000Z', '2009-11-01T02:30:00.000Z'],
      ['2009-11-01T02:31:00.000Z', '2009-11-01T03:30:00.000Z'],
    ]);
    expect(display('2009-11-01', provider)).toEqual([
      ['2009-11-01T02:30:00.000Z', '2009-11-01T02:31:00.000Z'],
      ['2009-11-01T03:30:00.000Z', '2009-11-02T03:30:00.000Z'],
    ]);
  });

  it('merges a repeated 48-hour Apia date when UTC membership is continuous', () => {
    const provider = schedule(45_184_000, [[epoch('1892-07-04T11:26:56Z'), -41_216_000]]);
    expect(display('1892-07-04', provider)).toEqual([['1892-07-03T11:26:56.000Z', '1892-07-05T11:26:56.000Z']]);
  });

  it('finds short and otherwise-hidden segments from a complete provider', () => {
    const first = schedule(0, [[-59 * 60_000, HOUR], [-58 * 60_000, 0]]);
    expect(resolveLocalDateIntervals('1970-01-01', 'Synthetic', first)).toEqual({
      status: 'existing', intervals: [{ start: -59 * 60_000, endExclusive: -58 * 60_000 }, { start: 0, endExclusive: DAY }],
    });
    const skippedExceptMinute = schedule(-10 * HOUR, [[10 * HOUR, 14 * HOUR], [10 * HOUR + 60_000, -10 * HOUR], [10 * HOUR + 120_000, 14 * HOUR]]);
    expect(resolveLocalDateIntervals('1970-01-01', 'Synthetic', skippedExceptMinute)).toEqual({
      status: 'existing', intervals: [{ start: 10 * HOUR + 60_000, endExclusive: 10 * HOUR + 120_000 }],
    });
  });

  it.each([
    ['lower edge', -DAY, 1_000, -1_000, DAY - 1_000],
    ['upper edge', 2 * DAY, 1_000, 0, DAY],
    ['date start', 0, 1_000, 0, DAY - 1_000],
    ['date end', DAY, 1_000, 0, DAY],
    ['last millisecond gap', DAY - 1, 1_000, 0, DAY - 1],
  ])('uses exact half-open boundaries at %s', (_name, transition, offset, start, endExclusive) => {
    expect(resolveLocalDateIntervals('1970-01-01', 'Synthetic', schedule(0, [[transition, offset]]))).toEqual({ status: 'existing', intervals: [{ start, endExclusive }] });
  });

  it('returns frozen values and does not expose mutable Date instances', () => {
    const result = resolveLocalDateIntervals('1970-01-01', 'UTC', schedule(0));
    expect(Object.isFrozen(result)).toBe(true);
    if (result.status !== 'existing') throw new Error('Expected interval');
    expect(Object.isFrozen(result.intervals)).toBe(true);
    expect(Object.isFrozen(result.intervals[0])).toBe(true);
    expect(typeof result.intervals[0].start).toBe('number');
  });
});

describe('malformed input and provider outcomes never become empty', () => {
  it.each([null, {}, '2001-02-29', '0000-02-30', '2000-13-01', '2000-01-00', '2000-1-01', '2000-01-01\n', '+010000-01-01'])('rejects date %j before consulting a provider', (date) => {
    const provider = schedule(0); const spy = vi.spyOn(provider, 'offsetMilliseconds');
    expect(resolveLocalDateIntervals(date, 'UTC', provider)).toEqual({ status: 'unresolved', reason: 'invalid-input' });
    expect(spy).not.toHaveBeenCalled();
  });
  it.each([undefined, null, {}, '', ' \t\n'])('rejects timezone %j before consulting a provider', (zone) => {
    expect(resolveLocalDateIntervals('1970-01-01', zone, schedule(0))).toEqual({ status: 'unresolved', reason: 'invalid-input' });
  });
  it('reports missing native capability and explicit absent provider', () => {
    vi.stubGlobal('Temporal', undefined);
    expect(resolveLocalDateIntervals('1970-01-01', 'UTC')).toEqual({ status: 'unresolved', reason: 'provider-unavailable' });
    expect(resolveLocalDateIntervals('1970-01-01', 'UTC', null)).toEqual({ status: 'unresolved', reason: 'provider-unavailable' });
  });
  it.each([{}, [], { completeness: 'sampled' }, { completeness: 'complete-transitions-v1', offsetMilliseconds: 3 }])('rejects malformed provider %j', (provider) => {
    expect(resolveLocalDateIntervals('1970-01-01', 'UTC', provider as unknown as CompleteTransitionProvider)).toEqual({ status: 'unresolved', reason: 'invalid-provider' });
  });
  it.each([NaN, Infinity, -Infinity, 0.5, DAY, -DAY, '0', null, Promise.resolve(0)])('rejects invalid offset %j', (value) => {
    const provider = { ...schedule(0), offsetMilliseconds: () => value } as CompleteTransitionProvider;
    expect(resolveLocalDateIntervals('1970-01-01', 'UTC', provider)).toEqual({ status: 'unresolved', reason: 'provider-violation' });
  });
  it.each([NaN, Infinity, -Infinity, -DAY, -DAY - 1, 0.5, 8_640_000_000_000_001, '0', undefined, Promise.resolve(null)])('rejects invalid/nonadvancing transition %j', (value) => {
    const provider = { ...schedule(0), nextTransitionMilliseconds: () => value } as CompleteTransitionProvider;
    expect(resolveLocalDateIntervals('1970-01-01', 'UTC', provider)).toEqual({ status: 'unresolved', reason: 'provider-violation' });
  });
  it.each(['offsetMilliseconds', 'nextTransitionMilliseconds'] as const)('contains %s failures without data or exception text', (method) => {
    const provider = { ...schedule(0), [method]: () => { throw new Error('private provider details'); } };
    expect(resolveLocalDateIntervals('1970-01-01', 'UTC', provider)).toEqual({ status: 'unresolved', reason: 'provider-failed' });
  });
  it('contains a throwing provider accessor', () => {
    const provider = Object.defineProperty({}, 'completeness', { get() { throw new Error('private'); } });
    expect(resolveLocalDateIntervals('1970-01-01', 'UTC', provider as CompleteTransitionProvider)).toEqual({ status: 'unresolved', reason: 'provider-failed' });
  });
  it('rejects a claimed transition with no offset change', () => {
    expect(resolveLocalDateIntervals('1970-01-01', 'UTC', { ...schedule(0), nextTransitionMilliseconds: () => 0 })).toEqual({ status: 'unresolved', reason: 'provider-violation' });
  });
  it.each(['before', 'after', 'omitted-last'] as const)('rejects observable %s offset disagreement without partial intervals', (variant) => {
    const provider = schedule(0, [[0, 1_000]]);
    const actual = provider.offsetMilliseconds.bind(provider);
    if (variant === 'omitted-last') provider.nextTransitionMilliseconds = () => null;
    else provider.offsetMilliseconds = (zone, t) => t === (variant === 'before' ? -1 : 0) ? 2_000 : actual(zone, t);
    expect(resolveLocalDateIntervals('1970-01-01', 'UTC', provider)).toEqual({ status: 'unresolved', reason: 'provider-violation' });
  });
  it('rejects a duplicate transition after accepting its first boundary', () => {
    const provider = { ...schedule(0, [[0, 1_000]]), nextTransitionMilliseconds: () => 0 };
    expect(resolveLocalDateIntervals('1970-01-01', 'UTC', provider)).toEqual({ status: 'unresolved', reason: 'provider-violation' });
  });
  it('admits 32 transitions but returns no partial coverage on the 33rd', () => {
    const changes: Change[] = Array.from({ length: 33 }, (_, i) => [i * 1_000, i % 2 === 0 ? 1_000 : 0]);
    expect(resolveLocalDateIntervals('1970-01-01', 'UTC', schedule(0, changes.slice(0, 32))).status).toBe('existing');
    const provider = schedule(0, changes); const spy = vi.spyOn(provider, 'nextTransitionMilliseconds');
    expect(resolveLocalDateIntervals('1970-01-01', 'UTC', provider)).toEqual({ status: 'unresolved', reason: 'transition-limit' });
    expect(spy).toHaveBeenCalledTimes(33);
  });
});

function fakeTemporal(offset: number, transition: bigint | null = null) {
  class Zoned {
    offsetNanoseconds = offset;
    epochNanoseconds = transition ?? 0n;
    getTimeZoneTransition() { return transition === null ? null : new Zoned(); }
  }
  class Instant {
    static fromEpochMilliseconds() { return { toZonedDateTimeISO: () => new Zoned() }; }
  }
  return { Instant, ZonedDateTime: Zoned };
}

describe('lazy Temporal adapter', () => {
  it('does no Temporal or Intl work while importing', async () => {
    let reads = 0;
    const original = Object.getOwnPropertyDescriptor(globalThis, 'Temporal');
    Object.defineProperty(globalThis, 'Temporal', { configurable: true, get() { reads += 1; throw new Error('eager access'); } });
    const intl = vi.spyOn(Intl, 'DateTimeFormat');
    try {
      vi.resetModules(); await import('./local-date-intervals');
      expect(reads).toBe(0); expect(intl).not.toHaveBeenCalled();
    } finally {
      if (original) Object.defineProperty(globalThis, 'Temporal', original);
      else Reflect.deleteProperty(globalThis, 'Temporal');
    }
  });
  it('feature detection does not resolve a timezone', () => {
    vi.stubGlobal('Temporal', fakeTemporal(0));
    const intl = vi.spyOn(Intl, 'DateTimeFormat');
    expect(createNativeTemporalTransitionProvider()?.completeness).toBe('complete-transitions-v1');
    expect(intl).not.toHaveBeenCalled();
  });
  it.each([{}, { Instant: {} }, { Instant: class {}, ZonedDateTime: class {} }])('reports missing required Temporal methods', (value) => {
    vi.stubGlobal('Temporal', value);
    expect(createNativeTemporalTransitionProvider()).toBeNull();
  });
  it('uses native identifier validation instead of accepting broader timeZoneLike input', () => {
    vi.stubGlobal('Temporal', fakeTemporal(0));
    expect(resolveLocalDateIntervals('1970-01-01', '2000-01-01T00:00[UTC]')).toEqual({ status: 'unresolved', reason: 'provider-failed' });
    expect(resolveLocalDateIntervals('1970-01-01', 'Synthetic/Invalid')).toEqual({ status: 'unresolved', reason: 'provider-failed' });
  });
  it('rejects disagreement with Intl instead of producing a false date', () => {
    vi.stubGlobal('Temporal', fakeTemporal(HOUR * 1_000_000));
    expect(resolveLocalDateIntervals('1970-01-01', 'UTC')).toEqual({ status: 'unresolved', reason: 'provider-violation' });
  });
  it('refuses sub-millisecond offsets and transitions rather than truncating', () => {
    vi.stubGlobal('Temporal', fakeTemporal(1));
    expect(resolveLocalDateIntervals('1970-01-01', 'UTC')).toEqual({ status: 'unresolved', reason: 'provider-violation' });
    vi.stubGlobal('Temporal', fakeTemporal(0, 1n));
    expect(resolveLocalDateIntervals('1970-01-01', 'UTC')).toEqual({ status: 'unresolved', reason: 'provider-violation' });
  });
  it('does not mistake a host call failure for an empty date', () => {
    const temporal = fakeTemporal(0);
    temporal.Instant.fromEpochMilliseconds = () => { throw new Error('private host failure'); };
    vi.stubGlobal('Temporal', temporal);
    expect(resolveLocalDateIntervals('1970-01-01', 'UTC')).toEqual({ status: 'unresolved', reason: 'provider-failed' });
  });
});
