/** Pure contact arithmetic, loaded when a saved chart needs personalization. */
import { ASPECTS, separation } from '../engine/aspects';
import type { AspectType } from '../engine/types';
import type { SavedChart } from '../profile/schema';

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

