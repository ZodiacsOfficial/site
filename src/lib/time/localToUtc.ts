/**
 * Local birth time → UTC, honoring the history available for the IANA zone —
 * DST, wartime shifts, pre-standardization local mean time (which can
 * carry seconds, e.g. America/Mexico_City at −6:36:36 before 1922).
 *
 * The browser/Node host's ICU data exposes its tzdb history through Intl.
 * Coverage and tzdb version therefore depend on that runtime. Never hand-roll
 * offsets.
 */
import { TECHNICAL_OFFSET_LOCALE, TECHNICAL_WALL_LOCALE } from '../i18n/dates';

export interface LocalTimeResolution {
  utc: Date;
  /** Offset applied, minutes east of UTC (may be fractional for LMT). */
  offsetMinutes: number;
  flags: ('dst-gap' | 'dst-fold' | 'lmt')[];
}

const offsetFormatters = new Map<string, Intl.DateTimeFormat>();
const wallFormatters = new Map<string, Intl.DateTimeFormat>();

function offsetFormatter(tz: string): Intl.DateTimeFormat {
  let f = offsetFormatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat(TECHNICAL_OFFSET_LOCALE, { timeZone: tz, timeZoneName: 'longOffset' });
    offsetFormatters.set(tz, f);
  }
  return f;
}

function wallFormatter(tz: string): Intl.DateTimeFormat {
  let f = wallFormatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat(TECHNICAL_WALL_LOCALE, {
      timeZone: tz,
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
  // TECHNICAL_WALL_LOCALE yields "YYYY-MM-DD, HH:mm"
  return wallFormatter(tz).format(utcMs).replace(', ', 'T');
}

/**
 * Resolve a wall-clock date + time in an IANA zone to UTC.
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
  // The wall-clock verification below compares built strings against
  // Intl's zero-padded output, so a non-canonical input ('8:30',
  // '1990-6-15') would never match and fall silently into the dst-gap
  // branch, returning a plausible instant flagged as a gap. Reject the
  // shape up front instead — a shared exported function must not hand a
  // future caller a silently shifted time.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    throw new RangeError(`resolveLocalToUtc needs 'YYYY-MM-DD' and 'HH:MM' input, got '${date}' '${time}'`);
  }
  const [y, mo, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const wallMs = Date.UTC(y, mo - 1, d, hh, mm);
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
