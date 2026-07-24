/**
 * The site's crafted planet glyph line-art, copied verbatim from
 * src/lib/glyphs/paths.ts (PLANET_GLYPH). Each string is the inner SVG of a
 * 0 0 24 24 viewBox; stroke presentation is applied by the renderer.
 *
 * Body ↔ traditional symbol mapping (see GLYPHS.md for the audit):
 *   Sun ☉ · Moon ☽ · Mercury ☿ · Venus ♀ · Mars ♂ · Jupiter ♃ · Saturn ♄
 *   Uranus ♅ · Neptune ♆ · Pluto ♇ · North Node ☊
 */
const DOT = (cx: number, cy: number, r: number) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="currentColor" stroke="none"/>`;

export const PLANET_GLYPH: Record<string, string> = {
  // ☉ circle + centre dot
  Sun: `<circle cx="12" cy="12" r="7.4"/>${DOT(12, 12, 1.5)}`,
  // ☽ waxing crescent
  Moon: `<path d="M14.7 4.4a8 8 0 1 0 0 15.2 6.5 6.5 0 0 1 0-15.2Z"/>`,
  // ☿ crescent (horns up) · circle · cross
  Mercury: `<path d="M8.7 4.6a3.3 3.3 0 0 0 6.6 0"/><circle cx="12" cy="10.4" r="3.2"/><path d="M12 13.6v6M9 16.6h6"/>`,
  // ♀ circle over a cross
  Venus: `<circle cx="12" cy="8.4" r="4.4"/><path d="M12 12.8v8.2M8.6 17.4h6.8"/>`,
  // ♂ circle with an arrow to the upper right
  Mars: `<circle cx="10.4" cy="13.6" r="4.7"/><path d="M13.8 10.2 19 5"/><path d="M14.7 5H19v4.3"/>`,
  // ♃ hook + stem + crossbar
  Jupiter: `<path d="M7.6 10.2c0-4.2 6.2-4.2 6.2 0v9.6"/><path d="M9.3 16.3h6.6"/>`,
  // ♄ cross at top of a stem curling into a hook
  Saturn: `<path d="M10.2 5v9.4"/><path d="M8 7.6h4.4"/><path d="M10.2 14.4c0 3.4 3.4 3.4 4.6 1.1"/>`,
  // ♅ H-frame with a hanging circle (astronomical Uranus)
  Uranus: `<path d="M8 6v7M16 6v7M8 9.4h8M12 6v6.4"/><circle cx="12" cy="16.4" r="2.1"/><path d="M12 13v1.3"/>`,
  // ♆ trident
  Neptune: `<path d="M6.5 5.6v4.2M17.5 5.6v4.2M12 4.4V20"/><path d="M6.5 9.8a6 6 0 0 0 11 0"/><path d="M9 16.6h6"/>`,
  // ♇ open crescent cradling a circle, over a cross
  Pluto: `<path d="M7 8.8a5 5 0 0 0 10 0"/><circle cx="12" cy="6.6" r="2.2"/><path d="M12 13.6v7M9 17.1h6"/>`,
  // ☊ ascending node — omega, feet down
  'North Node': `<path d="M8 19.2v-3.4a4.3 4.8 0 1 1 8 0v3.4"/>${DOT(8, 19.2, 1.4)}${DOT(16, 19.2, 1.4)}`,
};
