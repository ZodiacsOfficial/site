/**
 * zodiacs.org "Cosmic Void" tokens, lifted verbatim from
 * site src/styles/tokens.css + src/lib/signs.ts + src/lib/wheel/Wheel.tsx.
 * Do not invent colors — every value here exists on the site.
 */
export const VOID = {
  v0: '#060709',
  v1: '#0A0C11',
  v2: '#0F121A',
  v3: '#151925',
  v4: '#1C2130',
} as const;

export const INK = {
  i0: '#EEF1F7',
  i1: '#C6CCDA',
  i2: '#8E96AB',
  i3: '#7A8397',
} as const;

export const HAIR = {
  h1: 'rgba(198,204,218,0.08)',
  h2: 'rgba(198,204,218,0.16)',
  h3: 'rgba(198,204,218,0.28)',
} as const;

export const SIGN_HUES: Record<string, string> = {
  aries: '#DE8E79',
  taurus: '#B9D4BE',
  gemini: '#B29DD0',
  cancer: '#B6D4E4',
  leo: '#E0A9B4',
  virgo: '#B7D9B0',
  libra: '#D3A9DE',
  scorpio: '#B9DCE8',
  sagittarius: '#E0B080',
  capricorn: '#C0DEA8',
  aquarius: '#AE8FC9',
  pisces: '#A9D4C4',
};

export const SIGN_ORDER = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
] as const;

export const SIGN_NAMES: Record<string, string> = {
  aries: 'Aries', taurus: 'Taurus', gemini: 'Gemini', cancer: 'Cancer',
  leo: 'Leo', virgo: 'Virgo', libra: 'Libra', scorpio: 'Scorpio',
  sagittarius: 'Sagittarius', capricorn: 'Capricorn', aquarius: 'Aquarius', pisces: 'Pisces',
};

/** Aspect chord colors — Wheel.tsx ASPECT_COLOR, verbatim. */
export const ASPECT_COLOR: Record<string, string> = {
  conjunction: 'rgba(238,241,247,0.5)',
  sextile: 'rgba(169,212,196,0.55)',
  trine: 'rgba(182,212,228,0.6)',
  square: 'rgba(222,142,121,0.6)',
  opposition: 'rgba(224,169,180,0.6)',
};

/** Orb-weight class → chord stroke width — Wheel.tsx ASPECT_STROKE. */
export const ASPECT_STROKE = [0.9, 1.3, 1.8] as const;

/** Retrograde tag color — Wheel.tsx Rx text fill. */
export const RX_COLOR = 'rgba(224,176,128,0.9)';

export const FONT = {
  serif: "'EB Garamond', Georgia, serif",
  sans: "'Instrument Sans', system-ui, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
} as const;
