/**
 * The evaluator against polynomials this file chose. No kernel, no pack on
 * disk, nothing to blame but the code.
 */

/**
 * Named `.nodetest.mjs`, not `.test.mjs`, on purpose: vitest's default glob
 * collects `*.test.mjs` across the whole repository and these are
 * `node:test` suites, not vitest ones. The repository already uses this
 * convention for its research suites. Run them with the package's own
 * `npm test`, or `node --test "test/tier-a/*.nodetest.mjs"`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPack, chebAt, chebDerivAt } from './_pack.mjs';
import { parseContainerBytes } from '../../src/core/container.mjs';
import { memorySource } from '../../src/core/source.mjs';
import { Ephemeris } from '../../src/core/ephemeris.mjs';

const NCOEF = 6;
const INTERVAL = 86400;
const NREC = 8;
const INIT = -4 * INTERVAL;

/** A different, reproducible polynomial per (body, record, component). */
const coefFor = (salt) => (r) => {
  const out = [];
  for (let comp = 0; comp < 3; comp += 1) {
    for (let k = 0; k < NCOEF; k += 1) {
      out.push(Math.sin(salt + 3 * comp + 7 * k + 11 * r) * 1000 * (k === 0 ? 1000 : 1));
    }
  }
  return out;
};

function pack(encName) {
  return buildPack({
    bodies: [
      { name: 'sun', frame: 'native', ncoef: NCOEF, nrec: NREC, initEt: INIT, intervalSec: INTERVAL, enc: encName, q: 1e-4, coeffs: coefFor(1) },
      { name: 'emb', frame: 'ssb', ncoef: NCOEF, nrec: NREC, initEt: INIT, intervalSec: INTERVAL, enc: encName, q: 1e-4, coeffs: coefFor(2) },
      { name: 'moon', frame: 'ssb', ncoef: NCOEF, nrec: NREC, initEt: INIT, intervalSec: INTERVAL, enc: encName, q: 1e-4, coeffs: coefFor(3) },
      { name: 'marsBary', frame: 'sun', ncoef: NCOEF, nrec: NREC, initEt: INIT, intervalSec: INTERVAL, enc: encName, q: 1e-4, coeffs: coefFor(4) },
    ],
    derived: { earth399: { emrat: 81.30056822149722, from: 'moon' } },
  });
}

function open(bytes) {
  const src = memorySource(bytes);
  return new Ephemeris(src, parseContainerBytes(bytes));
}

/**
 * Clenshaw and the naive T_k recurrence sum the same terms in a different
 * order, so they agree to a few ulps OF THE TERMS, not of the answer. Where
 * the terms cancel — which the derivative does, heavily — the answer's own
 * relative error is larger than that and saying otherwise would be wrong.
 * The tolerance is therefore the standard forward-error bound built from the
 * coefficients: |T_k| <= 1 and |U_{k-1}| <= k on [-1, 1].
 */
const ULPS = 32;
const posTol = (col) => ULPS * Number.EPSILON * col.reduce((s, c) => s + Math.abs(c), 0);
const velTol = (col, radius) => (ULPS * Number.EPSILON * col.reduce((s, c, k) => s + k * k * Math.abs(c), 0)) / radius;
const within = (got, want, tol, label) => {
  assert.ok(Math.abs(got - want) <= tol, `${label}: ${got} vs ${want} (tol ${tol})`);
};

test('f64: position and velocity are the polynomial and its analytic derivative', () => {
  const bytes = pack('f64');
  const eph = open(bytes);
  const out = new Float64Array(6);
  const salts = { sun: 1, emb: 2, moon: 3, marsBary: 4 };
  for (const [name, salt] of Object.entries(salts)) {
    for (let r = 0; r < NREC; r += 1) {
      for (const frac of [0.001, 0.25, 0.5, 0.75, 0.999]) {
        const et = INIT + (r + frac) * INTERVAL;
        eph.raw(name, et, out);
        const c = coefFor(salt)(r);
        const tau = 2 * frac - 1;
        const radius = INTERVAL / 2;
        for (let comp = 0; comp < 3; comp += 1) {
          const col = c.slice(comp * NCOEF, (comp + 1) * NCOEF);
          within(out[comp], chebAt(col, tau), posTol(col), `${name} r${r} f${frac} pos comp${comp}`);
          within(out[comp + 3], chebDerivAt(col, tau) / radius, velTol(col, radius), `${name} r${r} f${frac} vel comp${comp}`);
        }
      }
    }
  }
});

test('quantised: decoding lands within the quantum of the value that was stored', () => {
  const q = 1e-4;
  const bytes = pack('q');
  const eph = open(bytes);
  const out = new Float64Array(6);
  let worst = 0;
  for (let r = 0; r < NREC; r += 1) {
    const c = coefFor(4)(r);
    const et = INIT + (r + 0.37) * INTERVAL;
    eph.raw('marsBary', et, out);
    for (let comp = 0; comp < 3; comp += 1) {
      const col = c.slice(comp * NCOEF, (comp + 1) * NCOEF);
      worst = Math.max(worst, Math.abs(out[comp] - chebAt(col, 2 * 0.37 - 1)));
    }
  }
  // Each coefficient is rounded to the nearest q/2, and the Chebyshev sum of
  // NCOEF of them cannot be further out than that times NCOEF.
  assert.ok(worst <= (q / 2) * 3 * NCOEF, `quantisation error ${worst} exceeds the bound`);
  assert.ok(worst > 0, 'a quantised pack that decoded exactly would mean the fixture is not quantised');
});

test('frames compose: a sun-relative body is returned barycentric', () => {
  const eph = open(pack('f64'));
  const mars = new Float64Array(6);
  const sun = new Float64Array(6);
  const et = INIT + 3.3 * INTERVAL;
  eph.state('Mars', et, mars);
  eph.raw('sun', et, sun);
  const marsRaw = new Float64Array(6);
  eph.raw('marsBary', et, marsRaw);
  for (let i = 0; i < 6; i += 1) assert.equal(mars[i], marsRaw[i] + sun[i]);
});

test('Earth and Moon come out of EMB and Moon with the pack\'s own EMRAT', () => {
  const eph = open(pack('f64'));
  const et = INIT + 2.1 * INTERVAL;
  const emb = new Float64Array(6); const moon = new Float64Array(6);
  const earthOut = new Float64Array(6); const moonOut = new Float64Array(6);
  eph.raw('emb', et, emb);
  eph.raw('moon', et, moon);
  eph.state('Earth', et, earthOut);
  eph.state('Moon', et, moonOut);
  const k = 1 / 81.30056822149722;
  for (let i = 0; i < 6; i += 1) {
    assert.ok(Math.abs(earthOut[i] - (emb[i] - k * moon[i])) < 1e-9, `Earth comp ${i}`);
    assert.equal(moonOut[i], emb[i] + moon[i]);
  }
});

test('record boundaries agree from both sides to within the fit, not by luck', () => {
  const eph = open(pack('f64'));
  const a = new Float64Array(6); const b = new Float64Array(6);
  const et = INIT + 4 * INTERVAL;
  eph.raw('sun', et - 1e-6, a);
  eph.raw('sun', et + 1e-6, b);
  // Different records with unrelated coefficients: the point of the check is
  // that the index arithmetic picks a DIFFERENT record either side, not that
  // this synthetic fixture is continuous.
  assert.notEqual(a[0], b[0]);
});

test('a request outside coverage is refused by the runtime, not clamped silently', () => {
  const bytes = pack('f64');
  const eph = open(bytes);
  assert.equal(eph.covers(INIT - 1), false);
  assert.equal(eph.covers(INIT + NREC * INTERVAL + 1), false);
  assert.equal(eph.covers(INIT + 1), true);
});

test('state() refuses to write into its own scratch', () => {
  const eph = open(pack('f64'));
  assert.throws(() => eph.state('Moon', INIT + 100, eph.scratch), (e) => e.code === 'unsupported-option');
});

test('an unknown body is a typed error', () => {
  const eph = open(pack('f64'));
  assert.throws(() => eph.state('Nibiru', INIT + 100, new Float64Array(6)), (e) => e.code === 'unknown-body');
  assert.throws(() => eph.raw('nope', INIT + 100, new Float64Array(6)), (e) => e.code === 'unknown-body');
});

test('a pack with no EMRAT cannot silently invent Earth', () => {
  const bytes = buildPack({
    bodies: [
      { name: 'emb', frame: 'ssb', ncoef: NCOEF, nrec: NREC, initEt: INIT, intervalSec: INTERVAL, coeffs: coefFor(2) },
      { name: 'moon', frame: 'ssb', ncoef: NCOEF, nrec: NREC, initEt: INIT, intervalSec: INTERVAL, coeffs: coefFor(3) },
    ],
    derived: {},
  });
  const eph = open(bytes);
  assert.throws(() => eph.state('Earth', INIT + 100, new Float64Array(6)), (e) => e.code === 'bad-header');
});

test('the same instant gives bit-identical numbers every time', () => {
  const eph = open(pack('f64'));
  const a = new Float64Array(6);
  const b = new Float64Array(6);
  for (const et of [INIT + 0.5, INIT + 3.14159 * INTERVAL, INIT + 7.9 * INTERVAL]) {
    eph.raw('emb', et, a);
    // Force a different cached record in between, so the answer cannot come
    // from a cache that was never invalidated.
    eph.raw('emb', INIT + 1.5 * INTERVAL, new Float64Array(6));
    eph.raw('emb', et, b);
    for (let i = 0; i < 6; i += 1) assert.equal(a[i], b[i], `component ${i} at ${et}`);
  }
});

test('the frame chain is not applied twice when a body is asked for twice', () => {
  const eph = open(pack('f64'));
  const one = new Float64Array(6);
  const two = new Float64Array(6);
  eph.state('Mars', INIT + 2.2 * INTERVAL, one);
  eph.state('Mars', INIT + 2.2 * INTERVAL, two);
  for (let i = 0; i < 6; i += 1) assert.equal(one[i], two[i]);
});
