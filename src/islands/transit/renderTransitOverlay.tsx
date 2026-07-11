/**
 * Renders the transit outer ring into the Wheel's overlay slot. Lives in the
 * transit island's (lazy) chunk — it receives the wheel's geometry and returns
 * the marks, so none of this weighs on the shared Wheel bundle used by the
 * homepage demo, the share card, and the birth chart.
 */
import { SIGNS } from '../../lib/signs';
import { PLANET_GLYPH } from '../../lib/glyphs/paths';
import { overlayAspectId, overlayBodyId, type WheelOverlay } from '../../lib/scene/types';
import type { WheelGeometry } from '../../lib/wheel/Wheel';

const ASPECT_COLOR: Record<string, string> = {
  conjunction: 'rgba(238,241,247,0.5)',
  sextile: 'rgba(169,212,196,0.55)',
  trine: 'rgba(182,212,228,0.6)',
  square: 'rgba(222,142,121,0.6)',
  opposition: 'rgba(224,169,180,0.6)',
};

export function renderTransitOverlay(
  overlay: WheelOverlay,
  natalLonOf: (name: string) => number | null,
  onSelect: (id: string | null) => void,
  geo: WheelGeometry,
) {
  const { size, cx, cy, rOuter, rOuterSeat, rSigns, rBodies, pt } = geo;
  const focus = overlay.focus;
  const focusOuter = focus ? overlay.aspects.find((a) => overlayAspectId(a) === focus)?.outer ?? null : null;
  const chordDim = (a: WheelOverlay['aspects'][number]) => (focus && overlayAspectId(a) !== focus ? 0.16 : 1);
  const bodyDim = (name: string) => (focus && name !== focusOuter ? 0.32 : 1);

  return (
    <g class="wheel__overlay" role="group" aria-label={overlay.label}>
      {/* Seat circle for the outer ring. */}
      <circle cx={cx} cy={cy} r={rOuterSeat} fill="none" stroke="rgba(198,204,218,0.14)" stroke-width="1" stroke-dasharray="2 4" />

      {/* Transit → natal contact chords, outer marker to natal planet. */}
      {overlay.aspects.map((a) => {
        const nl = natalLonOf(a.inner);
        const b = overlay.bodies.find((x) => x.body === a.outer);
        if (nl === null || !b) return null;
        const p1 = pt(b.drawLon, rOuter - size * 0.03);
        const p2 = pt(nl, rBodies);
        const id = overlayAspectId(a);
        return (
          <g key={id} opacity={chordDim(a)}>
            <line
              x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
              stroke={ASPECT_COLOR[a.type] ?? 'rgba(198,204,218,0.3)'}
              stroke-width={a.orb <= 1.5 ? 1.8 : a.orb <= 3.5 ? 1.3 : 0.9}
              pointer-events="none"
            />
            <line
              x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
              stroke="transparent" stroke-width={size * 0.028}
              data-transit-aspect={id}
              onClick={(ev: MouseEvent) => { ev.stopPropagation(); onSelect(focus === id ? null : id); }}
              class="wheel__hit"
            />
          </g>
        );
      })}

      {/* Transiting bodies on the outer ring. */}
      {overlay.bodies.map((b) => {
        const p = pt(b.drawLon, rOuter);
        const tick1 = pt(b.lon, rSigns + size * 0.008);
        const tick2 = pt(b.lon, rOuter - size * 0.036);
        const sign = SIGNS[Math.floor(((b.lon % 360) + 360) % 360 / 30)];
        const id = overlayBodyId(b.body);
        return (
          <g
            key={b.body}
            class="wheel__body wheel__transit wheel__hit"
            opacity={bodyDim(b.body)}
            data-transit={id}
            onClick={(ev: MouseEvent) => { ev.stopPropagation(); onSelect(focus === id ? null : id); }}
          >
            <line x1={tick1.x} y1={tick1.y} x2={tick2.x} y2={tick2.y} stroke={sign.hue} stroke-width="1.2" stroke-opacity="0.7" />
            <circle cx={p.x} cy={p.y} r={size * 0.03} fill="rgba(9,11,16,0.94)" stroke={sign.hue} stroke-opacity="0.75" stroke-width="1.2" stroke-dasharray="1.5 1.5" />
            <g
              transform={`translate(${p.x} ${p.y}) scale(${(size * 0.044) / 24}) translate(-12 -12)`}
              fill="none" stroke={sign.hue} stroke-width={1.4 * 24 / (size * 0.044)}
              stroke-linecap="round" stroke-linejoin="round"
              dangerouslySetInnerHTML={{ __html: PLANET_GLYPH[b.body] ?? '' }}
            />
            {b.retrograde && (
              <text x={p.x + size * 0.03} y={p.y - size * 0.026} text-anchor="middle" font-size={size * 0.016} fill="rgba(224,176,128,0.9)" font-family="var(--font-mono)">℞</text>
            )}
          </g>
        );
      })}
    </g>
  );
}
