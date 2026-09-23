/**
 * Julian (Old Style) and proleptic Gregorian civil dates, converted through
 * the Julian Day Number. A civil day maps to the same civil day, so a birth
 * time and zone carry over unchanged: convert an Old Style date first, then
 * resolve it as usual. Import-free, like civil-date.ts.
 */
export interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

const julianLeap = (year: number) => year % 4 === 0;
const gregorianLeap = (year: number) => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

function parse(value: unknown, leap: (year: number) => boolean): CalendarDate | null {
  if (typeof value !== 'string' || value.length !== 10) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1) return null;
  const days = month === 2 ? (leap(year) ? 29 : 28) : ([4, 6, 9, 11].includes(month) ? 30 : 31);
  return day <= days ? { year, month, day } : null;
}

/** Parse YYYY-MM-DD as a Julian calendar date: every fourth year is a leap year, so 1900-02-29 exists. */
export function parseJulianDate(value: unknown): CalendarDate | null {
  return parse(value, julianLeap);
}

// Richards' algorithms (Meeus, Astronomical Algorithms, ch. 7), integer only.
function shift(date: CalendarDate): { y: number; m: number } {
  const a = Math.floor((14 - date.month) / 12);
  return { y: date.year + 4800 - a, m: date.month + 12 * a - 3 };
}

function dayNumberFromJulian(date: CalendarDate): number {
  const { y, m } = shift(date);
  return date.day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
}

function dayNumberFromGregorian(date: CalendarDate): number {
  const { y, m } = shift(date);
  return date.day + Math.floor((153 * m + 2) / 5) + 365 * y
    + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

function fromDayNumber(c: number, centuries: number): CalendarDate {
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  return {
    day: e - Math.floor((153 * m + 2) / 5) + 1,
    month: m + 3 - 12 * Math.floor(m / 10),
    year: 100 * centuries + d - 4800 + Math.floor(m / 10),
  };
}

function gregorianFromDayNumber(jdn: number): CalendarDate {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  return fromDayNumber(a - Math.floor((146097 * b) / 4), b);
}

function julianFromDayNumber(jdn: number): CalendarDate {
  return fromDayNumber(jdn + 32082, 0);
}

function format(date: CalendarDate): string | null {
  if (date.year < 0 || date.year > 9999) return null;
  return `${String(date.year).padStart(4, '0')}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
}

/** The proleptic Gregorian date of a Julian calendar date, or null when it is not one. */
export function julianToGregorian(value: unknown): string | null {
  const date = parseJulianDate(value);
  return date ? format(gregorianFromDayNumber(dayNumberFromJulian(date))) : null;
}

/** The Julian calendar date of a proleptic Gregorian date, or null when it is not one. */
export function gregorianToJulian(value: unknown): string | null {
  const date = parse(value, gregorianLeap);
  return date ? format(julianFromDayNumber(dayNumberFromGregorian(date))) : null;
}
