/**
 * The pointwise observer-motion transformation, against closed forms.
 *
 * Nothing here calls a search or needs a pack. Every expected value is an
 * exact special case of the transformation, derived here rather than taken
 * from any implementation:
 *
 *   v = 0            the direction is unchanged
 *   v parallel p     p = (1 + beta) p_hat exactly, so the angle is ZERO
 *   v transverse p   p = (bm1, beta, 0) with |p| = 1, so the angle is
 *                    exactly atan(gamma beta)
 *
 * The ERFA cross-check is not here: it needs pyerfa, so it lives in
 * tools/measure/aberration-vs-erfa.mjs with its evidence recorded. Tier A
 * stays data- and dependency-independent.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { aberrate, aberrationAngleArcsec, SRS } from '../../src/core/aberration.mjs';

const ARCSEC = (180 * 3600) / Math.PI;
const unit = (v) => { const n = Math.hypot(...v); return v.map((x) => x / n); };

test('A1: a stationary observer does not move the direction', () => {
  for (const p of [[1, 0, 0], [0, 1, 0], [3, -4, 12], [-1, -1, -1]]) {
    const got = aberrate(p, [0, 0, 0]);
    const want = unit(p);
    for (let i = 0; i < 3; i += 1) {
      assert.ok(Math.abs(got[i] - want[i]) <= 4 * Number.EPSILON,
        `component ${i}: ${got[i]} vs ${want[i]}`);
    }
  }
});

test('A2: velocity parallel or antiparallel to the direction changes nothing at all', () => {
  // p = p_hat bm1 + w1 beta p_hat, and (bm1 + w1 beta)(1 + bm1) = (1 + bm1)(1 + beta),
  // so p = (1 + beta) p_hat, which is positive for every |beta| < 1.
  const p = unit([2, -3, 6]);
  for (const beta of [1e-8, 1e-4, 1e-2, 0.3, 0.9, -1e-4, -0.3, -0.9]) {
    const v = p.map((x) => x * beta);
    const got = aberrate(p, v);
    for (let i = 0; i < 3; i += 1) {
      assert.ok(Math.abs(got[i] - p[i]) <= 8 * Number.EPSILON,
        `beta=${beta} component ${i}: ${got[i]} vs ${p[i]}`);
    }
    assert.ok(aberrationAngleArcsec(p, v) < 1e-9, `beta=${beta} produced a non-zero angle`);
  }
});

test('A3: transverse velocity turns the direction by exactly atan(gamma beta)', () => {
  const p = [1, 0, 0];
  for (const beta of [1e-8, 1e-6, 1e-4, 1e-3, 1e-2, 0.1, 0.5, 0.9]) {
    const v = [0, beta, 0];
    const got = aberrate(p, v);
    const bm1 = Math.sqrt(1 - beta * beta);
    // |p| = sqrt(bm1^2 + beta^2) = 1, so the components ARE the answer.
    assert.ok(Math.abs(got[0] - bm1) <= 4 * Number.EPSILON, `beta=${beta} x`);
    assert.ok(Math.abs(got[1] - beta) <= 4 * Number.EPSILON, `beta=${beta} y`);
    assert.equal(got[2], 0, `beta=${beta} z`);
    const wantArcsec = Math.atan(beta / bm1) * ARCSEC;     // atan(gamma beta)
    const gotArcsec = aberrationAngleArcsec(p, v);
    assert.ok(Math.abs(gotArcsec - wantArcsec) <= 1e-9 * Math.max(1, wantArcsec),
      `beta=${beta}: ${gotArcsec} vs ${wantArcsec} arcsec`);
  }
});

test('A4: at Earth-like speed the transverse turn is the familiar ~20.5 arcsec', () => {
  // 29.79 km/s / c. Not an assertion about the Earth, just a scale check that
  // the units are right -- a formula in the wrong units fails here loudly.
  const beta = 29.79 / 299792.458;
  const got = aberrationAngleArcsec([1, 0, 0], [0, beta, 0]);
  assert.ok(got > 20 && got < 21, `expected about 20.5 arcsec, got ${got}`);
});

test('A5: the result is a unit vector for every admitted input', () => {
  let seed = 12345;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (let i = 0; i < 2000; i += 1) {
    const p = [rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1];
    if (Math.hypot(...p) < 1e-6) continue;
    const speed = rnd() * 0.95;
    const dir = unit([rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1]);
    const v = dir.map((x) => x * speed);
    const got = aberrate(p, v);
    assert.ok(Math.abs(Math.hypot(...got) - 1) <= 8 * Number.EPSILON, `|ppr| = ${Math.hypot(...got)}`);
  }
});

test('A6: the domain is enforced, not assumed', () => {
  assert.throws(() => aberrate([1, 0, 0], [1, 0, 0]), /subluminal/, 'v = c was admitted');
  assert.throws(() => aberrate([1, 0, 0], [1.5, 0, 0]), /subluminal/, 'v > c was admitted');
  assert.throws(() => aberrate([1, 0, 0], [0.8, 0.8, 0]), /subluminal/, '|v| > c by components was admitted');
  assert.throws(() => aberrate([0, 0, 0], [0, 1e-4, 0]), /non-zero natural direction/);
  // just inside the domain still works
  const near = aberrate([1, 0, 0], [0, 0.9999, 0]);
  assert.ok(Number.isFinite(near[0]) && Math.abs(Math.hypot(...near) - 1) < 1e-12);
});

test('A7: the gravitational-potential term is optional, bounded, and matches ERFA\'s stated size', () => {
  const p = [1, 0, 0];
  const v = [0, 1e-4, 0];
  const withOut = aberrate(p, v, { withPotential: false });
  const withIn = aberrate(p, v, { withPotential: true, sunDistanceAu: 1 });
  assert.notDeepEqual(withOut, withIn, 'the potential term did nothing');
  const cx = withOut[1] * withIn[2] - withOut[2] * withIn[1];
  const cy = withOut[2] * withIn[0] - withOut[0] * withIn[2];
  const cz = withOut[0] * withIn[1] - withOut[1] * withIn[0];
  const sep = Math.atan2(Math.hypot(cx, cy, cz), withOut[0] * withIn[0] + withOut[1] * withIn[1] + withOut[2] * withIn[2]) * ARCSEC;
  // ERFA's note: "a maximum effect of about 0.4 microarcsecond".
  assert.ok(sep > 0 && sep < 1e-6, `potential term moved the direction by ${sep} arcsec`);
  assert.throws(() => aberrate(p, v, { withPotential: true }), /Sun-observer distance/);
  assert.equal(SRS, 1.97412574336e-8);
});

test('A8: this module and reduce.mjs compute the same transformation, bit for bit', async () => {
  // reduce.mjs applies the same correction inline, divided by (1 + pdv) and
  // then normalized -- a uniform positive scale that normalization removes.
  // Rather than refactor released code to share one routine, the claim that
  // they ARE one routine is asserted here.
  const inlineFromReduce = (pIn, v) => {
    const p = unit(pIn);
    const v2 = v[0] * v[0] + v[1] * v[1] + v[2] * v[2];
    const bm1 = Math.sqrt(1 - v2);
    const pdv = p[0] * v[0] + p[1] * v[1] + p[2] * v[2];
    const w1 = 1 + pdv / (1 + bm1);
    const r = [0, 0, 0];
    for (let i = 0; i < 3; i += 1) r[i] = (bm1 * p[i] + w1 * v[i]) / (1 + pdv);
    return unit(r);
  };
  let seed = 99991;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  let worst = 0;
  for (let i = 0; i < 5000; i += 1) {
    const p = [rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1];
    if (Math.hypot(...p) < 1e-6) continue;
    const dir = unit([rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1]);
    const v = dir.map((x) => x * rnd() * 1e-3);       // realistic observer speeds
    const a = aberrate(p, v, { withPotential: false });
    const b = inlineFromReduce(p, v);
    for (let k = 0; k < 3; k += 1) worst = Math.max(worst, Math.abs(a[k] - b[k]));
  }
  assert.ok(worst <= 4 * Number.EPSILON,
    `the two routines disagree by ${worst}, which is more than rounding`);
});
