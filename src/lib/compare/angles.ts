/**
 * Angular arithmetic for chart comparison. Longitudes live on a circle, so 359°
 * and 1° are two degrees apart, not 358. Getting this wrong is the single most
 * likely way a comparison tool reports a nonsense difference, so it lives in one
 * place with its own tests.
 */

/** Two values closer than this are the same number, not a difference. */
export const IDENTICAL_EPSILON = 1e-12;

/**
 * Below this, a difference is explainable by rounding at the six decimal places
 * these receipts display, rather than by a different calculation. Reporting it
 * as a numerical difference would be misleading.
 */
export const DISPLAY_EPSILON = 5e-7;

/**
 * Signed shortest rotation from `a` to `b`, in (-180, 180]. Positive means `b`
 * is ahead of `a` in increasing longitude.
 */
export function circularDelta(a: number, b: number): number {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return Number.NaN;
  const wrapped = (((b - a) % 360) + 540) % 360 - 180;
  // ((-180) % 360 + 540) % 360 - 180 lands on -180; prefer the positive twin so
  // an exactly opposite pair reads the same whichever side is given first.
  return wrapped === -180 ? 180 : wrapped;
}

/** Unsigned shortest separation, in [0, 180]. */
export function circularDistance(a: number, b: number): number {
  return Math.abs(circularDelta(a, b));
}

export type NumericVerdict = 'identical' | 'display-only' | 'different';

/** How two angular values relate, separating a real difference from rounding. */
export function compareAngles(a: number, b: number): NumericVerdict {
  const distance = circularDistance(a, b);
  if (!Number.isFinite(distance)) return 'different';
  if (distance <= IDENTICAL_EPSILON) return 'identical';
  return distance < DISPLAY_EPSILON ? 'display-only' : 'different';
}

/** The same separation for plain (non-circular) quantities such as latitude. */
export function compareScalars(a: number, b: number): NumericVerdict {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return a === b ? 'identical' : 'different';
  const distance = Math.abs(a - b);
  if (distance <= IDENTICAL_EPSILON) return 'identical';
  return distance < DISPLAY_EPSILON ? 'display-only' : 'different';
}

/** A signed degree difference, written the way the tables show it. */
export function formatDelta(delta: number): string {
  if (!Number.isFinite(delta)) return '—';
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : '';
  return `${sign}${Math.abs(delta).toFixed(6)}°`;
}
