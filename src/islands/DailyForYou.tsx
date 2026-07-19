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
  const { profile, ready } = useProfile();
  const chart = profile.charts
    .filter((candidate) => (
      typeof candidate?.name === 'string'
      && typeof candidate.updatedAt === 'string'
      && Array.isArray(candidate.summary?.bodies)
    ))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .find((candidate) => {
      if (!sign) return true;
      const sun = candidate.summary.bodies.find((body) => (
        body?.body === 'Sun' && Number.isFinite(body.lon)
      ));
      return sun != null && signForLongitude(sun.lon).slug === sign;
    }) ?? null;
  const hasSavedChartHint = typeof document !== 'undefined'
    && document.documentElement.hasAttribute('data-dfy-saved-chart');

  if (!chart) {
    return ready && !hasSavedChartHint ? null : (
      <section class="dfy dfy--placeholder" aria-label={labels.forYourChart}>
        <div class="dfy__head">
          <h2>{labels.forYourChart}</h2>
          <span class="mono dfy__stamp">Saved chart · {daily.date}</span>
        </div>
        <div class="dfy__body">
          <p class="dfy__placeholder-copy">
            {ready
              ? 'This saved-chart comparison is unavailable right now. Your complete Sun-sign reading remains ready above.'
              : 'Your Sun-sign reading is ready above. This private saved-chart layer adds today’s closest contacts when available.'}
          </p>
          <ul class="dfy__fallback-points">
            <li>The complete daily reading remains available above.</li>
            <li>Your saved chart stays in this browser.</li>
            <li>You can open the full daily brief whenever you are ready.</li>
          </ul>
        </div>
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

  const natal = chart.summary.bodies
    .filter((body) => body && typeof body.body === 'string' && Number.isFinite(body.lon))
    .map(({ body, lon }) => ({ body, lon }));
  const sky = daily.bodies
    .filter((b) => MOVERS.has(b.body))
    .map(({ body, lon }) => ({ body, lon }));

  const aspects = findInterAspects(sky, natal);
  const hits = aspects.filter((a) => a.orb <= TRANSIT_ORB).slice(0, 3);
  const nearest = aspects[0] ?? null;

  const handle = chart.name.split('·')[0].trim() || chart.name;
  const sunSign = sign ? signBySlug(sign) : null;

  return (
    <section class="dfy" aria-label={labels.forYourChart}>
      <div class="dfy__head">
        <h2>{labels.forYourChart}</h2>
        <span
          class="mono dfy__stamp"
          aria-label={`${handle}, ${daily.date}`}
          title={`${handle} · ${daily.date}`}
        >
          Saved chart · {daily.date}
        </span>
      </div>
      <div class="dfy__body">
        {hits.length > 0 ? (
          <>
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
          </>
        ) : (
          <>
            <div class="dfy__quiet">
              <p>Today is quieter against this chart, with no close major contacts in the current snapshot.</p>
              {sunSign && (
                <div class="dfy__quiet-baseline">
                  <strong>{sunSign.name} Sun-sign baseline</strong>
                  <p>The {sunSign.name} reading above remains the main forecast for this edition.</p>
                  <a href="#reading-heading">Return to the {sunSign.name} reading ↑</a>
                </div>
              )}
            </div>
            <EvidenceDisclosure label={labels.whyThisReading}>
              <p class="dfy__quiet-receipt">
                No moving Sun, Mercury, Venus, Mars, Jupiter, or Saturn contact falls within the current 3° major-aspect window.
                {nearest && <> The nearest checked contact is {nearest.a} {nearest.type} natal {nearest.b}, {nearest.orb.toFixed(1)}° from exact.</>}
              </p>
            </EvidenceDisclosure>
          </>
        )}
      </div>
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
