/**
 * The chart with its third dimension put back.
 *
 * The flat wheel draws ecliptic longitude and drops ecliptic latitude, which
 * the engine computed anyway. This view restores it: drag to tilt the plane
 * from the familiar wheel to edge-on, and every body lifts off by the amount
 * the wheel was hiding.
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
  place,
} from '../../lib/wheel/ecliptic3d';
import { SIGNS } from '../../lib/signs';
import './EclipticView.css';

interface Body {
  body: string;
  lon: number;
  lat: number;
}

interface Props {
  bodies: Body[];
  size?: number;
  /** Localized heading for the figure's accessible name. */
  label?: string;
}

const VB = 400;
const CX = VB / 2;
const CY = VB / 2;
const R = 148;

const RESTING_TILT = 58;
const GLYPH: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
  'North Node': '☊', 'South Node': '☋',
};

function hueFor(lon: number): string {
  return SIGNS[Math.floor(norm360(lon) / 30)].hue;
}

function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function'
    && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function EclipticView({ bodies, size = 400, label }: Props) {
  const [tilt, setTilt] = useState(prefersReducedMotion() ? RESTING_TILT : 0);
  const [spin, setSpin] = useState(0);
  const frame = useRef<number>();
  const drag = useRef<{ x: number; y: number; tilt: number; spin: number } | null>(null);

  // The one-time reveal: the familiar wheel, then what it was hiding.
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const start = performance.now();
    const run = (now: number) => {
      const p = Math.min(1, (now - start) / 1100);
      // Cubic ease-out, matching --ease-soft in spirit.
      setTilt(RESTING_TILT * (1 - Math.pow(1 - p, 3)));
      if (p < 1) frame.current = requestAnimationFrame(run);
    };
    frame.current = requestAnimationFrame(run);
    return () => { if (frame.current) cancelAnimationFrame(frame.current); };
  }, []);

  const node = bodies.find((b) => b.body === 'North Node');
  const sun = bodies.find((b) => b.body === 'Sun');
  const nodeLon = node ? node.lon : null;

  const eclipse = useMemo(
    () => (sun && nodeLon !== null ? eclipseProximity(sun.lon, nodeLon) : null),
    [sun?.lon, nodeLon],
  );

  const ecliptic = useMemo(() => {
    const pts: string[] = [];
    for (let l = 0; l <= 360; l += 3) {
      const p = place(l, 0, spin, tilt, CX, CY, R);
      pts.push(`${p.x.toFixed(2)},${p.y.toFixed(2)}`);
    }
    return pts.join(' ');
  }, [spin, tilt]);

  const moonPath = useMemo(() => {
    if (nodeLon === null) return null;
    return inclinedCircle(nodeLon, MOON_INCLINATION, 3)
      .map(({ lon, lat }) => {
        const p = place(lon, lat, spin, tilt, CX, CY, R);
        return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
      })
      .join(' ');
  }, [nodeLon, spin, tilt]);

  const ticks = useMemo(() => SIGNS.map((sign, i) => {
    const inner = place(i * 30, 0, spin, tilt, CX, CY, R);
    const outer = place(i * 30, 0, spin, tilt, CX, CY, R + 11);
    return { sign, inner, outer };
  }), [spin, tilt]);

  // Painter's algorithm: far side of the sphere drawn first.
  const marks = useMemo(() => bodies
    // The nodes are drawn with the Moon's path instead: they are not bodies
    // lifted off the plane, they are where the plane is crossed.
    .filter((b) => GLYPH[b.body] && b.body !== 'North Node' && b.body !== 'South Node')
    .map((b) => {
      const at = place(b.lon, b.lat, spin, tilt, CX, CY, R);
      const foot = place(b.lon, 0, spin, tilt, CX, CY, R);
      return { ...b, at, foot, hue: hueFor(b.lon) };
    })
    .sort((a, z) => a.at.depth - z.at.depth), [bodies, spin, tilt]);

  const nodeMarks = useMemo(() => {
    if (nodeLon === null) return [];
    return [
      { lon: nodeLon, glyph: '☊' },
      { lon: norm360(nodeLon + 180), glyph: '☋' },
    ].map((n) => ({ ...n, at: place(n.lon, 0, spin, tilt, CX, CY, R) }));
  }, [nodeLon, spin, tilt]);

  const onPointerDown = (e: PointerEvent) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, tilt, spin };
    if (frame.current) cancelAnimationFrame(frame.current);
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

  const offPlane = bodies
    .filter((b) => GLYPH[b.body] && b.body !== 'Sun')
    .sort((a, z) => Math.abs(z.lat) - Math.abs(a.lat))[0];

  return (
    <figure class="ev" style={`--ev-size:${size}px`}>
      <svg
        viewBox={`0 0 ${VB} ${VB}`}
        class="ev-stage"
        role="img"
        aria-label={label ?? 'The chart in three dimensions: bodies lifted off the ecliptic plane by their real ecliptic latitude.'}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <polyline class="ev-plane" points={ecliptic} />

        {ticks.map(({ sign, inner, outer }) => (
          <line
            class="ev-tick"
            x1={inner.x.toFixed(2)} y1={inner.y.toFixed(2)}
            x2={outer.x.toFixed(2)} y2={outer.y.toFixed(2)}
            style={`--tick:${sign.hue}`}
          />
        ))}

        {moonPath && <polyline class="ev-moonpath" points={moonPath} />}

        {nodeMarks.map((n) => (
          <g class="ev-node">
            <circle cx={n.at.x.toFixed(2)} cy={n.at.y.toFixed(2)} r="3.5" />
            <text x={n.at.x.toFixed(2)} y={(n.at.y - 10).toFixed(2)} text-anchor="middle">{n.glyph}</text>
          </g>
        ))}

        {marks.map((m) => (
          <g class={`ev-body${m.body === 'Sun' ? ' is-sun' : ''}`} style={`--hue:${m.hue}`}>
            <line
              class="ev-stem"
              x1={m.foot.x.toFixed(2)} y1={m.foot.y.toFixed(2)}
              x2={m.at.x.toFixed(2)} y2={m.at.y.toFixed(2)}
            />
            <circle class="ev-foot" cx={m.foot.x.toFixed(2)} cy={m.foot.y.toFixed(2)} r="1.6" />
            <circle class="ev-disc" cx={m.at.x.toFixed(2)} cy={m.at.y.toFixed(2)} r="9" />
            <text class="ev-glyph" x={m.at.x.toFixed(2)} y={m.at.y.toFixed(2)} text-anchor="middle" dominant-baseline="central">
              {GLYPH[m.body]}
            </text>
          </g>
        ))}
      </svg>

      <div class="ev-controls">
        <label class="ev-slider">
          <span>Tilt</span>
          <input
            type="range"
            min="0"
            max="90"
            step="1"
            value={Math.round(tilt)}
            aria-label="Tilt the ecliptic plane, 0 degrees for the flat wheel, 90 degrees for edge-on"
            onInput={(e) => {
              if (frame.current) cancelAnimationFrame(frame.current);
              setTilt(Number((e.target as HTMLInputElement).value));
            }}
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
            The Moon's path (dashed) crosses the plane at the nodes. The Sun is{' '}
            {eclipse.degrees.toFixed(0)}° from the nearer node, so this chart
            {eclipse.possible ? ' falls inside an eclipse season.' : ' is outside an eclipse season.'}
          </p>
        )}
      </figcaption>
    </figure>
  );
}
