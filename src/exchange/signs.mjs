/**
 * The twelve, in zodiac order, with the canonical pastel hues.
 *
 * Values are copied from scripts/wing-nav.mjs NAV_SIGNS (which mirrors
 * src/lib/signs.ts) rather than imported: this module ships in a browser
 * bundle and the nav module belongs to the generators. A test pins the copy
 * against the source so the two can never skew.
 */

export const EXCHANGE_SIGNS = [
  { slug: 'aries', name: 'Aries', glyph: '♈', hue: '#DE8E79' },
  { slug: 'taurus', name: 'Taurus', glyph: '♉', hue: '#B9D4BE' },
  { slug: 'gemini', name: 'Gemini', glyph: '♊', hue: '#B29DD0' },
  { slug: 'cancer', name: 'Cancer', glyph: '♋', hue: '#B6D4E4' },
  { slug: 'leo', name: 'Leo', glyph: '♌', hue: '#E0A9B4' },
  { slug: 'virgo', name: 'Virgo', glyph: '♍', hue: '#B7D9B0' },
  { slug: 'libra', name: 'Libra', glyph: '♎', hue: '#D3A9DE' },
  { slug: 'scorpio', name: 'Scorpio', glyph: '♏', hue: '#B9DCE8' },
  { slug: 'sagittarius', name: 'Sagittarius', glyph: '♐', hue: '#E0B080' },
  { slug: 'capricorn', name: 'Capricorn', glyph: '♑', hue: '#C0DEA8' },
  { slug: 'aquarius', name: 'Aquarius', glyph: '♒', hue: '#AE8FC9' },
  { slug: 'pisces', name: 'Pisces', glyph: '♓', hue: '#A9D4C4' },
];
