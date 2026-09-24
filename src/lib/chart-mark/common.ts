/**
 * Chart marks: small pictures drawn from a chart's own saved longitudes,
 * used where a profile picture would go. Nothing here reads a birth date,
 * time, or place, loads the ephemeris, or touches the network — a mark is
 * arithmetic over the placements a saved chart already carries.
 *
 * This module is what every consumer shares, including the navigation
 * script, so it stays free of the sign table and its locale imports. The
 * hues and slugs mirror src/lib/signs.ts and the --sign-* tokens; a unit
 * test pins them.
 */

export const MARK_SIGN_HUES = [
  '#DE8E79', '#B9D4BE', '#B29DD0', '#B6D4E4', '#E0A9B4', '#B7D9B0',
  '#D3A9DE', '#B9DCE8', '#E0B080', '#C0DEA8', '#AE8FC9', '#A9D4C4',
] as const;

export const MARK_SIGN_SLUGS = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
] as const;

export type MarkSignSlug = (typeof MARK_SIGN_SLUGS)[number];

/** Void and ink values from src/styles/tokens.css, for standalone SVG. */
export const MARK_VOID = '#0A0C11';
export const MARK_INK = '#EEF1F7';
/** A placement whose sign the chart cannot settle is drawn in quiet ink. */
export const MARK_UNSETTLED = '#8E96AB';

/** Saved-chart shape a mark needs: longitudes only. */
export interface ChartMarkSource {
  bodies: readonly { body: string; lon: number }[];
  /** Ascendant longitude; null when the birth time is unknown. */
  asc: number | null;
  /** False for a reference-time chart (birth time unknown). */
  timeKnown: boolean;
}

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

export function signIndexForMark(lon: number): number {
  return Math.min(11, Math.floor(normalizeLongitude(lon) / 30));
}

/**
 * The sign index a mark may colour this body with, or null when the chart
 * cannot settle it. Known-time charts always settle. Without a birth time
 * the Moon never does (it crosses a whole sign in about two and a half
 * days), and other bodies do only when a full day's motion keeps them in
 * the same sign.
 */
export function settledSignIndex(body: string, lon: number, timeKnown: boolean): number | null {
  if (!Number.isFinite(lon)) return null;
  const index = signIndexForMark(lon);
  if (timeKnown) return index;
  const reach = DAILY_REACH[body];
  if (reach === undefined) return null;
  const within = normalizeLongitude(lon) - index * 30;
  return within >= reach && 30 - within >= reach ? index : null;
}

/** The Sun's sign slug when the chart settles it, else null. */
export function settledSunSlug(source: ChartMarkSource | null): MarkSignSlug | null {
  const sun = source?.bodies.find((row) => row.body === 'Sun');
  if (!sun) return null;
  const index = settledSignIndex('Sun', sun.lon, source!.timeKnown);
  return index === null ? null : MARK_SIGN_SLUGS[index];
}

const round = (value: number): number => Math.round(value * 100) / 100;

/**
 * The wheel's own convention (src/lib/wheel/Wheel.tsx): the anchor sits at
 * nine o'clock and longitude runs counter-clockwise, in a 100-unit box.
 */
export function markPoint(lon: number, anchor: number, radius: number): { x: number; y: number } {
  const phi = ((180 + (lon - anchor)) * Math.PI) / 180;
  return { x: round(50 + radius * Math.cos(phi)), y: round(50 - radius * Math.sin(phi)) };
}
