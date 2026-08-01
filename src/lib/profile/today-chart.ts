import type { SavedChart } from './schema';

export const TODAY_CHART_PREFERENCE_KEY = 'zodiacs.today-chart.v1';
export const TODAY_CHART_EVENT = 'zodiacs:today-chart';

export interface TodayChartPreference {
  version: 1;
  chartId: string;
}

export type TodayChartStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface TodayChartResolution {
  chart: SavedChart | null;
  preference: TodayChartPreference | null;
  changed: boolean;
}

export function isTodayChartUsable(chart: unknown): chart is SavedChart {
  if (!chart || typeof chart !== 'object') return false;
  const candidate = chart as Partial<SavedChart>;
  return typeof candidate.id === 'string'
    && candidate.id.length > 0
    && candidate.summary != null
    && Array.isArray(candidate.summary.bodies)
    && candidate.summary.bodies.some((body) => body != null && Number.isFinite(body.lon));
}

function chartTimestamp(chart: SavedChart): string {
  return typeof chart.updatedAt === 'string'
    ? chart.updatedAt
    : (typeof chart.createdAt === 'string' ? chart.createdAt : '');
}

export function newestUsableTodayChart(charts: readonly SavedChart[]): SavedChart | null {
  return charts.filter(isTodayChartUsable).reduce<SavedChart | null>((latest, chart) => {
    if (!latest) return chart;
    return chartTimestamp(chart) > chartTimestamp(latest) ? chart : latest;
  }, null);
}

export function parseTodayChartPreference(raw: string | null): TodayChartPreference | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<TodayChartPreference>;
    return parsed?.version === 1 && typeof parsed.chartId === 'string' && parsed.chartId.length > 0
      ? { version: 1, chartId: parsed.chartId }
      : null;
  } catch {
    return null;
  }
}

/**
 * Resolve a device's stable daily identity without mutating storage. A missing
 * or invalid preference falls back once to the newest usable chart; callers
 * persist the returned preference so later saves and renames cannot switch it.
 */
export function resolveTodayChartSelection(
  charts: readonly SavedChart[],
  rawPreference: string | null,
): TodayChartResolution {
  const parsed = parseTodayChartPreference(rawPreference);
  const preferred = parsed
    ? charts.find((chart) => isTodayChartUsable(chart) && chart.id === parsed.chartId) ?? null
    : null;
  if (preferred) return { chart: preferred, preference: parsed, changed: false };

  const fallback = newestUsableTodayChart(charts);
  const preference = fallback ? { version: 1 as const, chartId: fallback.id } : null;
  const canonicalRaw = preference ? JSON.stringify(preference) : null;
  return {
    chart: fallback,
    preference,
    changed: rawPreference !== canonicalRaw,
  };
}

function notifyTodayChart(chartId: string | null): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(TODAY_CHART_EVENT, { detail: { chartId } }));
}

function storageOrBrowser(storage?: TodayChartStorage): TodayChartStorage {
  return storage ?? localStorage;
}

/** Persist an explicit, already-validated chart ID from a saved-chart action. */
export function setTodayChartIdPreference(
  chartId: string,
  storage?: TodayChartStorage,
): boolean {
  if (!chartId) return false;
  try {
    const target = storageOrBrowser(storage);
    const next: TodayChartPreference = { version: 1, chartId };
    target.setItem(TODAY_CHART_PREFERENCE_KEY, JSON.stringify(next));
    notifyTodayChart(chartId);
    return true;
  } catch {
    return false;
  }
}

/** Resolve and, when needed, migrate the local preference to a valid chart. */
export function reconcileTodayChartPreference(
  charts: readonly SavedChart[],
  storage?: TodayChartStorage,
): SavedChart | null {
  const target = storageOrBrowser(storage);
  let raw: string | null = null;
  try {
    raw = target.getItem(TODAY_CHART_PREFERENCE_KEY);
  } catch {
    return newestUsableTodayChart(charts);
  }
  const resolved = resolveTodayChartSelection(charts, raw);
  if (!resolved.changed) return resolved.chart;
  try {
    if (resolved.preference) {
      target.setItem(TODAY_CHART_PREFERENCE_KEY, JSON.stringify(resolved.preference));
    } else {
      target.removeItem(TODAY_CHART_PREFERENCE_KEY);
    }
    notifyTodayChart(resolved.preference?.chartId ?? null);
  } catch {
    // The in-memory fallback remains useful when storage is unavailable.
  }
  return resolved.chart;
}

/** Explicit visitor choice. Merely opening or inspecting a chart never calls this. */
export function setTodayChartPreference(
  chartId: string,
  charts: readonly SavedChart[],
  storage?: TodayChartStorage,
): boolean {
  const chart = charts.find((candidate) => isTodayChartUsable(candidate) && candidate.id === chartId);
  if (!chart) return false;
  return setTodayChartIdPreference(chartId, storage);
}
