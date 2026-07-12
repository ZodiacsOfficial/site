/**
 * The capability demo: a real, precomputed chart (Frida Kahlo, public
 * birth data, Rodden AA) with build-time captions. The component is
 * server-rendered; its tiny classic script only toggles existing DOM.
 */
import Wheel from '../lib/wheel/Wheel';
import { formatLongitude, signForLongitude } from '../lib/signs';
import { bigThree } from '../lib/interpretations';
import { t } from '../lib/i18n';
import { matchAspect } from '../lib/engine/aspects';
import { houseOf, norm } from '../lib/engine/houses';
import { natalAspectLine, planetInHouseLine } from '../lib/natal';
import { collisionNudge } from '../lib/scene/layout';
import demo from '../data/demo-chart-frida.json';

const SIZE = 430;
const PAD = SIZE * 0.05;
const FRAME = SIZE + PAD * 2;
const R_BODIES = SIZE * 0.31;
const R_ASPECTS = SIZE * 0.235;
const R_HOUSE_LABELS = (R_ASPECTS + R_BODIES) / 2 - SIZE * 0.02;
function point(lon: number, radius: number) {
  const phi = ((180 + (lon - demo.angles.asc)) * Math.PI) / 180;
  return {
    x: ((SIZE / 2 + radius * Math.cos(phi) + PAD) / FRAME) * 100,
    y: ((SIZE / 2 - radius * Math.sin(phi) + PAD) / FRAME) * 100,
  };
}

const position = ({ x, y }: { x: number; y: number }, sign?: string) =>
  `--x:${x.toFixed(3)};--y:${y.toFixed(3)}${sign ? `;--sign:${sign}` : ''}`;

export default function DemoChart() {
  const bodies = demo.bodies.filter((b) => b.body !== 'South Node');
  const planets = bodies.filter((b) => !b.body.includes('Node'));
  const sun = demo.bodies.find((b) => b.body === 'Sun')!;
  const moon = demo.bodies.find((b) => b.body === 'Moon')!;
  const asc = demo.angles.asc;

  const callouts = [
    { label: 'Sun', lon: sun.lon, kind: 'sun' as const },
    { label: 'Moon', lon: moon.lon, kind: 'moon' as const },
    { label: 'Rising', lon: asc, kind: 'rising' as const },
  ];
  const aspects = planets.flatMap((a, index) => planets.slice(index + 1).flatMap((b) => {
    const match = matchAspect(a.body, a.lon, b.body, b.lon);
    return match ? [{ a: a.body, b: b.body, type: match.def.type, orb: match.orb }] : [];
  })).sort((a, b) => a.orb - b.orb).slice(0, 6);
  const drawLongitude = collisionNudge(bodies);
  const planetTargets = bodies.map((body) => {
    const house = houseOf(body.lon, demo.houses.cusps);
    return {
      key: body.body,
      label: `${body.body}, house ${house}`,
      caption: planetInHouseLine(body.body, house),
      point: point(drawLongitude.get(body.body) ?? body.lon, R_BODIES),
      hue: signForLongitude(body.lon).hue,
    };
  });
  const houseTargets = demo.houses.cusps.map((cusp, index) => {
    const house = index + 1;
    const occupant = planets.find((body) => houseOf(body.lon, demo.houses.cusps) === house);
    return {
      key: house,
      label: `House ${house}`,
      caption: occupant
        ? planetInHouseLine(occupant.body, house)
        : t('en', 'emptyHouseNote'),
      point: point(norm(cusp + 15), R_HOUSE_LABELS),
    };
  });
  const aspectTargets = aspects.map((aspect, index) => {
    const a = planets.find((body) => body.body === aspect.a)!;
    const b = planets.find((body) => body.body === aspect.b)!;
    const p1 = point(a.lon, R_ASPECTS);
    const p2 = point(b.lon, R_ASPECTS);
    const along = 0.34 + (index % 3) * 0.16;
    return {
      ...aspect,
      label: `${aspect.a} ${aspect.type} ${aspect.b}`,
      caption: natalAspectLine(aspect.a, aspect.type, aspect.b),
      point: { x: p1.x + (p2.x - p1.x) * along, y: p1.y + (p2.y - p1.y) * along },
    };
  });
  const defaultCaption = planetInHouseLine('Sun', houseOf(sun.lon, demo.houses.cusps));

  return (
    <div class="demo" data-demo-preview>
      <div class="demo__wheel shell">
        <div class="core demo__wheel-core">
          <div class="demo__wheel-stage">
            <Wheel
              bodies={bodies}
              asc={asc}
              mc={demo.angles.mc}
              cusps={demo.houses?.cusps ?? null}
              aspects={aspects}
              size={SIZE}
              preview
            />
            <div class="demo__targets">
              {planetTargets.map((target) => (
                <button
                  type="button"
                  class="demo__target demo__target--planet"
                  style={position(target.point, target.hue)}
                  aria-label={target.label}
                  aria-pressed="false"
                  data-demo-layer="planets"
                  data-demo-copy={target.caption}
                />
              ))}
              {houseTargets.map((target) => (
                <button
                  type="button"
                  class="demo__target demo__target--house"
                  style={position(target.point)}
                  aria-label={target.label}
                  aria-pressed="false"
                  data-demo-layer="houses"
                  data-demo-copy={target.caption}
                />
              ))}
              {aspectTargets.map((target) => (
                <button
                  type="button"
                  class="demo__target demo__target--aspect"
                  style={position(target.point)}
                  aria-label={target.label}
                  aria-pressed="false"
                  data-demo-layer="aspects"
                  data-demo-copy={target.caption}
                />
              ))}
            </div>
          </div>
          <p class="demo__receipt mono">
            {demo.name} · {demo.birth} · computed as {demo.utc.replace('T', ' ').slice(0, 16)} UTC
          </p>
          <p class="demo__preview-hint mono">Choose a planet, house, or aspect.</p>
          <p class="demo__caption" aria-live="polite">
            <span data-demo-caption>{defaultCaption}</span>{' '}
            <a href="/birth-chart/">Get your free birth chart →</a>
          </p>
        </div>
      </div>
      <div class="demo__callouts">
        {callouts.map((c) => {
          const s = signForLongitude(c.lon);
          return (
            <div class="demo__callout" style={`--sign:${s.hue}`} key={c.label}>
              <span class="mono--label">{c.label} · {formatLongitude(c.lon)}</span>
              <strong>{s.name}</strong>
              <p>{bigThree(c.kind, s.slug).split('. ')[0]}.</p>
            </div>
          );
        })}
        <p class="demo__cta-line">
          A real chart, computed from the 1907 sky down to the local mean time
          of the era. <strong>Yours takes about twenty seconds.</strong>
        </p>
      </div>
    </div>
  );
}
