import type { BodyName, BodyPosition } from './engine/types';
import { signForLongitude } from './signs';
import { resolveLocalToUtc } from './time/localToUtc';

export interface LocalDateEndpoints {
  start: Date;
  end: Date;
}

function nextIsoDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}

/**
 * The first and final instants of an IANA-zone civil date.
 *
 * Resolving the following midnight and subtracting one millisecond keeps the
 * interval end-exclusive without assuming a civil day is always 24 hours.
 */
export function localDateEndpointsUtc(date: string, timeZone: string): LocalDateEndpoints {
  const start = resolveLocalToUtc(date, '00:00', timeZone).utc;
  const nextStart = resolveLocalToUtc(nextIsoDate(date), '00:00', timeZone).utc;
  return { start, end: new Date(nextStart.getTime() - 1) };
}

/**
 * The body's sign when it is provably stable across the supplied local date.
 * Missing engine positions fail closed so a singular record is never inferred
 * from incomplete evidence.
 */
export function stableBodySignSlug(
  body: BodyName,
  startBodies: readonly BodyPosition[],
  endBodies: readonly BodyPosition[],
): string | null {
  const start = startBodies.find((position) => position.body === body);
  const end = endBodies.find((position) => position.body === body);
  if (!start || !end) return null;
  const startSlug = signForLongitude(start.lon).slug;
  return startSlug === signForLongitude(end.lon).slug ? startSlug : null;
}

export function bodySignIsAmbiguous(
  body: BodyName,
  startBodies: readonly BodyPosition[],
  endBodies: readonly BodyPosition[],
): boolean {
  return stableBodySignSlug(body, startBodies, endBodies) === null;
}
