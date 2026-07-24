# Glyph verification — every symbol that appears on screen

The site never typesets astrological symbols as loose Unicode text on new
surfaces: signs render as the SDK pastel disc icons
(`public/assets/zodiac-icons/…`, copied here byte-identical to
`video/public/icons/128/`), planets and points render as the site's crafted
SVG line-art (`src/lib/glyphs/paths.ts`, copied verbatim to
`src/components/planet-glyphs.ts`). The video follows the same rule — no
system-font astro glyphs anywhere. This table verifies each drawn mark
against the canonical Unicode symbol for the body/sign it stands for
(canonical codepoints from the site's own `src/lib/signs.ts` glyph column).

## Sign disc icons (wheel ring, Big Three chips, horoscope cards)

| On screen (icon file) | Stands for | Canonical Unicode | Verified |
| --- | --- | --- | --- |
| `icons/128/aries.webp` | Aries | ♈ U+2648 | ✓ ram-horn mark on `#DE8E79` disc |
| `icons/128/taurus.webp` | Taurus | ♉ U+2649 | ✓ circle + horns on `#B9D4BE` disc |
| `icons/128/gemini.webp` | Gemini | ♊ U+264A | ✓ twin pillars on `#B29DD0` disc |
| `icons/128/cancer.webp` | Cancer | ♋ U+264B | ✓ 69-curl mark on `#B6D4E4` disc |
| `icons/128/leo.webp` | Leo | ♌ U+264C | ✓ maned loop on `#E0A9B4` disc |
| `icons/128/virgo.webp` | Virgo | ♍ U+264D | ✓ M-with-loop on `#B7D9B0` disc |
| `icons/128/libra.webp` | Libra | ♎ U+264E | ✓ balance mark on `#D3A9DE` disc |
| `icons/128/scorpio.webp` | Scorpio | ♏ U+264F | ✓ M-with-sting on `#B9DCE8` disc |
| `icons/128/sagittarius.webp` | Sagittarius | ♐ U+2650 | ✓ arrow on `#E0B080` disc |
| `icons/128/capricorn.webp` | Capricorn | ♑ U+2651 | ✓ goat-fish curl on `#C0DEA8` disc |
| `icons/128/aquarius.webp` | Aquarius | ♒ U+2652 | ✓ double waves on `#AE8FC9` disc |
| `icons/128/pisces.webp` | Pisces | ♓ U+2653 | ✓ bound fishes on `#A9D4C4` disc |

## Planet / point marks (natal wheel bodies)

Crafted line-art from the site's `PLANET_GLYPH`; each drawing is the
traditional symbol:

| Body on wheel | Drawing | Canonical Unicode |
| --- | --- | --- |
| Sun | circle + centre dot | ☉ U+2609 |
| Moon | crescent | ☽ U+263D |
| Mercury | crescent-horns · circle · cross | ☿ U+263F |
| Venus | circle over cross | ♀ U+2640 |
| Mars | circle + upper-right arrow | ♂ U+2642 |
| Jupiter | hook + stem + crossbar | ♃ U+2643 |
| Saturn | cross-topped stem into hook | ♄ U+2644 |
| Uranus | H-frame + hanging circle | ♅ U+2645 (astronomical form) |
| Neptune | trident | ♆ U+2646 |
| Pluto | crescent cradling circle over cross | ♇ U+2647 |
| North Node | omega, feet down | ☊ U+260A |
| South Node | *not drawn* — site wheel convention hides it | (☋ U+260B) |

## Aspects

Aspect lines are colored chords (site `ASPECT_COLOR`); aspect names in the
synastry scene are typeset as words (`Mars square Pluto`), never as symbol
glyphs. Canonical symbols for reference: conjunction ☌ U+260C, opposition
☍ U+260D, trine △ U+25B3, square □ U+25A1, sextile ⚹ U+26B9.

## Other marks

- Retrograde is the site's mono-text `Rx` tag in `rgba(224,176,128,0.9)`
  (the site does not use ℞ U+211E). Appears on Saturn, Uranus, Neptune,
  Pluto in the 1993-06-16 chart — all four genuinely retrograde that day.
- Degrees typeset as `25°31′` — `°` U+00B0 + `′` U+2032 (prime), same as
  the site's `formatLongitude`; JetBrains Mono covers both (verified in
  the placements-table screenshot).
- The moon disc in the sky scene appears inside the real
  `/moon-phase/` screenshot (site `PhaseDisc` rendering).

## Chart-data audit (what the glyphs claim)

Chart: June 16, 1993 · 12:30 PM EDT (16:30 UTC) · New York, NY · Placidus.
Computed by the site's own engine (`@zodiacs/engine` 0.1.0):

- Sun 25°31′ Gemini (h10) · Moon 14°56′ Taurus (h8) · ASC 20°50′ Virgo ·
  MC 19°22′ Gemini
- Mercury 20°11′ Cancer · Venus 9°53′ Taurus · Mars 26°12′ Leo ·
  Jupiter 5°07′ Libra · Saturn 0°17′ Pisces Rx · Uranus 21°12′ Capricorn Rx ·
  Neptune 20°25′ Capricorn Rx · Pluto 23°17′ Scorpio Rx · NN 12°11′ Sagittarius
- The Uranus–Neptune conjunction (orb 0.77°) is the real 1993 conjunction.
- Wheel draws the 12 aspects under orb 6° (site convention), dashed when
  separating.

Sky scene (captured 2026-07-24 03:48 UTC, site engine):
Moon 1°20′ Sagittarius · Waxing Gibbous 75% · Neptune Rx · Pluto Rx ·
next eclipse total solar Aug 12 · 20° Leo — cross-checked against the
site's `/moon-phase/` and `/retrogrades/` pages rendered the same day
(screenshots in `public/shots/`).
