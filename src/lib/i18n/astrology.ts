import type { Locale } from './index';

const PLANET_LABELS: Record<Locale, Record<string, string>> = {
  en: {
    Sun: 'Sun', Moon: 'Moon', Mercury: 'Mercury', Venus: 'Venus', Mars: 'Mars',
    Jupiter: 'Jupiter', Saturn: 'Saturn', Uranus: 'Uranus', Neptune: 'Neptune', Pluto: 'Pluto',
    'North Node': 'North Node', 'South Node': 'South Node',
  },
  es: {
    Sun: 'Sol', Moon: 'Luna', Mercury: 'Mercurio', Venus: 'Venus', Mars: 'Marte',
    Jupiter: 'Júpiter', Saturn: 'Saturno', Uranus: 'Urano', Neptune: 'Neptuno', Pluto: 'Plutón',
    'North Node': 'Nodo Norte', 'South Node': 'Nodo Sur',
  },
};

const ASPECT_LABELS: Record<Locale, Record<string, string>> = {
  en: {
    conjunction: 'conjunction', sextile: 'sextile', square: 'square',
    trine: 'trine', opposition: 'opposition',
  },
  es: {
    conjunction: 'conjunción', sextile: 'sextil', square: 'cuadratura',
    trine: 'trígono', opposition: 'oposición',
  },
};

const MOON_PHASE_LABELS: Record<Locale, Record<string, string>> = {
  en: {
    'New Moon': 'New Moon',
    'Waxing Crescent': 'Waxing Crescent',
    'First Quarter': 'First Quarter',
    'Waxing Gibbous': 'Waxing Gibbous',
    'Full Moon': 'Full Moon',
    'Waning Gibbous': 'Waning Gibbous',
    'Last Quarter': 'Last Quarter',
    'Waning Crescent': 'Waning Crescent',
  },
  es: {
    'New Moon': 'Luna nueva',
    'Waxing Crescent': 'Luna creciente',
    'First Quarter': 'Cuarto creciente',
    'Waxing Gibbous': 'Gibosa creciente',
    'Full Moon': 'Luna llena',
    'Waning Gibbous': 'Gibosa menguante',
    'Last Quarter': 'Cuarto menguante',
    'Waning Crescent': 'Luna menguante',
  },
};

export function planetLabel(locale: Locale, body: string): string {
  return PLANET_LABELS[locale][body] ?? body;
}

export function aspectLabel(locale: Locale, aspect: string): string {
  return ASPECT_LABELS[locale][aspect] ?? aspect;
}

export function moonPhaseLabel(locale: Locale, phase: string): string {
  return MOON_PHASE_LABELS[locale][phase] ?? phase;
}
