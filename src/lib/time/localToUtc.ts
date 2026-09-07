/**
 * Local birth time → UTC, honoring the history available for the IANA zone —
 * DST, wartime shifts, pre-standardization local mean time (which can
 * carry seconds, e.g. America/Mexico_City at −6:36:36 before 1922).
 *
 * The browser/Node host's ICU data exposes its tzdb history through Intl.
 * Coverage and tzdb version therefore depend on that runtime. Never hand-roll
 * offsets.
 */
import { TECHNICAL_OFFSET_LOCALE, TECHNICAL_WALL_LOCALE } from './technical-locales';
import { parseCivilDate, parseCivilTime } from './civil-date';

export interface LocalTimeResolution {
  utc: Date;
  /** Offset applied, minutes east of UTC (may be fractional for LMT). */
  offsetMinutes: number;
  flags: ('dst-gap' | 'dst-fold' | 'lmt')[];
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
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
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
  return `${isoYear}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
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
 */
export function resolveLocalToUtc(
  date: string, // 'YYYY-MM-DD'
  time: string, // 'HH:MM'
  tz: string
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
  const wallStr = `${date}T${time}`;

  // Candidate offsets sampled around the wall instant.
  const sampled = [
    offsetAt(tz, wallMs - 36 * 3600_000),
    offsetAt(tz, wallMs),
    offsetAt(tz, wallMs + 36 * 3600_000),
  ];
  const candidates = [...new Set(sampled)];

  const matches: { utcMs: number; offset: number }[] = [];
  for (const off of candidates) {
    const utcMs = wallMs - off * 60_000;
    if (wallStringAt(tz, utcMs) === wallStr) {
      matches.push({ utcMs, offset: offsetAt(tz, utcMs) });
    }
  }

  const flags: LocalTimeResolution['flags'] = [];
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
    const utcMs = wallMs - before * 60_000;
    chosen = { utcMs, offset: offsetAt(tz, utcMs) };
    flags.push('dst-gap');
  }

  if (Math.abs(chosen.offset % 1) > 1e-9) flags.push('lmt');

  return { utc: new Date(chosen.utcMs), offsetMinutes: chosen.offset, flags };
}
