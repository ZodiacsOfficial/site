/**
 * The smallest interval arithmetic this package needs, and nothing more.
 *
 * Every operation returns an interval that CONTAINS the true result. The
 * endpoints are computed in ordinary double arithmetic rather than with
 * directed rounding, which JavaScript does not offer, so each result is
 * then widened by a relative slack of a few units in the last place. That
 * slack is stated rather than hidden: it is `PAD` below, and it is many
 * orders of magnitude smaller than the Chebyshev evaluation allowances
 * these intervals are combined with, so it never decides anything.
 *
 * Environment-neutral: no `node:` imports, no clock.
 */
import { fail } from './errors.mjs';
import { UNIT_ROUNDOFF } from './cheb.mjs';

/** Relative widening applied after every operation, covering the missing directed rounding. */
export const PAD = 8 * UNIT_ROUNDOFF;

const widen = (lo, hi) => ({
  lo: lo - Math.abs(lo) * PAD,
  hi: hi + Math.abs(hi) * PAD,
});

/** An interval from two numbers, in either order. */
export const iv = (a, b = a) => widen(Math.min(a, b), Math.max(a, b));
/** A point, widened by a stated absolute allowance. */
export const around = (x, allowance) => widen(x - Math.abs(allowance), x + Math.abs(allowance));

export const add = (a, b) => widen(a.lo + b.lo, a.hi + b.hi);
export const sub = (a, b) => widen(a.lo - b.hi, a.hi - b.lo);
export const neg = (a) => ({ lo: -a.hi, hi: -a.lo });

export function mul(a, b) {
  const p = [a.lo * b.lo, a.lo * b.hi, a.hi * b.lo, a.hi * b.hi];
  return widen(Math.min(...p), Math.max(...p));
}

export function scale(a, s) {
  return s >= 0 ? widen(a.lo * s, a.hi * s) : widen(a.hi * s, a.lo * s);
}

/** Refuses a denominator that straddles zero: there is no finite enclosure. */
export function div(a, b) {
  if (b.lo <= 0 && b.hi >= 0) {
    fail('enclosure-too-weak', `a denominator interval [${b.lo}, ${b.hi}] contains zero, so the quotient has no finite bound`, { denominator: b });
  }
  return mul(a, widen(1 / b.hi, 1 / b.lo));
}

/** The largest |x| over the interval. */
export const mag = (a) => Math.max(Math.abs(a.lo), Math.abs(a.hi));
/** The smallest |x| over the interval; zero when it straddles. */
export const mig = (a) => (a.lo <= 0 && a.hi >= 0 ? 0 : Math.min(Math.abs(a.lo), Math.abs(a.hi)));
export const width = (a) => a.hi - a.lo;
export const contains = (outer, inner) => inner.lo >= outer.lo && inner.hi <= outer.hi;
export const hull = (a, b) => (a === null ? b : widen(Math.min(a.lo, b.lo), Math.max(a.hi, b.hi)));

// ------------------------------------------------------------- 3-vectors
export const vAdd = (a, b) => [add(a[0], b[0]), add(a[1], b[1]), add(a[2], b[2])];
export const vSub = (a, b) => [sub(a[0], b[0]), sub(a[1], b[1]), sub(a[2], b[2])];
export const vScale = (a, s) => [scale(a[0], s), scale(a[1], s), scale(a[2], s)];
/** Componentwise multiply by one interval scalar. */
export const vMulI = (a, s) => [mul(a[0], s), mul(a[1], s), mul(a[2], s)];
export const vHull = (a, b) => (a === null ? b : [hull(a[0], b[0]), hull(a[1], b[1]), hull(a[2], b[2])]);
export const dot = (a, b) => add(add(mul(a[0], b[0]), mul(a[1], b[1])), mul(a[2], b[2]));

/** [min |v|, max |v|] over the vector interval. Both ends are true. */
export function norm(v) {
  const hi = Math.hypot(mag(v[0]), mag(v[1]), mag(v[2]));
  const lo = Math.hypot(mig(v[0]), mig(v[1]), mig(v[2]));
  // Math.hypot is not correctly rounded and differs between engines, so the
  // result is widened outward by a whole part in 1e-12 rather than by PAD.
  return { lo: lo * (1 - 1e-12), hi: hi * (1 + 1e-12) };
}

/** The largest |v| a vector interval allows, as a plain number. */
export const vMag = (v) => norm(v).hi;
