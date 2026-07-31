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
  type TodayContact,
} from '../../lib/today';
import SunSignFallback from './SunSignFallback';

type PushOptInModule = typeof import('../PushOptIn');
type TransitsModule = typeof import('../../lib/transits');

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

function longitudeLabel(lon: number): string {
  const sign = signForLongitude(lon);
  const degree = ((lon % 30) + 30) % 30;
  return `${degree.toFixed(1)}° ${sign.name}`;
}

function pointLabel(point: string): string {
  if (point === 'Ascendant') return 'ASC';
  if (point === 'Midheaven') return 'MC';
  return point;
}

function contactReceipt(contact: TodayContact): string {
  const moving = `${contact.transiting}${contact.transitingRetrograde ? ' Rx' : ''}`;
  const natal = `${pointLabel(contact.natal)}${contact.natalRetrograde ? ' Rx' : ''}`;
  return [
    `${moving} ${longitudeLabel(contact.transitingLon)}`,
    `${contact.type} natal ${natal} ${longitudeLabel(contact.natalLon)}`,
    `${contact.orb.toFixed(1)}° from exact`,
  ].join(' · ');
}

const WEB_PUSH_ENABLED = import.meta.env.PUBLIC_WEB_PUSH_ENABLED === '1';

interface Props {
  sunSignLines: Record<string, string>;
}

export default function TodayBrief({ sunSignLines }: Props) {
  const { profile, ready } = useProfile();
  const [streak, setStreak] = useState<number | null>(null);
  const [pushModule, setPushModule] = useState<PushOptInModule | null>(null);
  const [transitsModule, setTransitsModule] = useState<TransitsModule | null>(null);
  const [transitsFailed, setTransitsFailed] = useState(false);

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

  const chart = useMemo(() => newestSavedChart(profile), [profile]);
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
            <p class="today-card__time">Private, local-first daily astrology</p>
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
                <p>Today’s sky, compared with the latest chart saved on this device.</p>
              </div>
              <div class="today-reading__body today-reading__body--fallback">
                <p
                  class={`today-returning-chart-status${comparisonUnavailable ? ' is-visible' : ''}`}
                  aria-hidden={comparisonUnavailable ? undefined : 'true'}
                >
                  Your saved-chart comparison is temporarily unavailable. Your daily horoscope links are ready below.
                </p>
                <nav class="today-returning-sign-links" aria-label="Open a Sun-sign horoscope">
                  {SIGNS.map((sign) => <a href={`/horoscopes/${sign.slug}/`}>{sign.name}</a>)}
                </nav>
              </div>
              <p class="today-private">
                Your saved chart and this comparison stay in this browser.
              </p>
              <details class="today-method-details">
                <summary>How this comparison works</summary>
                <div class="today-method-details__body">
                  <p>
                    The saved-chart layer runs privately in this browser. If it cannot load,
                    links to the complete Sun-sign horoscopes remain available here.
                  </p>
                </div>
              </details>
            </div>
            <SunSignFallback
              noChartConfirmed={ready && !chart}
              comparisonUnavailable={comparisonUnavailable}
              sunSignLines={sunSignLines}
            />
          </>
        ) : (
          <div
            class={`today-reading today-reading--resolved${personalized.reading.contacts.length > 0 ? ' today-reading--active' : ' today-reading--quiet'}`}
          >
            <div class="today-reading__head">
              <h2 aria-label={`For ${personalized.chart.name || 'your latest chart'}`}>
                <span>For</span>{' '}
                <span
                  class="today-reading__chart-name"
                  title={personalized.chart.name || undefined}
                >
                  {personalized.chart.name || 'your latest chart'}
                </span>
              </h2>
              <p>A few themes from today’s sky, compared with your saved birth chart.</p>
            </div>

            <div class="today-reading__body">
              {personalized.reading.contacts.length > 0 ? (
                <ol class="today-lines">
                  {personalized.reading.contacts.map((contact) => (
                    <li key={`${contact.transiting}-${contact.type}-${contact.natal}`}>
                      <p class="today-lines__sentence">
                        {personalized.transits.transitLine(contact.transiting, contact.type, contact.natal)}
                      </p>
                    </li>
                  ))}
                </ol>
              ) : (
                <div class="today-quiet" data-today-quiet>
                  <p>
                    Today looks quieter against your chart. There is less pressure to act on
                    anything immediately.
                  </p>
                  {chartSunSign ? (
                    <section class="today-quiet__baseline" style={`--sign:${chartSunSign.hue}`}>
                      <p class="kicker">{chartSunSign.name} Sun-sign baseline</p>
                      <p>{sunSignLines[chartSunSign.slug]}</p>
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
              Your saved chart and this comparison stay in this browser.
            </p>
            <details class="today-method-details">
              <summary>How this was calculated</summary>
              <div class="today-method-details__body">
                <p>
                  We compare the latest chart saved on this device with the day’s precomputed
                  planet positions. Active contacts are major aspects within 3° of exact. The
                  positions use a noon-UTC snapshot for the date shown.
                </p>
                {personalized.reading.contacts.length > 0 ? (
                  <ul>
                    {personalized.reading.contacts.map((contact) => (
                      <li key={`${contact.transiting}-${contact.type}-${contact.natal}`}>
                        {contactReceipt(contact)}
                      </li>
                    ))}
                  </ul>
                ) : personalized.reading.nearest ? (
                  <p class="mono">Nearest contact: {contactReceipt(personalized.reading.nearest)}</p>
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
