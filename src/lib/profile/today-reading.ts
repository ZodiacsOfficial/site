/**
 * Today's reading for a saved chart, from the committed daily sky. The Sun
 * and Moon's houses come first when the birth time is known (whole sign,
 * from the ascendant), then the closest aspects today's movers make to the
 * chart. The profile's Today card lists all of it; your page's header leads
 * with one line. Pure arithmetic over committed data: no ephemeris loads.
 */
import daily from '../../data/daily.json';
import { isCurrentUtcEdition } from '../edition-freshness';
import { findInterAspects } from '../engine/synastry';
import { TRANSIT_ORB, transitLine } from '../transits';
import { houseLine, wholeSignHouseFromAsc, type DailyBody } from '../daily';
import { signForLongitude } from '../signs';
import type { SavedChart } from './schema';

const MOVERS = new Set(['Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']);

export function todayReading(chart: SavedChart) {
  const natal = chart.summary.bodies.map(({ body, lon }) => ({ body, lon }));
  const sky = daily.bodies.filter((b) => MOVERS.has(b.body)).map(({ body, lon }) => ({ body, lon }));
  const hits = findInterAspects(sky, natal)
    .filter((a) => a.orb <= TRANSIT_ORB)
    .sort((x, y) => x.orb - y.orb)
    .slice(0, 4);

  // Real natal houses (whole sign from the ascendant) when the birth
  // time is known — the Sun and Moon read from YOUR rooms, not solar ones.
  let houseLines: ReturnType<typeof houseLine>[] = [];
  const asc = chart.summary.angles?.asc;
  if (chart.birth.timeKnown && asc != null && chart.summary.houseSystem === 'whole') {
    const ascSign = signForLongitude(asc).slug;
    houseLines = daily.bodies
      .filter((b) => b.body === 'Sun' || b.body === 'Moon')
      .map((b) => houseLine(b as DailyBody, wholeSignHouseFromAsc(b.sign, ascSign)));
  }
  return { hits, houseLines };
}

export interface TodayLead {
  /** The edition's date, YYYY-MM-DD. */
  date: string;
  /** The Moon's phase on that date, e.g. "Waxing Gibbous". */
  phase: string;
  text: string;
}

/**
 * The one line your page leads with: the Moon's house, which turns over
 * every two or three days, else today's closest aspect. Null on a day
 * with neither, when the Today card says the sky is quiet, and whenever
 * the committed edition is not the current UTC day: the lines say
 * "today", so an edition a late deploy left behind is not shown as one.
 */
export function todayLead(chart: SavedChart, now: Date = new Date()): TodayLead | null {
  if (!isCurrentUtcEdition(daily.date, now)) return null;
  const { hits, houseLines } = todayReading(chart);
  const moon = houseLines.find((line) => line.body === 'Moon');
  const text = moon?.text ?? (hits[0] ? transitLine(hits[0].a, hits[0].type, hits[0].b) : null);
  return text ? { date: daily.date, phase: daily.moon.phase, text } : null;
}
