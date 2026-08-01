import { describe, expect, it } from 'vitest';
import type { SavedChart } from './schema';
import {
  TODAY_CHART_PREFERENCE_KEY,
  parseTodayChartPreference,
  reconcileTodayChartPreference,
  resolveTodayChartSelection,
  setTodayChartIdPreference,
  setTodayChartPreference,
} from './today-chart';

class MemoryStorage implements Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
  removeItem(key: string): void { this.values.delete(key); }
}

function chart(id: string, updatedAt: string, usable = true): SavedChart {
  return {
    id,
    name: id,
    createdAt: updatedAt,
    updatedAt,
    birth: { date: '1990-01-01', time: null, timeKnown: false, place: null },
    summary: {
      engineVersion: 'test',
      utcISO: '1990-01-01T12:00:00.000Z',
      houseSystem: 'whole',
      bodies: usable ? [{ body: 'Sun', lon: 280, retrograde: false }] : [],
      angles: null,
      flags: [],
    },
  };
}

describe('Today chart preference', () => {
  it('defaults to the newest usable chart once', () => {
    const charts = [
      chart('older', '2026-01-01T00:00:00.000Z'),
      chart('broken', '2026-08-01T00:00:00.000Z', false),
      chart('newer', '2026-07-01T00:00:00.000Z'),
    ];
    expect(resolveTodayChartSelection(charts, null)).toMatchObject({
      chart: { id: 'newer' },
      preference: { version: 1, chartId: 'newer' },
      changed: true,
    });
  });

  it('keeps a valid choice when a newer chart is added or renamed', () => {
    const preference = JSON.stringify({ version: 1, chartId: 'older' });
    const resolved = resolveTodayChartSelection([
      chart('older', '2026-08-02T00:00:00.000Z'),
      chart('newer', '2026-08-03T00:00:00.000Z'),
    ], preference);
    expect(resolved.chart?.id).toBe('older');
    expect(resolved.changed).toBe(false);
  });

  it('falls back after deletion and clears when no usable chart remains', () => {
    const selected = JSON.stringify({ version: 1, chartId: 'deleted' });
    expect(resolveTodayChartSelection([
      chart('remaining', '2026-07-01T00:00:00.000Z'),
    ], selected).preference?.chartId).toBe('remaining');
    expect(resolveTodayChartSelection([], selected)).toEqual({
      chart: null,
      preference: null,
      changed: true,
    });
  });

  it('persists only an explicit valid selection', () => {
    const storage = new MemoryStorage();
    const charts = [chart('a', '2026-01-01T00:00:00.000Z'), chart('b', '2026-02-01T00:00:00.000Z')];
    expect(setTodayChartPreference('missing', charts, storage)).toBe(false);
    expect(storage.getItem(TODAY_CHART_PREFERENCE_KEY)).toBeNull();
    expect(setTodayChartPreference('a', charts, storage)).toBe(true);
    expect(parseTodayChartPreference(storage.getItem(TODAY_CHART_PREFERENCE_KEY))).toEqual({
      version: 1,
      chartId: 'a',
    });
  });

  it('lets a saved-chart CTA synchronously choose its known chart ID', () => {
    const storage = new MemoryStorage();
    expect(setTodayChartIdPreference('', storage)).toBe(false);
    expect(setTodayChartIdPreference('newly-saved', storage)).toBe(true);
    expect(parseTodayChartPreference(storage.getItem(TODAY_CHART_PREFERENCE_KEY))).toEqual({
      version: 1,
      chartId: 'newly-saved',
    });
  });

  it('repairs malformed storage through the shared reconciler', () => {
    const storage = new MemoryStorage();
    storage.setItem(TODAY_CHART_PREFERENCE_KEY, '{broken');
    expect(reconcileTodayChartPreference([chart('valid', '2026-01-01T00:00:00.000Z')], storage)?.id)
      .toBe('valid');
    expect(parseTodayChartPreference(storage.getItem(TODAY_CHART_PREFERENCE_KEY))?.chartId).toBe('valid');
  });
});
