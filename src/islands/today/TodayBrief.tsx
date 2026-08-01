import { useEffect, useMemo, useState } from 'preact/hooks';
import dailyData from '../../data/daily.json';
import { useProfile } from '../../lib/hooks/useProfile';
import { useTodayChart } from '../../lib/hooks/useTodayChart';
import { isTodayChartUsable } from '../../lib/profile/today-chart';
import { SIGNS, signForLongitude } from '../../lib/signs';
import {
  natalPointsForChart,
  nearestTodayContact,
  recordTodayOpen,
  selectTodayContacts,
  TODAY_STORAGE_KEY,
} from '../../lib/today';
import SunSignFallback from './SunSignFallback';
import { datedEditionText } from '../../lib/edition-freshness';

type PushOptInModule = typeof import('../PushOptIn');
type TransitsModule = typeof import('../../lib/transits');
type ComingUpModule = typeof import('./ComingUp');

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

const WEB_PUSH_ENABLED = import.meta.env.PUBLIC_WEB_PUSH_ENABLED === '1';

interface Props {
  sunSignLines: Record<string, string>;
}

export default function TodayBrief({ sunSignLines }: Props) {
  const { profile, ready } = useProfile();
  const { chart, selectChart } = useTodayChart(profile, ready);
  const [streak, setStreak] = useState<number | null>(null);
  const [pushModule, setPushModule] = useState<PushOptInModule | null>(null);
  const [transitsModule, setTransitsModule] = useState<TransitsModule | null>(null);
  const [transitsFailed, setTransitsFailed] = useState(false);
  const [chartAnnouncement, setChartAnnouncement] = useState('');
  const [comingUpModule, setComingUpModule] = useState<ComingUpModule | null>(null);

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

  useEffect(() => {
    if (!chart || comingUpModule) return undefined;
    let cancelled = false;
    const load = () => {
      void import('./ComingUp').then((module) => {
        if (!cancelled) setComingUpModule(module);
      }).catch(() => {});
    };
    const idleWindow = window as unknown as {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const requestIdle = idleWindow.requestIdleCallback;
    const cancelIdle = idleWindow.cancelIdleCallback;
    const handle = requestIdle
      ? requestIdle(load, { timeout: 1_500 })
      : window.setTimeout(load, 250);
    return () => {
      cancelled = true;
      if (requestIdle) cancelIdle?.(handle);
      else window.clearTimeout(handle);
    };
  }, [chart?.id, comingUpModule]);

  const selectableCharts = useMemo(
    () => profile.charts.filter(isTodayChartUsable),
    [profile.charts],
  );
  const ComingUp = comingUpModule?.default;
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
  const streakDisplay = streak !== null && streak > 999 ? '999+' : (streak ?? 1);
  const editionSunSignLines = useMemo(
    () => Object.fromEntries(Object.entries(sunSignLines).map(([sign, line]) => (
      [sign, datedEditionText(line, daily.date)]
    ))),
    [sunSignLines],
  );
  const editionLabel = dateLabel(daily.date);

  return (
    <section
      class="today-card shell tinted"
      style="--sign:var(--sign-cancer)"
      data-today-state={personalized ? 'chart' : ready && !chart ? 'empty' : 'sun-sign'}
    >
      <div class="today-card__core core tinted">
        <header class="today-card__head">
          <div>
            <p class="today-card__date">{dateLabel(daily.date)}</p>
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
            <span>{streak === null || streak === 1 ? 'day' : 'days'}</span>
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
                  aria-live="polite"
                >
                  {comparisonUnavailable
                    ? 'Your saved-chart comparison is temporarily unavailable. Your Sun-sign baseline is ready below.'
                    : null}
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
              <p class="today-private">
                Your saved chart stays in this browser. If you send “Ask why,” only the
                displayed receipt leaves it unless you separately attach placements.
              </p>
              <details class="today-method-details">
                <summary>How this comparison works</summary>
                <div class="today-method-details__body">
                  <p>
                    The saved-chart layer runs privately in this browser. If it cannot load,
                    the complete Sun-sign reading remains available here.
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
          </>
        ) : (
          <div
            class={`today-reading today-reading--resolved${personalized.reading.contacts.length > 0 ? ' today-reading--active' : ' today-reading--quiet'}`}
          >
              <div class="today-reading__head">
                <h2 aria-label={`For ${personalized.chart.name || 'your chart'}`}>
                  <span>For</span>{' '}
                <span
                  class="today-reading__chart-name"
                  title={personalized.chart.name || undefined}
                >
                  {personalized.chart.name || 'your chart'}
                </span>
              </h2>
              <p>A few themes from the {editionLabel} sky, compared with your saved birth chart.</p>
              {selectableCharts.length > 1 && (
                <label class="today-chart-picker">
                  <span>Today chart</span>
                  <select
                    value={personalized.chart.id}
                    onChange={(event) => {
                      const id = (event.currentTarget as HTMLSelectElement).value;
                      const selected = selectableCharts.find((candidate) => candidate.id === id);
                      if (selected && selectChart(id)) {
                        setChartAnnouncement(`Now reading ${selected.name || 'your chart'}.`);
                      }
                    }}
                  >
                    {selectableCharts.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>{candidate.name}</option>
                    ))}
                  </select>
                </label>
              )}
              <span class="sr-only" role="status" aria-live="polite">{chartAnnouncement}</span>
            </div>

            <div class="today-reading__body">
              {personalized.reading.contacts.length > 0 ? (
                <ol class="today-lines">
                  {personalized.reading.contacts.map((contact) => (
                    <li key={`${contact.transiting}-${contact.type}-${contact.natal}`}>
                      <p class="today-lines__sentence">
                        {personalized.transits.transitLine(contact.transiting, contact.type, contact.natal)}{' '}
                        <button
                          class="today-lines__ask"
                          type="button"
                          aria-label="Ask why this matters"
                          data-today-ask-evidence
                          data-evidence-date={daily.date}
                          data-evidence-transiting-body={contact.transiting}
                          data-evidence-aspect={contact.type}
                          data-evidence-natal-point={contact.natal}
                          data-evidence-orb={String(contact.orb)}
                          data-evidence-chart-id={personalized.chart.id}
                          data-evidence-question="Why does this matter for me?"
                        >
                          Ask why <span aria-hidden="true">→</span>
                        </button>
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

            <p class="today-private">
              Your saved chart stays in this browser. If you send “Ask why,” only the
              displayed receipt leaves it unless you separately attach placements.
            </p>
            <details class="today-coming-up today-method-details">
              <summary>
                <strong>Coming up</strong>
                <span class="today-coming-up__next">View dates</span>
              </summary>
              {ComingUp ? (
                <ComingUp
                  chart={personalized.chart}
                  contacts={personalized.reading.contacts}
                  nearest={personalized.reading.nearest}
                />
              ) : (
                <div class="today-coming-up__body">
                  <p class="today-coming-up__quiet">Preparing this timeline on your device…</p>
                </div>
              )}
            </details>
            {PushOptIn && <PushOptIn locale="en" context="today-return" />}
          </div>
        )}
      </div>
    </section>
  );
}
