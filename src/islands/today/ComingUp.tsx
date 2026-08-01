import type { SavedChart } from '../../lib/profile/schema';
import { useYearAhead } from '../../lib/hooks/useYearAhead';
import type { TodayContact } from '../../lib/today';
import { selectComingUp, type YearAheadEvent } from '../../lib/year-ahead';

function upcomingDateLabel(event: YearAheadEvent): string {
  const date = new Date(event.at);
  if (Number.isNaN(date.getTime())) return event.at;
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function ComingUpGroup({ label, events }: { label: string; events: YearAheadEvent[] }) {
  if (events.length === 0) return null;
  return (
    <div class="today-coming-up__group">
      <h4>{label}</h4>
      <ol>
        {events.map((event) => (
          <li key={`${event.kind}-${event.at}-${event.receipt}`}>
            <time datetime={event.at}>{upcomingDateLabel(event)}</time>
            <p>{event.line}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function pointLabel(point: string): string {
  if (point === 'Ascendant') return 'ASC';
  if (point === 'Midheaven') return 'MC';
  return point;
}

function contactReceipt(contact: TodayContact): string {
  const moving = `${contact.transiting}${contact.transitingRetrograde ? ' Rx' : ''}`;
  const natal = `${pointLabel(contact.natal)}${contact.natalRetrograde ? ' Rx' : ''}`;
  return `${moving} ${contact.type} natal ${natal} · ${contact.orb.toFixed(1)}° from exact`;
}

interface Props {
  chart: SavedChart;
  contacts: TodayContact[];
  nearest: TodayContact | null;
}

export default function ComingUp({ chart, contacts, nearest }: Props) {
  const { timeline, busy } = useYearAhead(chart);
  const comingUp = selectComingUp(timeline, new Date());
  const firstEvent = comingUp.nextSevenDays[0]
    ?? comingUp.daysEightToThirty[0]
    ?? comingUp.nextLater;

  return (
    <div class="today-coming-up__body">
      <ComingUpGroup label="Next 7 days" events={comingUp.nextSevenDays} />
      <ComingUpGroup label="Days 8–30" events={comingUp.daysEightToThirty} />
      {comingUp.nextLater && (
        <ComingUpGroup label="Next later" events={[comingUp.nextLater]} />
      )}
      {!firstEvent && (
        <p class="today-coming-up__quiet">
          {busy
            ? 'Checking the next twelve months on this device…'
            : 'No major dated event is currently listed in the next 30 days.'}
        </p>
      )}
      <p class="today-coming-up__privacy">
        Calculated privately from the Today chart saved in this browser.
      </p>
      <div class="today-coming-up__method">
        <strong>How today was calculated</strong>
        <p>
          We compare the chart chosen for Today with the day’s precomputed planet positions.
          Active contacts are major aspects within 3° of exact; positions use a noon-UTC snapshot.
        </p>
        {contacts.length > 0 ? (
          <ul>
            {contacts.map((contact) => (
              <li key={`${contact.transiting}-${contact.type}-${contact.natal}`}>
                {contactReceipt(contact)}
              </li>
            ))}
          </ul>
        ) : nearest ? (
          <p class="mono">Nearest contact: {contactReceipt(nearest)}</p>
        ) : null}
      </div>
    </div>
  );
}
