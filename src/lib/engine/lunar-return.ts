import { bodyLongitude, computeChart } from './full';
import { findLongitudeCrossingsWith } from './longitude-crossings';
import type { Chart, ChartInput } from './types';

/** Explicit lunar scan constants; do not inherit the slow-body default step. */
export const LUNAR_RETURN_STEP_DAYS = 0.25;
export const LUNAR_RETURN_HORIZON_DAYS = 40;
export const LUNAR_RETURN_MIN_UTC = '1800-01-02T00:00:00.000Z';
export const LUNAR_RETURN_MAX_UTC = '2199-12-31T23:59:59.999Z';
export const LUNAR_RETURN_MAX_AFTER_UTC = '2199-11-21T23:59:59.999Z';

const DAY_MS = 86_400_000;
const MIN_MS = Date.parse(LUNAR_RETURN_MIN_UTC);
const MAX_MS = Date.parse(LUNAR_RETURN_MAX_UTC);
const MAX_AFTER_MS = Date.parse(LUNAR_RETURN_MAX_AFTER_UTC);

export interface LunarReturnLocation {
  latitude: number;
  longitude: number;
}

function validDate(date: Date, label: string): number {
  const milliseconds = date instanceof Date ? date.getTime() : NaN;
  if (!Number.isFinite(milliseconds)) throw new RangeError(`${label} must be a valid date.`);
  return milliseconds;
}

function validReference(afterUtc: Date): number {
  const after = validDate(afterUtc, 'The reference instant');
  if (after < MIN_MS || after > MAX_AFTER_MS) {
    throw new RangeError('The reference instant must allow a full 40-day scan within the supported dates.');
  }
  return after;
}

function validLocation(location: Partial<LunarReturnLocation>, label: string): LunarReturnLocation {
  const { latitude, longitude } = location;
  if (latitude == null || longitude == null
    || !Number.isFinite(latitude) || !Number.isFinite(longitude)
    || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new RangeError(`${label} needs valid latitude and longitude.`);
  }
  return { latitude, longitude };
}

function moonLongitude(date: Date): number {
  const longitude = bodyLongitude('Moon', date);
  if (!Number.isFinite(longitude) || longitude < 0 || longitude >= 360) {
    throw new RangeError('The Moon position could not be calculated.');
  }
  return longitude;
}

/**
 * First geocentric tropical Moon crossing in (afterUtc, afterUtc + 40 days].
 * `natalMoonLongitude` is a numeric longitude of date, without advancing the
 * natal frame or substituting phase/mean-period arithmetic. Date is numeric
 * transport; distant epochs do not carry an exact civil-UTC accuracy claim.
 */
export function lunarReturnInstant(natalMoonLongitude: number, afterUtc: Date): Date {
  if (!Number.isFinite(natalMoonLongitude)) throw new RangeError('The natal Moon longitude must be finite.');
  const after = validReference(afterUtc);
  const upper = after + LUNAR_RETURN_HORIZON_DAYS * DAY_MS;
  // Preserve an already-normalized natal value bit for bit: adding 360 can
  // round it slightly and break the exact birth/after identity at the start.
  const target = natalMoonLongitude >= 0 && natalMoonLongitude < 360
    ? natalMoonLongitude : ((natalMoonLongitude % 360) + 360) % 360;
  const crossings = findLongitudeCrossingsWith(
    (_body, date) => moonLongitude(date),
    'Moon', target, new Date(after), new Date(upper), LUNAR_RETURN_STEP_DAYS,
  );
  if (crossings.some((crossing) => !Number.isFinite(crossing.at.getTime()) || crossing.retrograde)) {
    throw new RangeError('The Moon crossing could not be calculated.');
  }
  const instants = [...new Set(crossings.map((crossing) => crossing.at.getTime()))]
    .filter((instant) => instant > after && instant <= upper)
    .sort((a, b) => a - b);
  if (!instants.length) throw new RangeError('No lunar return was found in the 40-day scan.');
  return new Date(instants[0]);
}

/**
 * Derive the target from complete resolved natal input and cast its next
 * return. The caller owns IANA resolution and must pass its flags; folds,
 * gaps, unknown time and missing place are rejected, including noon caches.
 * Location changes the returned houses/angles, never the geocentric event.
 */
export function lunarReturnChart(
  natal: ChartInput,
  afterUtc: Date,
  location?: LunarReturnLocation,
): Chart {
  if (natal.timeKnown !== true || natal.flags?.some((flag) =>
    flag === 'no-time' || flag === 'dst-gap' || flag === 'dst-fold')) {
    throw new RangeError('A known, unambiguous birth time is required for a lunar return.');
  }
  const birth = validDate(natal.utc, 'The birth instant');
  const after = validReference(afterUtc);
  if (birth < MIN_MS || birth > MAX_MS || birth > after) {
    throw new RangeError('The birth instant must be within the supported dates and no later than the reference.');
  }
  const birthplace = validLocation(natal, 'The birthplace');
  const castLocation = validLocation(location ?? birthplace, 'The return location');
  if (natal.houseSystem !== 'whole' && natal.houseSystem !== 'placidus') {
    throw new RangeError('Choose a supported house system.');
  }
  const utc = lunarReturnInstant(moonLongitude(new Date(birth)), new Date(after));
  return computeChart({ utc, ...castLocation, houseSystem: natal.houseSystem, timeKnown: true });
}
