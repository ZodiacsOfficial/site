/**
 * The chart as an armillary sphere.
 *
 * The flat wheel draws ecliptic longitude and drops ecliptic latitude, which
 * the engine computed anyway. This puts it back — but a tilted disc is not an
 * object: it collapses to a line edge-on and never reads as dimensional. So
 * the chart is mounted in the instrument it belongs to, the one on the
 * classroom shelf: a wireframe globe carrying three rings.
 *
 *   the ecliptic   — the Sun's path, and the zodiac band the chart lives on
 *   the equator    — tilted 23.44° to it, crossing at the equinoxes
 *   the Moon's road — tilted 5.15°, crossing at the nodes
 *
 * Those crossings are the whole sky in one picture: the equinoxes are why
 * 0° Aries is where it is, and the nodes are why eclipses happen where they
 * do. Edge-on, the rings separate instead of vanishing, which is the view
 * that actually teaches the obliquity.
 *
 * Depth is carried by splitting every curve where it passes behind the
 * sphere and drawing the far half faintly — without that a wireframe globe
 * is a flat tangle of ellipses.
 *
 * Its own lazy chunk: nothing here is loaded until the reader asks for it.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
  eclipseProximity,
  eclipticToVec,
  inclinedCircle,
  MOON_INCLINATION,
  norm360,
  OBLIQUITY,
  orient,
  splitByDepth,
  type Projected,
} from '../../lib/wheel/ecliptic3d';
import { SIGNS } from '../../lib/signs';
import { collisionNudge } from '../../lib/scene/layout';
import './EclipticView.css';

interface Body { body: string; lon: number; lat: number; retrograde?: boolean }
interface AspectLink { a: string; b: string; type: string }

interface Props {
  bodies: Body[];
  aspects?: AspectLink[];
  cusps?: number[] | null;
  asc?: number | null;
  size?: number;
  label?: string;
}

const VB = 400;
const CX = VB / 2;
const CY = VB / 2;

const R_SPHERE = 150;
const R_BAND_OUT = 150;
const R_BAND_IN = 128;
const R_ICON = 139;
const R_BODY = 150;

const RESTING_TILT = 62;

const GLYPH: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
};

const ASPECT_COLOR: Record<string, string> = {
  conjunction: 'rgba(238,241,247,0.55)',
  sextile: 'rgba(169,212,196,0.66)',
  trine: 'rgba(182,212,228,0.72)',
  square: 'rgba(222,142,121,0.72)',
  opposition: 'rgba(224,169,180,0.72)',
};

function reduced(): boolean {
  return typeof matchMedia === 'function'
    && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function EclipticView({
  bodies, aspects = [], cusps = null, asc = null, size = 460, label,
}: Props) {
  const [tilt, setTilt] = useState(reduced() ? RESTING_TILT : 0);
  const [spin, setSpin] = useState(0);
  const frame = useRef<number>();
  const drag = useRef<{ x: number; y: number; tilt: number; spin: number } | null>(null);

  useEffect(() => {
    if (reduced()) return undefined;
    const start = performance.now();
    const run = (now: number) => {
      const p = Math.min(1, (now - start) / 1500);
      setTilt(RESTING_TILT * (1 - Math.pow(1 - p, 3)));
      if (p < 1) frame.current = requestAnimationFrame(run);
    };
    frame.current = requestAnimationFrame(run);
    return () => { if (frame.current) cancelAnimationFrame(frame.current); };
  }, []);

  const stop = () => { if (frame.current) cancelAnimationFrame(frame.current); };

  /** Anchored like the flat wheel: the ascendant sits on the left at rest. */
  const anchor = asc ?? 0;
  const at = (lon: number, lat: number, r: number): Projected => {
    const v = orient(eclipticToVec(180 + (lon - anchor), lat), spin, tilt);
    return { x: CX + r * v.x, y: CY - r * v.y, depth: v.z };
  };
  const poly = (pts: Projected[]) => pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
  const curve = (pts: Projected[]) => splitByDepth(pts);

  /** The globe only materialises as the chart opens; flat, it stays a wheel. */
  const solidity = Math.min(1, Math.max(0, (tilt - 6) / 34));
  /**
   * The house floor is the flat chart's structure and means nothing edge-on,
   * where it degenerates into a line of overlapping numerals. It hands the
   * sphere over as the sphere takes shape.
   */
  const floor = Math.min(1, Math.max(0, 1 - (tilt - 30) / 40));

  const node = bodies.find((b) => b.body === 'North Node');
  const sun = bodies.find((b) => b.body === 'Sun');
  const nodeLon = node ? node.lon : null;
  const eclipse = useMemo(
    () => (sun && nodeLon !== null ? eclipseProximity(sun.lon, nodeLon) : null),
    [sun?.lon, nodeLon],
  );

  /** Meridians through the ecliptic poles, and parallels of latitude. */
  const wire = useMemo(() => {
    const runs: { front: boolean; d: string }[] = [];
    for (let lon = 0; lon < 180; lon += 30) {
      const pts: Projected[] = [];
      for (let lat = -90; lat <= 90; lat += 5) pts.push(at(lon, lat, R_SPHERE));
      for (let lat = 90; lat >= -90; lat -= 5) pts.push(at(lon + 180, lat, R_SPHERE));
      curve(pts).forEach((r) => runs.push({ front: r.front, d: poly(r.points) }));
    }
    for (const lat of [-60, -30, 30, 60]) {
      const pts: Projected[] = [];
      for (let lon = 0; lon <= 360; lon += 5) pts.push(at(lon, lat, R_SPHERE));
      curve(pts).forEach((r) => runs.push({ front: r.front, d: poly(r.points) }));
    }
    return runs;
  }, [spin, tilt, anchor]);

  /** A great circle at a given inclination, split front from back. */
  const ring = (nodeAt: number, inc: number, r: number) =>
    curve(inclinedCircle(nodeAt, inc, 3).map((p) => at(p.lon, p.lat, r)));

  const equator = useMemo(() => ring(0, OBLIQUITY, R_SPHERE), [spin, tilt, anchor]);
  const moonRoad = useMemo(
    () => (nodeLon === null ? [] : ring(nodeLon, MOON_INCLINATION, R_SPHERE)),
    [nodeLon, spin, tilt, anchor],
  );

  /** The zodiac band: twelve tinted ribbons lying in the ecliptic plane. */
  const sectors = useMemo(() => SIGNS.map((sign, i) => {
    const outer: Projected[] = [];
    const inner: Projected[] = [];
    for (let d = 0; d <= 30; d += 2.5) {
      outer.push(at(i * 30 + d, 0, R_BAND_OUT));
      inner.unshift(at(i * 30 + d, 0, R_BAND_IN));
    }
    const mid = at(i * 30 + 15, 0, R_BAND_IN);
    return { sign, points: poly([...outer, ...inner]), depth: mid.depth };
  }).sort((a, z) => a.depth - z.depth), [spin, tilt, anchor]);

  /** The pastel discs themselves — the site's icons, not redrawn glyphs. */
  const icons = useMemo(() => SIGNS.map((sign, i) => ({
    sign, p: at(i * 30 + 15, 0, R_ICON),
  })).sort((a, z) => a.p.depth - z.p.depth), [spin, tilt, anchor]);

  const houses = useMemo(() => {
    if (!cusps || cusps.length !== 12) return null;
    const ANGLE: Record<number, string> = { 0: 'ASC', 3: 'IC', 6: 'DSC', 9: 'MC' };
    return cusps.map((lon, i) => {
      const span = norm360(cusps[(i + 1) % 12] - lon) || 30;
      return {
        i,
        p: at(lon, 0, R_BAND_IN),
        num: at(lon + span / 2, 0, 54),
        angle: ANGLE[i] ?? null,
      };
    });
  }, [cusps, spin, tilt, anchor]);

  const centre = useMemo(() => at(0, 90, 0), [spin, tilt, anchor]);

  const nodeMarks = useMemo(() => (nodeLon === null ? [] : [
    { lon: nodeLon, glyph: '☊' },
    { lon: norm360(nodeLon + 180), glyph: '☋' },
  ].map((n) => ({ ...n, p: at(n.lon, 0, R_SPHERE) }))), [nodeLon, spin, tilt, anchor]);

  /** Equinoxes: where the equator cuts the ecliptic. */
  const equinoxes = useMemo(
    () => [0, 180].map((lon) => ({ lon, p: at(lon, 0, R_SPHERE) })),
    [spin, tilt, anchor],
  );

  const drawLon = useMemo(
    () => collisionNudge(bodies.filter((b) => GLYPH[b.body])),
    [bodies],
  );

  const marks = useMemo(() => bodies
    .filter((b) => GLYPH[b.body])
    .map((b) => {
      const shown = drawLon.get(b.body) ?? b.lon;
      return { ...b, p: at(shown, b.lat, R_BODY), foot: at(shown, 0, R_BODY) };
    })
    .sort((a, z) => a.p.depth - z.p.depth), [bodies, drawLon, spin, tilt, anchor]);

  const web = useMemo(() => {
    const pos = new Map<string, Projected>();
    for (const b of bodies) {
      if (GLYPH[b.body]) pos.set(b.body, at(drawLon.get(b.body) ?? b.lon, b.lat, R_BODY));
    }
    return aspects
      .map((a) => {
        const p1 = pos.get(a.a);
        const p2 = pos.get(a.b);
        return p1 && p2 ? { ...a, p1, p2, depth: (p1.depth + p2.depth) / 2 } : null;
      })
      .filter(Boolean)
      .sort((a, z) => a!.depth - z!.depth) as
        { type: string; p1: Projected; p2: Projected; depth: number }[];
  }, [aspects, bodies, drawLon, spin, tilt, anchor]);

  const onDown = (e: PointerEvent) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, tilt, spin };
    stop();
  };
  const onMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    setTilt(Math.max(0, Math.min(90, d.tilt + (e.clientY - d.y) * 0.4)));
    setSpin(d.spin + (e.clientX - d.x) * 0.4);
  };
  const onUp = (e: PointerEvent) => {
    (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
    drag.current = null;
  };
  const onKey = (e: KeyboardEvent) => {
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
  const cue = (d: number) => 0.4 + 0.6 * ((d + 1) / 2);

  const backWire = wire.filter((w) => !w.front);
  const frontWire = wire.filter((w) => w.front);
  const backBodies = marks.filter((m) => m.p.depth < 0);
  const frontBodies = marks.filter((m) => m.p.depth >= 0);

  const bodyGroup = (m: typeof marks[number]) => {
    const o = cue(m.p.depth);
    const r = 8 + 2.4 * ((m.p.depth + 1) / 2);
    const hue = SIGNS[Math.floor(norm360(m.lon) / 30)].hue;
    return (
      <g class={`ev-body${m.body === 'Sun' ? ' is-sun' : ''}`} style={`--hue:${hue};opacity:${o.toFixed(3)}`}>
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
  };

  return (
    <figure class="ev" style={`--ev-size:${size}px`}>
      <svg
        viewBox="0 0 400 400"
        class="ev-stage"
        role="img"
        tabIndex={0}
        aria-label={label ?? 'The chart as an armillary sphere. Drag vertically to tilt it and horizontally to spin it. The ecliptic carries the zodiac band; the celestial equator crosses it at the equinoxes and the Moon’s orbit at the nodes.'}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onKeyDown={onKey}
      >
        <circle class="ev-globe" cx={CX} cy={CY} r={R_SPHERE} style={`opacity:${solidity.toFixed(3)}`} />

        <g class="ev-wire is-back" style={`opacity:${(solidity * 0.45).toFixed(3)}`}>
          {backWire.map((w) => <polyline points={w.d} />)}
        </g>
        <g class="ev-ring is-back" style={`opacity:${solidity.toFixed(3)}`}>
          {equator.filter((r) => !r.front).map((r) => <polyline class="ev-equator" points={poly(r.points)} />)}
          {moonRoad.filter((r) => !r.front).map((r) => <polyline class="ev-moonroad" points={poly(r.points)} />)}
        </g>

        {backBodies.map(bodyGroup)}

        <g class="ev-band">
          {sectors.map(({ sign, points }) => (
            <polygon class="ev-sector" points={points} style={`--hue:${sign.hue}`} />
          ))}
        </g>

        {houses && floor > 0.01 && (
          <g class="ev-houses" style={`opacity:${floor.toFixed(3)}`}>
            {houses.map((h) => (
              <line class={h.angle ? 'ev-cusp is-angle' : 'ev-cusp'}
                    x1={centre.x.toFixed(2)} y1={centre.y.toFixed(2)}
                    x2={h.p.x.toFixed(2)} y2={h.p.y.toFixed(2)} />
            ))}
            {houses.map((h) => (
              <text class="ev-housenum" x={h.num.x.toFixed(2)} y={h.num.y.toFixed(2)}
                    text-anchor="middle" dominant-baseline="central">{h.i + 1}</text>
            ))}
            {houses.filter((h) => h.angle).map((h) => (
              <text class="ev-anglelabel" x={h.p.x.toFixed(2)} y={(h.p.y - 7).toFixed(2)}
                    text-anchor="middle">{h.angle}</text>
            ))}
          </g>
        )}

        {icons.map(({ sign, p }) => (
          <image
            class="ev-signicon"
            href={`/assets/zodiac-icons/48/${sign.slug}.webp`}
            x={(p.x - 11).toFixed(2)} y={(p.y - 11).toFixed(2)}
            width="22" height="22"
            style={`opacity:${cue(p.depth).toFixed(3)}`}
          />
        ))}

        <g class="ev-web">
          {web.map((w) => (
            <line x1={w.p1.x.toFixed(2)} y1={w.p1.y.toFixed(2)} x2={w.p2.x.toFixed(2)} y2={w.p2.y.toFixed(2)}
                  stroke={ASPECT_COLOR[w.type] ?? 'rgba(198,204,218,0.5)'}
                  style={`opacity:${(0.6 + 0.4 * ((w.depth + 1) / 2)).toFixed(3)}`} />
          ))}
        </g>

        <g class="ev-ring" style={`opacity:${solidity.toFixed(3)}`}>
          {equator.filter((r) => r.front).map((r) => <polyline class="ev-equator" points={poly(r.points)} />)}
          {moonRoad.filter((r) => r.front).map((r) => <polyline class="ev-moonroad" points={poly(r.points)} />)}
        </g>
        <g class="ev-wire" style={`opacity:${(solidity * 0.85).toFixed(3)}`}>
          {frontWire.map((w) => <polyline points={w.d} />)}
        </g>

        <g class="ev-crossings" style={`opacity:${solidity.toFixed(3)}`}>
          {equinoxes.map((e) => (
            <circle class="ev-equinox" cx={e.p.x.toFixed(2)} cy={e.p.y.toFixed(2)} r="2.6" />
          ))}
          {nodeMarks.map((n) => (
            <g class="ev-node">
              <circle cx={n.p.x.toFixed(2)} cy={n.p.y.toFixed(2)} r="3.2" />
              <text x={n.p.x.toFixed(2)} y={(n.p.y - 9).toFixed(2)} text-anchor="middle">{n.glyph}</text>
            </g>
          ))}
        </g>

        {frontBodies.map(bodyGroup)}
      </svg>

      <div class="ev-controls">
        <label class="ev-slider">
          <span>Tilt</span>
          <input type="range" min="0" max="90" step="1" value={Math.round(tilt)}
                 aria-label="Tilt the sphere: 0 degrees looks straight down on the flat wheel, 90 degrees is edge-on to the ecliptic"
                 onInput={(e) => { stop(); setTilt(Number((e.target as HTMLInputElement).value)); }} />
          <span class="mono">{Math.round(tilt)}°</span>
        </label>
        <ul class="ev-key">
          <li><i class="ev-key-ecliptic" />ecliptic · the zodiac band</li>
          <li><i class="ev-key-equator" />celestial equator · 23.4° · crosses at the equinoxes</li>
          <li><i class="ev-key-moon" />Moon's orbit · 5.1° · crosses at the nodes</li>
        </ul>
      </div>

      <figcaption class="ev-caption">
        <p>
          Drag to turn the sphere. Bodies sit at their real ecliptic latitude, on a globe of
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
            The Sun is {eclipse.degrees.toFixed(0)}° from the nearer node, so this chart
            {eclipse.possible ? ' falls inside an eclipse season.' : ' is outside an eclipse season.'}
          </p>
        )}
      </figcaption>
    </figure>
  );
}
