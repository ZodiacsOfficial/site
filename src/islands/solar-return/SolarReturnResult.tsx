import { useEffect, useRef } from 'preact/hooks';
import type { ComponentType } from 'preact';
import type { WheelProps } from '../../lib/wheel/Wheel';
import { houseOf } from '../../lib/engine/houses';
import { formatLongitude, signForLongitude } from '../../lib/signs';
import type { SolarReturnResultData } from './compute';
import { SR_COPY } from './copy';

export interface SolarReturnResultProps { result: SolarReturnResultData; Wheel: ComponentType<WheelProps> }

export function SolarReturnResult({ result, Wheel }: SolarReturnResultProps) {
  const { chart } = result;
  const sun = chart.bodies.find((body) => body.body === 'Sun')!;
  const sunHouse = chart.houses ? houseOf(sun.lon, chart.houses.cusps) : null;
  const ascSign = chart.angles ? signForLongitude(chart.angles.asc) : null;
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    (window as typeof window & {
      zodiacsAnalytics?: { track?: (name: string, props: { via: string }) => void };
    }).zodiacsAnalytics?.track?.('srchart_view', { via: 'page' });
    headingRef.current?.focus();
  }, [chart.input.utc]);

  return (
    <div class="sr-result" data-solar-return-result data-sr-asc={chart.angles?.asc ?? undefined} data-sr-sun={sun.lon} data-sr-no-time={result.noTime} data-sr-no-place={result.noPlace}>
      <section class="shell sr-result__receipt" aria-label="Solar return receipt">
        <div class="core sr-result__core">
          <span class="mono--label">Your {result.returnYear} return</span>
          <h2 ref={headingRef} tabIndex={-1}>{formatLongitude(sun.lon)} Sun</h2>
          <p class="mono" data-return-instant>
            UTC · {chart.input.utc.toISOString().slice(0, 19).replace('T', ' · ')}
            <br />Your time · {chart.input.utc.toLocaleString(undefined, {
              year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short',
            })}
          </p>
        </div>
      </section>

      {result.noTime && <p class="notice" data-noon-notice>{SR_COPY.noon}</p>}
      {result.noPlace && <p class="notice">{SR_COPY.noPlace}</p>}

      <section class="calc__wheel shell">
        <div class="core calc__wheel-core">
          <div aria-hidden="true">
            <Wheel
              bodies={chart.bodies.filter((body) => body.body !== 'South Node')}
              asc={chart.angles?.asc ?? null}
              mc={chart.angles?.mc ?? null}
              cusps={chart.houses?.cusps ?? null}
              aspects={chart.aspects.filter((aspect) => aspect.orb < 6)}
              animate
            />
          </div>
        </div>
      </section>

      {ascSign && (
        <p class="sr-result__line" data-sr-corpus="asc">{SR_COPY.asc[ascSign.slug as keyof typeof SR_COPY.asc]}</p>
      )}
      {sunHouse && <p class="sr-result__line" data-sr-corpus="sun-house">{SR_COPY.sunHouse[sunHouse]}</p>}

      <section class="shell">
        <div class="core sr-result__core">
          <h2>Return placements</h2>
          <div class="calc__table-wrap">
            <table class="calc__table">
              <caption class="sr-only">Solar return placements</caption>
              <thead><tr><th>Body</th><th>Sign</th><th>Degree</th>{chart.houses && <th>House</th>}</tr></thead>
              <tbody>
                {chart.bodies.map((body) => {
                  const sign = signForLongitude(body.lon);
                  const degree = formatLongitude(body.lon).split(' ')[0];
                  return <tr key={body.body}><td>{body.body}</td><td>{sign.name}</td><td class="mono">{degree}</td>{chart.houses && <td class="mono">{houseOf(body.lon, chart.houses.cusps)}</td>}</tr>;
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <div class="calc__actions">
        <a class="btn btn--ghost" href="/birth-chart/">Open your full birth chart →</a>
        <a class="btn btn--ghost" href="/transits/">See today’s transits →</a>
      </div>
    </div>
  );
}
