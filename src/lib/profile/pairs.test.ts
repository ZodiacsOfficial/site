import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ShareChartInput } from '../share';
import type { PositionsShareInput } from '../share-positions';
import {
  MAX_PAIRS,
  PAIRS_KEY,
  deletePair,
  loadPairs,
  pairSideLabels,
  positionsPairSide,
  prunePairs,
  savePair,
} from './pairs';
import type { SavedPair, SavedPairSide } from './pairs';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, String(value));
  }
}

const input = (overrides: Partial<ShareChartInput> = {}): ShareChartInput => ({
  date: '1907-07-06',
  time: '08:30',
  timeKnown: true,
  lat: 19.35,
  lon: -99.16,
  tz: 'America/Mexico_City',
  houseSystem: 'whole',
  ...overrides,
});

const chartSide = (chartId: string, label = chartId): SavedPairSide => ({ kind: 'chart', chartId, label });
const inputSide = (overrides: Partial<ShareChartInput> = {}, label = 'Guest'): SavedPairSide => ({
  kind: 'input', input: input(overrides), label,
});

const pair = (id: string, a: SavedPairSide, b: SavedPairSide): SavedPair => ({
  id, createdAt: '2026-07-11T00:00:00.000Z', a, b,
});

const positions = (offset = 0): PositionsShareInput => ({
  bodies: [
    'Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter',
    'Saturn', 'Uranus', 'Neptune', 'Pluto', 'North Node', 'South Node',
  ].map((body, index) => ({ body, lon: (index * 27 + offset) % 360 })) as PositionsShareInput['bodies'],
  angles: { asc: (88 + offset) % 360, mc: (2 + offset) % 360 },
  houseSystem: 'whole',
  engineVersion: '1.0.0',
});

let storage: MemoryStorage;

beforeEach(() => {
  storage = new MemoryStorage();
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('window', { dispatchEvent: vi.fn() });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('savePair', () => {
  it('round-trips and keeps the newest comparison first', () => {
    expect(savePair(pair('first', chartSide('frida'), chartSide('diego')))).toBe('saved');
    expect(savePair(pair('second', chartSide('frida'), inputSide()))).toBe('saved');
    expect(loadPairs().map((p) => p.id)).toEqual(['second', 'first']);
  });

  it('treats A×B and B×A as the same comparison', () => {
    expect(savePair(pair('ab', chartSide('frida'), chartSide('diego')))).toBe('saved');
    expect(savePair(pair('ba', chartSide('diego'), chartSide('frida')))).toBe('exists');
    expect(loadPairs()).toHaveLength(1);
  });

  it('dedupes inline sides by birth input, not by label', () => {
    expect(savePair(pair('one', chartSide('frida'), inputSide({}, 'Guest')))).toBe('saved');
    expect(savePair(pair('two', chartSide('frida'), inputSide({}, 'Renamed guest')))).toBe('exists');
    expect(savePair(pair('three', chartSide('frida'), inputSide({ date: '1907-07-07' })))).toBe('saved');
  });

  it('dedupes the same person saved once by value and once as a chart with a birth key', () => {
    const diegoInput: Partial<ShareChartInput> = {
      date: '1886-12-08', time: '20:00', lat: 21.02, lon: -101.26,
    };
    const diegoChart: SavedPairSide = {
      kind: 'chart', chartId: 'diego', label: 'Diego',
      birthKey: '1886-12-08|20:00|21.02|-101.26',
    };
    expect(savePair(pair('by-value', chartSide('frida'), inputSide(diegoInput, 'Diego')))).toBe('saved');
    expect(savePair(pair('by-chart', chartSide('frida'), diegoChart))).toBe('exists');
    // Without the birth key (chart stored placeless) they stay distinct.
    expect(savePair(pair('placeless', chartSide('frida'), chartSide('diego')))).toBe('saved');
  });

  it('refuses past the cap', () => {
    expect(MAX_PAIRS).toBe(24);
    for (let i = 0; i < MAX_PAIRS; i += 1) {
      expect(savePair(pair(`p${i}`, chartSide('frida'), inputSide({ lat: i })))).toBe('saved');
    }
    expect(savePair(pair('overflow', chartSide('frida'), inputSide({ lat: 99 })))).toBe('full');
    expect(loadPairs()).toHaveLength(MAX_PAIRS);
  });

  it('stores and dedupes privacy-safe positions without birth details', () => {
    const a = positionsPairSide(positions(), ' Their chart ');
    const b = positionsPairSide(positions(10), 'My chart');
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(savePair(pair('positions', a!, b!))).toBe('saved');
    expect(savePair(pair('positions-reversed', b!, a!))).toBe('exists');

    const stored = JSON.stringify(loadPairs());
    expect(stored).not.toContain('date');
    expect(stored).not.toContain('place');
    expect(stored).not.toContain('timezone');
    expect(stored).not.toContain('email');
    expect(stored).toContain('"received":true');
  });
});

describe('deletePair', () => {
  it('removes only the named pair', () => {
    savePair(pair('keep', chartSide('frida'), chartSide('diego')));
    savePair(pair('drop', chartSide('frida'), inputSide()));
    expect(deletePair('drop')).toBe(true);
    expect(loadPairs().map((p) => p.id)).toEqual(['keep']);
  });
});

describe('prunePairs', () => {
  it('drops pairs referencing missing charts and keeps the rest', () => {
    savePair(pair('goes', chartSide('frida'), chartSide('diego')));
    savePair(pair('stays-inline', inputSide(), inputSide({ date: '1886-12-08' })));
    savePair(pair('stays-other', chartSide('diego'), inputSide()));
    prunePairs(new Set(['diego']));
    expect(loadPairs().map((p) => p.id)).toEqual(['stays-other', 'stays-inline']);
  });

  it('writes nothing when every pair still resolves', () => {
    savePair(pair('stays', chartSide('diego'), inputSide()));
    const before = storage.getItem(PAIRS_KEY);
    const dispatches = (window.dispatchEvent as ReturnType<typeof vi.fn>).mock.calls.length;
    prunePairs(new Set(['diego']));
    expect(storage.getItem(PAIRS_KEY)).toBe(before);
    expect((window.dispatchEvent as ReturnType<typeof vi.fn>).mock.calls.length).toBe(dispatches);
  });
});

describe('pairSideLabels', () => {
  it('reads live chart names, trims handles, and falls back to stored labels', () => {
    const p = pair('p', chartSide('frida', 'Old label'), inputSide({}, 'Guest'));
    expect(pairSideLabels(p, [{ id: 'frida', name: 'Cancer Sun · 1907-07-06' }])).toEqual(['Cancer Sun', 'Guest']);
    expect(pairSideLabels(p, [])).toEqual(['Old label', 'Guest']);
  });
});

describe('loadPairs', () => {
  it('returns empty for malformed or non-array storage', () => {
    storage.setItem(PAIRS_KEY, '{not-json');
    expect(loadPairs()).toEqual([]);
    storage.setItem(PAIRS_KEY, '{"version":1}');
    expect(loadPairs()).toEqual([]);
  });

  it('filters malformed elements instead of crashing the reader', () => {
    const good = pair('good', chartSide('frida'), inputSide());
    storage.setItem(PAIRS_KEY, JSON.stringify([
      null,
      {},
      { id: 'no-sides', createdAt: 'x' },
      { id: 'bad-kind', createdAt: 'x', a: { kind: 'mystery', label: 'A' }, b: chartSide('frida') },
      { id: 'chartless', createdAt: 'x', a: { kind: 'chart', label: 'A' }, b: chartSide('frida') },
      { id: 'inputless', createdAt: 'x', a: { kind: 'input', label: 'A' }, b: chartSide('frida') },
      good,
    ]));
    expect(loadPairs()).toEqual([good]);
    // The next write persists only the valid survivors — zombies can't
    // eat the cap forever.
    expect(savePair(pair('another', chartSide('diego'), inputSide()))).toBe('saved');
    expect(loadPairs().map((p) => p.id)).toEqual(['another', 'good']);
  });

  it('rejects positions sides with extra fields or without received provenance', () => {
    const clean = positionsPairSide(positions(), 'Guest')!;
    const other = positionsPairSide(positions(10), 'Me')!;
    storage.setItem(PAIRS_KEY, JSON.stringify([
      pair('missing-provenance', { ...clean, received: false } as unknown as SavedPairSide, other),
      pair('extra-private-field', { ...clean, date: '1907-07-06' } as unknown as SavedPairSide, other),
      pair('valid-positions', clean, other),
    ]));
    expect(loadPairs().map((item) => item.id)).toEqual(['valid-positions']);
  });
});
