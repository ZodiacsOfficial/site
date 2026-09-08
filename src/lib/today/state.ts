/** Visit/profile helpers stay independent of contact arithmetic on first load. */
import type { Profile, SavedChart } from '../profile/schema';

export const TODAY_STORAGE_KEY = 'zodiacs.today.v1';

export interface TodayStreak {
  version: 1;
  count: number;
  lastOpenedUtcDay: string;
}

/** The most recently changed chart wins; timestamps are stored as ISO text. */
export function newestSavedChart(profile: Profile): SavedChart | null {
  return profile.charts.filter((chart) => (
    chart != null
    && chart.summary != null
    && Array.isArray(chart.summary.bodies)
    && chart.summary.bodies.some((body) => body != null && Number.isFinite(body.lon))
  )).reduce<SavedChart | null>((latest, chart) => {
    if (!latest) return chart;
    const chartStamp = typeof chart.updatedAt === 'string'
      ? chart.updatedAt
      : (typeof chart.createdAt === 'string' ? chart.createdAt : '');
    const latestStamp = typeof latest.updatedAt === 'string'
      ? latest.updatedAt
      : (typeof latest.createdAt === 'string' ? latest.createdAt : '');
    return chartStamp > latestStamp ? chart : latest;
  }, null);
}

export function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function dayNumber(day: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const value = Date.parse(`${day}T00:00:00.000Z`);
  return Number.isFinite(value) ? Math.floor(value / 86_400_000) : null;
}

/** Increment once per UTC day; a missed or backward day starts again at one. */
export function nextTodayStreak(previous: unknown, openedAt: Date): TodayStreak {
  const today = utcDay(openedAt);
  if (!previous || typeof previous !== 'object') {
    return { version: 1, count: 1, lastOpenedUtcDay: today };
  }
  const candidate = previous as Partial<TodayStreak>;
  const oldDay = typeof candidate.lastOpenedUtcDay === 'string'
    ? dayNumber(candidate.lastOpenedUtcDay)
    : null;
  const newDay = dayNumber(today);
  const oldCount = Number.isInteger(candidate.count) && Number(candidate.count) > 0
    ? Number(candidate.count)
    : 0;
  if (candidate.version !== 1 || oldDay == null || newDay == null || oldCount === 0) {
    return { version: 1, count: 1, lastOpenedUtcDay: today };
  }
  const elapsed = newDay - oldDay;
  if (elapsed === 0) {
    return { version: 1, count: oldCount, lastOpenedUtcDay: today };
  }
  return {
    version: 1,
    count: elapsed === 1 ? oldCount + 1 : 1,
    lastOpenedUtcDay: today,
  };
}

/** Best-effort storage adapter. Private browsing failures never block /today/. */
export function recordTodayOpen(storage: Pick<Storage, 'getItem' | 'setItem'>, openedAt = new Date()): TodayStreak {
  let previous: unknown = null;
  try {
    const raw = storage.getItem(TODAY_STORAGE_KEY);
    previous = raw ? JSON.parse(raw) : null;
  } catch {
    previous = null;
  }
  const next = nextTodayStreak(previous, openedAt);
  try {
    storage.setItem(TODAY_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // The in-memory count is still honest for this visit.
  }
  return next;
}
