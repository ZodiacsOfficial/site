/**
 * Local birth time → UTC, honoring the history available for the IANA zone —
 * DST, wartime shifts, pre-standardization local mean time (which can
 * carry seconds, e.g. America/Mexico_City at −6:36:36 before 1922).
 *
 * The browser/Node host's ICU data exposes its tzdb history through Intl.
 * Coverage and tzdb version therefore depend on that runtime. Never hand-roll
 * offsets.
 *
 * One era needs more than the zone: before a place adopted a legal time, its
 * clocks kept that place's own mean solar time, and tzdb records that only
 * for the zone's reference city. Given the birthplace's longitude, instants
 * before the zone's local mean time era ended (src/data/tz-lmt.json, from a
 * pinned tzdb release) use the birthplace's mean time — four minutes per
 * degree — instead of the reference city's. Every later instant is Intl's.
 * The table loads on demand, only for dates that can need it: await
 * prepareLocalTime(date) before resolving a birthplace time.
 */
import { TECHNICAL_OFFSET_LOCALE, TECHNICAL_WALL_LOCALE } from './technical-locales';
import { parseCivilDate, parseCivilTime } from './civil-date';

export interface LocalTimeOptions {
  /**
   * The birthplace's longitude, degrees east. Without it, a time from the
   * local mean time era uses the zone reference city's mean time.
   */
  longitude?: number;
}

export interface LocalTimeResolution {
  utc: Date;
  /** Offset applied, minutes east of UTC (may be fractional for LMT). */
  offsetMinutes: number;
  flags: ('dst-gap' | 'dst-fold' | 'lmt')[];
  /**
   * Present when the birthplace's own mean time decided the instant: the
   * longitude used, and the offset the zone alone would have applied.
   */
  localMeanTime?: { longitude: number; zoneOffsetMinutes: number };
}

/** Unix seconds at which each zone's local mean time era ended, once loaded. */
let lmtEraEnd: Readonly<Record<string, number>> | null = null;
let lmtEraLoad: Promise<void> | null = null;

/**
 * Every era in the table ends before this instant (the last, Niue and
 * Rarotonga, in October 1952); a test holds the table to it.
 */
export const LOCAL_MEAN_TIME_ERAS_END_BEFORE = Date.UTC(1953, 0, 1);

/**
 * Loads the local mean time era table when `date` (YYYY-MM-DD) could fall in
 * an era, and does nothing for later dates. Resolving a birthplace time from
 * such a date without it throws rather than guess.
 */
export function prepareLocalTime(date: string): Promise<void> {
  const year = Number(String(date).slice(0, 4));
  if (Number.isFinite(year) && year > new Date(LOCAL_MEAN_TIME_ERAS_END_BEFORE).getUTCFullYear()) {
    return Promise.resolve();
  }
  lmtEraLoad ??= import('../../data/tz-lmt.json').then(({ default: table }) => { lmtEraEnd = table.eras; });
  return lmtEraLoad;
}

const offsetFormatters = new Map<string, Intl.DateTimeFormat>();
const wallFormatters = new Map<string, Intl.DateTimeFormat>();

function offsetFormatter(tz: string): Intl.DateTimeFormat {
  // Intl treats undefined as the machine's timezone. Imported or stored
  // inputs must select an explicit zone, including at this public offset boundary.
  if (typeof tz !== 'string' || tz.length === 0) {
    throw new RangeError('An explicit supported timezone is required.');
  }
  let f = offsetFormatters.get(tz);
  if (!f) {
    try {
      f = new Intl.DateTimeFormat(TECHNICAL_OFFSET_LOCALE, { timeZone: tz, timeZoneName: 'longOffset' });
    } catch {
      // Do not include a potentially private, untrusted zone value in errors.
      throw new RangeError('An explicit supported timezone is required.');
    }
    offsetFormatters.set(tz, f);
  }
  return f;
}

function wallFormatter(tz: string): Intl.DateTimeFormat {
  let f = wallFormatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat(TECHNICAL_WALL_LOCALE, {
      timeZone: tz,
      calendar: 'gregory', numberingSystem: 'latn', era: 'short',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      fractionalSecondDigits: 3, hourCycle: 'h23',
    });
    wallFormatters.set(tz, f);
  }
  return f;
}

/** UTC offset of `tz` at a UTC instant, in minutes east (LMT-precise). */
export function offsetAt(tz: string, utcMs: number): number {
  const parts = offsetFormatter(tz).formatToParts(utcMs);
  const name = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT';
  // "GMT", "GMT+5", "GMT-06:36:36", "GMT+05:30"
  const m = name.match(/GMT([+-])?(\d{1,2})?(?::(\d{2}))?(?::(\d{2}))?/);
  if (!m) return 0;
  const sign = m[1] === '-' ? -1 : 1;
  const h = Number(m[2] ?? 0);
  const min = Number(m[3] ?? 0);
  const s = Number(m[4] ?? 0);
  return sign * (h * 60 + min + s / 60);
}

function wallStringAt(tz: string, utcMs: number): string {
  const parts = wallFormatter(tz).formatToParts(utcMs);
  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((candidate) => candidate.type === type)?.value ?? '';
  // Intl's Gregorian years are unpadded and count BCE from 1; ISO/Date
  // use astronomical years, where 1 BCE is 0000. Compare civil fields,
  // independently of the locale's display order and punctuation.
  const era = part('era');
  if (era !== 'AD' && era !== 'BC') throw new RangeError('Could not read Gregorian era.');
  const year = era === 'BC' ? 1 - Number(part('year')) : Number(part('year'));
  const isoYear = year >= 0 && year <= 9999
    ? String(year).padStart(4, '0')
    : `${year < 0 ? '-' : '+'}${String(Math.abs(year)).padStart(6, '0')}`;
  return `${isoYear}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}:${part('second')}.${part('fractionalSecond')}`;
}

/**
 * Whether this instant belongs to the requested local Gregorian date under
 * the host's timezone data. A false result refuses this representative; it
 * does not prove that the date is empty or establish whole-date coverage.
 * Invalid input or unavailable formatting throws without exposing input data.
 */
export function localDateContainsUtc(date: string, utc: Date, timeZone: string): boolean {
  try {
    if (!parseCivilDate(date) || typeof timeZone !== 'string' || timeZone.length === 0) {
      throw new RangeError();
    }
    // Read the Date's internal value once, including cross-realm Dates. Do not
    // invoke a caller's getTime override or normalize a date-like string.
    const instant = Date.prototype.getTime.call(utc);
    if (!Number.isFinite(instant)) throw new RangeError();
    return wallStringAt(timeZone, instant).split('T')[0] === date;
  } catch {
    throw new RangeError('Could not determine local-date membership from the supplied date, instant and explicit timezone.');
  }
}

/**
 * Resolve a wall-clock date + time in an IANA zone to UTC.
 * Inputs must be a real proleptic Gregorian YYYY-MM-DD (0000–9999) and
 * HH:MM (00:00–23:59). This syntax is not an astronomical accuracy claim;
 * callers such as birth sharing enforce their own narrower year window.
 * An explicit timezone supported by the host's Intl data is required;
 * omitted or invalid zones never fall back to the machine's timezone.
 *
 * Ambiguous times (clocks fell back — two instants match) resolve to the
 * earlier instant with a `dst-fold` flag. Skipped times (clocks sprang
 * forward — no instant matches) shift forward by the gap with a
 * `dst-gap` flag. Sub-minute offsets (pre-standard LMT) add `lmt`.
 *
 * Pass the birthplace's longitude whenever it is known: before the zone's
 * local mean time era ended, it replaces the reference city's mean time with
 * the birthplace's own, and the change out of that era is a gap or a fold
 * under the same policy. With a longitude, await prepareLocalTime(date) first.
 */
export function resolveLocalToUtc(
  date: string, // 'YYYY-MM-DD'
  time: string, // 'HH:MM'
  tz: string,
  options: LocalTimeOptions = {},
): LocalTimeResolution {
  // Reject before any Date normalization or timezone conversion. An
  // impossible date must not become a different date marked as a DST gap.
  const civilDate = parseCivilDate(date);
  const civilTime = parseCivilTime(time);
  if (!civilDate || !civilTime) {
    throw new RangeError('resolveLocalToUtc needs a valid YYYY-MM-DD date and HH:MM time.');
  }
  // Date.UTC remaps years 0–99 into 1900–1999. Preserve the typed year,
  // including year 0000's leap day, before asking Intl about its offset.
  const wallDate = new Date(0);
  wallDate.setUTCFullYear(civilDate.year, civilDate.month - 1, civilDate.day);
  wallDate.setUTCHours(civilTime.hour, civilTime.minute, 0, 0);
  const wallMs = wallDate.getTime();
  // HH:MM denotes exactly zero seconds/milliseconds. Shortening a candidate
  // to its minute hides historical gaps and creates false folds.
  const wallStr = `${date}T${time}:00.000`;

  // Candidate offsets sampled around the wall instant.
  const sampled = [
    offsetAt(tz, wallMs - 36 * 3600_000),
    offsetAt(tz, wallMs),
    offsetAt(tz, wallMs + 36 * 3600_000),
  ];
  const candidates = [...new Set(sampled)];

  const matches: { utcMs: number; offset: number }[] = [];
  for (const off of candidates) {
    // IANA offsets have integral seconds. Remove floating-point conversion
    // noise at millisecond precision without rounding away historical seconds.
    const utcMs = wallMs - Math.round(off * 60_000);
    if (wallStringAt(tz, utcMs) === wallStr) {
      matches.push({ utcMs, offset: offsetAt(tz, utcMs) });
    }
  }

  let flags: LocalTimeResolution['flags'] = [];
  let chosen: { utcMs: number; offset: number };

  if (matches.length === 1) {
    chosen = matches[0];
  } else if (matches.length > 1) {
    // Fold: two readings of the same wall clock — take the earlier.
    matches.sort((a, b) => a.utcMs - b.utcMs);
    chosen = matches[0];
    flags.push('dst-fold');
  } else {
    // Gap: this wall time never happened. Shift forward by the gap —
    // apply the offset that was valid just before the transition.
    const before = offsetAt(tz, wallMs - 36 * 3600_000);
    const utcMs = wallMs - Math.round(before * 60_000);
    chosen = { utcMs, offset: offsetAt(tz, utcMs) };
    flags.push('dst-gap');
  }

  const zoneOffset = chosen.offset;
  const meanTime = birthplaceMeanTime(tz, wallMs, chosen, options.longitude);
  if (meanTime) ({ chosen, flags } = meanTime);

  if (Math.abs(chosen.offset % 1) > 1e-9) flags.push('lmt');

  return {
    utc: new Date(chosen.utcMs),
    offsetMinutes: chosen.offset,
    flags,
    ...(meanTime ? { localMeanTime: { longitude: options.longitude!, zoneOffsetMinutes: zoneOffset } } : {}),
  };
}

/**
 * The reading of a wall time under the birthplace's own mean time, where
 * that decides it: a finite longitude, a zone whose local mean time era is
 * known, and a wall time near or inside that era. Null leaves Intl's reading.
 *
 * When the era ended, the birthplace's clock stepped from its own mean time
 * to the zone's first legal time. That step leaves a gap or a fold exactly
 * as a daylight-saving change does, and the same policy applies: a repeated
 * reading takes the earlier instant, a skipped one moves forward by the gap.
 */
function birthplaceMeanTime(
  tz: string,
  wallMs: number,
  intl: { utcMs: number; offset: number },
  longitude: number | undefined,
): { chosen: { utcMs: number; offset: number }; flags: LocalTimeResolution['flags'] } | null {
  if (typeof longitude !== 'number' || !Number.isFinite(longitude) || Math.abs(longitude) > 180) return null;
  // A birthplace reading lies within a day of Intl's; later instants are Intl's.
  if (intl.utcMs - LOCAL_MEAN_TIME_ERAS_END_BEFORE > 2 * 86_400_000) return null;
  if (!lmtEraEnd) {
    throw new Error('Local mean time eras are not loaded: await prepareLocalTime(date) before resolving.');
  }
  if (!Object.prototype.hasOwnProperty.call(lmtEraEnd, tz)) return null;
  const endMs = lmtEraEnd[tz] * 1000;
  if (intl.utcMs - endMs > 2 * 86_400_000) return null;

  // Mean solar time runs four minutes per degree of longitude, kept to whole
  // seconds as IANA offsets are. Before a move across the date line (Manila
  // 1844, Alaska 1867) the zone's calendar sat a whole day from its
  // longitude; the zone's own offset at the time supplies that day.
  const meanSeconds = Math.round(longitude * 240);
  const zoneSeconds = offsetAt(tz, Math.min(wallMs, endMs - 1)) * 60;
  const days = Math.round((zoneSeconds - meanSeconds) / 86_400);
  const placeOffset = (meanSeconds + days * 86_400) / 60;
  const placeUtc = wallMs - Math.round(placeOffset * 60_000);
  const placeReading = { utcMs: placeUtc, offset: placeOffset };

  if (intl.utcMs >= endMs) {
    // Intl read the wall time after the era; a birthplace reading before the
    // era's end is then the earlier half of the fold the change created.
    return placeUtc < endMs ? { chosen: placeReading, flags: ['dst-fold'] } : null;
  }
  if (placeUtc < endMs) return { chosen: placeReading, flags: [] };
  // Inside the era by the reference city's clock, after it by the
  // birthplace's: the zone's first legal time, or the gap the change left.
  const legal = offsetAt(tz, endMs);
  const legalUtc = wallMs - Math.round(legal * 60_000);
  if (legalUtc >= endMs) return { chosen: { utcMs: legalUtc, offset: legal }, flags: [] };
  return { chosen: { utcMs: placeUtc, offset: offsetAt(tz, placeUtc) }, flags: ['dst-gap'] };
}
