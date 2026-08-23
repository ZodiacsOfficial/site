import { useEffect, useMemo, useState } from 'preact/hooks';
import dailyData from '../../data/daily.json';
import { useProfile } from '../../lib/hooks/useProfile';
import { SIGNS, signForLongitude } from '../../lib/signs';
import {
  natalPointsForChart,
  nearestTodayContact,
  newestSavedChart,
  recordTodayOpen,
  selectTodayContacts,
  TODAY_STORAGE_KEY,
} from '../../lib/today';
import SunSignFallback from './SunSignFallback';
import { datedEditionText } from '../../lib/edition-freshness';

type PushOptInModule = typeof import('../PushOptIn');
type TransitsModule = typeof import('../../lib/transits');
type LivingMomentCaptureModule = typeof import('../living-chart/LivingMomentCapture');
type LivingSelfChartChooserModule = typeof import('../living-chart/LivingSelfChartChooser');
type ForecastSnapshotFactory = typeof import('../../lib/living-chart/forecast-snapshot')['createLivingForecastSnapshot'];

interface DailyData {
  date: string;
  bodies: Array<{ body: string; lon: number; retrograde: boolean }>;
}

const daily = dailyData as DailyData;

function dateLabel(day: string): string {
  return new Intl.DateTimeFormat('en', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${day}T12:00:00.000Z`));
}

const editionLabel = dateLabel(daily.date);

function LivingReflection({
  prompt,
}: {
  prompt?: { question: string } | null;
}) {
  return (
    <aside
      class="today-useful"
      aria-label="Useful today"
      aria-hidden={!prompt}
    >
      <span class="today-useful__label">Useful today</span>
      <p class="today-useful__question">{prompt?.question}</p>
      <small>Use this symbolic reading as a prompt, not a prediction of events.</small>
    </aside>
  );
}

function LivingSelfChartPlaceholder() {
  return (
    <section class="living-self-chart living-self-chart--placeholder" aria-hidden="true">
      <div>
        <h2>Which chart is yours?</h2>
        <p>Choose your own birth chart to open a personal forecast.</p>
      </div>
      <span class="btn btn--primary"><span>Use this as my chart</span><span class="orb">→</span></span>
    </section>
  );
}

const WEB_PUSH_ENABLED = import.meta.env.PUBLIC_WEB_PUSH_ENABLED === '1';

interface Props {
  sunSignReadings: Record<string, { text: string; receipt: string }>;
  livingChartEnabled?: boolean;
  livingChartSyncEnabled?: boolean;
  generatorVersion: string;
}

export default function TodayBrief({
  sunSignReadings,
  livingChartEnabled = false,
  livingChartSyncEnabled = false,
  generatorVersion,
}: Props) {
  const { profile, ready } = useProfile();
  const [streak, setStreak] = useState<number | null>(null);
  const [pushModule, setPushModule] = useState<PushOptInModule | null>(null);
  const [transitsModule, setTransitsModule] = useState<TransitsModule | null>(null);
  const [transitsFailed, setTransitsFailed] = useState(false);
  const [captureModule, setCaptureModule] = useState<LivingMomentCaptureModule | null>(null);
  const [chooserModule, setChooserModule] = useState<LivingSelfChartChooserModule | null>(null);
  const [snapshotFactory, setSnapshotFactory] = useState<ForecastSnapshotFactory | null>(null);

  useEffect(() => {
    let returning = false;
    try {
      returning = window.localStorage.getItem(TODAY_STORAGE_KEY) !== null;
    } catch {
      returning = false;
    }
    setStreak(recordTodayOpen(window.localStorage).count);
    void import('../../lib/transits')
      .then(setTransitsModule)
      .catch(() => {
        setTransitsFailed(true);
      });
    if (returning && WEB_PUSH_ENABLED) {
      void import('../PushOptIn').then(setPushModule).catch(() => {});
    }
    (window as Window & {
      zodiacsAnalytics?: { track?: (name: string, properties: Record<string, never>) => void };
    }).zodiacsAnalytics?.track?.('today_view', {});
  }, []);

  const chart = useMemo(
    () => {
      if (!livingChartEnabled) return newestSavedChart(profile);
      const selfCharts = profile.charts.filter((candidate) => candidate.relationship === 'self');
      return selfCharts.length === 1 ? selfCharts[0] ?? null : null;
    },
    [livingChartEnabled, profile],
  );
  const chartSunSign = useMemo(() => {
    const sun = chart?.summary?.bodies?.find((body) => (
      body?.body === 'Sun' && Number.isFinite(body.lon)
    ));
    return sun ? signForLongitude(sun.lon) : null;
  }, [chart]);
  const PushOptIn = pushModule?.default;
  const reading = useMemo(() => {
    if (!chart || !transitsModule) return null;
    try {
      const natal = natalPointsForChart(chart);
      return {
        contacts: selectTodayContacts(natal, daily.bodies, transitsModule.TRANSIT_ORB, 3),
        nearest: nearestTodayContact(natal, daily.bodies),
      };
    } catch {
      return null;
    }
  }, [chart, transitsModule]);
  const hasSavedChartHint = typeof document !== 'undefined'
    && document.documentElement.hasAttribute('data-today-saved-chart');
  const comparisonUnavailable = transitsFailed
    || (ready && chart === null && hasSavedChartHint)
    || (ready && chart !== null && transitsModule !== null && reading === null);
  const personalized = ready && chart && reading && transitsModule
    ? { chart, reading, transits: transitsModule }
    : null;

  useEffect(() => {
    if (!livingChartEnabled || !ready) return;
    let live = true;
    if (chart) {
      void Promise.all([
        import('../../lib/living-chart/forecast-snapshot'),
        import('../living-chart/LivingMomentCapture'),
      ]).then(([snapshotModule, nextCaptureModule]) => {
        if (!live) return;
        setSnapshotFactory(() => snapshotModule.createLivingForecastSnapshot);
        setCaptureModule(nextCaptureModule);
      }).catch(() => {});
    } else if (profile.charts.length > 0) {
      void import('../living-chart/LivingSelfChartChooser')
        .then((nextChooserModule) => {
          if (live) setChooserModule(nextChooserModule);
        })
        .catch(() => {});
    }
    return () => { live = false; };
  }, [chart?.id, livingChartEnabled, profile.charts.length, ready]);
  const streakDisplay = streak !== null && streak > 999 ? '999+' : (streak ?? 1);
  const editionSunSignLines = useMemo(
    () => Object.fromEntries(Object.entries(sunSignReadings).map(([sign, reading]) => (
      [sign, datedEditionText(reading.text, daily.date)]
    ))),
    [sunSignReadings],
  );
  const snapshotCapturedAt = useMemo(
    () => new Date().toISOString(),
    [chart?.id],
  );
  const livingForecast = useMemo(() => {
    if (!livingChartEnabled || !chart || !reading || !transitsModule || !snapshotFactory || !captureModule) return null;
    const active = reading.contacts.length > 0;
    const lines = active
      ? reading.contacts.map((contact) => ({
          id: `contact:${contact.transiting.toLowerCase()}:${contact.type}:${contact.natal.toLowerCase()}`,
          text: captureModule.possibleContactLine(contact),
          receipt: transitsModule.contactReceipt(contact),
        }))
      : [{
          id: `quiet:${daily.date}`,
          text: `The ${editionLabel} edition looks quieter against your chart. There is less pressure to act on anything immediately.`,
          receipt: reading.nearest
            ? `Nearest checked contact · ${transitsModule.contactReceipt(reading.nearest)}`
            : 'No major contact falls within 3° of the valid points in this saved chart.',
        }];
    if (!active && chartSunSign && lines.length < 3) {
      const baseline = sunSignReadings[chartSunSign.slug];
      if (baseline) lines.push({
        id: `sun-sign:${chartSunSign.slug}:${daily.date}`,
        text: datedEditionText(baseline.text, daily.date),
        receipt: baseline.receipt,
      });
    }
    return snapshotFactory({
      editionDate: daily.date,
      chartId: chart.id,
      source: active ? 'personalized' : 'quiet',
      generatorVersion,
      capturedAt: snapshotCapturedAt,
      lines,
    });
  }, [captureModule, chart, chartSunSign, editionLabel, generatorVersion, livingChartEnabled, reading, snapshotCapturedAt, snapshotFactory, sunSignReadings, transitsModule]);
  const reflectionPrompt = livingChartEnabled && personalized && captureModule
    ? captureModule.reflectionForContact(personalized.reading.contacts[0] ?? null)
    : null;
  const LivingMomentCapture = captureModule?.default;
  const LivingSelfChartChooser = chooserModule?.default;

  return (
    <section
      id="save-moment"
      class="today-card shell tinted"
      style="--sign:var(--sign-cancer)"
      data-today-state={personalized ? 'chart' : ready && !chart ? 'empty' : 'sun-sign'}
    >
      <div class="today-card__core core tinted">
        <header class="today-card__head">
          <div>
            <p class="today-card__date">{editionLabel}</p>
            <p class="today-card__time">Your daily astrology snapshot</p>
          </div>
          {/* The fixed two-column shell is present during SSR, so recording the
              local streak never changes header geometry after hydration. */}
          <p
            class="today-streak"
            data-ready={streak !== null ? '' : undefined}
            aria-label={streak !== null ? `${streak} day streak` : undefined}
            aria-hidden={streak === null ? 'true' : undefined}
          >
            <strong class="today-streak__count">{streakDisplay}</strong>
            <span>day streak</span>
          </p>
        </header>

        {!personalized ? (
          <>
            <div class="today-returning-chart-placeholder today-reading" aria-label="Saved-chart fallback">
              <div class="today-reading__head">
                <h2>For your saved chart</h2>
                <p>A few themes from the {editionLabel} sky, compared with your saved birth chart.</p>
              </div>
              <div class="today-reading__body today-reading__body--fallback">
                <p
                  class={`today-returning-chart-status${comparisonUnavailable ? ' is-visible' : ''}`}
                  aria-hidden={comparisonUnavailable ? undefined : 'true'}
                >
                  Your saved-chart comparison is temporarily unavailable. Your Sun-sign baseline is ready below.
                </p>
                <div class="today-returning-sun-baselines" data-nosnippet>
                  {SIGNS.map((sign) => (
                    <section
                      class="today-returning-sun-baseline"
                      data-today-chart-sun={sign.slug}
                      style={`--sign:${sign.hue}`}
                    >
                      <p class="kicker">{sign.name} Sun-sign baseline</p>
                      <p>{editionSunSignLines[sign.slug]}</p>
                      <a href={`/horoscopes/${sign.slug}/`}>
                        Read the full {sign.name} horoscope <span aria-hidden="true">→</span>
                      </a>
                    </section>
                  ))}
                  <nav class="today-returning-sign-links" aria-label="Open a Sun-sign horoscope">
                    {SIGNS.map((sign) => <a href={`/horoscopes/${sign.slug}/`}>{sign.name}</a>)}
                  </nav>
                </div>
              </div>
              {livingChartEnabled && <LivingReflection />}
              {livingChartEnabled && (
                <div class="living-moment-slot" aria-hidden="true">
                  <div class="living-moment-slot__fallback">
                    <button class="btn btn--primary">
                      <span>Save this moment</span>
                      <span class="orb">+</span>
                    </button>
                  </div>
                </div>
              )}
              <p class="today-private">
                {livingChartEnabled
                  ? livingChartSyncEnabled
                    ? 'Saved moments start on this device. Account sync is a separate choice you can make after saving.'
                    : 'Saved moments stay on this device now. Existing account sync and privacy controls remain available from Profile.'
                  : 'Your saved chart and this comparison stay in this browser.'}
              </p>
              <details class="today-method-details">
                <summary>How this comparison works</summary>
                <div class="today-method-details__body">
                  <p>
                    {livingChartEnabled
                      ? 'The saved-chart layer uses the chart you explicitly selected as yours. If it cannot load, the complete Sun-sign reading remains available here.'
                      : 'The saved-chart layer runs privately in this browser. If it cannot load, the complete Sun-sign reading remains available here.'}
                  </p>
                </div>
              </details>
            </div>
            <SunSignFallback
              noChartConfirmed={ready && !chart}
              comparisonUnavailable={comparisonUnavailable}
              sunSignLines={editionSunSignLines}
              editionDate={daily.date}
            />
            {livingChartEnabled && !ready && <LivingSelfChartPlaceholder />}
            {livingChartEnabled && ready && !chart && profile.charts.length > 0 && (
              LivingSelfChartChooser
                ? <LivingSelfChartChooser charts={profile.charts} />
                : <LivingSelfChartPlaceholder />
            )}
          </>
        ) : (
          <div
            class={`today-reading today-reading--resolved${personalized.reading.contacts.length > 0 ? ' today-reading--active' : ' today-reading--quiet'}`}
          >
            <div class="today-reading__head">
              <h2 aria-label={`For ${personalized.chart.name || (livingChartEnabled ? 'your chart' : 'your latest chart')}`}>
                <span>For</span>{' '}
                <span
                  class="today-reading__chart-name"
                  title={personalized.chart.name || undefined}
                >
                  {personalized.chart.name || (livingChartEnabled ? 'your chart' : 'your latest chart')}
                </span>
              </h2>
              <p>A few themes from the {editionLabel} sky, compared with your saved birth chart.</p>
            </div>

            <div class="today-reading__body">
              {personalized.reading.contacts.length > 0 ? (
                <ol class="today-lines">
                  {personalized.reading.contacts.map((contact, index) => (
                    <li key={`${contact.transiting}-${contact.type}-${contact.natal}`}>
                      {livingChartEnabled && (
                        <span class="today-lines__rank">
                          {index === 0 ? 'Strongest contact · closest to exact' : 'Also active'}
                        </span>
                      )}
                      <p class="today-lines__sentence">
                        {personalized.transits.transitLine(contact.transiting, contact.type, contact.natal)}
                      </p>
                    </li>
                  ))}
                </ol>
              ) : (
                <div class="today-quiet" data-today-quiet>
                  <p>
                    The {editionLabel} edition looks quieter against your chart. There is less pressure to act on
                    anything immediately.
                  </p>
                  {chartSunSign ? (
                    <section class="today-quiet__baseline" style={`--sign:${chartSunSign.hue}`}>
                      <p class="kicker">{chartSunSign.name} Sun-sign baseline</p>
                      <p>{editionSunSignLines[chartSunSign.slug]}</p>
                      <a href={`/horoscopes/${chartSunSign.slug}/`}>
                        Read the full {chartSunSign.name} horoscope <span aria-hidden="true">→</span>
                      </a>
                    </section>
                  ) : (
                    <div class="today-quiet__baseline">
                      <strong>What was checked</strong>
                      <p>No major contact falls within 3° of the valid points in this saved chart.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {livingChartEnabled && (
              <LivingReflection prompt={reflectionPrompt} />
            )}

            {livingForecast && LivingMomentCapture ? (
              <LivingMomentCapture
                chartLabel={personalized.chart.name || 'your chart'}
                forecast={livingForecast}
                reflectionQuestionId={reflectionPrompt?.id ?? 'reflection:notice.v1'}
                syncEnabled={livingChartSyncEnabled}
              />
            ) : livingChartEnabled ? (
              <div class="living-moment-slot" aria-hidden="true">
                <div class="living-moment-slot__fallback">
                  <button class="btn btn--primary">
                    <span>Save this moment</span>
                    <span class="orb">+</span>
                  </button>
                </div>
              </div>
            ) : null}

            <p class="today-private">
              {livingChartEnabled
                ? livingChartSyncEnabled
                  ? 'Saved moments start on this device. You decide separately whether to sync them with your account.'
                  : 'Saved moments stay on this device now. Existing account sync and privacy controls remain available from Profile.'
                : 'Your saved chart and this comparison stay in this browser.'}
            </p>
            <details class="today-method-details">
              <summary>How this was calculated</summary>
              <div class="today-method-details__body">
                <p>
                  We compare your {livingChartEnabled ? 'selected self chart' : 'latest saved chart'} with the day’s precomputed
                  planet positions. Active contacts are major aspects within 3° of exact. The
                  positions use a noon-UTC snapshot for the date shown.
                </p>
                {personalized.reading.contacts.length > 0 ? (
                  <ul>
                    {personalized.reading.contacts.map((contact) => (
                      <li key={`${contact.transiting}-${contact.type}-${contact.natal}`}>
                        {personalized.transits.contactReceipt(contact)}
                      </li>
                    ))}
                  </ul>
                ) : personalized.reading.nearest ? (
                  <p class="mono">Nearest contact: {personalized.transits.contactReceipt(personalized.reading.nearest)}</p>
                ) : null}
              </div>
            </details>
            {PushOptIn && <PushOptIn locale="en" context="today-return" />}
          </div>
        )}
      </div>
    </section>
  );
}
