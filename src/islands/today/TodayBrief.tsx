import { useEffect, useMemo, useState } from 'preact/hooks';
import dailyData from '../../data/daily.json';
import { useProfile } from '../../lib/hooks/useProfile';
import { signForLongitude } from '../../lib/signs';
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

  useEffect(() => {
    let returning = false;
    try {
      returning = window.localStorage.getItem(TODAY_STORAGE_KEY) !== null;
    } catch {
      returning = false;
    }
    setStreak(recordTodayOpen(window.localStorage).count);
    void import('../../lib/transits').then(setTransitsModule).catch(() => {});
    if (returning && WEB_PUSH_ENABLED) {
      void import('../PushOptIn').then(setPushModule).catch(() => {});
    }
    (window as Window & {
      zodiacsAnalytics?: { track?: (name: string, properties: Record<string, never>) => void };
    }).zodiacsAnalytics?.track?.('today_view', {});
  }, []);

  const chart = useMemo(() => newestSavedChart(profile), [profile]);
  const PushOptIn = pushModule?.default;
  const reading = useMemo(() => {
    if (!chart || !transitsModule) return null;
    const natal = natalPointsForChart(chart);
    return {
      contacts: selectTodayContacts(natal, daily.bodies, transitsModule.TRANSIT_ORB, 3),
      nearest: nearestTodayContact(natal, daily.bodies),
    };
  }, [chart, transitsModule]);
  const personalized = ready && chart && reading && transitsModule
    ? { chart, reading, transits: transitsModule }
    : null;

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
          {streak !== null && (
            <p class="today-streak" aria-label={`${streak} day streak`}>
              <strong class="today-streak__count">{streak}</strong>
              <span>{streak === 1 ? 'day' : 'days'}</span>
            </p>
          )}
        </header>

        {!personalized ? (
          <SunSignFallback noChartConfirmed={ready && !chart} sunSignLines={sunSignLines} />
        ) : (
          <div class="today-reading">
            <div class="today-reading__head">
              <h2>For {personalized.chart.name || 'your latest chart'}</h2>
              <p>A few themes from today’s sky, compared with your saved birth chart.</p>
            </div>

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
              </div>
            )}

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
