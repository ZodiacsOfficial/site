import type { BodyName } from './engine/types';
import { requireCatalogLocale, t, type Locale } from './i18n';
import { SIGNS, signForLongitude, signName } from './signs';

export interface MoonPresentation {
  bodies: readonly { body: BodyName; lon: number }[];
  angles?: unknown | null;
  moonSignCandidates?: readonly string[];
}

/** Never reconstruct a local-day range from a reference longitude alone. */
export function moonCandidates(chart: MoonPresentation): readonly string[] {
  if (chart.moonSignCandidates !== undefined) {
    const candidates = [...new Set(chart.moonSignCandidates)];
    return candidates.length <= 2 && candidates.every((slug) => SIGNS.some((sign) => sign.slug === slug))
      ? candidates : [];
  }
  if (chart.angles === null) return [];
  const moon = chart.bodies.find((body) => body.body === 'Moon');
  return moon ? [signForLongitude(moon.lon).slug] : [];
}

export function moonIsUncertain(chart: MoonPresentation): boolean {
  return moonCandidates(chart).length !== 1;
}

export function moonLabel(chart: MoonPresentation, locale: Locale = 'en'): string {
  const catalogLocale = requireCatalogLocale(locale);
  const candidates = moonCandidates(chart);
  return candidates.length
    ? candidates.map((slug) => signName(SIGNS.find((sign) => sign.slug === slug)!, locale)).join(' / ')
    : t(catalogLocale, 'needsBirthTime');
}

/** Endpoint positions are already computed by the caller's existing local-day check. */
export function moonCandidatesFromEndpoints(
  start: MoonPresentation['bodies'],
  end: MoonPresentation['bodies'],
): readonly string[] {
  const first = start.find((body) => body.body === 'Moon');
  const last = end.find((body) => body.body === 'Moon');
  if (!first || !last || !Number.isFinite(first.lon) || !Number.isFinite(last.lon)) return [];
  return [...new Set([signForLongitude(first.lon).slug, signForLongitude(last.lon).slug])];
}
