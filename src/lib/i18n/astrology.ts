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
  pt: {
    Sun: 'Sol', Moon: 'Lua', Mercury: 'Mercúrio', Venus: 'Vênus', Mars: 'Marte',
    Jupiter: 'Júpiter', Saturn: 'Saturno', Uranus: 'Urano', Neptune: 'Netuno', Pluto: 'Plutão',
    'North Node': 'Nodo Norte', 'South Node': 'Nodo Sul',
  },
  fr: {
    Sun: 'Soleil', Moon: 'Lune', Mercury: 'Mercure', Venus: 'Vénus', Mars: 'Mars',
    Jupiter: 'Jupiter', Saturn: 'Saturne', Uranus: 'Uranus', Neptune: 'Neptune', Pluto: 'Pluton',
    'North Node': 'Nœud Nord', 'South Node': 'Nœud Sud',
  },
  it: {
    Sun: 'Sole', Moon: 'Luna', Mercury: 'Mercurio', Venus: 'Venere', Mars: 'Marte',
    Jupiter: 'Giove', Saturn: 'Saturno', Uranus: 'Urano', Neptune: 'Nettuno', Pluto: 'Plutone',
    'North Node': 'Nodo Nord', 'South Node': 'Nodo Sud',
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
  pt: {
    conjunction: 'conjunção', sextile: 'sextil', square: 'quadratura',
    trine: 'trígono', opposition: 'oposição',
  },
  fr: {
    conjunction: 'conjonction', sextile: 'sextile', square: 'carré',
    trine: 'trigone', opposition: 'opposition',
  },
  it: {
    conjunction: 'congiunzione', sextile: 'sestile', square: 'quadratura',
    trine: 'trigono', opposition: 'opposizione',
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
  pt: {
    'New Moon': 'Lua nova',
    'Waxing Crescent': 'Lua crescente',
    'First Quarter': 'Quarto crescente',
    'Waxing Gibbous': 'Gibosa crescente',
    'Full Moon': 'Lua cheia',
    'Waning Gibbous': 'Gibosa minguante',
    'Last Quarter': 'Quarto minguante',
    'Waning Crescent': 'Lua minguante',
  },
  fr: {
    'New Moon': 'Nouvelle Lune',
    'Waxing Crescent': 'Premier croissant',
    'First Quarter': 'Premier quartier',
    'Waxing Gibbous': 'Lune gibbeuse croissante',
    'Full Moon': 'Pleine Lune',
    'Waning Gibbous': 'Lune gibbeuse décroissante',
    'Last Quarter': 'Dernier quartier',
    'Waning Crescent': 'Dernier croissant',
  },
  it: {
    'New Moon': 'Luna nuova',
    'Waxing Crescent': 'Falce crescente',
    'First Quarter': 'Primo quarto',
    'Waxing Gibbous': 'Gibbosa crescente',
    'Full Moon': 'Luna piena',
    'Waning Gibbous': 'Gibbosa calante',
    'Last Quarter': 'Ultimo quarto',
    'Waning Crescent': 'Falce calante',
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
