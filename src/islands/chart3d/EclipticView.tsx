/**
 * The chart with its third dimension put back.
 *
 * The flat wheel draws ecliptic longitude and drops ecliptic latitude, which
 * the engine computed anyway. This view restores it: drag to tilt the plane
 * from the familiar wheel to edge-on, and every body lifts off by the amount
 * the wheel was hiding.
 *
 * It carries the same furniture as the flat wheel — the tinted sign band,
 * the twelve discs, the aspect web, retrograde marks — because a diagram
 * that drops all of that to make a geometric point is a worse chart, not a
 * more honest one. What is new is that the aspect web is now a web through
 * space rather than chords across a disc, and it visibly ignores latitude:
 * two bodies can be a degree from exact and still sit twenty degrees apart.
 *
 * Two things become visible that no flat drawing can show. The Sun never
 * leaves the plane, because the plane is defined as the Sun's apparent path.
 * And the Moon's own orbit is tilted, so it crosses the plane at exactly two
 * points — the nodes — which is why eclipses happen there and nowhere else.
 *
 * Its own lazy chunk: nothing here is loaded until the reader asks for it.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
  eclipseProximity,
  inclinedCircle,
  MOON_INCLINATION,
  norm360,
  orient,
  eclipticToVec,
} from '../../lib/wheel/ecliptic3d';
import { SIGNS } from '../../lib/signs';
import { collisionNudge } from '../../lib/scene/layout';
import './EclipticView.css';

interface Body {
  body: string;
  lon: number;
  lat: number;
  retrograde?: boolean;
}

interface AspectLink {
  a: string;
  b: string;
  type: string;
}

interface Props {
  bodies: Body[];
  aspects?: AspectLink[];
  /** Twelve cusp longitudes, index 0 = first house. */
  cusps?: number[] | null;
  asc?: number | null;
  mc?: number | null;
  size?: number;
  label?: string;
}

const VB = 400;
const CX = VB / 2;
const CY = VB / 2;

/** Radii as fractions of the frame, echoing the flat wheel's proportions. */
const R_BAND_OUT = 150;
const R_BAND_IN = 126;
const R_DISC = 138;
const R_BODY = 104;
/** The web joins the discs themselves. The flat wheel can pull its chords
 *  into an inner hub because they still read as radiating from a tight
 *  circle; in perspective the same trick leaves lines floating unattached,
 *  so here a chord runs disc to disc — which is also the truer picture. */
const R_ASPECT = R_BODY;

const RESTING_TILT = 58;

const GLYPH: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
};

/** Matches ASPECT_COLOR in the flat wheel, so one chart is one language. */
const ASPECT_COLOR: Record<string, string> = {
  conjunction: 'rgba(238,241,247,0.62)',
  sextile: 'rgba(169,212,196,0.72)',
  trine: 'rgba(182,212,228,0.78)',
  square: 'rgba(222,142,121,0.78)',
  opposition: 'rgba(224,169,180,0.78)',
};

function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function'
    && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function EclipticView({
  bodies, aspects = [], cusps = null, asc = null, mc = null, size = 420, label,
}: Props) {
  const [tilt, setTilt] = useState(prefersReducedMotion() ? RESTING_TILT : 0);
  const [spin, setSpin] = useState(0);
  const frame = useRef<number>();
  const drag = useRef<{ x: number; y: number; tilt: number; spin: number } | null>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const start = performance.now();
    const run = (now: number) => {
      const p = Math.min(1, (now - start) / 1300);
      setTilt(RESTING_TILT * (1 - Math.pow(1 - p, 3)));
      if (p < 1) frame.current = requestAnimationFrame(run);
    };
    frame.current = requestAnimationFrame(run);
    return () => { if (frame.current) cancelAnimationFrame(frame.current); };
  }, []);

  const stop = () => { if (frame.current) cancelAnimationFrame(frame.current); };

  /**
   * Same anchoring as the flat wheel: the ascendant sits on the left at rest,
   * so tilting opens the very chart the reader was just looking at rather
   * than a differently-rotated one.
   */
  const anchor = asc ?? 0;

  /** Direction (lon, lat) at planar/spherical radius r → screen + depth. */
  const at = (lon: number, lat: number, r: number) => {
    const v = orient(eclipticToVec(180 + (lon - anchor), lat), spin, tilt);
    return { x: CX + r * v.x, y: CY - r * v.y, depth: v.z };
  };
  const xy = (p: { x: number; y: number }) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`;

  const node = bodies.find((b) => b.body === 'North Node');
  const sun = bodies.find((b) => b.body === 'Sun');
  const nodeLon = node ? node.lon : null;

  const eclipse = useMemo(
    () => (sun && nodeLon !== null ? eclipseProximity(sun.lon, nodeLon) : null),
    [sun?.lon, nodeLon],
  );

  /** The twelve tinted sectors, drawn as flat annular ribbons in the plane. */
  const sectors = useMemo(() => SIGNS.map((sign, i) => {
    const from = i * 30;
    const outer: string[] = [];
    const inner: string[] = [];
    for (let d = 0; d <= 30; d += 2.5) {
      outer.push(xy(at(from + d, 0, R_BAND_OUT)));
      inner.unshift(xy(at(from + d, 0, R_BAND_IN)));
    }
    return { sign, points: [...outer, ...inner].join(' ') };
  }), [spin, tilt, anchor]);

  const rim = useMemo(() => {
    const out: string[] = [];
    const inn: string[] = [];
    for (let l = 0; l <= 360; l += 3) {
      out.push(xy(at(l, 0, R_BAND_OUT)));
      inn.push(xy(at(l, 0, R_BAND_IN)));
    }
    return { out: out.join(' '), inn: inn.join(' ') };
  }, [spin, tilt, anchor]);

  /** A tick every ten degrees, so the band reads as a scale. */
  const ticks = useMemo(() => {
    const marks: { d: string; major: boolean }[] = [];
    for (let l = 0; l < 360; l += 10) {
      const major = l % 30 === 0;
      const a = at(l, 0, R_BAND_IN);
      const b = at(l, 0, R_BAND_IN + (major ? 24 : 7));
      marks.push({ d: `M ${xy(a)} L ${xy(b)}`.replace(/,/g, ' '), major });
    }
    return marks;
  }, [spin, tilt, anchor]);

  const discs = useMemo(() => SIGNS.map((sign, i) => ({
    sign,
    p: at(i * 30 + 15, 0, R_DISC),
  })).sort((a, z) => a.p.depth - z.p.depth), [spin, tilt, anchor]);

  /**
   * House cusps lie in the ecliptic plane, so they sweep the floor of the
   * view rather than standing up in it. They also give the middle of the
   * chart something true to hold.
   */
  const houses = useMemo(() => {
    if (!cusps || cusps.length !== 12) return null;
    const spokes = cusps.map((lon, i) => ({
      i,
      lon,
      p: at(lon, 0, R_BAND_IN),
      angle: i === 0 ? 'ASC' : i === 3 ? 'IC' : i === 6 ? 'DSC' : i === 9 ? 'MC' : null,
    }));
    const numerals = cusps.map((lon, i) => {
      const next = cusps[(i + 1) % 12];
      const span = norm360(next - lon) || 30;
      return { n: i + 1, p: at(lon + span / 2, 0, 52) };
    });
    return { spokes, numerals };
  }, [cusps, spin, tilt, anchor]);

  const center = useMemo(() => at(0, 90, 0), [spin, tilt, anchor]);

  const moonPath = useMemo(() => {
    if (nodeLon === null) return null;
    return inclinedCircle(nodeLon, MOON_INCLINATION, 3)
      .map(({ lon, lat }) => xy(at(lon, lat, R_BAND_IN)))
      .join(' ');
  }, [nodeLon, spin, tilt, anchor]);

  const nodeMarks = useMemo(() => {
    if (nodeLon === null) return [];
    return [
      { lon: nodeLon, glyph: '☊' },
      { lon: norm360(nodeLon + 180), glyph: '☋' },
    ].map((n) => ({ ...n, p: at(n.lon, 0, R_BAND_IN) }));
  }, [nodeLon, spin, tilt, anchor]);

  /**
   * A stellium stacks into one unreadable blob without this. It is the flat
   * wheel's own fan — same helper, same four relaxation passes — so crowded
   * bodies sit in the same order in both views. Latitude is untouched: only
   * the drawn longitude moves, and the stem still drops to the true one.
   */
  const drawLon = useMemo(
    () => collisionNudge(bodies.filter((b) => GLYPH[b.body])),
    [bodies],
  );

  const marks = useMemo(() => bodies
    .filter((b) => GLYPH[b.body])
    .map((b) => {
      const shown = drawLon.get(b.body) ?? b.lon;
      return {
        ...b,
        p: at(shown, b.lat, R_BODY),
        foot: at(shown, 0, R_BODY),
      };
    })
    .sort((a, z) => a.p.depth - z.p.depth), [bodies, drawLon, spin, tilt, anchor]);

  const markAt = useMemo(() => {
    const m = new Map<string, { x: number; y: number; depth: number }>();
    for (const b of bodies) {
      if (GLYPH[b.body]) m.set(b.body, at(drawLon.get(b.body) ?? b.lon, b.lat, R_ASPECT));
    }
    return m;
  }, [bodies, drawLon, spin, tilt, anchor]);

  /** Chords through the sphere, not across a disc. */
  const web = useMemo(() => aspects
    .map((a) => {
      const p1 = markAt.get(a.a);
      const p2 = markAt.get(a.b);
      if (!p1 || !p2) return null;
      return { ...a, p1, p2, depth: (p1.depth + p2.depth) / 2 };
    })
    .filter(Boolean)
    .sort((a, z) => a!.depth - z!.depth) as
      { a: string; b: string; type: string; p1: any; p2: any; depth: number }[],
  [aspects, markAt]);

  const onPointerDown = (e: PointerEvent) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, tilt, spin };
    stop();
  };
  const onPointerMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    setTilt(Math.max(0, Math.min(90, d.tilt + (e.clientY - d.y) * 0.4)));
    setSpin(d.spin + (e.clientX - d.x) * 0.4);
  };
  const onPointerUp = (e: PointerEvent) => {
    (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
    drag.current = null;
  };
  const onKeyDown = (e: KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 3;
    let used = true;
    if (e.key === 'ArrowUp') setTilt((t) => Math.max(0, t - step));
    else if (e.key === 'ArrowDown') setTilt((t) => Math.min(90, t + step));
    else if (e.key === 'ArrowLeft') setSpin((s) => s - step);
    else if (e.key === 'ArrowRight') setSpin((s) => s + step);
    else used = false;
    if (used) { e.preventDefault(); stop(); }
  };

  const offPlane = bodies
    .filter((b) => GLYPH[b.body] && b.body !== 'Sun')
    .sort((a, z) => Math.abs(z.lat) - Math.abs(a.lat))[0];

  /** Far side recedes; near side comes forward. */
  const cue = (depth: number) => 0.42 + 0.58 * ((depth + 1) / 2);

  return (
    <figure class="ev" style={`--ev-size:${size}px`}>
      <svg
        viewBox="0 38 400 324"
        class="ev-stage"
        role="img"
        tabIndex={0}
        aria-label={label ?? 'The chart in three dimensions. Drag vertically to tilt the ecliptic plane, horizontally to spin it. Bodies sit at their real ecliptic latitude.'}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
      >
        <g class="ev-band">
          {sectors.map(({ sign, points }) => (
            <polygon class="ev-sector" points={points} style={`--hue:${sign.hue}`} />
          ))}
          <polyline class="ev-rim" points={rim.out} />
          <polyline class="ev-rim" points={rim.inn} />
          {ticks.map((t) => (
            <path class={t.major ? 'ev-tick is-major' : 'ev-tick'} d={t.d} />
          ))}
        </g>

        {houses && (
          <g class="ev-houses">
            {houses.spokes.map((s) => (
              <line
                class={s.angle ? 'ev-cusp is-angle' : 'ev-cusp'}
                x1={center.x.toFixed(2)} y1={center.y.toFixed(2)}
                x2={s.p.x.toFixed(2)} y2={s.p.y.toFixed(2)}
              />
            ))}
            {houses.numerals.map((h) => (
              <text class="ev-housenum" x={h.p.x.toFixed(2)} y={h.p.y.toFixed(2)}
                    text-anchor="middle" dominant-baseline="central">{h.n}</text>
            ))}
            {houses.spokes.filter((s) => s.angle).map((s) => (
              <text class="ev-anglelabel" x={s.p.x.toFixed(2)} y={(s.p.y - 7).toFixed(2)}
                    text-anchor="middle">{s.angle}</text>
            ))}
          </g>
        )}

        {discs.map(({ sign, p }) => (
          <g class="ev-signdisc" style={`--hue:${sign.hue};opacity:${cue(p.depth).toFixed(3)}`}>
            <circle cx={p.x.toFixed(2)} cy={p.y.toFixed(2)} r="10.5" />
            <text x={p.x.toFixed(2)} y={p.y.toFixed(2)} text-anchor="middle" dominant-baseline="central">
              {sign.glyph}
            </text>
          </g>
        ))}

        {moonPath && <polyline class="ev-moonpath" points={moonPath} />}

        {nodeMarks.map((n) => (
          <g class="ev-node">
            <circle cx={n.p.x.toFixed(2)} cy={n.p.y.toFixed(2)} r="3.2" />
            <text x={n.p.x.toFixed(2)} y={(n.p.y - 9).toFixed(2)} text-anchor="middle">{n.glyph}</text>
          </g>
        ))}

        <g class="ev-web">
          {web.map((w) => (
            <line
              x1={w.p1.x.toFixed(2)} y1={w.p1.y.toFixed(2)}
              x2={w.p2.x.toFixed(2)} y2={w.p2.y.toFixed(2)}
              stroke={ASPECT_COLOR[w.type] ?? 'rgba(198,204,218,0.5)'}
              style={`opacity:${(0.62 + 0.38 * ((w.depth + 1) / 2)).toFixed(3)}`}
            />
          ))}
        </g>

        {marks.map((m) => {
          const o = cue(m.p.depth);
          const r = 8.4 + 2.2 * ((m.p.depth + 1) / 2);
          return (
            <g class={`ev-body${m.body === 'Sun' ? ' is-sun' : ''}`} style={`--hue:${SIGNS[Math.floor(norm360(m.lon) / 30)].hue};opacity:${o.toFixed(3)}`}>
              <line class="ev-stem" x1={m.foot.x.toFixed(2)} y1={m.foot.y.toFixed(2)} x2={m.p.x.toFixed(2)} y2={m.p.y.toFixed(2)} />
              <circle class="ev-foot" cx={m.foot.x.toFixed(2)} cy={m.foot.y.toFixed(2)} r="1.7" />
              <circle class="ev-disc" cx={m.p.x.toFixed(2)} cy={m.p.y.toFixed(2)} r={r.toFixed(2)} />
              <text class="ev-glyph" x={m.p.x.toFixed(2)} y={m.p.y.toFixed(2)} text-anchor="middle" dominant-baseline="central">
                {GLYPH[m.body]}
              </text>
              {m.retrograde && (
                <text class="ev-rx" x={(m.p.x + r + 2).toFixed(2)} y={(m.p.y + r + 1).toFixed(2)}>Rx</text>
              )}
            </g>
          );
        })}
      </svg>

      <div class="ev-controls">
        <label class="ev-slider">
          <span>Tilt</span>
          <input
            type="range" min="0" max="90" step="1" value={Math.round(tilt)}
            aria-label="Tilt the ecliptic plane, 0 degrees for the flat wheel, 90 degrees for edge-on"
            onInput={(e) => { stop(); setTilt(Number((e.target as HTMLInputElement).value)); }}
          />
          <span class="mono">{Math.round(tilt)}°</span>
        </label>
      </div>

      <figcaption class="ev-caption">
        <p>
          Drag to turn it. Bodies sit at their real ecliptic latitude, on a sphere of
          directions — where each one <em>was</em>, not how far away.
        </p>
        {offPlane && (
          <p class="mono ev-readout">
            {offPlane.body} {offPlane.lat >= 0 ? 'north' : 'south'} {Math.abs(offPlane.lat).toFixed(1)}° ·
            Sun 0.0° — it defines the plane
          </p>
        )}
        {eclipse && (
          <p class="ev-note">
            The Moon's path crosses the plane at the nodes. The Sun is{' '}
            {eclipse.degrees.toFixed(0)}° from the nearer node, so this chart
            {eclipse.possible ? ' falls inside an eclipse season.' : ' is outside an eclipse season.'}
          </p>
        )}
      </figcaption>
    </figure>
  );
}
