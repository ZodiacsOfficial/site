/**
 * The measurement `trig.mjs`'s header promises: the ACTUAL worst error of
 * `sinCos` against a high-precision reference, over the whole admitted
 * range.
 *
 * This file exists because the header named it and it did not exist. The
 * bound `ABS_ERR = 4e-15` was, and remains, an ANALYSIS -- a term-by-term
 * derivation in that header, not a machine-checked proof. What was missing
 * was the other half: a measurement that would catch the analysis being
 * wrong. A claim of "measured at N against an M-digit reference" with no
 * harness in the repository is a claim about a probe nobody can re-run,
 * and it was being shipped inside `OF_DATE_CONTRACT.evaluation`, where a
 * consumer reads it.
 *
 * ## The reference
 *
 * Fixed-point BigInt at 10^-70, which is far below anything double
 * arithmetic can express, so the reference's own error does not enter the
 * comparison at the digits being measured.
 *
 *  * the double under test is decomposed EXACTLY from its bits, so the
 *    reference is evaluated at the same real number the function received
 *    rather than at a decimal that is merely close to it;
 *  * pi is a literal to 80 digits, reduction is one exact BigInt division;
 *  * sin and cos are Taylor series run until the term is zero at this
 *    scale, which for |r| <= pi/2 is about 30 terms.
 *
 * It shares nothing with `trig.mjs`: no Cody-Waite, no two-word pi/2, no
 * double arithmetic anywhere in the evaluation.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { sinCos, ABS_ERR, MAX_ARG } from '../../src/core/trig.mjs';

// ------------------------------------------------------- the reference
const DIGITS = 70n;
const SCALE = 10n ** DIGITS;

/** pi to 80 decimal places. */
const PI_DIGITS = '31415926535897932384626433832795028841971693993751058209749445923078164062862089';
const PI = BigInt(PI_DIGITS.slice(0, Number(DIGITS) + 1));
const TWO_PI = PI * 2n;

const mul = (a, b) => (a * b) / SCALE;

/** A double, exactly, as a BigInt scaled by 10^70. No decimal round-trip. */
function exactScaled(x) {
  if (x === 0) return 0n;
  const buf = new DataView(new ArrayBuffer(8));
  buf.setFloat64(0, x);
  const bits = buf.getBigUint64(0);
  const sign = (bits >> 63n) & 1n ? -1n : 1n;
  const rawExp = Number((bits >> 52n) & 0x7ffn);
  const rawMan = bits & 0xfffffffffffffn;
  // Normal: (1.man) * 2^(e-1023). Subnormal: (0.man) * 2^-1022.
  const man = rawExp === 0 ? rawMan : rawMan | (1n << 52n);
  const exp = (rawExp === 0 ? -1022 : rawExp - 1023) - 52;
  let v = sign * man * SCALE;
  if (exp >= 0) v *= 1n << BigInt(exp);
  else v /= 1n << BigInt(-exp);
  return v;
}

/** sin and cos of a scaled BigInt, by reduction then Taylor. */
function sinCosExact(xs) {
  // Reduce to [-pi, pi]. Round-half-away division, in BigInt.
  let k = (xs * 2n + (xs >= 0n ? TWO_PI : -TWO_PI)) / (TWO_PI * 2n);
  let r = xs - k * TWO_PI;
  while (r > PI) { r -= TWO_PI; }
  while (r < -PI) { r += TWO_PI; }

  let term = r;
  let s = r;
  let n = 1n;
  while (term !== 0n) {
    term = -mul(mul(term, r), r) / ((2n * n) * (2n * n + 1n));
    s += term;
    n += 1n;
  }
  let cterm = SCALE;
  let c = SCALE;
  n = 1n;
  while (cterm !== 0n) {
    cterm = -mul(mul(cterm, r), r) / ((2n * n - 1n) * (2n * n));
    c += cterm;
    n += 1n;
  }
  return { s, c };
}

/** |approx - exact| as a double, where exact is scaled by 10^70. */
const absErr = (approx, exact) => Number((exactScaled(approx) - exact) < 0n
  ? exact - exactScaled(approx)
  : exactScaled(approx) - exact) / Number(SCALE);

// --------------------------------------------- the reference is sound
test('the BigInt reference agrees with Math.sin to about a double ulp', () => {
  // Not a check of `trig.mjs`. If the reference itself were wrong the
  // measurement below would be meaningless, so it is pinned against a
  // completely different implementation first -- the host's own, whose
  // error is unspecified but is in practice within an ulp or two.
  let worst = 0;
  for (let i = -80; i <= 80; i += 1) {
    const x = i / 10;
    const { s, c } = sinCosExact(exactScaled(x));
    worst = Math.max(worst, Math.abs(Number(s) / Number(SCALE) - Math.sin(x)));
    worst = Math.max(worst, Math.abs(Number(c) / Number(SCALE) - Math.cos(x)));
  }
  assert.ok(worst < 1e-15, `the reference disagrees with Math.sin by ${worst}`);
});

test('the reference reproduces values that are known in closed form', () => {
  const at = (x) => sinCosExact(exactScaled(x));
  const near = (got, want, tol, what) => assert.ok(
    Math.abs(Number(got) / Number(SCALE) - want) < tol, `${what}: ${Number(got) / Number(SCALE)} vs ${want}`,
  );
  near(at(0).s, 0, 1e-60, 'sin 0');
  near(at(0).c, 1, 1e-60, 'cos 0');
  // pi/6 and pi/4, to the accuracy the double argument itself allows.
  // `Math.PI / 6` is not pi/6: it is the nearest double to it, about
  // 1e-17 away, and the reference is evaluated at THAT number. So the
  // closed-form value is reached only to within the argument's own error
  // times the derivative -- a few times 1e-16, not 1e-60. Tightening this
  // tolerance would be asserting that a double equals an irrational.
  near(at(Math.PI / 6).s, 0.5, 1e-15, 'sin pi/6');
  near(at(Math.PI / 4).s, Math.SQRT1_2, 1e-15, 'sin pi/4');
  near(at(Math.PI / 4).c, Math.SQRT1_2, 1e-15, 'cos pi/4');
});

// ------------------------------------- the measurement the header promises
/**
 * A grid dense enough to land inside every quadrant of the Cody-Waite
 * reduction, plus the reduction boundaries themselves and their immediate
 * neighbours, which is where a two-word reduction goes wrong if it is
 * going to.
 */
function argumentsToMeasure() {
  const xs = [];
  const N = 40000;
  for (let i = 0; i <= N; i += 1) xs.push(-MAX_ARG + (2 * MAX_ARG * i) / N);
  // The quadrant boundaries: k*pi/2 for every k the range admits, and the
  // two doubles either side of each.
  for (let k = -6; k <= 6; k += 1) {
    const b = (k * Math.PI) / 2;
    if (Math.abs(b) > MAX_ARG) continue;
    for (const d of [-2, -1, 0, 1, 2]) {
      let v = b;
      for (let j = 0; j < Math.abs(d); j += 1) v = d < 0 ? prevDouble(v) : nextDouble(v);
      xs.push(v);
    }
  }
  // Very small arguments, where cancellation in the polynomial is worst.
  for (let e = -300; e <= -1; e += 1) xs.push(2 ** e, -(2 ** e));
  return xs;
}
const step = (x, dir) => {
  if (x === 0) return dir > 0 ? Number.MIN_VALUE : -Number.MIN_VALUE;
  const buf = new DataView(new ArrayBuffer(8));
  buf.setFloat64(0, x);
  const bits = buf.getBigUint64(0);
  buf.setBigUint64(0, bits + BigInt((x > 0) === (dir > 0) ? 1 : -1));
  return buf.getFloat64(0);
};
const nextDouble = (x) => step(x, +1);
const prevDouble = (x) => step(x, -1);

test('sinCos is within its declared bound everywhere it is measured', () => {
  const xs = argumentsToMeasure();
  let worstSin = 0;
  let worstCos = 0;
  let atSin = 0;
  let atCos = 0;
  for (const x of xs) {
    const got = sinCos(x);
    const want = sinCosExact(exactScaled(x));
    const es = absErr(got.s, want.s);
    const ec = absErr(got.c, want.c);
    if (es > worstSin) { worstSin = es; atSin = x; }
    if (ec > worstCos) { worstCos = ec; atCos = x; }
  }
  const worst = Math.max(worstSin, worstCos);
  // The declared bound. This is the assertion that matters: if the
  // term-by-term analysis in the header is wrong, this fails.
  assert.ok(worstSin <= ABS_ERR, `sin worst error ${worstSin} at x = ${atSin}, over the declared ${ABS_ERR}`);
  assert.ok(worstCos <= ABS_ERR, `cos worst error ${worstCos} at x = ${atCos}, over the declared ${ABS_ERR}`);

  // And the figure the documents quote. Kept as a LOOSE ceiling rather
  // than an equality: it is a measurement over this grid, and a denser
  // grid may find a slightly worse point. What must not happen silently
  // is the measured error climbing toward the bound.
  assert.ok(worst < 1e-15,
    `measured worst error ${worst} has climbed above 1e-15; the documents quote 2e-16 and the bound is ${ABS_ERR}`);

  // Reported so a reader of the test output sees the number rather than
  // taking the documents' word for it.
  process.stderr.write(`# sinCos over ${xs.length} arguments: worst sin ${worstSin.toExponential(3)}, worst cos ${worstCos.toExponential(3)}\n`);
});

test('the bound is declared for the range it is measured over, and refuses outside it', () => {
  assert.equal(ABS_ERR, 4e-15);
  assert.equal(MAX_ARG, 8);
  for (const bad of [MAX_ARG + 1e-9, -MAX_ARG - 1e-9, 1e3, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => sinCos(bad), (e) => e.code === 'unsupported-option', `accepted ${bad}`);
  }
});
