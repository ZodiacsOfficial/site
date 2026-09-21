/**
 * Sine and cosine with a PROVEN error bound, from arithmetic alone.
 *
 * ## Why not `Math.sin`
 *
 * Two reasons, and the second is the one that decided it.
 *
 * ECMAScript requires nothing of `Math.sin` beyond "implementation-
 * approximated". A frame matrix built from it cannot carry an interval
 * enclosure that is a bound rather than a hope: to widen by the right
 * amount you would have to know the host's error, and the specification
 * does not tell you. An assumption about the host is still an assumption
 * even when every host you tried happened to satisfy it.
 *
 * And the frame chain has to be REPRODUCIBLE across runtimes. `frames.mjs`
 * already records that V8 and SpiderMonkey agreed bit for bit on `sin`,
 * `cos` and `atan2` everywhere it measured -- and says, correctly, that
 * this is an observation about those engines rather than a guarantee. A
 * date-dependent frame evaluates trigonometry hundreds of times per
 * instant on arguments that sweep the whole circle; "agreed on everything
 * measured" is a thinner reed there than it is for one obliquity constant.
 * Everything below is `+`, `-` and `*` on doubles, so every engine that
 * implements IEEE-754 double arithmetic gets the same bits.
 *
 * ## The method
 *
 * Cody-Waite quadrant reduction against a two-word pi/2, then a Taylor
 * polynomial on the reduced argument, with the residual of the reduction
 * carried as a second word and folded back in through the derivative.
 *
 *   k    = round(x / (pi/2)),  |k| small because callers reduce first
 *   t    = x - k*PIO2_HI            exact: PIO2_HI has its low 33 bits
 *                                   clear, so k*PIO2_HI is exact for
 *                                   |k| < 2^33, and t is a difference of
 *                                   nearby values
 *   rhi  = t - k*PIO2_LO
 *   rlo  = (t - rhi) - k*PIO2_LO    exact by Fast2Sum
 *   sin(rhi + rlo) = sin(rhi) + rlo*cos(rhi) + O(rlo^2)
 *
 * ## The bound, term by term, for |x| <= 8
 *
 *   reduction, beyond two words   |k| * 4e-27          <= 3e-26
 *   the dropped O(rlo^2) term     rlo^2 / 2            <= 5e-33
 *   Taylor truncation, sin        (pi/4)^19 / 19!      <= 9e-20
 *   Taylor truncation, cos        (pi/4)^20 / 20!      <= 4e-21
 *   polynomial rounding           <= 12 operations on
 *                                 quantities <= 1, at
 *                                 half an ulp each      <= 1.4e-15
 *
 * The last line dominates and is deliberately loose: it assumes every
 * rounding is worst-case and in the same direction, which they are not.
 * `ABS_ERR` below is set from it with room to spare.
 *
 * The bound above is an ANALYSIS, not a machine-checked proof.
 * `test/tier-a/trig.nodetest.mjs` measures the actual worst error against
 * a 70-digit BigInt reference over the whole range, to catch the analysis
 * being wrong: 1.484e-16 on sin and 1.330e-16 on cos over 40,656
 * arguments, including every Cody-Waite quadrant boundary and the two
 * doubles either side of it. The measurement validates the bound; it does
 * not replace it.
 *
 * That file was named here before it existed, and the figures it now
 * reports were quoted in the results and in `OF_DATE_CONTRACT` while no
 * harness in this repository produced them. A measurement nobody can
 * re-run is not a measurement.
 */
import { fail } from './errors.mjs';
import * as I from './interval.mjs';

/** pi/2, split so that k*PIO2_HI is exact for the |k| this module admits. */
const PIO2_HI = 1.57079632673412561417e+00;   // 0x3FF921FB54400000, low 33 bits clear
const PIO2_LO = 6.07710050650619224932e-11;   // the correctly rounded remainder
const TWO_OVER_PI = 0.63661977236758134308;

/**
 * The declared absolute error bound on both outputs, for any |x| <= MAX_ARG.
 * See the header for the term-by-term derivation. Measured worst error is
 * two orders below it.
 */
export const ABS_ERR = 4e-15;

/**
 * Arguments beyond this are REFUSED rather than reduced.
 *
 * Quadrant reduction stays exact only while k*PIO2_HI is exact, and the
 * two-word pi/2 only holds the reduction to 1e-26 while |k| is small. A
 * caller with a large angle has already lost precision forming it and
 * should reduce in its own units -- the nutation series reduces in
 * ARCSECONDS, where `fmod` by a whole turn is exact, which is why it never
 * hands anything large to this module. Silently accepting a huge argument
 * would return an answer whose error nobody had bounded.
 */
export const MAX_ARG = 8;

/**
 * sin and cos of one double, with |error| <= ABS_ERR on each.
 *
 * @param {number} x radians, |x| <= MAX_ARG
 * @returns {{s: number, c: number}}
 */
export function sinCos(x) {
  if (!(Math.abs(x) <= MAX_ARG)) {
    fail('unsupported-option', `this sine needs |x| <= ${MAX_ARG} radians to hold its error bound; got ${x}`);
  }
  const k = Math.round(x * TWO_OVER_PI);
  const t = x - k * PIO2_HI;
  const w = k * PIO2_LO;
  const rhi = t - w;
  const rlo = (t - rhi) - w;          // exact: Fast2Sum, |t| >= |w|

  const z = rhi * rhi;
  // sin(r)/r and cos(r), Horner in z. Coefficients are 1/(2n+1)! and
  // 1/(2n)! written as literals so no runtime division rounds them.
  const sp = rhi * (1
    + z * (-1.6666666666666666e-01
    + z * (8.3333333333333333e-03
    + z * (-1.9841269841269841e-04
    + z * (2.7557319223985891e-06
    + z * (-2.5052108385441719e-08
    + z * (1.6059043836821613e-10
    + z * (-7.6471637318198165e-13
    + z * 2.8114572543455208e-15))))))));
  const cp = 1
    + z * (-5.0000000000000000e-01
    + z * (4.1666666666666666e-02
    + z * (-1.3888888888888889e-03
    + z * (2.4801587301587302e-05
    + z * (-2.7557319223985891e-07
    + z * (2.0876756987868099e-09
    + z * (-1.1470745597729725e-11
    + z * 4.7794773323873853e-14)))))));

  // Fold the reduction residual back through the derivative.
  const sr = sp + rlo * cp;
  const cr = cp - rlo * sp;

  switch (k & 3) {
    case 0: return { s: sr, c: cr };
    case 1: return { s: cr, c: -sr };
    case 2: return { s: -sr, c: -cr };
    default: return { s: -cr, c: sr };
  }
}

export const sin = (x) => sinCos(x).s;
export const cos = (x) => sinCos(x).c;

// --------------------------------------------------------------- intervals
/**
 * sin and cos over an INTERVAL of arguments.
 *
 * The part that is easy to get wrong: the endpoints do not bound a sine
 * over an interval that contains one of its turning points. On
 * [pi/2 - 0.1, pi/2 + 0.1] both endpoints give 0.995 and the true maximum
 * is 1. An enclosure built from endpoints alone is not an enclosure, and
 * every interval that spans a quadrant boundary is such an interval.
 *
 * So the extrema are looked for explicitly: sin peaks at pi/2 + 2k*pi and
 * troughs at -pi/2 + 2k*pi, cos at 2k*pi and pi + 2k*pi. The search for
 * "is there such a point inside [lo, hi]" is done through a GUARD BAND, so
 * a borderline case includes the extremum rather than excluding it.
 * Over-including widens the result, which is safe; under-including would
 * lose the bound.
 */
const TWO_PI = 6.283185307179586;
/**
 * Slack on the extremum test, radians.
 *
 * `phase + k*TWO_PI` carries |k| times the error in the double TWO_PI
 * (2.4e-16) plus its own rounding. |x| <= MAX_ARG = 8 keeps |k| <= 3, so
 * 1e-14 is four orders of margin. Being generous costs only the width of
 * a 1e-14 window in which the sine differs from its extremum by less than
 * 1e-14 anyway.
 */
const GUARD = 1e-14;

/** Is some `phase + k*2pi`, k integer, inside [lo - GUARD, hi + GUARD]? */
function spansPhase(lo, hi, phase) {
  const a = lo - GUARD;
  const b = hi + GUARD;
  if (b - a >= TWO_PI) return true;
  const k = Math.ceil((a - phase) / TWO_PI);
  return phase + k * TWO_PI <= b;
}

const HALF_PI = 1.5707963267948966;
const PI = 3.141592653589793;

/**
 * @param {{lo:number,hi:number}} x radians; |x| <= MAX_ARG at both ends
 * @returns {{s:{lo:number,hi:number}, c:{lo:number,hi:number}}}
 */
export function sinCosInterval(x) {
  if (!(x.hi >= x.lo)) fail('unsupported-option', 'an interval sine needs hi >= lo');
  if (!(Math.abs(x.lo) <= MAX_ARG && Math.abs(x.hi) <= MAX_ARG)) {
    fail('unsupported-option', `this sine needs |x| <= ${MAX_ARG} radians at both ends; got [${x.lo}, ${x.hi}]`);
  }
  const a = sinCos(x.lo);
  const b = sinCos(x.hi);

  let sLo = Math.min(a.s, b.s);
  let sHi = Math.max(a.s, b.s);
  let cLo = Math.min(a.c, b.c);
  let cHi = Math.max(a.c, b.c);

  if (spansPhase(x.lo, x.hi, HALF_PI)) sHi = 1;
  if (spansPhase(x.lo, x.hi, -HALF_PI)) sLo = -1;
  if (spansPhase(x.lo, x.hi, 0)) cHi = 1;
  if (spansPhase(x.lo, x.hi, PI)) cLo = -1;

  // The evaluation allowance, on top of the range. `iv` then adds its own
  // relative widening for the arithmetic that follows.
  return {
    s: I.iv(sLo - ABS_ERR, sHi + ABS_ERR),
    c: I.iv(cLo - ABS_ERR, cHi + ABS_ERR),
  };
}

export const sinInterval = (x) => sinCosInterval(x).s;
export const cosInterval = (x) => sinCosInterval(x).c;
