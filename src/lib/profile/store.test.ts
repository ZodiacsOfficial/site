import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ENGINE_VERSION } from '../engine/types';
import type { Chart, HouseSystem } from '../engine/types';
import { PROFILE_DELETIONS_KEY, loadChartDeletions } from './deletions';
import { EMPTY_PROFILE, MAX_CHARTS, PROFILE_KEY } from './schema';
import type { SavedChart, SavedChartRelationship } from './schema';
import {
  deleteChart,
  getPrimarySelfChart,
  loadProfile,
  markPrimarySelfChart,
  replaceProfile,
  saveChart,
} from './store';
import { resolveSavedChart, type SavedChartEngineLoader } from './resolve';

const YEAR_AHEAD_CACHE_KEY = 'zodiacs.yearahead.v1';
const NOW = '2026-07-10T12:00:00.000Z';

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

interface ChartOptions {
  name?: string;
  createdAt?: string;
  updatedAt?: string;
  date?: string;
  time?: string | null;
  timeKnown?: boolean;
  place?: boolean;
  lat?: number;
  lon?: number;
  houseSystem?: HouseSystem;
  engineVersion?: string;
  relationship?: SavedChartRelationship;
}

function makeChart(id: string, options: ChartOptions = {}): SavedChart {
  const time = options.time === undefined ? '12:00' : options.time;
  return {
    id,
    name: options.name ?? id,
    ...(options.relationship ? { relationship: options.relationship } : {}),
    createdAt: options.createdAt ?? '2026-07-01T00:00:00.000Z',
    updatedAt: options.updatedAt ?? '2026-07-01T00:00:00.000Z',
    birth: {
      date: options.date ?? '1990-01-01',
      time,
      timeKnown: options.timeKnown ?? time !== null,
      place: options.place === false ? null : {
        name: 'Bangkok',
        admin1: 'Bangkok',
        country: 'TH',
        lat: options.lat ?? 13.7563,
        lon: options.lon ?? 100.5018,
        tz: 'Asia/Bangkok',
      },
    },
    summary: {
      engineVersion: options.engineVersion ?? ENGINE_VERSION,
      utcISO: '1990-01-01T05:00:00.000Z',
      houseSystem: options.houseSystem ?? 'whole',
      bodies: [{ body: 'Sun', lon: 280, retrograde: false }],
      angles: { asc: 12, mc: 102 },
      flags: [],
    },
  };
}

let storage: MemoryStorage;

function seedProfile(charts: SavedChart[]): void {
  storage.setItem(PROFILE_KEY, JSON.stringify({ ...EMPTY_PROFILE, charts }));
}

beforeEach(() => {
  storage = new MemoryStorage();
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('window', { dispatchEvent: vi.fn() });
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NOW));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('saveChart', () => {
  it('preserves a rename when an opened chart is saved again without an explicit name', () => {
    const existing = makeChart('kept-id', {
      name: 'Mom',
      createdAt: '2025-01-01T00:00:00.000Z',
    });
    seedProfile([existing]);
    storage.setItem(PROFILE_DELETIONS_KEY, JSON.stringify([
      { id: existing.id, deletedAt: '2026-07-09T00:00:00.000Z' },
    ]));

    const incoming = makeChart('new-random-id', {
      name: 'Fresh calculation',
      createdAt: '2026-07-10T11:59:00.000Z',
      engineVersion: 'next-engine',
    });

    expect(saveChart(incoming)).toBe('updated');
    const [saved] = loadProfile().charts;
    expect(loadProfile().charts).toHaveLength(1);
    expect(saved.id).toBe(existing.id);
    expect(saved.createdAt).toBe(existing.createdAt);
    expect(saved.updatedAt).toBe(NOW);
    expect(saved.name).toBe('Mom');
    expect(saved.summary.engineVersion).toBe('next-engine');
    expect(loadChartDeletions()).toEqual([]);
  });

  it('uses an explicit name for matched updates and new charts', () => {
    seedProfile([makeChart('existing', { name: 'Mom' })]);

    expect(saveChart(makeChart('incoming', { name: 'Auto name' }), {
      explicitName: '  Aunt Ana  ',
    })).toBe('updated');
    expect(loadProfile().charts[0].name).toBe('Aunt Ana');

    expect(saveChart(makeChart('new-person', { lat: 14, name: 'Auto name' }), {
      explicitName: 'Friend',
    })).toBe('saved');
    expect(loadProfile().charts[0].name).toBe('Friend');
  });

  it('treats an empty explicit name as non-explicit', () => {
    seedProfile([makeChart('existing', { name: 'Mom' })]);

    expect(saveChart(makeChart('incoming', { name: 'Auto name' }), {
      explicitName: '   ',
    })).toBe('updated');
    expect(loadProfile().charts[0].name).toBe('Mom');
  });

  it.each<[string, ChartOptions]>([
    ['date', { date: '1990-01-02' }],
    ['time', { time: '13:00' }],
    ['latitude', { lat: 14 }],
    ['longitude', { lon: 101 }],
    ['house system', { houseSystem: 'placidus' }],
  ])('mints a new chart when %s differs', (_field, difference) => {
    seedProfile([makeChart('existing')]);

    expect(saveChart(makeChart('incoming', difference))).toBe('saved');
    expect(loadProfile().charts.map((chart) => chart.id)).toEqual(['incoming', 'existing']);
  });

  it('does not dedupe charts that have no stored coordinates', () => {
    seedProfile([makeChart('existing', { place: false })]);

    expect(saveChart(makeChart('incoming', { place: false }))).toBe('saved');
    expect(loadProfile().charts).toHaveLength(2);
  });

  it('updates an input match at capacity but rejects a new input', () => {
    const charts = Array.from({ length: MAX_CHARTS }, (_, index) => (
      makeChart(`chart-${index}`, { lat: index })
    ));
    seedProfile(charts);

    expect(saveChart(makeChart('replacement-id', { lat: 10, name: 'Updated ten' }), {
      explicitName: 'Updated ten',
    })).toBe('updated');
    expect(loadProfile().charts).toHaveLength(MAX_CHARTS);
    expect(loadProfile().charts.find((chart) => chart.id === 'chart-10')?.name).toBe('Updated ten');
    expect(saveChart(makeChart('overflow', { lat: 100 }))).toBe('full');
  });

  it('preserves a saved relationship when a recalculation does not classify the chart', () => {
    seedProfile([makeChart('existing', { relationship: 'self' })]);

    expect(saveChart(makeChart('incoming'))).toBe('updated');
    expect(loadProfile().charts[0].relationship).toBe('self');
  });

  it('makes an incoming self chart canonical and classifies every other chart as other', () => {
    seedProfile([
      makeChart('legacy-self', { relationship: 'self' }),
      makeChart('unclassified', { lat: 14 }),
    ]);

    expect(saveChart(makeChart('new-self', { lat: 15, relationship: 'self' }))).toBe('saved');
    expect(loadProfile().charts.map(({ id, relationship }) => ({ id, relationship }))).toEqual([
      { id: 'new-self', relationship: 'self' },
      { id: 'legacy-self', relationship: 'other' },
      { id: 'unclassified', relationship: 'other' },
    ]);
  });

  it('lets an explicit incoming other classification replace a saved self classification', () => {
    seedProfile([makeChart('existing', { relationship: 'self' })]);

    expect(saveChart(makeChart('incoming', { relationship: 'other' }))).toBe('updated');
    expect(getPrimarySelfChart()).toBeNull();
    expect(loadProfile().charts[0].relationship).toBe('other');
  });
});

describe('markPrimarySelfChart', () => {
  it('marks exactly one canonical self chart and demotes every other saved chart', () => {
    seedProfile([
      makeChart('old-self', { relationship: 'self' }),
      makeChart('chosen', { lat: 14 }),
      makeChart('third', { lat: 15 }),
    ]);

    expect(markPrimarySelfChart('chosen')).toBe(true);
    expect(getPrimarySelfChart()?.id).toBe('chosen');
    expect(loadProfile().charts.map(({ id, relationship }) => ({ id, relationship }))).toEqual([
      { id: 'old-self', relationship: 'other' },
      { id: 'chosen', relationship: 'self' },
      { id: 'third', relationship: 'other' },
    ]);
  });

  it('does not rewrite the profile when the requested chart is missing', () => {
    const existing = makeChart('existing', { relationship: 'self' });
    seedProfile([existing]);

    expect(markPrimarySelfChart('missing')).toBe(false);
    expect(loadProfile().charts).toEqual([existing]);
  });

  it('fails closed when legacy data contains more than one self chart', () => {
    seedProfile([
      makeChart('first-self', { relationship: 'self' }),
      makeChart('second-self', { relationship: 'self', lat: 14 }),
    ]);

    expect(getPrimarySelfChart()).toBeNull();
  });
});

describe('deleteChart', () => {
  it('prunes only the deleted chart from the year-ahead cache', () => {
    seedProfile([makeChart('remove-me'), makeChart('keep-me', { lat: 14 })]);
    storage.setItem(YEAR_AHEAD_CACHE_KEY, JSON.stringify({
      'remove-me': { computedAt: 'old' },
      'keep-me': { computedAt: 'current' },
    }));

    expect(deleteChart('remove-me')).toBe(true);
    expect(loadProfile().charts.map((chart) => chart.id)).toEqual(['keep-me']);
    expect(JSON.parse(storage.getItem(YEAR_AHEAD_CACHE_KEY)!)).toEqual({
      'keep-me': { computedAt: 'current' },
    });
    expect(loadChartDeletions().map((deletion) => deletion.id)).toEqual(['remove-me']);
  });

  it('does not let a malformed derived cache block profile deletion', () => {
    seedProfile([makeChart('remove-me')]);
    storage.setItem(YEAR_AHEAD_CACHE_KEY, '{not-json');

    expect(deleteChart('remove-me')).toBe(true);
    expect(loadProfile().charts).toEqual([]);
    expect(storage.getItem(YEAR_AHEAD_CACHE_KEY)).toBe('{not-json');
  });
});

describe('replaceProfile', () => {
  it('prunes cached years for charts removed by a remote profile merge', () => {
    storage.setItem(YEAR_AHEAD_CACHE_KEY, JSON.stringify({
      'remote-deleted': { computedAt: 'old' },
      'remote-kept': { computedAt: 'current' },
    }));
    const profile = {
      ...EMPTY_PROFILE,
      charts: [makeChart('remote-kept')],
    };

    expect(replaceProfile(profile)).toBe(true);
    expect(loadProfile()).toEqual(profile);
    expect(JSON.parse(storage.getItem(YEAR_AHEAD_CACHE_KEY)!)).toEqual({
      'remote-kept': { computedAt: 'current' },
    });
  });
});

describe('resolveSavedChart', () => {
  it('returns a current stored summary without loading the engine', async () => {
    let loads = 0;
    const loader: SavedChartEngineLoader = async () => {
      loads += 1;
      throw new Error('must stay lazy');
    };

    await expect(resolveSavedChart(makeChart('current'), loader)).resolves.toEqual({
      bodies: [{ body: 'Sun', lon: 280 }],
      asc: 12,
      timeKnown: true,
    });
    expect(loads).toBe(0);
  });

  it('does not load the engine for a stale chart without source coordinates', async () => {
    let loads = 0;
    const loader: SavedChartEngineLoader = async () => {
      loads += 1;
      throw new Error('must stay lazy');
    };

    const resolved = await resolveSavedChart(makeChart('stale', {
      engineVersion: 'old',
      place: false,
    }), loader);
    expect(resolved.bodies).toEqual([{ body: 'Sun', lon: 280 }]);
    expect(loads).toBe(0);
  });

  it('recomputes a stale chart from birth input with the injected lazy engine', async () => {
    let received: Chart['input'] | null = null;
    const loader: SavedChartEngineLoader = async () => ({
      computeChart(input) {
        received = input;
        return {
          input,
          bodies: [{ body: 'Sun', lon: 42, lat: 0, speed: 1, retrograde: false }],
          angles: { asc: 5, mc: 95, dsc: 185, ic: 275 },
          houses: null,
          aspects: [],
          flags: input.flags ?? [],
          engineVersion: ENGINE_VERSION,
        };
      },
    });

    const resolved = await resolveSavedChart(makeChart('stale', {
      engineVersion: 'old',
      time: null,
      timeKnown: false,
      houseSystem: 'placidus',
    }), loader);

    expect(received).not.toBeNull();
    expect(received!.utc.toISOString()).toBe('1990-01-01T05:00:00.000Z');
    expect(received).toMatchObject({
      latitude: 13.7563,
      longitude: 100.5018,
      houseSystem: 'placidus',
      timeKnown: false,
      flags: [],
    });
    expect(resolved).toEqual({
      bodies: [{ body: 'Sun', lon: 42 }],
      asc: 5,
      timeKnown: false,
    });
  });

  it('falls back to the stored summary when stale recomputation fails', async () => {
    const loader: SavedChartEngineLoader = async () => {
      throw new Error('offline');
    };
    const chart = makeChart('stale', { engineVersion: 'old' });

    await expect(resolveSavedChart(chart, loader)).resolves.toEqual({
      bodies: [{ body: 'Sun', lon: 280 }],
      asc: 12,
      timeKnown: true,
    });
  });
});
