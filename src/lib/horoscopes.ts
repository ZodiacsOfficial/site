/**
 * Horoscope helpers shared by the hub and the sign pages. The rendered
 * month is always the latest month PRESENT IN THE COLLECTION, labeled
 * from frontmatter — the wall clock never decides what displays, so a
 * stale month renders honestly instead of failing the deploy.
 */
import { signBySlug, signName } from './signs';
import type { Locale } from './i18n';
import { aspectLabel, planetLabel } from './i18n/astrology';
import { formatDate } from './i18n/dates';

export interface TransitEvent {
  at: string;
  label: string;
  /** The event's primary body, for a leading glyph (locale-independent). */
  body: string;
  /** The relevant sign's disc hue, tinting that glyph. */
  hue: string;
}

interface TransitFile {
  month: string;
  ingresses: { planet: string; at: string; sign: string; retrograde: boolean }[];
  lunations: { type: string; at: string; sign: string; degree: number }[];
  stations: { planet: string; at: string; type: string; sign: string; degree: number }[];
  aspects: { a: string; b: string; type: string; at: string; aSign: string; bSign: string }[];
}

// Eagerly bundle every committed month at build time; tiny JSON files.
const transitFiles = import.meta.glob<{ default: TransitFile }>(
  '../data/transits-*.json',
  { eager: true },
);

export function transitsFor(month: string): TransitFile | null {
  for (const mod of Object.values(transitFiles)) {
    if (mod.default.month === month) return mod.default;
  }
  return null;
}

/** The newest committed transit month ('YYYY-MM'), or null if none. */
export function latestTransitMonth(): string | null {
  const months = Object.values(transitFiles).map((m) => m.default.month).sort();
  return months.at(-1) ?? null;
}

const sn = (slug: string, locale: Locale = 'en') => signName(signBySlug(slug), locale);

/** The month's events as one chronological, human-readable list. */
export function eventList(month: string, locale: Locale = 'en'): TransitEvent[] {
  const t = transitsFor(month);
  if (!t) return [];
  const events: TransitEvent[] = [
    ...t.ingresses.map((e) => ({
      at: e.at,
      label: locale === 'es'
        ? `${planetLabel(locale, e.planet)} entra en ${sn(e.sign, locale)}${e.retrograde ? ', retrógrado' : ''}`
        : `${e.planet} enters ${sn(e.sign)}${e.retrograde ? ', retrograde' : ''}`,
      body: e.planet,
      hue: signBySlug(e.sign).hue,
    })),
    ...t.lunations.map((e) => ({
      at: e.at,
      label: locale === 'es'
        ? `${e.type === 'new' ? 'Luna nueva' : 'Luna llena'} a ${Math.round(e.degree)}° de ${sn(e.sign, locale)}`
        : `${e.type === 'new' ? 'New moon' : 'Full moon'} at ${Math.round(e.degree)}° ${sn(e.sign)}`,
      body: 'Moon',
      hue: signBySlug(e.sign).hue,
    })),
    ...t.stations.map((e) => ({
      at: e.at,
      label: locale === 'es'
        ? `${planetLabel(locale, e.planet)} estaciona ${e.type === 'retrograde' ? 'retrógrado' : 'directo'} a ${Math.round(e.degree)}° de ${sn(e.sign, locale)}`
        : `${e.planet} stations ${e.type} at ${Math.round(e.degree)}° ${sn(e.sign)}`,
      body: e.planet,
      hue: signBySlug(e.sign).hue,
    })),
    ...t.aspects.map((e) => ({
      at: e.at,
      label: locale === 'es'
        ? `${planetLabel(locale, e.a)} ${aspectLabel(locale, e.type)} ${planetLabel(locale, e.b)} (${sn(e.aSign, locale)}–${sn(e.bSign, locale)})`
        : `${e.a} ${e.type} ${e.b} (${sn(e.aSign)}–${sn(e.bSign)})`,
      body: e.a,
      hue: signBySlug(e.aSign).hue,
    })),
  ];
  return events.sort((a, b) => a.at.localeCompare(b.at));
}

export function monthLabel(month: string, locale: Locale = 'en'): string {
  const [y, m] = month.split('-').map(Number);
  return formatDate(locale, new Date(Date.UTC(y, m - 1, 1)), {
    month: 'long', year: 'numeric', timeZone: 'UTC',
  });
}

export function dayLabel(iso: string, locale: Locale = 'en'): string {
  return formatDate(locale, new Date(iso), {
    month: 'short', day: 'numeric', timeZone: 'UTC',
  });
}

/** Loud, non-fatal staleness check — call once per build from the hub. */
export function warnIfStale(latestMonth: string): void {
  const now = new Date();
  const current = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  if (latestMonth < current) {
    console.warn(
      `\n${'='.repeat(72)}\n` +
      `  HOROSCOPES ARE STALE: latest committed month is ${latestMonth}, ` +
      `today is in ${current}.\n` +
      `  Run: node scripts/build-transits.mjs ${current} and write the twelve\n` +
      `  src/content/horoscopes/${current}-{sign}.mdx entries.\n` +
      `${'='.repeat(72)}\n`,
    );
  }
}
