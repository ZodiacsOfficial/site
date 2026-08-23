/**
 * Audit-grade wheel used only by the lazily loaded chart-sheet exporter.
 * Keeping this renderer separate protects the live calculator's pinned wheel
 * markup and its initial-JS budget while letting the exported sheet carry a
 * degree scale, exact-longitude leaders, all four angles, and both nodes.
 */
import { SIGNS } from '../signs';
import { PLANET_GLYPH } from '../glyphs/paths';
import { technicalCollisionFan } from './technical-layout';

export interface TechnicalWheelBody {
  body: string;
  lon: number;
  retrograde?: boolean;
}

export interface TechnicalWheelProps {
  bodies: TechnicalWheelBody[];
  asc?: number | null;
  mc?: number | null;
  dsc?: number | null;
  ic?: number | null;
  cusps?: number[] | null;
  aspects?: { a: string; b: string; type: string }[];
  size?: number;
}

const ASPECT_COLOR: Record<string, string> = {
  conjunction: 'rgba(238,241,247,0.58)',
  sextile: 'rgba(169,212,196,0.66)',
  trine: 'rgba(182,212,228,0.7)',
  square: 'rgba(222,142,121,0.7)',
  opposition: 'rgba(224,169,180,0.7)',
};

const norm = (longitude: number) => ((longitude % 360) + 360) % 360;

export default function TechnicalWheel({
  bodies,
  asc = null,
  mc = null,
  dsc = null,
  ic = null,
  cusps = null,
  aspects = [],
  size = 420,
}: TechnicalWheelProps) {
  const cx = size / 2;
  const cy = size / 2;
  const rSigns = size * 0.475;
  const rSignsIn = size * 0.395;
  const rBodies = size * 0.31;
  const rAspects = size * 0.235;
  const bodyRadius = size * 0.029;
  const anchor = asc ?? 0;
  const drawLon = technicalCollisionFan(bodies);
  const pad = size * 0.055;

  const pt = (longitude: number, radius: number) => {
    const phi = ((180 + (longitude - anchor)) * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(phi),
      y: cy - radius * Math.sin(phi),
    };
  };

  const arcPath = (from: number, to: number, radius: number) => {
    const a = pt(from, radius);
    const b = pt(to, radius);
    return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${radius} ${radius} 0 0 0 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
  };

  const angleLabel = (
    longitude: number | null,
    label: 'ASC' | 'DSC' | 'MC' | 'IC',
  ) => {
    if (longitude == null) return null;
    const vertical = label === 'MC' || label === 'IC';
    const point = pt(longitude, rSigns + size * (vertical ? 0.028 : 0.012));
    const x = label === 'ASC' ? point.x - size * 0.012
      : label === 'DSC' ? point.x + size * 0.012
        : point.x;
    const anchorMode = label === 'ASC' ? 'end' : label === 'DSC' ? 'start' : 'middle';
    return (
      <text
        key={label}
        x={x} y={point.y}
        text-anchor={anchorMode}
        dominant-baseline="central"
        font-size={size * 0.026}
        fill={vertical ? 'rgba(238,241,247,0.66)' : 'rgba(238,241,247,0.82)'}
        font-family="var(--font-mono)"
        data-angle-label={label}
      >{label}</text>
    );
  };

  return (
    <svg
      viewBox={`${-pad} ${-pad} ${size + pad * 2} ${size + pad * 2}`}
      width="100%"
      role="img"
      aria-label="Technical birth chart wheel"
      class="wheel wheel--technical"
    >
      <circle cx={cx} cy={cy} r={rSigns} fill="none" stroke="rgba(198,204,218,0.24)" stroke-width="1.4" />
      <circle cx={cx} cy={cy} r={rSignsIn} fill="none" stroke="rgba(198,204,218,0.24)" stroke-width="1.4" />
      <circle cx={cx} cy={cy} r={rAspects} fill="none" stroke="rgba(198,204,218,0.12)" stroke-width="1" />

      {SIGNS.map((sign, index) => {
        const from = index * 30;
        const center = pt(from + 15, (rSigns + rSignsIn) / 2);
        const disc = size * 0.068;
        return (
          <g key={sign.slug}>
            <path
              d={arcPath(from + 1.5, from + 28.5, (rSigns + rSignsIn) / 2)}
              fill="none" stroke={sign.hue} stroke-opacity="0.14"
              stroke-width={rSigns - rSignsIn - 6}
            />
            <path
              d={arcPath(from + 1.5, from + 28.5, rSigns - 1)}
              fill="none" stroke={sign.hue} stroke-opacity="0.9"
              stroke-width="2" stroke-linecap="round"
            />
            <image
              href={`/assets/zodiac-icons/128/${sign.slug}.webp`}
              x={(center.x - disc / 2).toFixed(2)}
              y={(center.y - disc / 2).toFixed(2)}
              width={disc.toFixed(2)} height={disc.toFixed(2)}
            >
              <title>{sign.name}</title>
            </image>
          </g>
        );
      })}

      {SIGNS.map((_, index) => {
        const inner = pt(index * 30, rSignsIn);
        const outer = pt(index * 30, rSigns);
        return <line key={`sign-${index}`} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="rgba(198,204,218,0.28)" stroke-width="1" />;
      })}

      {Array.from({ length: 360 }, (_, degree) => {
        const major = degree % 5 === 0;
        const outer = pt(degree, rSignsIn - size * 0.003);
        const inner = pt(degree, rSignsIn - size * (major ? 0.018 : 0.010));
        return (
          <line
            key={`degree-${degree}`}
            x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y}
            stroke={major ? 'rgba(198,204,218,0.38)' : 'rgba(198,204,218,0.2)'}
            stroke-width={major ? 1 : 0.65}
            data-degree-tick={degree}
          />
        );
      })}

      {cusps?.map((longitude, index) => {
        const inner = pt(longitude, rAspects);
        const outer = pt(longitude, rSignsIn);
        const next = cusps[(index + 1) % cusps.length];
        const span = norm(next - longitude) || 360;
        const number = pt(longitude + span / 2, (rAspects + rBodies) / 2 - size * 0.02);
        const angular = index === 0 || index === 3 || index === 6 || index === 9;
        return (
          <g key={`house-${index}`}>
            <line
              x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
              stroke={angular ? 'rgba(238,241,247,0.62)' : 'rgba(198,204,218,0.18)'}
              stroke-width={angular ? 2 : 1}
            />
            <text
              x={number.x} y={number.y} text-anchor="middle"
              dominant-baseline="central" font-size={size * 0.024}
              fill="rgba(142,150,171,0.92)"
            >{index + 1}</text>
          </g>
        );
      })}

      {angleLabel(asc, 'ASC')}
      {angleLabel(dsc, 'DSC')}
      {angleLabel(mc, 'MC')}
      {angleLabel(ic, 'IC')}

      {aspects.map((aspect, index) => {
        const a = bodies.find((body) => body.body === aspect.a);
        const b = bodies.find((body) => body.body === aspect.b);
        if (!a || !b) return null;
        const from = pt(a.lon, rAspects);
        const to = pt(b.lon, rAspects);
        return (
          <line
            key={`aspect-${index}`}
            x1={from.x} y1={from.y} x2={to.x} y2={to.y}
            stroke={ASPECT_COLOR[aspect.type] ?? 'rgba(198,204,218,0.35)'}
            stroke-width="1.35"
          />
        );
      })}

      {bodies.map((body) => {
        const longitude = drawLon.get(body.body) ?? body.lon;
        const marker = pt(longitude, rBodies);
        const tickOuter = pt(body.lon, rSignsIn);
        const tickInner = pt(body.lon, rSignsIn - size * 0.028);
        const leaderEnd = pt(longitude, rBodies + bodyRadius);
        const sign = SIGNS[Math.floor(norm(body.lon) / 30)];
        return (
          <g key={body.body} data-technical-body={body.body}>
            <line
              x1={tickOuter.x} y1={tickOuter.y} x2={tickInner.x} y2={tickInner.y}
              stroke={sign.hue} stroke-width="2"
            />
            <line
              x1={tickInner.x} y1={tickInner.y} x2={leaderEnd.x} y2={leaderEnd.y}
              stroke={sign.hue} stroke-opacity="0.42" stroke-width="1.15"
              data-body-leader={body.body}
            />
            <circle
              cx={marker.x} cy={marker.y} r={bodyRadius}
              fill="rgba(15,18,26,0.94)" stroke={sign.hue}
              stroke-opacity="0.72" stroke-width="1.25"
            />
            <g
              transform={`translate(${marker.x} ${marker.y}) scale(${(size * 0.046) / 24}) translate(-12 -12)`}
              fill="none" stroke="#EEF1F7"
              stroke-width={1.4 * 24 / (size * 0.046)}
              stroke-linecap="round" stroke-linejoin="round"
              style="color:#EEF1F7"
              dangerouslySetInnerHTML={{ __html: PLANET_GLYPH[body.body] ?? '' }}
            />
            {body.retrograde && (
              <text
                x={marker.x + size * 0.03} y={marker.y + size * 0.026}
                text-anchor="middle" font-size={size * 0.017}
                fill="rgba(224,176,128,0.9)" font-family="var(--font-mono)"
              >Rx</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
