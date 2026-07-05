/**
 * The chart wheel — hand-built SVG, shared by the calculator and the
 * homepage demo chart. Standard orientation: the Ascendant sits at the
 * left (9 o'clock) and the zodiac runs counterclockwise. Without known
 * angles it renders 0° Aries on the left with no house spokes.
 */
import { SIGNS } from '../signs';

export interface WheelBody {
  body: string;
  lon: number;
  retrograde?: boolean;
}

export interface WheelProps {
  bodies: WheelBody[];
  asc?: number | null;
  mc?: number | null;
  cusps?: number[] | null;
  aspects?: { a: string; b: string; type: string }[];
  size?: number;
  /** Draw-in animation on mount (respects reduced motion via CSS). */
  animate?: boolean;
}

const GLYPHS: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
  'North Node': '☊', 'South Node': '☋',
};

const ASPECT_COLOR: Record<string, string> = {
  conjunction: 'rgba(238,241,247,0.5)',
  sextile: 'rgba(169,212,196,0.55)',
  trine: 'rgba(182,212,228,0.6)',
  square: 'rgba(222,142,121,0.6)',
  opposition: 'rgba(224,169,180,0.6)',
};

export default function Wheel({
  bodies, asc = null, mc = null, cusps = null, aspects = [], size = 420, animate = false,
}: WheelProps) {
  const cx = size / 2;
  const cy = size / 2;
  const rSigns = size * 0.475;      // outer edge of sign ring
  const rSignsIn = size * 0.395;    // inner edge of sign ring
  const rBodies = size * 0.31;      // planet markers
  const rAspects = size * 0.235;    // aspect hub
  const anchor = asc ?? 0;

  /** Ecliptic longitude → SVG point at radius r. */
  const pt = (lon: number, r: number) => {
    const phi = ((180 + (lon - anchor)) * Math.PI) / 180;
    return { x: cx + r * Math.cos(phi), y: cy - r * Math.sin(phi) };
  };

  const arcPath = (from: number, to: number, r: number) => {
    const a = pt(from, r);
    const b = pt(to, r);
    // 30° segments only — always the small arc, sweep flips for the
    // counterclockwise zodiac (SVG sweep=0 is counterclockwise in this
    // y-down coordinate system when angles increase).
    return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${r} ${r} 0 0 0 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
  };

  // Collision-nudge: bodies closer than 7° fan outward slightly.
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
      let gap = ((lb - la) % 360 + 360) % 360;
      if (gap < 7) {
        const push = (7 - gap) / 2;
        drawLon.set(a.body, la - push);
        drawLon.set(b.body, lb + push);
      }
    }
  }

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width="100%"
      role="img"
      aria-label="Birth chart wheel"
      class={animate ? 'wheel wheel--animate' : 'wheel'}
    >
      {/* Ring backgrounds */}
      <circle cx={cx} cy={cy} r={rSigns} fill="none" stroke="rgba(198,204,218,0.16)" stroke-width="1" />
      <circle cx={cx} cy={cy} r={rSignsIn} fill="none" stroke="rgba(198,204,218,0.16)" stroke-width="1" />
      <circle cx={cx} cy={cy} r={rAspects} fill="none" stroke="rgba(198,204,218,0.08)" stroke-width="1" />

      {/* Sign ring: pastel arcs + glyphs */}
      {SIGNS.map((s, i) => {
        const from = i * 30;
        const mid = from + 15;
        const label = pt(mid, (rSigns + rSignsIn) / 2);
        return (
          <g key={s.slug}>
            <path
              d={arcPath(from + 1.5, from + 28.5, (rSigns + rSignsIn) / 2)}
              fill="none"
              stroke={s.hue}
              stroke-opacity="0.34"
              stroke-width={rSigns - rSignsIn - 6}
            />
            <text
              x={label.x}
              y={label.y}
              text-anchor="middle"
              dominant-baseline="central"
              font-size={size * 0.037}
              fill={s.hue}
            >
              {s.glyph}
            </text>
          </g>
        );
      })}

      {/* Sign boundaries */}
      {SIGNS.map((_, i) => {
        const a = pt(i * 30, rSignsIn);
        const b = pt(i * 30, rSigns);
        return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgba(198,204,218,0.22)" stroke-width="1" />;
      })}

      {/* House cusps */}
      {cusps?.map((lon, i) => {
        const a = pt(lon, rAspects);
        const b = pt(lon, rSignsIn);
        const isAngle = i === 0 || i === 3 || i === 6 || i === 9;
        const num = pt(lon + 15, (rAspects + rBodies) / 2 - size * 0.02);
        return (
          <g key={i}>
            <line
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={isAngle ? 'rgba(238,241,247,0.4)' : 'rgba(198,204,218,0.14)'}
              stroke-width={isAngle ? 1.4 : 1}
            />
            <text x={num.x} y={num.y} text-anchor="middle" dominant-baseline="central" font-size={size * 0.021} fill="rgba(95,103,121,0.9)">
              {i + 1}
            </text>
          </g>
        );
      })}

      {/* ASC / MC labels */}
      {asc !== null && (() => { const p = pt(asc, rSigns + size * 0.012); return (
        <text x={p.x - size * 0.012} y={p.y} text-anchor="end" dominant-baseline="central" font-size={size * 0.026} fill="rgba(238,241,247,0.75)" font-family="var(--font-mono)">ASC</text>
      ); })()}
      {mc !== null && mc !== undefined && (() => { const p = pt(mc, rSigns + size * 0.028); return (
        <text x={p.x} y={p.y} text-anchor="middle" dominant-baseline="central" font-size={size * 0.026} fill="rgba(238,241,247,0.6)" font-family="var(--font-mono)">MC</text>
      ); })()}

      {/* Aspect lines */}
      {aspects.map((a, i) => {
        const A = bodies.find((b) => b.body === a.a);
        const B = bodies.find((b) => b.body === a.b);
        if (!A || !B) return null;
        const p1 = pt(A.lon, rAspects);
        const p2 = pt(B.lon, rAspects);
        return (
          <line
            key={i}
            x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
            stroke={ASPECT_COLOR[a.type] ?? 'rgba(198,204,218,0.3)'}
            stroke-width="1"
          />
        );
      })}

      {/* Bodies */}
      {bodies.map((b) => {
        const lonDraw = drawLon.get(b.body) ?? b.lon;
        const p = pt(lonDraw, rBodies);
        const tick1 = pt(b.lon, rSignsIn);
        const tick2 = pt(b.lon, rSignsIn - size * 0.014);
        const sign = SIGNS[Math.floor(((b.lon % 360) + 360) % 360 / 30)];
        return (
          <g key={b.body} class="wheel__body">
            <line x1={tick1.x} y1={tick1.y} x2={tick2.x} y2={tick2.y} stroke={sign.hue} stroke-width="1.4" />
            <circle cx={p.x} cy={p.y} r={size * 0.033} fill="rgba(15,18,26,0.92)" stroke={sign.hue} stroke-opacity="0.55" stroke-width="1" />
            <text x={p.x} y={p.y + size * 0.002} text-anchor="middle" dominant-baseline="central" font-size={size * 0.036} fill="#EEF1F7">
              {GLYPHS[b.body] ?? '•'}
            </text>
            {b.retrograde && (
              <text x={p.x + size * 0.030} y={p.y + size * 0.026} text-anchor="middle" font-size={size * 0.018} fill="rgba(224,176,128,0.9)">℞</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
