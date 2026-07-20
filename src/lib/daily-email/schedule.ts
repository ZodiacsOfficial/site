export interface LocalDeliveryTime {
  date: string;
  hour: number;
  timezone: string;
  usedUtcFallback: boolean;
}
const DATE_FORMATTERS = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timezone: string): Intl.DateTimeFormat {
  const cached = DATE_FORMATTERS.get(timezone);
  if (cached) return cached;
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  });
  DATE_FORMATTERS.set(timezone, formatter);
  return formatter;
}

function validTimezone(timezone: string): boolean {
  try {
    formatterFor(timezone).format(new Date(0));
    return true;
  } catch {
    return false;
  }
}

export function localDeliveryTime(at: Date, requestedTimezone: string | null | undefined): LocalDeliveryTime {
  if (Number.isNaN(at.getTime())) throw new Error('Daily email send time is invalid.');
  const requested = typeof requestedTimezone === 'string' ? requestedTimezone.trim() : '';
  const timezone = requested && validTimezone(requested) ? requested : 'UTC';
  const fields = new Map(
    formatterFor(timezone)
      .formatToParts(at)
      .map((part) => [part.type, part.value]),
  );
  const year = fields.get('year');
  const month = fields.get('month');
  const day = fields.get('day');
  const hour = Number(fields.get('hour'));
  if (!year || !month || !day || !Number.isInteger(hour)) {
    throw new Error(`Could not resolve local delivery time for ${timezone}.`);
  }
  return {
    date: `${year}-${month}-${day}`,
    hour,
    timezone,
    usedUtcFallback: timezone === 'UTC' && requested !== 'UTC',
  };
}

/**
 * A recipient enters the cohort once their local clock reaches 07:00.
 * Later hours remain eligible so a held edition can send after it is safely
 * published. The receipt primary key prevents a second send that day.
 */
export function isDailyEmailDue(
  editionDate: string,
  at: Date,
  timezone: string | null | undefined,
): boolean {
  const local = localDeliveryTime(at, timezone);
  return local.date === editionDate && local.hour >= 7;
}
