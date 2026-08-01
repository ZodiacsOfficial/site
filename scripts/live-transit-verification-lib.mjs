export const RENDERED_TRANSIT_PATHS = [
  '/transits/',
  '/es/transits/',
  '/fr/transits/',
  '/it/transits/',
  '/pt/transits/',
];

const TRANSIT_MONTH = /^\d{4}-(?:0[1-9]|1[0-2])$/u;
const EDITION_DAY = /^\d{4}-\d{2}-\d{2}$/u;
const FALSE_OUTAGE_COPY = 'saved-chart comparison is temporarily unavailable';

function isRealUtcDay(value) {
  if (!EDITION_DAY.test(value ?? '')) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function attributeValues(html, attribute) {
  const expression = new RegExp(`\\b${attribute}=(?:"([^"]*)"|'([^']*)')`, 'gu');
  return [...html.matchAll(expression)].map((match) => match[1] ?? match[2]);
}

/** Assert the machine-readable contract emitted by a rendered transit page. */
export function assertRenderedCurrentTransit(html, expectedMonth, path = '/transits/') {
  if (!TRANSIT_MONTH.test(expectedMonth)) {
    throw new TypeError(`Invalid expected transit month: ${expectedMonth}`);
  }

  const months = attributeValues(html, 'data-transit-month');
  const statuses = attributeValues(html, 'data-transit-status');
  if (months.length !== 1) {
    throw new Error(`${path}: expected one rendered transit month, found ${months.length}`);
  }
  if (statuses.length !== 1) {
    throw new Error(`${path}: expected one rendered transit status, found ${statuses.length}`);
  }
  if (months[0] !== expectedMonth) {
    throw new Error(`${path}: rendered transit month is ${months[0]}, expected ${expectedMonth}`);
  }
  if (statuses[0] !== 'current') {
    throw new Error(`${path}: rendered transit status is ${statuses[0]}, expected current`);
  }
}

/** Assert the flagship daily page is current and does not advertise a false outage. */
export function assertRenderedToday(html, expectedDay, path = '/today/') {
  if (!isRealUtcDay(expectedDay)) throw new TypeError(`Invalid expected edition day: ${expectedDay}`);
  const days = attributeValues(html, 'data-daily-date');
  if (days.length !== 1) {
    throw new Error(`${path}: expected one rendered daily edition, found ${days.length}`);
  }
  if (days[0] !== expectedDay) {
    throw new Error(`${path}: rendered daily edition is ${days[0]}, expected ${expectedDay}`);
  }
  if (html.toLocaleLowerCase('en').includes(FALSE_OUTAGE_COPY)) {
    throw new Error(`${path}: rendered HTML advertises a saved-chart outage`);
  }
}

/** Keep a committed publication inseparable from the workflow's UTC target. */
export function assertExactPublicationDate(manifestDay, targetDay) {
  if (!isRealUtcDay(targetDay)) throw new TypeError(`Invalid target UTC day: ${targetDay}`);
  if (!isRealUtcDay(manifestDay)) throw new TypeError(`Invalid manifest UTC day: ${manifestDay}`);
  if (manifestDay !== targetDay) {
    throw new Error(`committed publication date is ${manifestDay}, expected UTC target ${targetDay}`);
  }
}
