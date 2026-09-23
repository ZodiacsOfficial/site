/**
 * Local birth time → UTC, honoring the history available for the IANA zone —
 * DST, wartime shifts, pre-standardization local mean time (which can
 * carry seconds, e.g. America/Mexico_City at −6:36:36 before 1922).
 *
 * The browser/Node host's ICU data exposes its tzdb history through Intl.
 * Coverage and tzdb version therefore depend on that runtime. Legal offsets
 * always come from there; nothing here hand-rolls a legal offset.
 *
 * One era needs more than the zone: before a place adopted a legal time, its
 * clocks kept that place's own mean solar time, and tzdb records that only
 * for the zone's reference city. Given the birthplace's longitude, instants
 * before the zone's local mean time era ended use the birthplace's mean time
 * (four minutes of time per degree of longitude) instead of the reference
 * city's. When each era ended comes from src/data/tz-lmt.json, generated
 * from a pinned tzdb release that includes backzone.
 *
 * Given a longitude, instants before 1970 also take the zone's legal offsets
 * from that pinned release (src/data/tz-history/), not from Intl: browsers
 * carry tzdb's default build, which gives many places another city's history
 * before 1970 (Stockholm keeps Berlin's). Every later instant is Intl's. Both
 * tables load on demand, only for dates that can need them: await
 * prepareLocalTime(date, timeZone) before resolving a birthplace time.
 */
import { loadModule } from '../module-load';
import type { ZoneHistory } from './tz-history-load';
import { TECHNICAL_OFFSET_LOCALE, TECHNICAL_WALL_LOCALE } from './technical-locales';
import { parseCivilDate, parseCivilTime } from './civil-date';

export interface LocalTimeOptions {
  /**
   * The birthplace's longitude, degrees east. Without it, a time from the
   * local mean time era uses the zone reference city's mean time, and a time
   * before 1970 the host's history.
   */
  longitude?: number;
}

export interface LocalTimeResolution {
  utc: Date;
  /** Offset applied, minutes east of UTC (may be fractional for LMT). */
  offsetMinutes: number;
  flags: ('dst-gap' | 'dst-fold' | 'lmt')[];
  /**
   * Present when the instant falls in the birthplace's own local mean time:
   * the longitude used, and the offset the zone alone would have applied.
   */
  localMeanTime?: { longitude: number; zoneOffsetMinutes: number };
}

/** Unix seconds at which each zone's local mean time era ended, once loaded. */
let lmtEraEnd: Readonly<Record<string, number>> | null = null;
/** Each era's own mean time offset (seconds east), from the table rather than the host. */
let lmtOffsets: Readonly<Record<string, number>> = {};
/** For eras that crossed the date line: each line's end (Unix seconds) and offset (seconds east). */
let lmtDateLine: Readonly<Record<string, readonly (readonly number[])[]>> = {};
let lmtEraLoad: Promise<void> | null = null;

/** Offsets before 1970 from the pinned release, per zone name once loaded; null where the host's apply. */
const zoneHistories = new Map<string, ZoneHistory | null>();
const zoneHistoryLoads = new Map<string, Promise<void>>();
/** The host's history applies from 1970-01-01T00:00:00Z. */
const ZONE_HISTORY_END = 0;

/**
 * Every era in the table ends before this instant (the last, Niue and
 * Rarotonga, in October 1952); a test holds the table to it.
 */
export const LOCAL_MEAN_TIME_ERAS_END_BEFORE = Date.UTC(1953, 0, 1);

/**
 * Whether a local date (YYYY-MM-DD) could fall in a local mean time era, so
 * that a birthplace's longitude can change how its wall time resolves. False
 * only for years after the last era ended.
 */
export function localMeanTimeCanApply(date: string): boolean {
  const year = Number(String(date).slice(0, 4));
  return !(Number.isFinite(year) && year > new Date(LOCAL_MEAN_TIME_ERAS_END_BEFORE).getUTCFullYear());
}

/**
 * Whether a birthplace's longitude can change how a wall time on this local
 * date (YYYY-MM-DD) resolves, through its local mean time or its zone's
 * pinned history: for dates up to 1970.
 */
export function birthplaceTimeCanApply(date: string): boolean {
  return !(Number(String(date).slice(0, 4)) > 1970);
}

/**
 * Loads what resolving a birthplace time on `date` (YYYY-MM-DD) in
 * `timeZone` can need: the local mean time era table for dates up to 1953,
 * and the zone's pinned history for dates up to 1970. Later dates need
 * neither. Resolving such a date with a longitude without them throws rather
 * than guess. A failed download rejects with a ModuleLoadError, like the
 * calculators' other code downloads, and is not remembered: the next call
 * tries again.
 */
export function prepareLocalTime(date: string, timeZone: string): Promise<void> {
  const loads: Promise<void>[] = [];
  if (localMeanTimeCanApply(date) && !lmtEraEnd) {
    if (!lmtEraLoad) {
      const pending = loadModule(() => import('../../data/tz-lmt.json')).then(({ default: table }) => {
        lmtOffsets = table.offsets;
        lmtDateLine = table.dateLine;
        lmtEraEnd = table.eras;
      });
      lmtEraLoad = pending;
      void pending.catch(() => {
        if (lmtEraLoad === pending) lmtEraLoad = null;
      });
    }
    loads.push(lmtEraLoad);
  }
  if (birthplaceTimeCanApply(date) && !zoneHistories.has(timeZone)) {
    let pending = zoneHistoryLoads.get(timeZone);
    if (!pending) {
      const load = loadModule(async () => (await import('./tz-history-load')).loadZoneHistory(timeZone))
        .then((history) => { zoneHistories.set(timeZone, history); });
      zoneHistoryLoads.set(timeZone, load);
      void load.catch(() => {
        if (zoneHistoryLoads.get(timeZone) === load) zoneHistoryLoads.delete(timeZone);
      });
      pending = load;
    }
    loads.push(pending);
  }
  return Promise.all(loads).then(() => undefined);
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
 * under the same policy; before 1970, the zone's legal offsets come from the
 * pinned release rather than the host. With a longitude, await
 * prepareLocalTime(date, tz) first.
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

  let zoneOffset = chosen.offset;
  let inEra = false;
  const place = birthplaceClock(tz, wallMs, options.longitude);
  if (place) {
    // What the zone's own clock reads, for the record: the pinned one before 1970.
    if (place.pinned) zoneOffset = readClock(wallMs, place.zoneAt, place.samples).chosen.offset;
    ({ chosen, flags } = readClock(wallMs, place.clockAt, place.samples));
    inEra = chosen.utcMs < place.endMs;
  }

  if (Math.abs(chosen.offset % 1) > 1e-9) flags.push('lmt');

  return {
    utc: new Date(chosen.utcMs),
    offsetMinutes: chosen.offset,
    flags,
    ...(inEra ? { localMeanTime: { longitude: options.longitude!, zoneOffsetMinutes: zoneOffset } } : {}),
  };
}

/**
 * A birthplace this far from its zone's own mean time is not in that zone.
 * The widest real case in the city index is Gar, in western Tibet, 165
 * minutes from Shanghai's mean time.
 */
const MAX_MEAN_TIME_DEPARTURE_MINUTES = 180;

/** The offset (minutes east) a pinned history gives at an instant before 1970. */
function pinnedOffset(history: ZoneHistory, utcMs: number): number {
  let lo = 0;
  let hi = history.t.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (history.t[mid] * 1000 <= utcMs) lo = mid + 1;
    else hi = mid;
  }
  return history.o[lo] / 60;
}

/**
 * The birthplace's clock, where it differs from reading the wall time
 * through Intl: a plausible longitude, and either a wall time near or inside
 * the zone's local mean time era, or one near or before 1970 in a zone the
 * pinned release covers. Null leaves Intl's reading.
 *
 * Until the era ended the clock showed the birthplace's mean time, on the
 * side of the date line the zone's own era kept at that instant (Manila and
 * Pohnpei kept the American date until 1844, Alaska the Asian one until
 * 1867); from then on it showed the zone's legal time, from the pinned
 * release before 1970 and from Intl after.
 */
function birthplaceClock(
  tz: string,
  wallMs: number,
  longitude: number | undefined,
): { clockAt: (utcMs: number) => number; zoneAt: (utcMs: number) => number; samples: number[]; endMs: number; pinned: boolean } | null {
  if (typeof longitude !== 'number' || !Number.isFinite(longitude) || Math.abs(longitude) > 180) return null;
  const probe = 36 * 3600_000;
  // No reading of a wall time from 1970-01-02 on falls before 1970 (no
  // offset reaches 24 hours), so later dates never need the pinned history.
  let history: ZoneHistory | null = null;
  if (wallMs < ZONE_HISTORY_END + 86_400_000) {
    if (!zoneHistories.has(tz)) {
      throw new Error('Zone history is not loaded: await prepareLocalTime(date, timeZone) before resolving.');
    }
    history = zoneHistories.get(tz)!;
  }
  const zoneAt = (utcMs: number): number => (history && utcMs < ZONE_HISTORY_END ? pinnedOffset(history, utcMs) : offsetAt(tz, utcMs));

  let endMs = Number.NEGATIVE_INFINITY;
  let meanOffset = (utcMs: number): number => zoneAt(utcMs);
  // Every era ended before LOCAL_MEAN_TIME_ERAS_END_BEFORE; no reading of a
  // later wall time can fall inside one, so later instants never need the table.
  if (wallMs - probe - LOCAL_MEAN_TIME_ERAS_END_BEFORE <= 0) {
    if (!lmtEraEnd) {
      throw new Error('Local mean time eras are not loaded: await prepareLocalTime(date, timeZone) before resolving.');
    }
    if (Object.prototype.hasOwnProperty.call(lmtEraEnd, tz) && wallMs - probe - lmtEraEnd[tz] * 1000 <= 0) {
      const eraEnd = lmtEraEnd[tz] * 1000;
      // Mean solar time runs four minutes per degree of longitude, kept to
      // whole seconds as IANA offsets are.
      const meanSeconds = Math.round(longitude * 240);
      // The zone's own mean time during the era, from the table: it fixes
      // the side of the date line, which the host's data can get wrong (it
      // lacks Pohnpei's move in 1844 and puts Midway on the Asian date).
      const own = (table: Readonly<Record<string, unknown>>) => Object.prototype.hasOwnProperty.call(table, tz);
      const eraLines = own(lmtDateLine) ? lmtDateLine[tz] : null;
      const eraOffset = (utcMs: number): number => {
        if (eraLines) for (const [until, offset] of eraLines) if (utcMs < until * 1000) return offset / 60;
        if (own(lmtOffsets)) return lmtOffsets[tz] / 60;
        return zoneAt(utcMs);
      };
      const birthplaceOffset = (utcMs: number): number => {
        const days = Math.round((eraOffset(utcMs) * 60 - meanSeconds) / 86_400);
        return (meanSeconds + days * 86_400) / 60;
      };
      // A longitude hours away from the zone's own mean time belongs to
      // another zone; leave such an input to the zone rather than invent a
      // clock. In whole seconds, so a departure of exactly the bound is
      // treated alike in every zone.
      const eraSample = Math.min(wallMs, eraEnd - 1);
      const departure = Math.abs(Math.round(birthplaceOffset(eraSample) * 60) - Math.round(eraOffset(eraSample) * 60));
      if (departure <= MAX_MEAN_TIME_DEPARTURE_MINUTES * 60) {
        endMs = eraEnd;
        meanOffset = birthplaceOffset;
      }
    }
  }
  if (endMs === Number.NEGATIVE_INFINITY && !history) return null;

  // Without the pinned history, the host can record the change out of the
  // era later than the table does, with another city's offset in between.
  // If the host's offset changes within the probe after the era's end, the
  // birthplace went straight to the later one.
  let legalFrom = endMs;
  if (!history && offsetAt(tz, endMs + probe) !== offsetAt(tz, endMs)) {
    const atEnd = offsetAt(tz, endMs);
    let lo = endMs;
    let hi = endMs + probe;
    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2);
      if (offsetAt(tz, mid) === atEnd) lo = mid;
      else hi = mid;
    }
    legalFrom = hi;
  }
  const clockAt = (utcMs: number): number => (utcMs < endMs ? meanOffset(utcMs) : zoneAt(Math.max(utcMs, legalFrom)));
  const samples = [wallMs - probe, wallMs, wallMs + probe];
  if (endMs > Number.NEGATIVE_INFINITY) samples.push(endMs - 1, endMs, legalFrom);
  return { clockAt, zoneAt, samples, endMs, pinned: history !== null };
}

/**
 * Reads a wall time on a clock under the ordinary policy: readings are
 * enumerated against the clock, a repeated reading takes the earlier
 * instant, and a skipped one moves forward by the offset the clock showed
 * just before it jumped.
 */
function readClock(
  wallMs: number,
  clockAt: (utcMs: number) => number,
  samples: number[],
): { chosen: { utcMs: number; offset: number }; flags: LocalTimeResolution['flags'] } {
  const probe = 36 * 3600_000;
  const readings: { utcMs: number; offset: number }[] = [];
  for (const offset of new Set(samples.map(clockAt))) {
    const utcMs = wallMs - Math.round(offset * 60_000);
    if (Math.abs(clockAt(utcMs) - offset) < 1e-9 && !readings.some((reading) => reading.utcMs === utcMs)) {
      readings.push({ utcMs, offset });
    }
  }
  readings.sort((a, b) => a.utcMs - b.utcMs);
  if (readings.length > 0) return { chosen: readings[0], flags: readings.length > 1 ? ['dst-fold'] : [] };
  // Skipped: the clock jumped over this wall time. Find the jump, and apply
  // the offset the clock showed just before it.
  const wallOf = (utcMs: number): number => utcMs + Math.round(clockAt(utcMs) * 60_000);
  let lo = wallMs - probe - 86_400_000;
  let hi = wallMs + probe + 86_400_000;
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (wallOf(mid) > wallMs) hi = mid;
    else lo = mid;
  }
  const utcMs = wallMs - Math.round(clockAt(lo) * 60_000);
  return { chosen: { utcMs, offset: clockAt(utcMs) }, flags: ['dst-gap'] };
}
