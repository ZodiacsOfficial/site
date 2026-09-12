/**
 * Canonical proleptic Gregorian civil fields. Calendar validity is separate
 * from each caller's supported birth-date window and numerical accuracy.
 * Keep this module import-free: share decoding is an eager browser boundary.
 */
export interface CivilDate {
  year: number;
  month: number;
  day: number;
}

export interface CivilTime {
  hour: number;
  minute: number;
}

/** Parse exactly YYYY-MM-DD, with four-digit astronomical years 0000–9999. */
export function parseCivilDate(value: unknown): CivilDate | null {
  if (typeof value !== 'string' || value.length !== 10) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1) return null;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = month === 2 ? (leap ? 29 : 28) : ([4, 6, 9, 11].includes(month) ? 30 : 31);
  return day <= days ? { year, month, day } : null;
}

/** Parse exactly HH:MM, from 00:00 through 23:59; never trim or roll over. */
export function parseCivilTime(value: unknown): CivilTime | null {
  if (typeof value !== 'string' || value.length !== 5) return null;
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour <= 23 && minute <= 59 ? { hour, minute } : null;
}
