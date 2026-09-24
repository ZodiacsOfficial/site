/**
 * Which sign a saved chart's placement is in, stated only as far as the
 * chart settles it. Nothing here reads a birth date, time, or place, loads
 * the ephemeris, or touches the network: it is arithmetic over the
 * longitudes a saved chart or a received card already carries.
 *
 * The hues mirror src/lib/signs.ts and the --sign-* tokens without importing
 * the sign table. The navigation's inline script keeps its own copy of the
 * hues and of the settle rule; a unit test pins all three together.
 */

export const SIGN_HUES = [
  '#DE8E79', '#B9D4BE', '#B29DD0', '#B6D4E4', '#E0A9B4', '#B7D9B0',
  '#D3A9DE', '#B9DCE8', '#E0B080', '#C0DEA8', '#AE8FC9', '#A9D4C4',
] as const;

/**
 * The most a body can move in one day, in degrees. With no birth time the
 * saved positions are a reference moment on the birth date, so a body this
 * close to a sign boundary may have been in the neighbouring sign at the
 * actual birth.
 */
const DAILY_REACH: Record<string, number> = {
  Sun: 1.02,
  Mercury: 2.2,
  Venus: 1.26,
  Mars: 0.8,
  Jupiter: 0.25,
  Saturn: 0.14,
  Uranus: 0.07,
  Neptune: 0.04,
  Pluto: 0.04,
};

export function normalizeLongitude(lon: number): number {
  return ((lon % 360) + 360) % 360;
}

export function signIndexOf(lon: number): number {
  return Math.min(11, Math.floor(normalizeLongitude(lon) / 30));
}

/**
 * The sign index this body can be stated in, or null when the chart cannot
 * settle it. Known-time charts always settle. Without a birth time the
 * Moon never does (it crosses a whole sign in about two and a half days),
 * and other bodies do only when a full day's motion keeps them in the same
 * sign.
 */
export function settledSignIndex(body: string, lon: number, timeKnown: boolean): number | null {
  if (!Number.isFinite(lon)) return null;
  const index = signIndexOf(lon);
  if (timeKnown) return index;
  const reach = DAILY_REACH[body];
  if (reach === undefined) return null;
  const within = normalizeLongitude(lon) - index * 30;
  return within >= reach && 30 - within >= reach ? index : null;
}

/** The Sun sign's hue when the chart settles that sign, else null. */
export function settledSunHue(
  bodies: readonly { body: string; lon: number }[],
  timeKnown: boolean,
): string | null {
  const sun = bodies.find((row) => row.body === 'Sun');
  const index = sun ? settledSignIndex('Sun', sun.lon, timeKnown) : null;
  return index === null ? null : SIGN_HUES[index];
}
