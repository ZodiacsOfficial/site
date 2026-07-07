/**
 * Presentation logic over src/data/birthdays.json for the /birthday/ pages.
 * The JSON carries pure ephemeris facts (signs, cusp tables, degree spans);
 * everything interpretive — decans, rulers, phrasing helpers — lives here
 * where signs.ts is importable and vitest can reach it.
 */
import { SIGNS, signBySlug, type Sign } from './signs';

export interface BirthdayNow {
  year: number;
  lon: number;
  moonSign: string;
}

/** Per-year cusp record: 'a' | 'b' = whole day that sign; 'HH:MM' = UTC ingress. */
export interface CuspTable {
  a: string;
  b: string;
  years: Record<string, string>;
}

export interface BirthdayEntry {
  month: number;
  day: number;
  lonMin: number;
  lonMax: number;
  now: BirthdayNow;
  sign?: string;
  cusp?: CuspTable;
}

export const MONTH_SLUGS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
] as const;

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

export function birthdaySlug(month: number, day: number): string {
  return `${MONTH_SLUGS[month - 1]}-${day}`;
}

export function birthdayLabel(month: number, day: number): string {
  return `${MONTH_NAMES[month - 1]} ${day}`;
}

/** Previous date on the full 366-day wheel (Dec 31 ← Jan 1, Feb 29 included). */
export function prevDate(month: number, day: number): { month: number; day: number } {
  if (day > 1) return { month, day: day - 1 };
  const m = month === 1 ? 12 : month - 1;
  return { month: m, day: DAYS_IN_MONTH[m - 1] };
}

/** Next date on the full 366-day wheel. */
export function nextDate(month: number, day: number): { month: number; day: number } {
  if (day < DAYS_IN_MONTH[month - 1]) return { month, day: day + 1 };
  return { month: month === 12 ? 1 : month + 1, day: 1 };
}

/**
 * Triplicity decans with traditional rulers only — the decan system
 * predates the outer planets, so Scorpio/Aquarius/Pisces use their
 * classical rulers here (matching the "traditional rulerships" promise
 * the rising pages already make).
 */
const ELEMENT_ORDER: Record<string, string[]> = {
  fire: ['aries', 'leo', 'sagittarius'],
  earth: ['taurus', 'virgo', 'capricorn'],
  air: ['gemini', 'libra', 'aquarius'],
  water: ['cancer', 'scorpio', 'pisces'],
};

export function decanRuler(signSlug: string, decan: 1 | 2 | 3): string {
  const sign = signBySlug(signSlug);
  const seq = ELEMENT_ORDER[sign.element];
  const idx = seq.indexOf(signSlug);
  const rulingSign = signBySlug(seq[(idx + decan - 1) % 3]);
  return rulingSign.classicRuler ?? rulingSign.ruler;
}

export interface DecanSpan {
  /** Decan of the span's start and end; equal when the date sits inside one decan. */
  lo: 1 | 2 | 3;
  hi: 1 | 2 | 3;
  ruler: string;
  /** Set when lo !== hi — the second ruler for edge dates. */
  hiRuler?: string;
}

const ORDINAL_DECAN = ['first', 'second', 'third'] as const;

export function decanOrdinal(decan: 1 | 2 | 3): string {
  return ORDINAL_DECAN[decan - 1];
}

/**
 * Decan(s) covered by a non-cusp date's noon-UTC degree span across the
 * year range. ~50 dates straddle a 10° line across years; those render
 * honestly as "first–second decan" instead of picking a side.
 */
export function decanSpan(entry: BirthdayEntry): DecanSpan {
  if (!entry.sign) throw new Error('decanSpan is for non-cusp dates');
  const signIndex = SIGNS.findIndex((s) => s.slug === entry.sign);
  const start = signIndex * 30;
  const norm = (lon: number) => ((lon % 360) + 360) % 360;
  const inLo = norm(entry.lonMin) - start;
  const inHi = norm(entry.lonMax) - start;
  const clamp = (v: number) => Math.min(3, Math.max(1, Math.floor(v / 10) + 1)) as 1 | 2 | 3;
  const lo = clamp(inLo);
  const hi = clamp(inHi);
  return {
    lo,
    hi,
    ruler: decanRuler(entry.sign, lo),
    ...(lo !== hi ? { hiRuler: decanRuler(entry.sign, hi) } : {}),
  };
}

export interface CuspSummary {
  a: Sign;
  b: Sign;
  wholeA: number;
  wholeB: number;
  split: number;
  /** Years whose day contains the ingress, with the UTC time. */
  splitYears: { year: number; at: string }[];
  /** The sign this date belongs to in the clear majority of years, if any. */
  majority: Sign | null;
}

export function cuspSummary(cusp: CuspTable): CuspSummary {
  const a = signBySlug(cusp.a);
  const b = signBySlug(cusp.b);
  let wholeA = 0;
  let wholeB = 0;
  const splitYears: { year: number; at: string }[] = [];
  for (const [year, v] of Object.entries(cusp.years)) {
    if (v === 'a') wholeA += 1;
    else if (v === 'b') wholeB += 1;
    else splitYears.push({ year: Number(year), at: v });
  }
  splitYears.sort((x, y) => x.year - y.year);
  const total = wholeA + wholeB + splitYears.length;
  const majority = wholeA / total >= 0.7 ? a : wholeB / total >= 0.7 ? b : null;
  return { a, b, wholeA, wholeB, split: splitYears.length, splitYears, majority };
}

/** Sign for a specific birth year on a cusp date, from the table. */
export function cuspYearReading(cusp: CuspTable, year: number):
  | { kind: 'whole'; sign: Sign }
  | { kind: 'split'; before: Sign; after: Sign; atUtc: string }
  | null {
  const v = cusp.years[String(year)];
  if (!v) return null;
  if (v === 'a') return { kind: 'whole', sign: signBySlug(cusp.a) };
  if (v === 'b') return { kind: 'whole', sign: signBySlug(cusp.b) };
  return { kind: 'split', before: signBySlug(cusp.a), after: signBySlug(cusp.b), atUtc: v };
}

/** Distance (degrees) from the span to the nearest sign boundary — for honest "how close to the cusp" phrasing on non-cusp dates. */
export function boundaryDistance(entry: BirthdayEntry): number {
  const norm = (lon: number) => ((lon % 360) + 360) % 360;
  const inLo = norm(entry.lonMin) % 30;
  const inHi = norm(entry.lonMax) % 30;
  return Math.round(Math.min(inLo, 30 - inHi) * 10) / 10;
}
