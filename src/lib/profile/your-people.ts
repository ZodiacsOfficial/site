/**
 * The people on your profile: saved charts that are not yours, plus cards
 * other people sent you. Each gets an initial, a way to compare with your
 * own chart, and the next date worth knowing — a birthday for a saved chart
 * (its birth date is on this device), or the Sun's return to its birth
 * position for a card (a card carries positions, not a birth date).
 *
 * Dates are pure arithmetic: calendar math for birthdays and the
 * dependency-free solar series from engine/lite for returns, so the
 * profile never loads the ephemeris for this list.
 */
import { sunLongitude } from '../engine/lite';
import { isAutomaticChartName } from './me';
import { settledSunHue } from './settled-signs';
import type { SavedChart } from './schema';
import type { CircleEntry } from './circle';

const DAY_MS = 86_400_000;

export type UpcomingKind = 'birthday' | 'sun-return';

export interface PersonRow {
  key: string;
  kind: 'saved' | 'card';
  /** Saved-chart id or circle-entry id. */
  id: string;
  /** The label shown; empty for a card sent without a name. */
  name: string;
  /** The name an initial comes from; null for an automatic chart name or a nameless card. */
  personalName: string | null;
  /** The settled Sun sign's hue, else null. */
  sunHue: string | null;
  next: { kind: UpcomingKind; at: Date; days: number } | null;
}

function localMidnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Whole local days from `now` to `target` (0 = today). */
export function daysUntil(target: Date, now: Date): number {
  return Math.round((localMidnight(target).getTime() - localMidnight(now).getTime()) / DAY_MS);
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * The next local calendar date matching a YYYY-MM-DD birth date, today
 * included. A 29 February birthday falls on 28 February in common years.
 */
export function nextBirthday(birthDate: string, now: Date): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(birthDate);
  if (!match) return null;
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const today = localMidnight(now);
  for (const year of [today.getFullYear(), today.getFullYear() + 1]) {
    const fitted = month === 2 && day === 29 && !isLeapYear(year) ? 28 : day;
    const candidate = new Date(year, month - 1, fitted);
    if (candidate.getMonth() !== month - 1) return null;
    if (candidate.getTime() >= today.getTime()) return candidate;
  }
  return null;
}

/** Signed shortest angular distance from a to b, degrees in (-180, 180]. */
function angularDelta(a: number, b: number): number {
  const delta = ((b - a) % 360 + 540) % 360 - 180;
  return delta === -180 ? 180 : delta;
}

/**
 * The next moment the Sun returns to a longitude, searched from the start
 * of today (local) across the coming year. Accurate to minutes with the
 * low-precision series — plenty for a date.
 */
export function nextSunReturn(sunLon: number, now: Date): Date | null {
  if (!Number.isFinite(sunLon)) return null;
  const start = localMidnight(now).getTime();
  let previous = angularDelta(sunLongitude(new Date(start)), sunLon);
  for (let day = 1; day <= 367; day += 1) {
    const at = start + day * DAY_MS;
    const current = angularDelta(sunLongitude(new Date(at)), sunLon);
    // The Sun gains about a degree a day: a crossing flips the sign from
    // positive (target ahead) to non-positive (target reached or passed).
    if (previous > 0 && current <= 0) {
      let lo = at - DAY_MS;
      let hi = at;
      for (let step = 0; step < 24; step += 1) {
        const mid = (lo + hi) / 2;
        if (angularDelta(sunLongitude(new Date(mid)), sunLon) > 0) lo = mid;
        else hi = mid;
      }
      return new Date(hi);
    }
    previous = current;
  }
  return null;
}

/** First part of a saved chart's name, the way compact labels trim it. */
export function chartHandle(name: string): string {
  return name.split('·')[0].trim() || name;
}

/** A saved chart's name as a person's name, or null when it is automatic (it carries the birth date). */
export function personalChartName(name: string): string | null {
  return isAutomaticChartName(name) ? null : chartHandle(name);
}

export function savedChartSunHue(chart: SavedChart): string | null {
  return settledSunHue(chart.summary.bodies, chart.birth.timeKnown === true);
}

/**
 * Everyone on the profile except you, soonest date first; people with no
 * computable date keep their saved order after them.
 */
export function buildPeople(
  charts: readonly SavedChart[],
  circle: readonly CircleEntry[],
  now: Date,
): PersonRow[] {
  const rows: PersonRow[] = [];
  for (const chart of charts) {
    // Only an explicit "other" is someone else. An unclassified legacy
    // chart may be the visitor's own, so it is never listed as a person.
    if (chart.relationship !== 'other') continue;
    const at = nextBirthday(chart.birth.date, now);
    rows.push({
      key: `saved:${chart.id}`,
      kind: 'saved',
      id: chart.id,
      name: chartHandle(chart.name),
      personalName: personalChartName(chart.name),
      sunHue: savedChartSunHue(chart),
      next: at ? { kind: 'birthday', at, days: daysUntil(at, now) } : null,
    });
  }
  for (const entry of circle) {
    const sun = entry.chart.bodies.find((row) => row.body === 'Sun');
    const at = sun ? nextSunReturn(sun.lon, now) : null;
    rows.push({
      key: `card:${entry.id}`,
      kind: 'card',
      id: entry.id,
      name: entry.name,
      personalName: entry.name || null,
      sunHue: settledSunHue(entry.chart.bodies, entry.timeKnown),
      next: at ? { kind: 'sun-return', at, days: daysUntil(at, now) } : null,
    });
  }
  const order = new Map(rows.map((row, index) => [row.key, index]));
  return rows.sort((a, b) => {
    if (a.next && b.next) return a.next.at.getTime() - b.next.at.getTime();
    if (a.next) return -1;
    if (b.next) return 1;
    return order.get(a.key)! - order.get(b.key)!;
  });
}
