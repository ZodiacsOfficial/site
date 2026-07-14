import { useEffect, useMemo } from 'preact/hooks';
import {
  COMMUNICATION_COPY,
  communicationRead,
} from '../lib/communication';
import type { Chart } from '../lib/engine/types';

interface Props {
  chart: Chart;
}

export default function CommunicationRead({ chart }: Props) {
  const read = useMemo(() => communicationRead(chart), [chart]);

  useEffect(() => {
    (window as unknown as {
      zodiacsAnalytics?: { track?: (name: string, props: Record<string, string>) => void };
    }).zodiacsAnalytics?.track?.('comm_read_view', {});
  }, [chart]);

  return (
    <section class="calc__comm" aria-labelledby="calc-comm-title">
      <h2 id="calc-comm-title">{COMMUNICATION_COPY.title}</h2>
      <p class="calc__comm-intro">{COMMUNICATION_COPY.intro}</p>
      <div class="calc__comm-part">
        <h3>Mercury</h3>
        <p>{read.mercury}</p>
        {read.mercuryAddendum && <p class="calc__comm-addendum">{read.mercuryAddendum}</p>}
        {read.aspects.length > 0 && (
          <ul>
            {read.aspects.map((line) => <li key={line}>{line}</li>)}
          </ul>
        )}
      </div>
      <div class="calc__comm-part">
        <h3>Mars</h3>
        <p>{read.mars}</p>
      </div>
    </section>
  );
}
