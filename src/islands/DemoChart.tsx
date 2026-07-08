/**
 * The capability demo: a real, precomputed chart (Frida Kahlo, public
 * birth data, Rodden AA) with three plain-language callouts. Static
 * fixture — the ephemeris never loads on the homepage.
 */
import Wheel from '../lib/wheel/Wheel';
import { formatLongitude, signForLongitude } from '../lib/signs';
import { bigThree } from '../lib/interpretations';
import demo from '../data/demo-chart-frida.json';

export default function DemoChart() {
  const bodies = demo.bodies.filter((b) => b.body !== 'South Node');
  const sun = demo.bodies.find((b) => b.body === 'Sun')!;
  const moon = demo.bodies.find((b) => b.body === 'Moon')!;
  const asc = demo.angles.asc;

  const callouts = [
    { label: 'Sun', lon: sun.lon, kind: 'sun' as const },
    { label: 'Moon', lon: moon.lon, kind: 'moon' as const },
    { label: 'Rising', lon: asc, kind: 'rising' as const },
  ];

  return (
    <div class="demo">
      <div class="demo__wheel shell">
        <div class="core demo__wheel-core">
          <Wheel
            bodies={bodies}
            asc={asc}
            mc={demo.angles.mc}
            cusps={demo.houses?.cusps ?? null}
            size={430}
          />
          <p class="demo__receipt mono">
            {demo.name} · {demo.birth} · computed as {demo.utc.replace('T', ' ').slice(0, 16)} UTC
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
        <a class="btn btn--primary demo__cta" href="/birth-chart/">
          <span>Get your free birth chart</span><span class="orb">↗</span>
        </a>
      </div>
    </div>
  );
}
