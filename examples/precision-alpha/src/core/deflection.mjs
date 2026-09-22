/**
 * Solar gravitational light deflection: the pointwise transformation.
 *
 * Profile `zodiacs-deflected-of-date/1`. `DEFLECTION-PROFILE.md` is the
 * specification and was written before this file; where the two differ the
 * document is wrong and should be corrected, not this.
 *
 * ## What this is
 *
 * Given the light-time-corrected vector from observer to source, and the
 * Sun's position at each end of the ray, this returns the NATURAL
 * direction: where the source would be seen if the observer were at rest.
 * `aberration.mjs` takes it from there.
 *
 *     w = SRS / em / max(q . (q + e), dlim)
 *     D = d + w * (d x (e x q))
 *
 * which is ERFA's `eraLd` with `bm = 1`, pinned at
 * `tools/measure/erfa-deflection/ld.c`, sha256 affa41a6028f8f2e...
 *
 * ## Three things that are easy to get wrong
 *
 * **`d` is not normalised and must not be.** `eraLd` is LINEAR in its `p`:
 * `D = (I - w[e x q]_x) d`, because `w` depends only on `q`, `e`, `em` and
 * `dlim`. So rescaling `d` by `k` rescales `D` by the same `k`.
 *
 * The domain of that argument is `k > 0`, and the restriction is not
 * cosmetic: `k < 0` reverses `D` too, which moves a longitude by 180
 * degrees and flips the sign of every projection. The search's vector is
 * positive by construction (it is a light-time-corrected separation scaled
 * by a positive factor), and the tests assert both halves -- that `k > 0`
 * leaves the direction fixed and that `k < 0` does not.
 *
 * In floating point the rescaling is EXACT only for powers of two, where
 * every product and sum scales by the same exponent shift; for a general
 * `k` both sides round differently and the two agree to within a few ulps
 * instead. The tests separate those two claims rather than asserting the
 * stronger one everywhere. The property is ERFA's own, not an artefact of
 * this transliteration: the fixture carries `eraLd` run on the raw `d` and
 * on `unit(d)` separately, and the compiled reference is itself linear to
 * 2.75e-16 relative across all 264 cases.
 *
 * **`q` and `e` are normalised and must be.** They are not scale-free.
 * Rescaling `q` by a factor `lam` while leaving its direction alone
 * multiplies the deflection by `(1 + c) / (lam + c)`, `c = q_hat . e_hat`,
 * so the relative error it induces is `(1 - lam) / (lam + c)`. Since
 * `1 + c = 1 - cos(chi)` is about `chi^2 / 2` near conjunction, a fixed
 * relative error in `|q|` is amplified by roughly `2 / chi^2`: at
 * `lam = 1.0001` and a source at 5.2 au it costs 1.8162 per cent of the
 * deflection at 5 degrees of elongation (1.421e-3 arcsec of 0.078215) and
 * 83.6912 per cent at 0.3 degrees (1.092 arcsec of 1.304493). The two
 * square roots are not optional and there is no rearrangement that avoids
 * them. Tested against that law, not against a threshold.
 *
 * **This is finite-distance, not `eraLdsun`.** `eraLdsun` calls
 * `eraLd(1, p, p, e, em, dlim)` -- passing `p` for `q`, the distant-star
 * approximation. For a planet that is wrong by up to 1.5554 arcsec (Venus,
 * 0.3 degrees elongation, near branch). `q` here is the real Sun-to-source
 * direction at emission.
 *
 * ## What the limiter is
 *
 * `dlim` is `phi^2 / 2`, where `phi` is the angular separation at which
 * limiting BEGINS (`ld.c` Note 4). Below it the deflection is artificially
 * reduced toward zero -- so the limiter does not bound the error, it
 * replaces the model with a convention that goes the wrong way.
 *
 * It is NOT an error cap. A comment in `reduce.mjs` says ERFA's `dlim`
 * "silently caps the deflection at roughly a tenth of an arcsecond"; the
 * actual peak under `dlim = 1e-6` is 5.7586 arcsec, 57.6 times that and
 * 3.29 times a limb-grazing ray's 1.7512 arcsec. That comment is about the
 * released reducer and is left alone there; it is not repeated here.
 *
 * The supported domain below is set so the limiter NEVER fires inside it.
 * `limiterActive` is reported anyway, and if it is ever true the result is
 * outside the domain and says so.
 */
import { fail } from './errors.mjs';

/** Schwarzschild radius of the Sun divided by the au, radians. ERFA_SRS. */
export const SRS = 1.97412574336e-8;

/** IAU 2012 astronomical unit, km, exactly as the package's other modules use it. */
export const AU_KM = 1.495978707e8;

/**
 * Solar radius, km. IAU 2015 Resolution B3 nominal value.
 *
 * Stated because it moves the answer: 696000 puts the apparent limb at
 * 959.64 arcsec from 1 au and 695700 puts it at 959.23, and a domain test
 * that does not say which radius it used is not reproducible.
 */
export const SOLAR_RADIUS_KM = 6.957e5;

const DEG = Math.PI / 180;
const ARCSEC = Math.PI / (180 * 3600);

/**
 * The supported domain, as an elongation floor.
 *
 * Five degrees. `DEFLECTION-PROFILE.md` section 7 justifies it against four
 * boundaries that are NOT the same boundary; the binding ones are that it
 * is 18.7x the largest apparent solar radius and 61.7x the widest limiter
 * threshold, and that `eraLd`'s own omitted second-order term is a measured
 * 4.23e-7 arcsec there against 2.08e-3 arcsec at 0.3 degrees.
 */
export const MIN_ELONGATION_RAD = 5 * DEG;

/** What the profile declares about itself, for the result's metadata. */
export const DEFLECTION_PROFILE = Object.freeze({
  id: 'zodiacs-deflected-of-date/1',
  deflectors: Object.freeze(['Sun']),
  form: 'eraLd with bm = 1, finite-distance source geometry (q is the real Sun-to-source direction at emission, NOT eraLdsun\'s q = p distant-star approximation)',
  srs: SRS,
  solarRadiusKm: SOLAR_RADIUS_KM,
  limiter: 'dlim = 1e-6 / max(em^2, 1), ERFA eraLdsun\'s own. dlim is phi^2/2, the angular separation at which limiting BEGINS -- not an error cap. Below it the deflection is artificially reduced toward zero. The supported domain is set so it never fires inside it; limiterActive is reported regardless.',
  minElongationDeg: 5,
  epochs: 'e and em from the observer and Sun at RECEPTION; q from the source and Sun at EMISSION. ld.c Note 3 prefers the deflector at the ray\'s closest approach; the split used here is within 3.13e-10 arcsec of that, against 1.96e-5 arcsec for the simpler reception-for-both.',
  notApplied: Object.freeze([
    'deflection by any body other than the Sun',
    'the second-order term eraLd itself omits: a measured 2.08e-3 arcsec at 0.3 deg elongation, 4.23e-7 arcsec at 5 deg, 4.97e-8 arcsec at 10 deg, against an independent ray integration. A property of the MODEL, not of this implementation',
    'the Klioner solar-potential term inside the aberration, which is a DIFFERENT term in a different transformation and stays off',
    'Shapiro (relativistic) delay',
    'topocentric parallax, diurnal aberration, refraction',
  ]),
});

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
/**
 * `Math.sqrt` of the sum of squares, never `Math.hypot` -- the core-wide
 * rule, stated in `frames.mjs`: `sqrt` is correctly rounded and agrees
 * between engines, `hypot` is neither.
 *
 * It is observable here and not merely a principle. ERFA leaves
 * normalisation to the caller, so the norm routine is part of this
 * module's contract rather than the reference's. Generating the comparison
 * fixture with `hypot` instead put 14 of 792 components up to 4 ulp away
 * from the compiled `eraLd`; with `sqrt` all 792 are bit-identical.
 */
const norm = (a) => Math.sqrt(dot(a, a));

/** The limiter for an observer `emAu` from the deflector. ERFA eraLdsun's. */
export const deflectionLimit = (emAu) => 1e-6 / Math.max(emAu * emAu, 1);

/**
 * Where this geometry sits relative to the four boundaries of section 7.
 *
 * They are four different boundaries and the code keeps them apart:
 * the model is defined wherever phi > 0; the limiter is active below its
 * own threshold; the line of sight is obstructed below the APPARENT solar
 * radius, which is not a constant -- it runs 943.5 to 975.5 arcsec over a
 * year as the Earth's distance changes; and the supported domain is
 * narrower than all of them.
 *
 * @param {number[]} d     observer -> source, light-time corrected, any length
 * @param {number[]} eVec  Sun -> observer at reception, km, any length
 */
export function deflectionDomain(d, eVec) {
  const dn = norm(d);
  const en = norm(eVec);
  if (!(dn > 0) || !(en > 0)) {
    return {
      supported: false,
      reason: 'degenerate',
      detail: 'the source is on the observer, or the observer is at the centre of the Sun',
    };
  }
  // Elongation: the angle at the OBSERVER between the Sun and the source.
  // The observer sees the Sun along -eVec.
  const toSun = [-eVec[0], -eVec[1], -eVec[2]];
  // atan2 of the cross and dot magnitudes, which is well conditioned at
  // both ends, unlike acos of a dot.
  const elongationRad = Math.atan2(norm(cross(toSun, d)), dot(toSun, d));
  const emAu = en / AU_KM;
  const apparentSolarRadiusRad = Math.asin(Math.min(1, SOLAR_RADIUS_KM / en));
  const limiterThresholdRad = 2 * Math.asin(Math.sqrt(deflectionLimit(emAu) / 2));
  return {
    supported: elongationRad >= MIN_ELONGATION_RAD,
    reason: elongationRad >= MIN_ELONGATION_RAD ? null : 'elongation-below-floor',
    elongationRad,
    elongationDeg: elongationRad / DEG,
    elongationArcsec: elongationRad / ARCSEC,
    emAu,
    apparentSolarRadiusArcsec: apparentSolarRadiusRad / ARCSEC,
    limiterThresholdArcsec: limiterThresholdRad / ARCSEC,
    minElongationArcsec: MIN_ELONGATION_RAD / ARCSEC,
    obstructed: elongationRad < apparentSolarRadiusRad,
    withinLimiter: elongationRad < limiterThresholdRad,
  };
}

/**
 * Apply solar deflection to a light-time-corrected vector.
 *
 * @param {number[]} d     observer -> source, light-time corrected, km.
 *                         NOT normalised, and the result carries its length.
 * @param {number[]} eVec  Sun -> observer at RECEPTION, km
 * @param {number[]} qVec  Sun -> source at EMISSION, km
 * @param {{enforceDomain?: boolean}} [opts]
 * @returns {{D: number[], u: number[], w: number, qdqpe: number,
 *            limiterActive: boolean, emAu: number, domain: object}}
 *          `u` is the perturbation, `D - d`. It is returned because
 *          recovering it by subtracting is a catastrophic cancellation --
 *          see `deflectionAngleOf`.
 */
export function deflect(d, eVec, qVec, opts = {}) {
  const { enforceDomain = true } = opts;
  const en = norm(eVec);
  const qn = norm(qVec);
  if (!(en > 0)) fail('bad-geometry', 'the observer is at the centre of the deflecting body');
  if (!(qn > 0)) fail('bad-geometry', 'the source is at the centre of the deflecting body');
  if (!(norm(d) > 0)) fail('bad-geometry', 'the source is on the observer');

  const domain = deflectionDomain(d, eVec);
  if (enforceDomain && !domain.supported) {
    fail('out-of-domain',
      `solar elongation ${domain.elongationArcsec === undefined ? '(degenerate)' : domain.elongationArcsec.toFixed(3)} arcsec is inside the ${domain.minElongationArcsec ?? 18000} arcsec floor this profile supports`
      + `${domain.obstructed ? '; the line of sight is obstructed by the solar disc' : ''}`
      + `${domain.withinLimiter ? '; the deflection limiter would be active' : ''}`,
      { domain });
  }

  // q and e MUST be unit. d must not be touched.
  const e = [eVec[0] / en, eVec[1] / en, eVec[2] / en];
  const q = [qVec[0] / qn, qVec[1] / qn, qVec[2] / qn];
  const emAu = en / AU_KM;

  const qdqpe = dot(q, [q[0] + e[0], q[1] + e[1], q[2] + e[2]]);
  const dlim = deflectionLimit(emAu);
  const limiterActive = qdqpe < dlim;
  const w = SRS / emAu / Math.max(qdqpe, dlim);

  const eq = cross(e, q);
  const deq = cross(d, eq);
  // Hoisted rather than inlined into `D` so the perturbation survives for
  // `deflectionAngleOf`. ECMAScript rounds every operation individually --
  // there is no FMA contraction to lose -- so `D` is bit-identical either
  // way, which the fixture comparison would catch if it were not.
  const u = [w * deq[0], w * deq[1], w * deq[2]];
  return {
    D: [d[0] + u[0], d[1] + u[1], d[2] + u[2]],
    u,
    w,
    qdqpe,
    dlim,
    limiterActive,
    emAu,
    domain,
  };
}

/**
 * The deflection ANGLE between two directions, radians.
 *
 * `atan2(|a x b|, a . b)` rather than `acos` of a normalised dot: the
 * latter loses three digits at small angles, which was enough to put an
 * early measurement 0.3 per cent out at one arcsecond of separation.
 *
 * Use this to compare two INDEPENDENT directions. Do NOT use it to measure
 * how far `deflect` moved its input -- `deflectionAngleOf` does that, and
 * the reason is in its note.
 */
export function deflectionAngle(a, b) {
  return Math.atan2(norm(cross(a, b)), dot(a, b));
}

/**
 * How far `deflect` moved its input, radians, from the result it returned.
 *
 * `atan(|u| / |d|)`, using the perturbation directly. `u` is perpendicular
 * to `d` by construction (`u` is a multiple of `d x (e x q)`), so the two
 * legs are the opposite and adjacent sides of a right triangle and no
 * angle-between routine is needed.
 *
 * ## Why not `deflectionAngle(d, D)`
 *
 * Because `D = d + u` with `|u| / |d|` around 1e-10 to 1e-15 in this
 * regime, so forming `d x D` subtracts two nearly equal products and
 * throws away everything the answer is made of. The relative error of that
 * route is bounded by about `eps |d| / |u|`, which is 6.6e-7 at the
 * fixture's worst case; measured, it runs at about a tenth of that bound,
 * and it put an earlier closed-form comparison 5.9e-8 out and looked like
 * a disagreement between two models when it was an artefact of the
 * measuring instrument. This route agrees with the independent closed form
 * to 3.64e-12 relative over all 264 fixture cases, and to 1.5e-16 -- one
 * ulp -- at the case where the other route showed 5.9e-8.
 *
 * @param {number[]} d   the vector handed to `deflect`
 * @param {{u: number[]}} result  what `deflect` returned
 */
export function deflectionAngleOf(d, result) {
  return Math.atan(norm(result.u) / norm(d));
}

/**
 * The closed form: the deflection angle from `chi` alone, radians.
 *
 *     tan(delta) = (SRS / em) tan(chi / 2)
 *
 * with `chi` the SUN-CENTRED angle between source and observer. It shares
 * no code with `deflect` -- it never forms `d x (e x q)` and never touches
 * `d` at all -- so agreement between the two is a real check rather than a
 * restatement.
 *
 * ## Where it comes from, and what it assumes
 *
 * `deflect` returns `u = w (d x (e x q))` with `w = SRS / em / (1 + q.e)`,
 * and `u` is perpendicular to `d`, so `tan(delta) = |u| / |d|`. Now
 * `|d x (e x q)| = |d| |e x q| sin(angle(d, e x q))`, and `e x q` is
 * normal to the plane of `e` and `q`; so IF `d` lies in that plane the
 * sine is 1 and `|d x (e x q)| = |d| sin(chi)`. With
 * `q.(q + e) = 1 + cos(chi)` that gives
 * `tan(delta) = (SRS / em) sin(chi) / (1 + cos(chi))`, and the half-angle
 * identity finishes it.
 *
 * **The coplanarity is a real assumption and it is satisfied for real
 * geometry, not by luck.** `e` is Sun to observer and `q` is Sun to
 * source, so `d = |q| q_hat - |e| e_hat` is a linear combination of the
 * two and lies in their plane identically. The identity therefore holds at
 * finite source distance exactly as it does for a distant star; it is not
 * a small-angle or far-field approximation. It would fail for a `d` that
 * did not come from this geometry, and `deflect` would still compute the
 * model correctly for such a `d` -- that is why this is a separate
 * function and not an optimisation of that one.
 *
 * ## The atan
 *
 * `(SRS / em) tan(chi / 2)` is the TANGENT of the deflection, not the
 * deflection. Dropping the `atan` is harmless where the deflection is
 * small but reaches 1.41e-11 relative at the fixture's `chi = 179.69`
 * degrees; it is kept so the function returns an angle at every `chi`
 * rather than one that is only asymptotically an angle.
 *
 * This is NOT an independent model. It is the same `eraLd` first-order
 * model reached by a different algebraic route, so it checks the
 * arithmetic and the vector algebra, not the physics. The independent
 * check on the model itself is the ray integration in
 * `DEFLECTION-PROFILE.md` section 0.
 */
export function deflectionAngleClosedForm(eVec, qVec) {
  const en = norm(eVec);
  const qn = norm(qVec);
  const e = [eVec[0] / en, eVec[1] / en, eVec[2] / en];
  const q = [qVec[0] / qn, qVec[1] / qn, qVec[2] / qn];
  const chi = Math.atan2(norm(cross(q, e)), dot(q, e));
  return Math.atan((SRS / (en / AU_KM)) * Math.tan(chi / 2));
}
