/**
 * "For your chart" — the day's sky pressed against the visitor's saved
 * natal chart. Pure arithmetic: natal longitudes come from the stored
 * summary, transiting longitudes from the committed daily JSON, aspects
 * from the synastry math. The ephemeris never loads; visitors without a
 * saved chart see nothing at all.
 */
import { useProfile } from '../lib/hooks/useProfile';
import { findInterAspects } from '../lib/engine/synastry';
import { TRANSIT_ORB, transitLine } from '../lib/transits';
import PlanetGlyph from '../components/PlanetGlyph';
import EvidenceDisclosure from './EvidenceDisclosure';
import { signBySlug, signForLongitude } from '../lib/signs';
import daily from '../data/daily.json';

/** Each transiting body's current-sign hue, for the leading receipt glyph. */
const SKY_HUE: Record<string, string> = Object.fromEntries(
  daily.bodies.map((b) => [b.body, signBySlug(b.sign).hue]),
);

interface Labels {
  forYourChart: string;
  whyThisReading: string;
  natal: string;
  orb: string;
  openDailyBrief: string;
  allTransits: string;
}

interface Props {
  sign?: string;
  labels: Labels;
  todayHref?: string;
  transitsHref?: string;
}

/** The transit-worthy movers; the natal side keeps every stored body. */
const MOVERS = new Set(['Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']);

export default function DailyForYou({
  sign,
  labels,
  todayHref = '/today/',
  transitsHref = '/transits/',
}: Props) {
  const { profile } = useProfile();
  const chart = [...profile.charts]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .find((candidate) => {
      if (!sign) return true;
      const sun = candidate.summary.bodies.find((body) => body.body === 'Sun');
      return sun != null && signForLongitude(sun.lon).slug === sign;
    }) ?? null;

  if (!chart) return null;

  const natal = chart.summary.bodies.map(({ body, lon }) => ({ body, lon }));
  const sky = daily.bodies
    .filter((b) => MOVERS.has(b.body))
    .map(({ body, lon }) => ({ body, lon }));

  const hits = findInterAspects(sky, natal)
    .filter((a) => a.orb <= TRANSIT_ORB)
    .sort((x, y) => x.orb - y.orb)
    .slice(0, 3);

  if (hits.length === 0) return null;

  const handle = chart.name.split('·')[0].trim() || chart.name;

  return (
    <section class="dfy" aria-label={labels.forYourChart}>
      <div class="dfy__head">
        <h2>{labels.forYourChart}</h2>
        <span class="mono dfy__stamp">{handle} · {daily.date}</span>
      </div>
      <ul class="dfy__lines">
        {hits.map((a) => (
          <li key={`${a.a}-${a.b}-${a.type}`}>
            <p>{transitLine(a.a, a.type, a.b)}</p>
          </li>
        ))}
      </ul>
      <EvidenceDisclosure label={labels.whyThisReading}>
        <ul class="evidence-disclosure__list">
          {hits.map((a) => (
            <li class="mono evidence-disclosure__receipt" key={`${a.a}-${a.b}-${a.type}`}>
              <PlanetGlyph body={a.a} hue={SKY_HUE[a.a]} size={13} class="rcpt-glyph" />
              <span>{a.a} {a.type} {labels.natal} {a.b} · {labels.orb} {a.orb.toFixed(1)}°</span>
            </li>
          ))}
        </ul>
      </EvidenceDisclosure>
      <div class="dfy__actions">
        <a class="btn btn--primary dfy__primary" href={todayHref}>
          <span>{labels.openDailyBrief}</span>
          <span class="orb" aria-hidden="true">→</span>
        </a>
        <a class="dfy__more" href={transitsHref}>
          <span>{labels.allTransits}</span>
          <span aria-hidden="true">→</span>
        </a>
      </div>
    </section>
  );
}
