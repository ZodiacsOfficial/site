/**
 * Stellar (annual) aberration: the pointwise observer-motion transformation.
 *
 * ## What this is, exactly
 *
 * Given the NATURAL direction to a source -- the unit vector along
 * r_target(t - tau) - r_observer(t), i.e. light-time already applied -- and
 * the observer's barycentric velocity at RECEPTION time t, this returns the
 * PROPER direction: where the source is seen from a moving observer.
 *
 *     pdv = pnat . v
 *     w1  = 1 + pdv / (1 + bm1)
 *     p   = pnat * bm1 + w1 * v                (+ the potential term, below)
 *     ppr = p / |p|
 *
 * with `v` the observer velocity in units of c and `bm1 = sqrt(1 - |v|^2)`,
 * the reciprocal Lorentz factor. This is Expr. (7.40) of the Explanatory
 * Supplement (Urban & Seidelmann 2013), normalized rigorously.
 *
 * ## Relationship to the two implementations that already exist
 *
 * ERFA's `eraAb` (pinned: liberfa/erfa src/ab.c, revision 2021-02-24,
 * sha256 ff4bac5fc8a2ccb5...) computes
 *
 *     p_i = pnat_i * bm1 + w1 * v_i + w2 * (v_i - pdv * pnat_i),  w2 = SRS/s
 *
 * The extra `w2` term is the Klioner (2003) solar gravitational-potential
 * contribution, which ERFA's own note bounds at about 0.4 microarcsecond.
 * `withPotential` below reproduces it exactly, so a comparison against ERFA
 * can either match it or account for it; it is OFF by default, because this
 * operation's contract omits gravitational terms and a silent 0.4 uas is
 * still a silent term.
 *
 * This package's `reduce.mjs` computes, for `aberration: 'full'`,
 *
 *     r_i = (bm1 * p_i + w1 * v_i) / (1 + pdv)   then   unit(r)
 *
 * The division by `(1 + pdv)` is a uniform POSITIVE scale -- 1 + pdv > 0 for
 * any |v| < 1 -- and `unit()` removes it. So that routine is this one with
 * `withPotential: false`, not a different model, and
 * `aberration.nodetest.mjs` asserts the two agree to the last bit on random
 * inputs rather than leaving the claim to this comment.
 *
 * ## Domain
 *
 * The transformation is defined when |v| < 1 (subluminal) and |pnat| > 0.
 * `1 + bm1 > 0` follows from |v| < 1, and `|p| > 0` is checked rather than
 * assumed: it is the denominator of the normalization.
 */
import { fail } from './errors.mjs';

/** Schwarzschild radius of the Sun divided by the au. ERFA_SRS. */
export const SRS = 1.97412574336e-8;

/**
 * Apply aberration to a natural direction.
 *
 * @param {number[]} pnat  natural direction; need not be a unit vector
 * @param {number[]} v     observer barycentric velocity in units of c
 * @param {{withPotential?: boolean, sunDistanceAu?: number}} [opts]
 * @returns {number[]} the proper direction, as a unit vector
 */
export function aberrate(pnat, v, opts = {}) {
  const { withPotential = false, sunDistanceAu = null } = opts;
  const pn2 = pnat[0] * pnat[0] + pnat[1] * pnat[1] + pnat[2] * pnat[2];
  if (!(pn2 > 0)) fail('bad-geometry', 'aberration needs a non-zero natural direction');
  const pl = Math.sqrt(pn2);
  const p0 = [pnat[0] / pl, pnat[1] / pl, pnat[2] / pl];

  const v2 = v[0] * v[0] + v[1] * v[1] + v[2] * v[2];
  if (!(v2 < 1)) {
    fail('bad-geometry', `aberration needs a subluminal observer: |v|/c = ${Math.sqrt(v2)}`);
  }
  const bm1 = Math.sqrt(1 - v2);
  const pdv = p0[0] * v[0] + p0[1] * v[1] + p0[2] * v[2];
  const w1 = 1 + pdv / (1 + bm1);

  let w2 = 0;
  if (withPotential) {
    if (!(sunDistanceAu > 0)) {
      fail('unsupported-option', 'the gravitational-potential term needs a positive Sun-observer distance in au');
    }
    w2 = SRS / sunDistanceAu;
  }

  const p = [0, 0, 0];
  let r2 = 0;
  for (let i = 0; i < 3; i += 1) {
    p[i] = p0[i] * bm1 + w1 * v[i] + w2 * (v[i] - pdv * p0[i]);
    r2 += p[i] * p[i];
  }
  if (!(r2 > 0)) fail('bad-geometry', 'aberration produced a zero-length direction');
  const r = Math.sqrt(r2);
  return [p[0] / r, p[1] / r, p[2] / r];
}

/**
 * The angle between the natural and proper directions, in arcseconds.
 * Computed from the cross/dot pair rather than acos of a dot product, which
 * loses all its precision at the small angles aberration actually produces.
 */
export function aberrationAngleArcsec(pnat, v, opts = {}) {
  const a = aberrate(pnat, [0, 0, 0], {});      // normalizes only
  const b = aberrate(pnat, v, opts);
  const cx = a[1] * b[2] - a[2] * b[1];
  const cy = a[2] * b[0] - a[0] * b[2];
  const cz = a[0] * b[1] - a[1] * b[0];
  // sqrt of the sum of squares, deliberately: the hypot builtin is not
  // correctly rounded and engines differ on it, and src/core is held to one
  // arithmetic. IEEE-754 sqrt is exact to the last bit.
  const s = Math.sqrt(cx * cx + cy * cy + cz * cz);
  const c = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  return (Math.atan2(s, c) * 180 * 3600) / Math.PI;
}
