/**
 * Horoscope helpers shared by the hub and the sign pages. The rendered
 * month is always the latest month PRESENT IN THE COLLECTION, labeled
 * from frontmatter — the wall clock never decides what displays, so a
 * stale month renders honestly instead of failing the deploy.
 */
import { signBySlug } from './signs';

export interface TransitEvent {
  at: string;
  label: string;
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

const sn = (slug: string) => signBySlug(slug).name;

/** The month's events as one chronological, human-readable list. */
export function eventList(month: string): TransitEvent[] {
  const t = transitsFor(month);
  if (!t) return [];
  const events: TransitEvent[] = [
    ...t.ingresses.map((e) => ({
      at: e.at,
      label: `${e.planet} enters ${sn(e.sign)}${e.retrograde ? ', retrograde' : ''}`,
    })),
    ...t.lunations.map((e) => ({
      at: e.at,
      label: `${e.type === 'new' ? 'New moon' : 'Full moon'} at ${Math.round(e.degree)}° ${sn(e.sign)}`,
    })),
    ...t.stations.map((e) => ({
      at: e.at,
      label: `${e.planet} stations ${e.type} at ${Math.round(e.degree)}° ${sn(e.sign)}`,
    })),
    ...t.aspects.map((e) => ({
      at: e.at,
      label: `${e.a} ${e.type} ${e.b} (${sn(e.aSign)}–${sn(e.bSign)})`,
    })),
  ];
  return events.sort((a, b) => a.at.localeCompare(b.at));
}

export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', {
    month: 'long', year: 'numeric', timeZone: 'UTC',
  });
}

export function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
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
