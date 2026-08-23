/**
 * Build-time model for the Living Correspondence Chart and its CSV twin.
 * The sign correspondences come from the canonical sign table; the two
 * year-specific Sun ingresses come only from the committed ingress data.
 */
import ingressData from '../data/ingresses.json';
import { ELEMENT_LABEL, MODALITY_LABEL, SIGNS, type Sign } from './signs';

interface IngressWindow {
  planet: string;
  sign: string;
  from: string;
  to: string;
}

interface IngressData {
  generatedAt: string;
  windows: IngressWindow[];
}

const ingresses = ingressData as IngressData;
const sourceYear = Number(ingresses.generatedAt.slice(0, 4));

if (!Number.isInteger(sourceYear)) {
  throw new Error(`Invalid ingress generatedAt: ${ingresses.generatedAt}`);
}

export const INGRESS_GENERATED_AT = ingresses.generatedAt;
export const INGRESS_YEARS = [sourceYear, sourceYear + 1] as const;

const SEASONS = [
  { northern: 'Spring', southern: 'Autumn' },
  { northern: 'Spring', southern: 'Autumn' },
  { northern: 'Spring', southern: 'Autumn' },
  { northern: 'Summer', southern: 'Winter' },
  { northern: 'Summer', southern: 'Winter' },
  { northern: 'Summer', southern: 'Winter' },
  { northern: 'Autumn', southern: 'Spring' },
  { northern: 'Autumn', southern: 'Spring' },
  { northern: 'Autumn', southern: 'Spring' },
  { northern: 'Winter', southern: 'Summer' },
  { northern: 'Winter', southern: 'Summer' },
  { northern: 'Winter', southern: 'Summer' },
] as const;

export interface ZodiacDateRow {
  sign: Sign;
  glyph: string;
  unicode: string;
  longitudeRange: string;
  element: string;
  modality: string;
  polarity: 'Day (yang)' | 'Night (yin)';
  modernRuler: string;
  classicalRuler: string;
  northernSeason: string;
  southernSeason: string;
  ingressUtc: Record<number, string>;
}

function sunIngress(sign: string, year: number): string {
  const matches = ingresses.windows.filter((window) =>
    window.planet === 'Sun'
    && window.sign === sign
    && window.from.startsWith(`${year}-`));

  if (matches.length !== 1) {
    throw new Error(`Expected one ${year} Sun ingress for ${sign}, found ${matches.length}`);
  }
  return matches[0].from;
}

export const ZODIAC_DATE_ROWS: readonly ZodiacDateRow[] = SIGNS.map((sign, index) => {
  const codePoint = sign.glyph.codePointAt(0);
  if (codePoint === undefined) throw new Error(`Missing glyph for ${sign.name}`);

  const ingressUtc = Object.fromEntries(
    INGRESS_YEARS.map((year) => [year, sunIngress(sign.slug, year)]),
  ) as Record<number, string>;
  const season = SEASONS[index];

  return {
    sign,
    glyph: sign.glyph,
    unicode: `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`,
    longitudeRange: `${index * 30}° ≤ λ < ${(index + 1) * 30}°`,
    element: ELEMENT_LABEL[sign.element],
    modality: MODALITY_LABEL[sign.modality],
    polarity: sign.polarity === 'day' ? 'Day (yang)' : 'Night (yin)',
    modernRuler: sign.ruler,
    classicalRuler: sign.classicRuler ?? sign.ruler,
    northernSeason: season.northern,
    southernSeason: season.southern,
    ingressUtc,
  };
});

/** ISO minute for data interchange, e.g. 2026-03-20T14:45Z. */
export function ingressIsoMinute(iso: string): string {
  return `${iso.slice(0, 16)}Z`;
}

/** Human UTC receipt at minute precision, e.g. 2026-03-20 · 14:45 UTC. */
export function ingressDisplayMinute(iso: string): string {
  return `${iso.slice(0, 10)} · ${iso.slice(11, 16)} UTC`;
}
