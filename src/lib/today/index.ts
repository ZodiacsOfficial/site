/**
 * Pure, engine-free arithmetic for /today/. Natal points arrive from the
 * saved profile summary; moving positions arrive from committed daily data.
 */
import { ASPECTS, separation } from '../engine/aspects';
import type { AspectType } from '../engine/types';
import type { Profile, SavedChart } from '../profile/schema';

export const TODAY_STORAGE_KEY = 'zodiacs.today.v1';

export interface TodaySkyBody {
  body: string;
  lon: number;
  retrograde?: boolean;
}

export interface TodayNatalPoint {
  body: string;
  lon: number;
  retrograde?: boolean;
}

export interface TodayContact {
  transiting: string;
  transitingLon: number;
  transitingRetrograde: boolean;
  natal: string;
  natalLon: number;
  natalRetrograde: boolean;
  type: AspectType;
  separation: number;
  orb: number;
}

export interface TodayStreak {
  version: 1;
  count: number;
  lastOpenedUtcDay: string;
}

/** The most recently changed chart wins; timestamps are stored as ISO text. */
export function newestSavedChart(profile: Profile): SavedChart | null {
  return profile.charts.reduce<SavedChart | null>((latest, chart) => {
    if (!latest) return chart;
    const chartStamp = chart.updatedAt || chart.createdAt;
    const latestStamp = latest.updatedAt || latest.createdAt;
    return chartStamp > latestStamp ? chart : latest;
  }, null);
}

/** Bodies plus the two stored angles, when a timed chart has them. */
export function natalPointsForChart(chart: SavedChart): TodayNatalPoint[] {
  const points = chart.summary.bodies
    .filter(({ lon }) => Number.isFinite(lon))
    .map(({ body, lon, retrograde }) => ({ body, lon, retrograde }));
  const angles = chart.summary.angles;
  if (angles && Number.isFinite(angles.asc) && Number.isFinite(angles.mc)) {
    points.push(
      { body: 'Ascendant', lon: angles.asc, retrograde: false },
      { body: 'Midheaven', lon: angles.mc, retrograde: false },
    );
  }
  return points;
}

function closestMajorAspect(aLon: number, bLon: number) {
  const angle = separation(aLon, bLon);
  return ASPECTS.reduce<{ type: AspectType; target: number; orb: number } | null>((best, aspect) => {
    const orb = Math.abs(angle - aspect.angle);
    if (best && best.orb <= orb) return best;
    return { type: aspect.type, target: aspect.angle, orb };
  }, null);
}

/**
 * Every moving-to-natal major contact, sorted tightest first. `maxOrb` may be
 * Infinity when the caller needs the honest nearest miss for an empty state.
 */
export function rankTodayContacts(
  natal: TodayNatalPoint[],
  sky: TodaySkyBody[],
  maxOrb: number,
): TodayContact[] {
  const contacts: TodayContact[] = [];
  for (const moving of sky) {
    if (!Number.isFinite(moving.lon)) continue;
    for (const fixed of natal) {
      if (!Number.isFinite(fixed.lon)) continue;
      const aspect = closestMajorAspect(moving.lon, fixed.lon);
      if (!aspect || aspect.orb > maxOrb) continue;
      contacts.push({
        transiting: moving.body,
        transitingLon: moving.lon,
        transitingRetrograde: moving.retrograde === true,
        natal: fixed.body,
        natalLon: fixed.lon,
        natalRetrograde: fixed.retrograde === true,
        type: aspect.type,
        separation: separation(moving.lon, fixed.lon),
        orb: aspect.orb,
      });
    }
  }
  return contacts.sort((a, b) =>
    a.orb - b.orb
    || a.transiting.localeCompare(b.transiting)
    || a.natal.localeCompare(b.natal)
    || a.type.localeCompare(b.type));
}

export function selectTodayContacts(
  natal: TodayNatalPoint[],
  sky: TodaySkyBody[],
  maxOrb: number,
  limit = 3,
): TodayContact[] {
  return rankTodayContacts(natal, sky, maxOrb).slice(0, Math.max(0, limit));
}

export function nearestTodayContact(
  natal: TodayNatalPoint[],
  sky: TodaySkyBody[],
): TodayContact | null {
  return rankTodayContacts(natal, sky, Number.POSITIVE_INFINITY)[0] ?? null;
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
