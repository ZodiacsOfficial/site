/**
 * Season clock for the Zodiac Games. One definition of "Virgo Season"
 * sitewide: the tropical date ranges in `SIGNS` (the same ranges the
 * Registry publishes and scripts/astrofolio-season.mjs resolves), evaluated
 * in UTC only, so a season instance is deterministic for a given instant.
 *
 * A season instance is year-qualified by its UTC start date — the Capricorn
 * season that opens in December 2026 is `capricorn-2026` through January.
 */
import { seasonSign, signBySlug, type Sign } from '../signs.js';

const DAY_MS = 86_400_000;

export const SEASON_ID_PATTERN =
  /^(aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces)-20[0-9]{2}$/;

export interface SeasonInstance {
  /** e.g. "virgo-2026" */
  id: string;
  sign: Sign;
  /** UTC year the season instance starts in. */
  startYear: number;
  /** First instant of the season, UTC midnight. */
  startUtc: number;
  /** First instant after the season ends, UTC midnight. */
  endUtcExclusive: number;
}

export function seasonInstanceAt(input: Date | number): SeasonInstance {
  const date = new Date(input);
  if (!Number.isFinite(date.getTime())) {
    throw new TypeError('Season resolution requires a valid date');
  }
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const sign = seasonSign(month, day);
  const [startMonth, startDay] = sign.start;
  const [endMonth, endDay] = sign.end;
  const wraps = startMonth > endMonth;
  // In a wrapping season (Capricorn), January dates belong to the instance
  // that started the previous December.
  const startYear = wraps && month === endMonth
    ? date.getUTCFullYear() - 1
    : date.getUTCFullYear();
  const endYear = wraps ? startYear + 1 : startYear;
  return {
    id: `${sign.slug}-${startYear}`,
    sign,
    startYear,
    startUtc: Date.UTC(startYear, startMonth - 1, startDay),
    endUtcExclusive: Date.UTC(endYear, endMonth - 1, endDay) + DAY_MS,
  };
}

/** Whole days left in the season, counting the current UTC day (min 1). */
export function daysLeftInSeason(season: SeasonInstance, now: Date | number): number {
  const instant = new Date(now).getTime();
  return Math.max(1, Math.ceil((season.endUtcExclusive - instant) / DAY_MS));
}

export interface IsoWeek {
  isoYear: number;
  isoWeek: number;
}

/** ISO-8601 week of the UTC calendar date — the Race's weekly stamp. */
export function isoWeekUtc(input: Date | number): IsoWeek {
  const source = new Date(input);
  if (!Number.isFinite(source.getTime())) {
    throw new TypeError('ISO week resolution requires a valid date');
  }
  const date = new Date(Date.UTC(
    source.getUTCFullYear(), source.getUTCMonth(), source.getUTCDate(),
  ));
  const weekday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - weekday + 3);
  const isoYear = date.getUTCFullYear();
  const jan4 = Date.UTC(isoYear, 0, 4);
  const jan4Weekday = (new Date(jan4).getUTCDay() + 6) % 7;
  const isoWeek = 1 + Math.round(
    ((date.getTime() - jan4) / DAY_MS - 3 + jan4Weekday) / 7,
  );
  return { isoYear, isoWeek };
}

export function seasonInstanceForId(id: string): SeasonInstance {
  const match = SEASON_ID_PATTERN.exec(id);
  if (!match) throw new Error(`Malformed season id: ${id}`);
  const sign = signBySlug(match[1]);
  const startYear = Number(id.slice(match[1].length + 1));
  const wraps = sign.start[0] > sign.end[0];
  return {
    id,
    sign,
    startYear,
    startUtc: Date.UTC(startYear, sign.start[0] - 1, sign.start[1]),
    endUtcExclusive:
      Date.UTC(startYear + (wraps ? 1 : 0), sign.end[0] - 1, sign.end[1]) + DAY_MS,
  };
}
