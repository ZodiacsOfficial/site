/**
 * Whether a record's civil-day bounds span one complete local day: between
 * 23 and 25 hours (a clock change can shorten or lengthen the day) and not
 * the UTC-day stand-in compute-astro.mjs uses when no zone resolves, which
 * ends at 23:59:59.999Z.
 *
 * A real local midnight can fall at any UTC time, 23:59 included. Before
 * standard time a birthplace kept its own mean time, so Honfleur (0.23° E)
 * began its days at 23:59:04 UTC and Seville (6.00° W) at 00:23:59 UTC.
 */
const UTC_DAY_STAND_IN_END = /T23:59:59\.999Z$/u;
const HOUR = 3_600_000;

export function completeCivilDay(startUtc, endUtc) {
  const start = Date.parse(startUtc);
  const end = Date.parse(endUtc);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
  const span = end - start;
  return span >= 23 * HOUR && span <= 25 * HOUR && !UTC_DAY_STAND_IN_END.test(endUtc);
}
