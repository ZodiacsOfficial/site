/**
 * Reader-facing strings for the sky data API, produced from the same helpers
 * the site uses on its pages so an API label and a page label never differ.
 * Everything here is a pure function of the data — no astronomy, no prose
 * beyond fixed templates.
 */
import { formatLongitude, signBySlug } from '../signs';
import { moonNameForDate } from '../events/format';

const UTC = 'UTC';

export function signNameOf(slug: string): string {
  return signBySlug(slug).name;
}

export function signGlyphOf(slug: string): string {
  return signBySlug(slug).glyph;
}

/** 14°52′ Virgo — the site's own degree/minute/sign label. */
export function formatPosition(lon: number): string {
  return formatLongitude(lon, 'en');
}

/** September 7, 2026 */
export function formatDay(iso: string): string {
  return new Intl.DateTimeFormat('en', {
    month: 'long', day: 'numeric', year: 'numeric', timeZone: UTC,
  }).format(new Date(iso));
}

/** Monday, September 7, 2026 */
export function formatDayLong(iso: string): string {
  return new Intl.DateTimeFormat('en', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: UTC,
  }).format(new Date(iso));
}

/** 12:00 UTC */
export function formatClock(iso: string): string {
  return `${new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: UTC,
  }).format(new Date(iso))} UTC`;
}

/** September 26, 2026 at 16:49 UTC */
export function formatInstant(iso: string): string {
  return `${formatDay(iso)} at ${formatClock(iso)}`;
}

export function percent(fraction: number): number {
  return Math.round(fraction * 100);
}

export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Oxford-comma list: "Saturn, Neptune, and Pluto". */
export function listPhrase(items: readonly string[]): string {
  if (items.length <= 1) return items.join('');
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`;
}

export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

/**
 * Traditional full-moon names for a chronological list of lunations, with
 * the second full moon in one UTC calendar month called Blue — the same
 * rule the full-moon calendar page applies.
 */
export function fullMoonNames(instants: readonly { type: string; at: string }[]): Map<string, string> {
  const names = new Map<string, string>();
  const seenMonths = new Set<string>();
  const fulls = instants
    .filter((moon) => moon.type === 'full')
    .slice()
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  for (const moon of fulls) {
    const monthKey = moon.at.slice(0, 7);
    names.set(moon.at, moonNameForDate(moon.at, seenMonths.has(monthKey)));
    seenMonths.add(monthKey);
  }
  return names;
}

export function moonLabel(name: string): string {
  return name === 'Blue' ? 'a blue moon' : `the ${name} Moon`;
}
