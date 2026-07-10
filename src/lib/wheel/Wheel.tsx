/**
 * The chart wheel — hand-built SVG, shared by the calculator, the homepage
 * demo chart, and the share-card renderer. Standard orientation: the
 * Ascendant sits at the left (9 o'clock) and the zodiac runs
 * counterclockwise. Without known angles it renders 0° Aries on the left
 * with no house spokes.
 *
 * Two personalities, one component:
 *  - Legacy/static (share card, demo): pass bodies/asc/mc/cusps/aspects and
 *    nothing else. The rendered markup is pinned byte-for-byte by
 *    wheel-serialization.test.ts — every previously shared card depends on
 *    it staying identical.
 *  - Interactive (Chart Explorer): additionally pass `interactive` with the
 *    scene model, selection, emphasis, and onSelect. Marks become hit
 *    targets (data-entity), chords weight by orb and dash when separating,
 *    and everything not selected dims to the emphasis floor.
 */
import { SIGNS } from '../signs';
import { PLANET_GLYPH } from '../glyphs/paths';
import type { ChartSceneModel, EntityRef, SceneEmphasis, SignSlug } from '../scene/types';
import { entityId } from '../scene/types';
import { collisionNudge } from '../scene/build';
import { emphasisOpacity } from '../scene/emphasis';

export interface WheelBody {
  body: string;
  lon: number;
  retrograde?: boolean;
}

export interface WheelInteraction {
  scene: ChartSceneModel;
  selection: EntityRef | null;
  emphasis: SceneEmphasis;
  onSelect: (e: EntityRef | null) => void;
  /** Accessible name for the interactive group (localized by the caller). */
  label: string;
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
  /** Chart Explorer mode — omit for the pinned static rendering. */
  interactive?: WheelInteraction;
}


const ASPECT_COLOR: Record<string, string> = {
  conjunction: 'rgba(238,241,247,0.5)',
  sextile: 'rgba(169,212,196,0.55)',
  trine: 'rgba(182,212,228,0.6)',
  square: 'rgba(222,142,121,0.6)',
  opposition: 'rgba(224,169,180,0.6)',
};

/** Orb-weight class → chord stroke width (interactive mode only). */
const ASPECT_STROKE = [0.9, 1.3, 1.8] as const;

export default function Wheel({
  bodies, asc = null, mc = null, cusps = null, aspects = [], size = 420, animate = false,
  interactive,
}: WheelProps) {
  const cx = size / 2;
  const cy = size / 2;
  const rSigns = size * 0.475;      // outer edge of sign ring
  const rSignsIn = size * 0.395;    // inner edge of sign ring
  const rBodies = size * 0.31;      // planet markers
  const rAspects = size * 0.235;    // aspect hub
  const anchor = interactive ? interactive.scene.anchor.lon : (asc ?? 0);

  const ix = interactive ?? null;
  const opacityOf = (id: string) => (ix ? emphasisOpacity(ix.emphasis, id) : 1);
  const select = (e: EntityRef) => (ev: Event) => {
    ev.stopPropagation();
    ix?.onSelect(ix.selection && entityId(ix.selection) === entityId(e) ? null : e);
  };
  /** Interaction attributes for a mark (nothing at all in static mode). */
  const hit = (e: EntityRef) => (ix ? {
    'data-entity': entityId(e),
    'data-selected': ix.selection && entityId(ix.selection) === entityId(e) ? 'true' : undefined,
    onClick: select(e),
    class: 'wheel__hit',
  } : {});

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

  // Collision layout is shared with the scene model so every renderer fans
  // crowded bodies identically; in interactive mode the scene already
  // carries the result.
  const drawLon = ix
    ? new Map(ix.scene.bodies.map((b) => [b.body, b.drawLon]))
    : collisionNudge(bodies);

  // Padding keeps the ASC/MC labels inside the viewBox.
  const pad = size * 0.05;

  // House-number placement: interactive mode fixes the wedge-midpoint defect
  // (the number belongs at cusp + span/2 — under Placidus at high latitude a
  // wedge can be far narrower than 30°, and the old cusp+15° put the numeral
  // in the neighbouring house). The static path keeps the historical
  // cusp+15° so pinned share-card output never shifts.
  const houseMid = (lon: number, i: number) =>
    ix?.scene.houses ? ix.scene.houses[i].midLon : lon + 15;

  return (
    <svg
      viewBox={`${-pad} ${-pad} ${size + pad * 2} ${size + pad * 2}`}
      width="100%"
      role={ix ? 'group' : 'img'}
      aria-label={ix ? ix.label : 'Birth chart wheel'}
      class={[
        animate ? 'wheel wheel--animate' : 'wheel',
        ix ? 'wheel--interactive' : '',
      ].filter(Boolean).join(' ')}
      onClick={ix ? () => ix.onSelect(null) : undefined}
    >
      {/* Ring backgrounds */}
      <circle cx={cx} cy={cy} r={rSigns} fill="none" stroke="rgba(198,204,218,0.16)" stroke-width="1" />
      <circle cx={cx} cy={cy} r={rSignsIn} fill="none" stroke="rgba(198,204,218,0.16)" stroke-width="1" />
      <circle cx={cx} cy={cy} r={rAspects} fill="none" stroke="rgba(198,204,218,0.08)" stroke-width="1" />

      {/* Sign ring: pastel arcs + the pastel disc icons (the same icon set
          as the homepage wheel). The disc <image> refs stay external for the
          live wheel; the share-card renderer inlines them as data URIs before
          rasterizing, so the serialized SVG is self-contained. */}
      {SIGNS.map((s, i) => {
        const from = i * 30;
        const mid = from + 15;
        const c = pt(mid, (rSigns + rSignsIn) / 2);
        const disc = size * 0.068;
        const signRef: EntityRef = { kind: 'sign', sign: s.slug as SignSlug };
        return (
          <g key={s.slug} {...(ix ? { opacity: opacityOf(`sign:${s.slug}`) } : {})}>
            <path
              d={arcPath(from + 1.5, from + 28.5, (rSigns + rSignsIn) / 2)}
              fill="none"
              stroke={s.hue}
              stroke-opacity="0.12"
              stroke-width={rSigns - rSignsIn - 6}
              {...hit(signRef)}
            />
            <path
              d={arcPath(from + 1.5, from + 28.5, rSigns - 1)}
              fill="none"
              stroke={s.hue}
              stroke-opacity="0.8"
              stroke-width="2"
              stroke-linecap="round"
            />
            <image
              href={`/assets/zodiac-icons/128/${s.slug}.webp`}
              x={(c.x - disc / 2).toFixed(2)}
              y={(c.y - disc / 2).toFixed(2)}
              width={disc.toFixed(2)}
              height={disc.toFixed(2)}
              {...(ix ? { onClick: select(signRef), class: 'wheel__hit' } : {})}
            >
              <title>{s.name}</title>
            </image>
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
        const num = pt(houseMid(lon, i), (rAspects + rBodies) / 2 - size * 0.02);
        const houseRef: EntityRef = { kind: 'house', house: i + 1 };
        return (
          <g key={i} {...(ix ? { opacity: opacityOf(`house:${i + 1}`) } : {})}>
            <line
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={isAngle ? 'rgba(238,241,247,0.4)' : 'rgba(198,204,218,0.14)'}
              stroke-width={isAngle ? 1.4 : 1}
            />
            {ix && (() => {
              // Invisible wedge between this cusp and the next makes the
              // whole house tappable, not just the numeral.
              const span = ix.scene.houses ? ix.scene.houses[i].spanDeg : 30;
              const inner = arcPath(lon + 0.5, lon + span - 0.5, (rAspects + rSignsIn) / 2);
              return (
                <path
                  d={inner}
                  fill="none"
                  stroke="transparent"
                  stroke-width={rSignsIn - rAspects - 4}
                  {...hit(houseRef)}
                />
              );
            })()}
            <text x={num.x} y={num.y} text-anchor="middle" dominant-baseline="central" font-size={size * 0.021} fill="rgba(95,103,121,0.9)" {...(ix ? { 'pointer-events': 'none' } : {})}>
              {i + 1}
            </text>
          </g>
        );
      })}

      {/* ASC / MC labels */}
      {asc !== null && (() => { const p = pt(asc, rSigns + size * 0.012); return (
        <text x={p.x - size * 0.012} y={p.y} text-anchor="end" dominant-baseline="central" font-size={size * 0.026} fill="rgba(238,241,247,0.75)" font-family="var(--font-mono)" {...(ix ? { ...hit({ kind: 'angle', angle: 'asc' }), opacity: opacityOf('angle:asc') } : {})}>ASC</text>
      ); })()}
      {mc !== null && mc !== undefined && (() => { const p = pt(mc, rSigns + size * 0.028); return (
        <text x={p.x} y={p.y} text-anchor="middle" dominant-baseline="central" font-size={size * 0.026} fill="rgba(238,241,247,0.6)" font-family="var(--font-mono)" {...(ix ? { ...hit({ kind: 'angle', angle: 'mc' }), opacity: opacityOf('angle:mc') } : {})}>MC</text>
      ); })()}

      {/* Aspect lines */}
      {aspects.map((a, i) => {
        const A = bodies.find((b) => b.body === a.a);
        const B = bodies.find((b) => b.body === a.b);
        if (!A || !B) return null;
        const p1 = pt(A.lon, rAspects);
        const p2 = pt(B.lon, rAspects);
        if (!ix) {
          return (
            <line
              key={i}
              x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
              stroke={ASPECT_COLOR[a.type] ?? 'rgba(198,204,218,0.3)'}
              stroke-width="1"
            />
          );
        }
        const sceneAspect = ix.scene.aspects.find((sa) => sa.a === a.a && sa.b === a.b && sa.type === a.type);
        const aspectRef: EntityRef = { kind: 'aspect', a: a.a as any, b: a.b as any, type: a.type as any };
        const id = entityId(aspectRef);
        return (
          <g key={i} opacity={opacityOf(id)}>
            <line
              x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
              stroke={ASPECT_COLOR[a.type] ?? 'rgba(198,204,218,0.3)'}
              stroke-width={ASPECT_STROKE[sceneAspect?.weight ?? 0]}
              stroke-dasharray={sceneAspect && !sceneAspect.applying ? '3 3' : undefined}
              pointer-events="none"
            />
            {/* Wide invisible twin makes the 1px chord tappable. */}
            <line
              x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
              stroke="transparent"
              stroke-width={size * 0.028}
              {...hit(aspectRef)}
            />
          </g>
        );
      })}

      {/* Bodies */}
      {bodies.map((b) => {
        const lonDraw = drawLon.get(b.body) ?? b.lon;
        const p = pt(lonDraw, rBodies);
        const tick1 = pt(b.lon, rSignsIn);
        const tick2 = pt(b.lon, rSignsIn - size * 0.014);
        const sign = SIGNS[Math.floor(((b.lon % 360) + 360) % 360 / 30)];
        const bodyRef: EntityRef = { kind: 'body', body: b.body as any };
        const id = `body:${b.body}`;
        const selected = ix?.selection && entityId(ix.selection) === id;
        return (
          <g key={b.body} class="wheel__body" {...(ix ? { opacity: opacityOf(id) } : {})}>
            <line x1={tick1.x} y1={tick1.y} x2={tick2.x} y2={tick2.y} stroke={sign.hue} stroke-width="1.4" />
            {selected && (
              <circle cx={p.x} cy={p.y} r={size * 0.044} fill="none" stroke={sign.hue} stroke-width="1.6" class="wheel__sel-ring" />
            )}
            <circle cx={p.x} cy={p.y} r={size * 0.033} fill="rgba(15,18,26,0.92)" stroke={sign.hue} stroke-opacity="0.55" stroke-width="1" />
            <g
              transform={`translate(${p.x} ${p.y}) scale(${(size * 0.05) / 24}) translate(-12 -12)`}
              fill="none"
              stroke="#EEF1F7"
              stroke-width={1.4 * 24 / (size * 0.05)}
              stroke-linecap="round"
              stroke-linejoin="round"
              style="color:#EEF1F7"
              dangerouslySetInnerHTML={{ __html: PLANET_GLYPH[b.body] ?? '' }}
            />
            {b.retrograde && (
              <text x={p.x + size * 0.032} y={p.y + size * 0.028} text-anchor="middle" font-size={size * 0.017} fill="rgba(224,176,128,0.9)" font-family="var(--font-mono)">Rx</text>
            )}
            {ix && (
              // Generous invisible hit circle over the marker (≈44px at
              // typical render width) so touch selection never needs
              // precision.
              <circle cx={p.x} cy={p.y} r={size * 0.052} fill="transparent" {...hit(bodyRef)} />
            )}
          </g>
        );
      })}
    </svg>
  );
}
