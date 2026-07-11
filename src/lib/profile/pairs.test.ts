import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ShareChartInput } from '../share';
import {
  MAX_PAIRS,
  PAIRS_KEY,
  deletePair,
  loadPairs,
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

  it('refuses past the cap', () => {
    for (let i = 0; i < MAX_PAIRS; i += 1) {
      expect(savePair(pair(`p${i}`, chartSide('frida'), inputSide({ lat: i })))).toBe('saved');
    }
    expect(savePair(pair('overflow', chartSide('frida'), inputSide({ lat: 99 })))).toBe('full');
    expect(loadPairs()).toHaveLength(MAX_PAIRS);
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

describe('loadPairs', () => {
  it('returns empty for malformed or non-array storage', () => {
    storage.setItem(PAIRS_KEY, '{not-json');
    expect(loadPairs()).toEqual([]);
    storage.setItem(PAIRS_KEY, '{"version":1}');
    expect(loadPairs()).toEqual([]);
  });
});
