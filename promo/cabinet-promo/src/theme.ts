/** Cosmic Void palette + the Twelve, mirrored from zodiacs.org tokens. */
export const VOID = '#060709';
export const INK_0 = '#EEF1F7';
export const INK_1 = '#C6CCDA';
export const INK_2 = '#8E96AB';
export const HAIR = 'rgba(198, 204, 218, 0.16)';
export const HAIR_SOFT = 'rgba(198, 204, 218, 0.08)';

export const BRONZE = '#DE8E79';
export const SILVER = '#C6CCDA';
export const GOLD = '#E0B080';

export const SIGNS = [
  { slug: 'aries', name: 'Aries', hue: '#DE8E79' },
  { slug: 'taurus', name: 'Taurus', hue: '#B9D4BE' },
  { slug: 'gemini', name: 'Gemini', hue: '#B29DD0' },
  { slug: 'cancer', name: 'Cancer', hue: '#B6D4E4' },
  { slug: 'leo', name: 'Leo', hue: '#E0A9B4' },
  { slug: 'virgo', name: 'Virgo', hue: '#B7D9B0' },
  { slug: 'libra', name: 'Libra', hue: '#D3A9DE' },
  { slug: 'scorpio', name: 'Scorpio', hue: '#B9DCE8' },
  { slug: 'sagittarius', name: 'Sagittarius', hue: '#E0B080' },
  { slug: 'capricorn', name: 'Capricorn', hue: '#C0DEA8' },
  { slug: 'aquarius', name: 'Aquarius', hue: '#AE8FC9' },
  { slug: 'pisces', name: 'Pisces', hue: '#A9D4C4' },
] as const;

export const SERIF = 'EBGaramond, Georgia, serif';
export const SANS = 'InstrumentSans, system-ui, sans-serif';
export const MONO = 'JetBrainsMono, ui-monospace, monospace';

/** SVG grain as a data URI — static film grain over the void. */
export const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='240' height='240' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`;
