/**
 * The date-dependent frame, over intervals: ICRS equatorial axes to the
 * ecliptic of date with its origin at the true equinox of date.
 *
 * ## The frame, named exactly
 *
 * Input axes:      ICRS/GCRS equatorial, which is what the pack stores.
 * Output plane:    the ECLIPTIC OF DATE. The ecliptic is the mean one:
 *                  nutation is a motion of the EQUATOR, not of the
 *                  ecliptic, so there is no such thing as a "true
 *                  ecliptic" in this construction and the phrase is not
 *                  used here.
 * Longitude origin: the TRUE EQUINOX OF DATE, because nutation in
 *                  longitude is applied. Drop it and the origin is the
 *                  mean equinox of date -- that is the other rung. The
 *                  two are separated by the nutation in longitude, which
 *                  over 1950-2100 runs from -18.96 to +18.89 arcsec and
 *                  passes through zero, so it is a rung rather than a
 *                  fixed offset.
 * Epoch:           the date itself. Not J2000.
 * Time scale:      TT, from TDB through a stated model (see `timeOfDate`).
 * Models:          IAU 2006 precession with frame bias, in the
 *                  Fukushima-Williams parameterisation (`pfw06`), and IAU
 *                  2000B nutation adjusted to P03 (`nut00b` +
 *                  `adjustToP03`). The same models, from the same
 *                  constants, that the released apparent reducer uses.
 *
 * ## Why the obliquity is absent
 *
 * The released reducer computes `equToEcl(NPB v, epsTrue)`, that is
 * `R1(eps) R1(-eps) R3(-psi) R1(phib) R3(gamb) v`. The two obliquity
 * rotations are inverses and cancel exactly, so
 *
 *     ICRS -> ecliptic of date  =  R3(-psi) R1(phib) R3(gamb)
 *
 * with `psi = psib + dpsi`. Measured against the released chain over
 * +-1.5 centuries the largest element difference is 2.2e-16, and
 * `frame-of-date.nodetest.mjs` pins it. This is not a shortcut: it is the
 * Fukushima-Williams angles doing what they are for -- gamb, phib and
 * psib are defined against the ecliptic, and the obliquity only appears
 * when you rotate on to the equator. It also means the ecliptic
 * projection does not depend on the nutation in OBLIQUITY at all, which
 * the tests check rather than assert.
 *
 * ## What is NOT here
 *
 * No gravitational deflection, no Shapiro delay, nothing topocentric, no
 * diurnal terms, no refraction. This is a frame rotation applied to the
 * light-time- and aberration-corrected direction, and a result carrying
 * it must not be called an apparent place.
 *
 * ## Evaluation
 *
 * `trig.mjs` rather than `Math.sin`, for the two reasons its header
 * gives: the host's error is unspecified, so an enclosure built on it
 * would not be a bound; and the whole chain then reproduces bit for bit
 * across runtimes, which `Math.sin` does not promise. The released
 * reducer keeps `Math.sin` and is untouched; the two evaluations of the
 * same model agree to within `trig.ABS_ERR`, and that agreement is a
 * cross-check the tests make rather than a coincidence.
 *
 * Environment-neutral: no `node:` imports, no clock.
 */
import { fail } from './errors.mjs';
import * as I from './interval.mjs';
import { sinCosInterval, ABS_ERR as TRIG_ABS_ERR } from './trig.mjs';
import { PFW06_COEFFICIENTS, DAS2R } from './frames.mjs';
import {
  NUT00B_LUNISOLAR,
} from './nutation-series-2000b.mjs';
import {
  OBL06_COEFFICIENTS, DELAUNAY_2000B, PLANETARY_BIAS_2000B, TABLE_UNITS_ARCSEC,
} from './nutation.mjs';

/** Arcseconds in a turn. Exact. */
const TURNAS = 1296000;
const HALF_TURNAS = 648000;
const DAY = 86400;
const CENTURY_SEC = 36525 * DAY;

/**
 * The frames this module can produce, as labels a result can carry.
 * `fixed` is the existing mode's frame and is here only so the three can
 * be named in one place; this module does not compute it.
 */
export const FRAMES = Object.freeze({
  fixed: 'ecliptic-of-the-icrs-equator',
  meanOfDate: 'ecliptic-of-date-mean-equinox-of-date',
  trueEquinoxOfDate: 'ecliptic-of-date-true-equinox-of-date',
});

// ------------------------------------------------------- interval polynomials
/** Horner over an interval, ascending coefficients. */
function polyI(coeffs, t) {
  let acc = I.iv(coeffs[coeffs.length - 1]);
  for (let i = coeffs.length - 2; i >= 0; i -= 1) acc = I.add(I.mul(acc, t), I.iv(coeffs[i]));
  return acc;
}

/** d/dt of the same polynomial, over an interval. */
function polyDotI(coeffs, t) {
  const n = coeffs.length - 1;
  let acc = I.scale(I.iv(coeffs[n]), n);
  for (let i = n - 1; i >= 1; i -= 1) acc = I.add(I.mul(acc, t), I.scale(I.iv(coeffs[i]), i));
  return acc;
}

/**
 * Combined linear arguments of the 2000B terms, ARCSECONDS: for term j,
 * `arg_j(t) = A[j] + B[j] t`.
 *
 * Derived here from the published multipliers and the published Delaunay
 * arguments rather than transcribed, so there is no second copy of
 * anything. Folding the five arguments into one linear function before
 * reducing is also tighter than reducing five and summing: one rounding
 * instead of five, and the SUM is what the sine needs.
 */
const ARG_A = new Float64Array(NUT00B_LUNISOLAR.length);
const ARG_B = new Float64Array(NUT00B_LUNISOLAR.length);
{
  const D = DELAUNAY_2000B;
  const order = [D.el, D.elp, D.f, D.d, D.om];
  for (let j = 0; j < NUT00B_LUNISOLAR.length; j += 1) {
    const r = NUT00B_LUNISOLAR[j];
    let a = 0;
    let b = 0;
    for (let i = 0; i < 5; i += 1) { a += r[i] * order[i][0]; b += r[i] * order[i][1]; }
    ARG_A[j] = a;
    ARG_B[j] = b;
  }
}

/**
 * Reduce an ARCSECOND angle interval to radians near zero, keeping the
 * width, so the interval sine never sees a large argument.
 *
 * Reduction of an INTERVAL by `fmod` is wrong -- `fmod` is discontinuous
 * and would split the interval in two without saying so. What is reduced
 * here is the CENTRE, which is a single number; the half-width rides
 * along untouched, and sine's 2pi-periodicity makes the shifted interval
 * the same set of values. `fmod` by a whole turn in arcseconds is exact
 * in IEEE arithmetic, and the further fold into [-half turn, +half turn]
 * is a Sterbenz subtraction, also exact.
 *
 * Returns null when the interval spans at least half a turn either way,
 * which the caller reads as "the whole range".
 */
function reducedRadians(arcsec) {
  const centre = (arcsec.lo + arcsec.hi) / 2;
  // NOT (hi - lo)/2: `lo + hi` rounds, so the true reach from the computed
  // centre is the larger of the two distances. The same correction the
  // search's lever arm carries.
  const half = Math.max(arcsec.hi - centre, centre - arcsec.lo);
  if (!(half < HALF_TURNAS)) return null;
  let c = centre % TURNAS;                       // exact
  if (c > HALF_TURNAS) c -= TURNAS;              // exact, Sterbenz
  else if (c < -HALF_TURNAS) c += TURNAS;
  const cr = c * DAS2R;
  const hr = half * DAS2R;
  if (!(hr < Math.PI)) return null;
  // The two scalings above each round, at a relative 2^-53 on quantities
  // no larger than pi and half a turn in radians; PAD's eight units cover
  // both several times over.
  return I.iv(cr - hr, cr + hr);
}

const FULL_RANGE = I.iv(-1 - TRIG_ABS_ERR, 1 + TRIG_ABS_ERR);

/**
 * IAU 2000B nutation over an interval of t, and its derivative.
 * Angles out: ARCSECONDS and arcseconds per century, as intervals.
 */
export function nut00bInterval(t) {
  let dp = I.iv(0);
  let de = I.iv(0);
  let dpDot = I.iv(0);
  let deDot = I.iv(0);
  // Smallest terms first, as the published algorithm prescribes.
  for (let j = NUT00B_LUNISOLAR.length - 1; j >= 0; j -= 1) {
    const r = NUT00B_LUNISOLAR[j];
    const argArcsec = I.add(I.iv(ARG_A[j]), I.scale(t, ARG_B[j]));
    const red = reducedRadians(argArcsec);
    const sc = red === null ? { s: FULL_RANGE, c: FULL_RANGE } : sinCosInterval(red);
    const omega = ARG_B[j] * DAS2R;              // d(arg)/dt, radians per century

    // dpsi term: (S + St t) sin + Sc cos
    const amp = I.add(I.iv(r[5]), I.scale(t, r[6]));
    dp = I.add(dp, I.add(I.mul(amp, sc.s), I.scale(sc.c, r[7])));
    // d/dt = St sin + (S + St t) omega cos - Sc omega sin
    dpDot = I.add(dpDot, I.add(
      I.scale(sc.s, r[6]),
      I.scale(I.sub(I.mul(amp, sc.c), I.scale(sc.s, r[7])), omega),
    ));

    // deps term: (C + Ct t) cos + Cs sin
    const ampE = I.add(I.iv(r[8]), I.scale(t, r[9]));
    de = I.add(de, I.add(I.mul(ampE, sc.c), I.scale(sc.s, r[10])));
    // d/dt = Ct cos - (C + Ct t) omega sin + Cs omega cos
    deDot = I.add(deDot, I.add(
      I.scale(sc.c, r[9]),
      I.scale(I.sub(I.scale(sc.c, r[10]), I.mul(ampE, sc.s)), omega),
    ));
  }
  return {
    dpsi: I.add(I.scale(dp, TABLE_UNITS_ARCSEC), I.iv(PLANETARY_BIAS_2000B.dpsi)),
    deps: I.add(I.scale(de, TABLE_UNITS_ARCSEC), I.iv(PLANETARY_BIAS_2000B.deps)),
    dpsiDot: I.scale(dpDot, TABLE_UNITS_ARCSEC),
    depsDot: I.scale(deDot, TABLE_UNITS_ARCSEC),
  };
}

/**
 * The P03 adjustment, over intervals, matching `adjustToP03` exactly:
 *   dpsi -> dpsi (1 + 0.4697e-6 + fj2),  deps -> deps (1 + fj2),
 *   fj2 = -2.7774e-6 t
 * and the derivative that goes with it.
 */
function adjustToP03Interval(nut, t) {
  const FJ2_RATE = -2.7774e-6;
  const fj2 = I.scale(t, FJ2_RATE);
  const kp = I.add(I.iv(1 + 0.4697e-6), fj2);
  const ke = I.add(I.iv(1), fj2);
  return {
    dpsi: I.mul(nut.dpsi, kp),
    deps: I.mul(nut.deps, ke),
    dpsiDot: I.add(I.mul(nut.dpsiDot, kp), I.scale(nut.dpsi, FJ2_RATE)),
    depsDot: I.add(I.mul(nut.depsDot, ke), I.scale(nut.deps, FJ2_RATE)),
  };
}

/**
 * Every frame angle over an interval of t, radians and radians/century.
 * `nutation: false` gives the mean equinox of date.
 */
export function frameAnglesInterval(t, { nutation = true } = {}) {
  const gamb = I.scale(polyI(PFW06_COEFFICIENTS.gamb, t), DAS2R);
  const phib = I.scale(polyI(PFW06_COEFFICIENTS.phib, t), DAS2R);
  const psib = I.scale(polyI(PFW06_COEFFICIENTS.psib, t), DAS2R);
  const epsa = I.scale(polyI(OBL06_COEFFICIENTS, t), DAS2R);
  const gambDot = I.scale(polyDotI(PFW06_COEFFICIENTS.gamb, t), DAS2R);
  const phibDot = I.scale(polyDotI(PFW06_COEFFICIENTS.phib, t), DAS2R);
  const psibDot = I.scale(polyDotI(PFW06_COEFFICIENTS.psib, t), DAS2R);
  const epsaDot = I.scale(polyDotI(OBL06_COEFFICIENTS, t), DAS2R);

  if (!nutation) {
    return {
      gamb, phib, psi: psib, epsa, gambDot, phibDot, psiDot: psibDot, epsaDot,
      dpsi: I.iv(0), deps: I.iv(0),
    };
  }
  const nut = adjustToP03Interval(nut00bInterval(t), t);
  return {
    gamb,
    phib,
    psi: I.add(psib, I.scale(nut.dpsi, DAS2R)),
    epsa,
    gambDot,
    phibDot,
    psiDot: I.add(psibDot, I.scale(nut.dpsiDot, DAS2R)),
    epsaDot,
    dpsi: nut.dpsi,
    deps: nut.deps,
  };
}

// --------------------------------------------------------- interval rotations
const zero3 = () => [[I.iv(0), I.iv(0), I.iv(0)], [I.iv(0), I.iv(0), I.iv(0)], [I.iv(0), I.iv(0), I.iv(0)]];

/** The module-wide convention, matching frames.mjs and ERFA exactly. */
function R1I(sc) {
  const m = zero3();
  m[0][0] = I.iv(1);
  m[1][1] = sc.c; m[1][2] = sc.s;
  m[2][1] = I.neg(sc.s); m[2][2] = sc.c;
  return m;
}
function R3I(sc) {
  const m = zero3();
  m[0][0] = sc.c; m[0][1] = sc.s;
  m[1][0] = I.neg(sc.s); m[1][1] = sc.c;
  m[2][2] = I.iv(1);
  return m;
}
/** dR1/da and dR3/da at the same angle, so a chain rule can use them. */
function dR1I(sc) {
  const m = zero3();
  m[1][1] = I.neg(sc.s); m[1][2] = sc.c;
  m[2][1] = I.neg(sc.c); m[2][2] = I.neg(sc.s);
  return m;
}
function dR3I(sc) {
  const m = zero3();
  m[0][0] = I.neg(sc.s); m[0][1] = sc.c;
  m[1][0] = I.neg(sc.c); m[1][1] = I.neg(sc.s);
  return m;
}

export function matMulI(a, b) {
  const o = zero3();
  for (let i = 0; i < 3; i += 1) {
    for (let j = 0; j < 3; j += 1) {
      o[i][j] = I.add(I.add(I.mul(a[i][0], b[0][j]), I.mul(a[i][1], b[1][j])), I.mul(a[i][2], b[2][j]));
    }
  }
  return o;
}
const matAddI = (a, b) => {
  const o = zero3();
  for (let i = 0; i < 3; i += 1) for (let j = 0; j < 3; j += 1) o[i][j] = I.add(a[i][j], b[i][j]);
  return o;
};
const matScaleI = (a, s) => {
  const o = zero3();
  for (let i = 0; i < 3; i += 1) for (let j = 0; j < 3; j += 1) o[i][j] = I.mul(a[i][j], s);
  return o;
};
export function matApplyI(m, v) {
  return [0, 1, 2].map((i) => I.add(I.add(I.mul(m[i][0], v[0]), I.mul(m[i][1], v[1])), I.mul(m[i][2], v[2])));
}

/**
 * The frame matrix and its derivative with respect to t (TT centuries),
 * over an interval of t.
 *
 *   R  = R3(-psi) R1(phib) R3(gamb)
 *   R' = -psi' dR3(-psi) R1(phib) R3(gamb)
 *        + R3(-psi) phib' dR1(phib) R3(gamb)
 *        + R3(-psi) R1(phib) gamb' dR3(gamb)
 *
 * Three terms, not one: rotating a vector by R and then differentiating
 * only the vector would be the derivative of a DIFFERENT function.
 */
export function frameMatrixInterval(t, { nutation = true } = {}) {
  const a = frameAnglesInterval(t, { nutation });
  const negPsi = I.neg(a.psi);
  const scPsi = sinCosInterval(reducedRadiansFromRadians(negPsi));
  const scPhi = sinCosInterval(reducedRadiansFromRadians(a.phib));
  const scGam = sinCosInterval(reducedRadiansFromRadians(a.gamb));

  const A = R3I(scPsi);
  const B = R1I(scPhi);
  const C = R3I(scGam);
  const R = matMulI(A, matMulI(B, C));

  const dA = matScaleI(dR3I(scPsi), I.neg(a.psiDot));
  const dB = matScaleI(dR1I(scPhi), a.phibDot);
  const dC = matScaleI(dR3I(scGam), a.gambDot);
  const Rdot = matAddI(
    matMulI(dA, matMulI(B, C)),
    matAddI(matMulI(A, matMulI(dB, C)), matMulI(A, matMulI(B, dC))),
  );
  return { R, Rdot, angles: a };
}

/**
 * The same centre-and-width reduction, for an angle already in radians.
 * phib is about 0.409 rad and gamb and psi are small, so nothing here
 * needs reducing today; the guard exists so a caller far outside the
 * supported interval is refused rather than handed an unbounded sine.
 */
function reducedRadiansFromRadians(x) {
  const centre = (x.lo + x.hi) / 2;
  const half = Math.max(x.hi - centre, centre - x.lo);
  if (!(half < Math.PI) || !(Math.abs(centre) + half <= 7)) {
    fail('enclosure-too-weak', `a frame angle interval [${x.lo}, ${x.hi}] is too wide or too large for a bounded sine`);
  }
  return x;
}

// ------------------------------------------------------------- the time scale
/**
 * TT centuries past J2000 from TDB seconds past J2000, and dt/d(TDB s).
 *
 * The model is `reduce.mjs`'s `tdbMinusTt`, the two-term Astronomical
 * Almanac form, which that module documents as |error| < 30 microseconds.
 * Three separate things are being kept apart here, and the results
 * document keeps them apart too:
 *
 *  1. the SEARCH's own numerical error, which the enclosures bound;
 *  2. the APPROXIMATION in this conversion model, 30 us, which is an
 *     error in the frame's time argument and not in the search;
 *  3. the EXTERNAL uncertainty in TDB-TT itself, which is a question
 *     about the world and is not bounded here at all.
 *
 * The model is a function of TT and is evaluated at TDB. That is a
 * deliberate, stated approximation: |d(TDB-TT)/dt| is about 3.4e-10, so
 * evaluating it 1.7 ms away from where it belongs costs 6e-13 s, which is
 * seven orders below the model's own 30 us. It is recorded rather than
 * waved away.
 */
export const TIME_MODEL = Object.freeze({
  name: 'TDB-TT: two-term Astronomical Almanac series, as reduce.mjs tdbMinusTt',
  statedModelErrorSec: 3e-5,
  evaluatedAt: 'TDB rather than TT, costing a further 6e-13 s; see the module note',
  supported: 'the pack\'s own coverage; the series is periodic and does not degrade outside it, but nothing here is claimed beyond the data',
});

const G0 = 357.53 * Math.PI / 180;
const G1 = 0.9856003 * Math.PI / 180;
const L0 = 246.11 * Math.PI / 180;
const L1 = 0.90251792 * Math.PI / 180;

/** TDB - TT in seconds, and its derivative per TDB second, over an interval. */
export function tdbMinusTtInterval(tdbSec) {
  const days = I.scale(tdbSec, 1 / DAY);
  const g = I.add(I.iv(G0), I.scale(days, G1));
  const l = I.add(I.iv(L0), I.scale(days, L1));
  const sg = sinCosInterval(reducedRadians(I.scale(g, 1 / DAS2R)));
  const s2g = sinCosInterval(reducedRadians(I.scale(I.scale(g, 2), 1 / DAS2R)));
  const sl = sinCosInterval(reducedRadians(I.scale(l, 1 / DAS2R)));
  const value = I.add(I.add(I.scale(sg.s, 0.001658), I.scale(s2g.s, 0.000014)), I.scale(sl.s, 0.0000224));
  const perSec = I.add(I.add(
    I.scale(sg.c, 0.001658 * G1 / DAY),
    I.scale(s2g.c, 0.000014 * 2 * G1 / DAY),
  ), I.scale(sl.c, 0.0000224 * L1 / DAY));
  return { value, perSec };
}

/**
 * @param {{lo:number,hi:number}} tdbSec TDB seconds past J2000
 * @returns {{t:{lo:number,hi:number}, dtdTdb:{lo:number,hi:number}}}
 *   t in TT Julian centuries past J2000, and dt/d(TDB second).
 */
export function ttCenturiesInterval(tdbSec) {
  const d = tdbMinusTtInterval(tdbSec);
  const ttSec = I.sub(tdbSec, d.value);
  return {
    t: I.scale(ttSec, 1 / CENTURY_SEC),
    dtdTdb: I.scale(I.sub(I.iv(1), d.perSec), 1 / CENTURY_SEC),
    tdbMinusTtSec: d.value,
  };
}
