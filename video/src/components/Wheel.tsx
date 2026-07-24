/**
 * The chart wheel — a faithful port of the site's hand-built SVG wheel
 * (src/lib/wheel/Wheel.tsx, static + interactive styling) rendering the
 * real computed chart, with two additions for motion: per-aspect draw-on
 * progress and grouped aspect opacity. Geometry, radii, colors, stroke
 * weights, collision layout, and conventions (ASC at 9 o'clock, zodiac
 * counterclockwise, South Node hidden) are the site's own.
 */
import React from 'react';
import { ASPECT_COLOR, ASPECT_STROKE, HAIR, INK, RX_COLOR, SIGN_HUES, SIGN_ORDER, FONT, VOID } from '../theme';
import { PLANET_GLYPH } from './planet-glyphs';
import { ICON_URI } from '../icon-data';
import type { WheelAspectDatum, WheelBodyDatum } from '../data';

/** Site collisionNudge (src/lib/scene/layout.ts), verbatim: <7° fans out, 4 passes. */
function collisionNudge(bodies: { body: string; lon: number }[]): Map<string, number> {
  const sorted = [...bodies].sort((x, y) => x.lon - y.lon);
  const drawLon = new Map<string, number>();
  for (const b of sorted) drawLon.set(b.body, b.lon);
  for (let pass = 0; pass < 4; pass += 1) {
    for (let i = 0; i < sorted.length; i += 1) {
      const a = sorted[i];
      const b = sorted[(i + 1) % sorted.length];
      if (a === b) continue;
      const la = drawLon.get(a.body)!;
      const lb = drawLon.get(b.body)!;
      const gap = ((lb - la) % 360 + 360) % 360;
      if (gap < 7) {
        const push = (7 - gap) / 2;
        drawLon.set(a.body, la - push);
        drawLon.set(b.body, lb + push);
      }
    }
  }
  return drawLon;
}

export interface WheelProps {
  bodies: WheelBodyDatum[];
  asc: number;
  mc: number;
  cusps: number[];
  aspects: WheelAspectDatum[];
  size?: number;
  /** 0..1 per drawn aspect: chord draw-on (solid) / fade-in (dashed). */
  aspectProgress?: number[];
  /** Multiplies every chord's opacity (fade the web as a group). */
  aspectOpacity?: number;
}

export const Wheel: React.FC<WheelProps> = ({
  bodies, asc, mc, cusps, aspects, size = 620,
  aspectProgress, aspectOpacity = 1,
}) => {
  const cx = size / 2;
  const cy = size / 2;
  const rSigns = size * 0.475;
  const rSignsIn = size * 0.395;
  const rBodies = size * 0.31;
  const rAspects = size * 0.235;
  const anchor = asc;
  const pad = size * 0.05;

  const pt = (lon: number, r: number) => {
    const phi = ((180 + (lon - anchor)) * Math.PI) / 180;
    return { x: cx + r * Math.cos(phi), y: cy - r * Math.sin(phi) };
  };

  const arcPath = (from: number, to: number, r: number) => {
    const a = pt(from, r);
    const b = pt(to, r);
    return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${r} ${r} 0 0 0 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
  };

  const drawLon = collisionNudge(bodies);
  const houseSpan = (i: number) => {
    const next = cusps[(i + 1) % 12];
    return ((next - cusps[i]) % 360 + 360) % 360;
  };

  return (
    <svg
      viewBox={`${-pad} ${-pad} ${size + pad * 2} ${size + pad * 2}`}
      width="100%"
      style={{ display: 'block' }}
    >
      {/* Ring backgrounds */}
      <circle cx={cx} cy={cy} r={rSigns} fill="none" stroke={HAIR.h2} strokeWidth={1} />
      <circle cx={cx} cy={cy} r={rSignsIn} fill="none" stroke={HAIR.h2} strokeWidth={1} />
      <circle cx={cx} cy={cy} r={rAspects} fill="none" stroke={HAIR.h1} strokeWidth={1} />

      {/* Sign ring: pastel arcs + disc icons */}
      {SIGN_ORDER.map((slug, i) => {
        const from = i * 30;
        const mid = from + 15;
        const c = pt(mid, (rSigns + rSignsIn) / 2);
        const disc = size * 0.068;
        const hue = SIGN_HUES[slug];
        return (
          <g key={slug}>
            <path
              d={arcPath(from + 1.5, from + 28.5, (rSigns + rSignsIn) / 2)}
              fill="none" stroke={hue} strokeOpacity={0.12}
              strokeWidth={rSigns - rSignsIn - 6}
            />
            <path
              d={arcPath(from + 1.5, from + 28.5, rSigns - 1)}
              fill="none" stroke={hue} strokeOpacity={0.8}
              strokeWidth={2} strokeLinecap="round"
            />
            <image
              href={ICON_URI[slug]}
              x={(c.x - disc / 2).toFixed(2)} y={(c.y - disc / 2).toFixed(2)}
              width={disc.toFixed(2)} height={disc.toFixed(2)}
            />
          </g>
        );
      })}

      {/* Sign boundaries */}
      {SIGN_ORDER.map((_, i) => {
        const a = pt(i * 30, rSignsIn);
        const b = pt(i * 30, rSigns);
        return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgba(198,204,218,0.22)" strokeWidth={1} />;
      })}

      {/* House cusps + numbers (true wedge midpoints, as the calculator wheel) */}
      {cusps.map((lon, i) => {
        const a = pt(lon, rAspects);
        const b = pt(lon, rSignsIn);
        const isAngle = i === 0 || i === 3 || i === 6 || i === 9;
        const num = pt(lon + houseSpan(i) / 2, (rAspects + rBodies) / 2 - size * 0.02);
        return (
          <g key={i}>
            <line
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={isAngle ? 'rgba(238,241,247,0.4)' : 'rgba(198,204,218,0.14)'}
              strokeWidth={isAngle ? 1.4 : 1}
            />
            <text
              x={num.x} y={num.y} textAnchor="middle" dominantBaseline="central"
              fontSize={size * 0.021} fill="rgba(95,103,121,0.9)" fontFamily={FONT.mono}
            >
              {i + 1}
            </text>
          </g>
        );
      })}

      {/* ASC / MC labels */}
      {(() => {
        const p = pt(asc, rSigns + size * 0.012);
        return (
          <text
            x={p.x - size * 0.012} y={p.y} textAnchor="end" dominantBaseline="central"
            fontSize={size * 0.026} fill="rgba(238,241,247,0.75)" fontFamily={FONT.mono}
          >
            ASC
          </text>
        );
      })()}
      {(() => {
        const p = pt(mc, rSigns + size * 0.028);
        return (
          <text
            x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central"
            fontSize={size * 0.026} fill="rgba(238,241,247,0.6)" fontFamily={FONT.mono}
          >
            MC
          </text>
        );
      })()}

      {/* Aspect chords — real aspects, site colors/weights; draw-on per chord */}
      {aspects.map((a, i) => {
        const A = bodies.find((b) => b.body === a.a);
        const B = bodies.find((b) => b.body === a.b);
        if (!A || !B) return null;
        const p1 = pt(A.lon, rAspects);
        const p2 = pt(B.lon, rAspects);
        const p = aspectProgress ? Math.max(0, Math.min(1, aspectProgress[i] ?? 1)) : 1;
        if (p <= 0) return null;
        const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const dashed = !a.applying;
        return (
          <line
            key={`${a.a}-${a.type}-${a.b}`}
            x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
            stroke={ASPECT_COLOR[a.type] ?? 'rgba(198,204,218,0.3)'}
            strokeWidth={ASPECT_STROKE[a.weight]}
            strokeDasharray={dashed ? '3 3' : p < 1 ? `${len} ${len}` : undefined}
            strokeDashoffset={dashed ? undefined : p < 1 ? len * (1 - p) : undefined}
            opacity={(dashed ? p : 1) * aspectOpacity}
          />
        );
      })}

      {/* Bodies: hue tick at true longitude, disc + crafted glyph at fanned position */}
      {bodies.map((b) => {
        const lonDraw = drawLon.get(b.body) ?? b.lon;
        const p = pt(lonDraw, rBodies);
        const tick1 = pt(b.lon, rSignsIn);
        const tick2 = pt(b.lon, rSignsIn - size * 0.014);
        const hue = SIGN_HUES[SIGN_ORDER[Math.floor((((b.lon % 360) + 360) % 360) / 30)]];
        const glyphScale = (size * 0.05) / 24;
        return (
          <g key={b.body}>
            <line x1={tick1.x} y1={tick1.y} x2={tick2.x} y2={tick2.y} stroke={hue} strokeWidth={1.4} />
            <circle cx={p.x} cy={p.y} r={size * 0.033} fill="rgba(15,18,26,0.92)" stroke={hue} strokeOpacity={0.55} strokeWidth={1} />
            <g
              transform={`translate(${p.x} ${p.y}) scale(${glyphScale}) translate(-12 -12)`}
              fill="none"
              stroke={INK.i0}
              strokeWidth={1.4 * 24 / (size * 0.05)}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: INK.i0 }}
              dangerouslySetInnerHTML={{ __html: PLANET_GLYPH[b.body] ?? '' }}
            />
            {b.retrograde && (
              <text
                x={p.x + size * 0.032} y={p.y + size * 0.028} textAnchor="middle"
                fontSize={size * 0.017} fill={RX_COLOR} fontFamily={FONT.mono}
              >
                Rx
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
};

export const wheelBackdropColor = VOID.v0;
