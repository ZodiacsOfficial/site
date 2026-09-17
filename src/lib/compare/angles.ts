/**
 * Angular arithmetic for chart comparison. Longitudes live on a circle, so 359°
 * and 1° are two degrees apart, not 358. Getting this wrong is the single most
 * likely way a comparison tool reports a nonsense difference, so it lives in one
 * place with its own tests.
 */

/** Two values closer than this are the same number, not a difference. */
export const IDENTICAL_EPSILON = 1e-12;

/** The decimals these receipts carry, and the decimals the tables print. */
export const DISPLAYED_DECIMALS = 6;

/**
 * A value as the page prints it. The display verdict below is decided on these
 * strings rather than on a tolerance: rounding at a fixed number of decimals is
 * a step function, so no epsilon can stand in for it. Two values 8e-7 apart can
 * print identically and two values 2e-8 apart can print differently, and an
 * epsilon gets both of those backwards.
 */
export function displayed(value: number): string {
  return Number.isFinite(value) ? value.toFixed(DISPLAYED_DECIMALS) : String(value);
}

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
  return displayed(a) === displayed(b) ? 'display-only' : 'different';
}

/** The same separation for plain (non-circular) quantities such as latitude. */
export function compareScalars(a: number, b: number): NumericVerdict {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 'different';
  if (Math.abs(a - b) <= IDENTICAL_EPSILON) return 'identical';
  return displayed(a) === displayed(b) ? 'display-only' : 'different';
}

/**
 * A signed degree difference, written the way the tables show it. A difference
 * too small to survive six decimals is written in exponential form rather than
 * printed as a bare zero, so a row never claims a difference of 0.000000°.
 */
export function formatDelta(delta: number): string {
  if (!Number.isFinite(delta)) return '—';
  if (delta === 0) return '0.000000°';
  const sign = delta > 0 ? '+' : '−';
  const magnitude = Math.abs(delta);
  const fixed = magnitude.toFixed(DISPLAYED_DECIMALS);
  return `${sign}${Number(fixed) === 0 ? magnitude.toExponential(1) : fixed}°`;
}
