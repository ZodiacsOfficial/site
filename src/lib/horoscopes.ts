/**
 * Horoscope helpers shared by the hub and the sign pages. The rendered
 * month is always the latest month PRESENT IN THE COLLECTION, labeled
 * from frontmatter — the wall clock never decides what displays, so a
 * stale month renders honestly instead of failing the deploy.
 */
import { signBySlug, signName } from './signs';
import type { ReleasedLocale as Locale } from './i18n';
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

type IngressEvent = TransitFile['ingresses'][number];
type LunationEvent = TransitFile['lunations'][number];
type StationEvent = TransitFile['stations'][number];
type AspectEvent = TransitFile['aspects'][number];

interface TransitEventLabels {
  ingress: (event: IngressEvent) => string;
  lunation: (event: LunationEvent) => string;
  station: (event: StationEvent) => string;
  aspect: (event: AspectEvent) => string;
}

const TRANSIT_EVENT_LABELS = {
  en: {
    ingress: (event) =>
      `${event.planet} enters ${sn(event.sign)}${event.retrograde ? ', retrograde' : ''}`,
    lunation: (event) =>
      `${event.type === 'new' ? 'New moon' : 'Full moon'} at ${Math.round(event.degree)}° ${sn(event.sign)}`,
    station: (event) =>
      `${event.planet} stations ${event.type} at ${Math.round(event.degree)}° ${sn(event.sign)}`,
    aspect: (event) =>
      `${event.a} ${event.type} ${event.b} (${sn(event.aSign)}–${sn(event.bSign)})`,
  },
  es: {
    ingress: (event) =>
      `${planetLabel('es', event.planet)} entra en ${sn(event.sign, 'es')}${event.retrograde ? ', retrógrado' : ''}`,
    lunation: (event) =>
      `${event.type === 'new' ? 'Luna nueva' : 'Luna llena'} a ${Math.round(event.degree)}° de ${sn(event.sign, 'es')}`,
    station: (event) =>
      `${planetLabel('es', event.planet)} estaciona ${event.type === 'retrograde' ? 'retrógrado' : 'directo'} a ${Math.round(event.degree)}° de ${sn(event.sign, 'es')}`,
    aspect: (event) =>
      `${planetLabel('es', event.a)} ${aspectLabel('es', event.type)} ${planetLabel('es', event.b)} (${sn(event.aSign, 'es')}–${sn(event.bSign, 'es')})`,
  },
  pt: {
    ingress: (event) =>
      `${planetLabel('pt', event.planet)} entra em ${sn(event.sign, 'pt')}${event.retrograde ? ', retrógrado' : ''}`,
    lunation: (event) =>
      `${event.type === 'new' ? 'Lua nova' : 'Lua cheia'} a ${Math.round(event.degree)}° de ${sn(event.sign, 'pt')}`,
    station: (event) =>
      `${planetLabel('pt', event.planet)} estaciona ${event.type === 'retrograde' ? 'retrógrado' : 'direto'} a ${Math.round(event.degree)}° de ${sn(event.sign, 'pt')}`,
    aspect: (event) =>
      `${planetLabel('pt', event.a)} em ${aspectLabel('pt', event.type)} com ${planetLabel('pt', event.b)} (${sn(event.aSign, 'pt')}–${sn(event.bSign, 'pt')})`,
  },
  fr: {
    ingress: (event) =>
      `${planetLabel('fr', event.planet)} entre en ${sn(event.sign, 'fr')}${event.retrograde ? ', rétrograde' : ''}`,
    lunation: (event) =>
      `${event.type === 'new' ? 'Nouvelle Lune' : 'Pleine Lune'} à ${Math.round(event.degree)}° en ${sn(event.sign, 'fr')}`,
    station: (event) =>
      `${planetLabel('fr', event.planet)} ${event.type === 'retrograde' ? 'devient rétrograde' : 'redevient direct'} à ${Math.round(event.degree)}° en ${sn(event.sign, 'fr')}`,
    aspect: (event) =>
      `${planetLabel('fr', event.a)} en ${aspectLabel('fr', event.type)} avec ${planetLabel('fr', event.b)} (${sn(event.aSign, 'fr')}–${sn(event.bSign, 'fr')})`,
  },
  it: {
    ingress: (event) =>
      `${planetLabel('it', event.planet)} entra in ${sn(event.sign, 'it')}${event.retrograde ? ', retrogrado' : ''}`,
    lunation: (event) =>
      `${event.type === 'new' ? 'Luna nuova' : 'Luna piena'} a ${Math.round(event.degree)}° in ${sn(event.sign, 'it')}`,
    station: (event) =>
      `${planetLabel('it', event.planet)} staziona in moto ${event.type === 'retrograde' ? 'retrogrado' : 'diretto'} a ${Math.round(event.degree)}° in ${sn(event.sign, 'it')}`,
    aspect: (event) =>
      `${planetLabel('it', event.a)} in ${aspectLabel('it', event.type)} con ${planetLabel('it', event.b)} (${sn(event.aSign, 'it')}–${sn(event.bSign, 'it')})`,
  },
} satisfies Record<Locale, TransitEventLabels>;

/** The month's events as one chronological, human-readable list. */
export function eventList(month: string, locale: Locale = 'en'): TransitEvent[] {
  const t = transitsFor(month);
  if (!t) return [];
  const labels = TRANSIT_EVENT_LABELS[locale];
  const events: TransitEvent[] = [
    ...t.ingresses.map((e) => ({
      at: e.at,
      label: labels.ingress(e),
      body: e.planet,
      hue: signBySlug(e.sign).hue,
    })),
    ...t.lunations.map((e) => ({
      at: e.at,
      label: labels.lunation(e),
      body: 'Moon',
      hue: signBySlug(e.sign).hue,
    })),
    ...t.stations.map((e) => ({
      at: e.at,
      label: labels.station(e),
      body: e.planet,
      hue: signBySlug(e.sign).hue,
    })),
    ...t.aspects.map((e) => ({
      at: e.at,
      label: labels.aspect(e),
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
