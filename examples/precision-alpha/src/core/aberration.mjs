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
import * as I from './interval.mjs';

/** IAU 1976 speed of light, km/s. Only used to phrase a refusal in km/s. */
const C_KM_S = 299792.458;

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

// --------------------------------------------------------------- intervals

/**
 * The same transformation over an INTERVAL of reception times, with both
 * normalizations removed, together with its first derivative.
 *
 * ## Why the normalizations go away
 *
 * `aberrate` above divides twice: once to make `pnat` a unit vector, once
 * to make the answer one. The search never needs a unit vector. It needs
 * the sign of two projections, and both are LINEAR in the direction, so any
 * strictly positive rescaling leaves every root and every half-plane
 * verdict exactly where it was. Multiplying `p` through by |d| > 0:
 *
 *     P = bm1 d + S v,        S = |d| + (d . v) / (1 + bm1)
 *
 * and `u = P/|P|` with |P| > 0. So `w . u = 0` iff `w . P = 0`, and
 * `sign(w . u) = sign(w . P)`. Two interval divisions disappear with them,
 * and an interval division is the operation that most readily loses a
 * bound: `div` refuses outright when the denominator straddles zero.
 *
 * Setting `v = 0` gives bm1 = 1, S = |d| and P = d exactly -- the
 * light-time-only vector, not an approximation of it. That reduction is
 * asserted in the tests, not left to this paragraph.
 *
 * ## The derivative is derived, not differenced
 *
 *     |d|'   = (d . d') / |d|
 *     bm1'   = -(v . v') / bm1
 *     S'     = |d|' + [ (d'.v + d.v')(1 + bm1) - (d.v) bm1' ] / (1 + bm1)^2
 *     P'     = bm1' d + bm1 d' + S' v + S v'
 *
 * Note what P' is NOT: it is not f' |P|, and it is not the derivative of
 * the unit vector scaled by anything. Rescaling a function by a quantity
 * that itself varies does not rescale its derivative, so the positive
 * factor that was free to drop above is not free here. P' is the derivative
 * of P as written, and it is used to bound the derivative of the
 * PROJECTIONS of P, which is the only thing the search asks of it.
 *
 * ## Refusing rather than throwing
 *
 * Every domain failure comes back as `{ok: false, retry, why}`. This runs
 * inside a cell evaluator whose whole contract is to hand the search a typed
 * refusal it can subdivide or record; an exception raised from in here would
 * escape the search loop entirely and lose every cell already decided.
 * `retry` says whether a narrower cell could establish what this one could
 * not -- false means the geometry itself is the answer and subdividing only
 * spends budget.
 *
 * @param {{lo:number,hi:number}[]} d     light-time-corrected geocentric vector, km
 * @param {{lo:number,hi:number}[]} dDot  its time derivative, km/s
 * @param {{lo:number,hi:number}} dist    an enclosure of |d|, km, with lo > 0
 * @param {{lo:number,hi:number}[]} v     observer velocity over c, dimensionless
 * @param {{lo:number,hi:number}[]} vDot  observer acceleration over c, 1/s
 */
export function aberrateInterval(d, dDot, dist, v, vDot) {
  if (!(dist.lo > 0)) {
    return { ok: false, retry: true, why: 'the target and the observer cannot be shown to be separated over this cell, so the natural direction is undefined' };
  }
  const speed = I.norm(v);
  if (!(speed.hi < 1)) {
    // Two different failures wear the same message, and only one of them
    // is worth subdividing. `speed.lo >= 1` says the observer is above c
    // at EVERY instant the enclosure admits: halving the cell tightens the
    // enclosure around a value that is still above c, so the answer never
    // changes. `speed.lo < 1 <= speed.hi` says only that the enclosure
    // straddles c, which a narrower cell can resolve.
    //
    // Measured before this split existed: a 1.4c observer over four days
    // subdivided 199,883 cells and spent the whole 4,000,000-evaluation
    // budget to reach the refusal it can reach on the first cell. Exactly
    // the defect the light-time mode already carries a note about, one
    // body over.
    const hopeless = speed.lo >= 1;
    return {
      ok: false,
      retry: !hopeless,
      why: `the observer's speed ${hopeless ? 'is' : 'bound over this cell is'} ${(hopeless ? speed.lo * C_KM_S : speed.hi * C_KM_S).toFixed(3)} km/s, which is not below c, so the aberration transformation is outside its domain${hopeless ? ' at every instant this cell contains, and no subdivision changes that' : ''}`,
    };
  }
  const oneMinusV2 = I.sub(I.iv(1), I.mul(speed, speed));
  if (!(oneMinusV2.lo > 0)) {
    return { ok: false, retry: true, why: `1 - |v/c|^2 encloses ${oneMinusV2.lo}, which is not bounded above zero, so the Lorentz factor has no enclosure here` };
  }
  const bm1 = I.sqrt(oneMinusV2);
  if (!(bm1.lo > 0)) {
    return { ok: false, retry: true, why: 'the reciprocal Lorentz factor cannot be bounded away from zero over this cell' };
  }
  const onePlus = I.add(I.iv(1), bm1);

  const dv = I.dot(d, v);
  const S = I.add(dist, I.div(dv, onePlus));
  const P = I.vAdd(I.vMulI(d, bm1), I.vMulI(v, S));

  const pNorm = I.norm(P);
  if (!(pNorm.lo > 0)) {
    return { ok: false, retry: true, why: 'the aberrated direction cannot be bounded away from zero length over this cell, so its normalization is undefined' };
  }

  const bm1Dot = I.neg(I.div(I.dot(v, vDot), bm1));
  const distDot = I.div(I.dot(d, dDot), dist);
  const dvDot = I.add(I.dot(dDot, v), I.dot(d, vDot));
  const SDot = I.add(
    distDot,
    I.div(I.sub(I.mul(dvDot, onePlus), I.mul(dv, bm1Dot)), I.mul(onePlus, onePlus)),
  );
  const PDot = I.vAdd(
    I.vAdd(I.vMulI(d, bm1Dot), I.vMulI(dDot, bm1)),
    I.vAdd(I.vMulI(v, SDot), I.vMulI(vDot, S)),
  );

  return { ok: true, P, PDot, bm1, speed, pNorm };
}
