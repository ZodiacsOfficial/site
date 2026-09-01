/**
 * Which monthly horoscope edition a build displays.
 *
 * Entries accumulate as YYYY-MM-{sign}.mdx and may be written ahead of time
 * (the month after next is prepared on the 26th). The edition shown is the
 * latest month that is not after the committed daily edition's month (the
 * freshness gate keeps that equal to the current UTC month), so a prepared future
 * month sits inert in the repository until its first day, when that day's
 * daily publication (whose date anchors the selection) makes it current. Every
 * site that picks "the current month" — the monthly route, the locale slug
 * routes, the sitemap, the assistant site guide, and the freshness gate —
 * goes through this one function so they can never disagree.
 */

/**
 * `YYYY-MM` of a clock value in UTC.
 * @param {Date | string | number} [now] a Date, an ISO string such as a daily edition date, or epoch milliseconds
 * @returns {string}
 */
export function utcMonth(now = new Date()) {
  const date = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(date.getTime())) throw new Error(`invalid clock value: ${String(now)}`);
  return date.toISOString().slice(0, 7);
}

/**
 * The latest month in `months` (each `YYYY-MM`) that is not after
 * `currentMonth`, or `undefined` when every entry lies in the future.
 * @param {readonly string[]} months
 * @param {string} currentMonth
 * @returns {string | undefined}
 */
export function currentHoroscopeMonth(months, currentMonth) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(currentMonth))) {
    throw new Error(`current month must be YYYY-MM, received ${String(currentMonth)}`);
  }
  return [...new Set(months)]
    .filter((month) => typeof month === 'string' && month <= currentMonth)
    .sort()
    .at(-1);
}
