/**
 * validated-retarded-geometric, against geometry with closed-form or
 * independently derived answers.
 *
 * Every expected value here comes from analytic formulae or from a plain
 * fixed-point-plus-bisection reference written in this file — never from
 * calling the solver under test and believing it.
 *
 * The cases are L1..L12 of RETARDED-PREREGISTRATION.md, in order.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPack } from './_pack.mjs';
import { parseContainerBytes } from '../../src/core/container.mjs';
import { memorySource } from '../../src/core/source.mjs';
import { Ephemeris } from '../../src/core/ephemeris.mjs';
import { searchRetardedLongitude, RETARDED_CONTRACT } from '../../src/core/retarded-search.mjs';
import { solveTau, targetWeights, observerWeights, C_KM_S } from '../../src/core/retarded.mjs';

const DAY = 86400;
const EMRAT = 81.30056822149722;
const EPS0 = ((84381.406 / 3600) * Math.PI) / 180;
const CE = Math.cos(EPS0);
const SE = Math.sin(EPS0);

/** Chebyshev coefficients of g on [lo, hi], by discrete cosine fit. */
function fit(g, lo, hi, n) {
  const m = 4 * n;
  const xs = [];
  const ys = [];
  for (let j = 0; j < m; j += 1) {
    const tau = Math.cos((Math.PI * (j + 0.5)) / m);
    xs.push(tau);
    ys.push(g(lo + ((tau + 1) / 2) * (hi - lo)));
  }
  const c = new Array(n).fill(0);
  for (let k = 0; k < n; k += 1) {
    let s = 0;
    for (let j = 0; j < m; j += 1) s += ys[j] * Math.cos(k * Math.acos(xs[j]));
    c[k] = ((k === 0 ? 1 : 2) / m) * s;
  }
  return c;
}

/**
 * A pack whose `marsBary` series IS the target path and whose `emb`
 * series IS the observer path. `moon` is zero, so Earth = emb exactly and
 * the observer is whatever `observerFn` says.
 */
function packOf(targetFn, observerFn, { ncoef = 20, nrec = 40, intervalSec = DAY, initEt = -20 * DAY } = {}) {
  const zeros = () => new Array(ncoef).fill(0);
  const series = (fn) => (r) => {
    const lo = initEt + r * intervalSec;
    const hi = lo + intervalSec;
    return [0, 1, 2].flatMap((comp) => fit((t) => fn(t)[comp], lo, hi, ncoef));
  };
  const bytes = buildPack({
    bodies: [
      { name: 'sun', frame: 'native', ncoef, nrec, initEt, intervalSec, coeffs: () => [...zeros(), ...zeros(), ...zeros()] },
      { name: 'emb', frame: 'ssb', ncoef, nrec, initEt, intervalSec, coeffs: series(observerFn) },
      { name: 'moon', frame: 'ssb', ncoef, nrec, initEt, intervalSec, coeffs: () => [...zeros(), ...zeros(), ...zeros()] },
      { name: 'marsBary', frame: 'ssb', ncoef, nrec, initEt, intervalSec, coeffs: series(targetFn) },
    ],
    derived: { earth399: { emrat: EMRAT, from: 'moon' } },
  });
  return new Ephemeris(memorySource(bytes), parseContainerBytes(bytes));
}

// ---------------------------------------------------- analytic reference
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const norm3 = (v) => Math.hypot(v[0], v[1], v[2]);

/** The fixed point, by plain iteration. Independent of the solver. */
function tauExact(targetFn, observerFn, t, iterations = 400) {
  let x = 0;
  const o = observerFn(t);
  for (let i = 0; i < iterations; i += 1) x = norm3(sub3(targetFn(t - x), o)) / C_KM_S;
  return x;
}

function fExact(targetFn, observerFn, t, L) {
  const x = tauExact(targetFn, observerFn, t);
  const d = sub3(targetFn(t - x), observerFn(t));
  const l = (L * Math.PI) / 180;
  return Math.sin(l) * d[0] - Math.cos(l) * (CE * d[1] + SE * d[2]);
}

/**
 * The half-plane, analytically. f vanishes on the whole LINE through the
 * target longitude, so its roots include the antipode; g > 0 is what
 * separates the requested direction from the opposite one. A reference
 * that forgets this reports crossings the operation is right to drop --
 * which is exactly what L9 caught on its first run.
 */
function gExact(targetFn, observerFn, t, L) {
  const x = tauExact(targetFn, observerFn, t);
  const d = sub3(targetFn(t - x), observerFn(t));
  const l = (L * Math.PI) / 180;
  return Math.cos(l) * d[0] + Math.sin(l) * (CE * d[1] + SE * d[2]);
}

/** Bisect the analytic f. Returns null when the ends do not straddle. */
function rootExact(targetFn, observerFn, L, a, b) {
  let fa = fExact(targetFn, observerFn, a, L);
  const fb = fExact(targetFn, observerFn, b, L);
  if (Math.sign(fa) === Math.sign(fb)) return null;
  let lo = a;
  let hi = b;
  for (let i = 0; i < 200; i += 1) {
    const m = (lo + hi) / 2;
    const fm = fExact(targetFn, observerFn, m, L);
    if (Math.sign(fm) === Math.sign(fa)) { lo = m; fa = fm; } else hi = m;
  }
  return (lo + hi) / 2;
}

const ORIGIN = () => [0, 0, 0];

/**
 * A point at ECLIPTIC longitude `lam` and radius `R`, expressed in the
 * equatorial frame the pack stores.
 *
 * The first version of the tangency case set the equatorial azimuth to
 * the target longitude and expected f to vanish. It does not: the
 * operation reads the ecliptic longitude
 * `atan2(cos(e) y_eq + sin(e) z_eq, x_eq)`, so an equatorial azimuth of
 * L is an ecliptic longitude of something else, and f sat at 5.8e5 km
 * throughout. Rotating properly is the difference between a case that
 * tests a tangency and a case that tests nothing.
 */
const atEclipticLongitude = (lam, R) => [R * Math.cos(lam), R * Math.sin(lam) * CE, R * Math.sin(lam) * SE];
const search = (eph, spec) => searchRetardedLongitude(eph, { body: 'Mars', ...spec });

// ------------------------------------------------------------- L1 .. L4
test('L1: a stationary target gives tau = D/c exactly', () => {
  const P = [2e8, 0, 0];
  const eph = packOf(() => P, ORIGIN);
  const got = solveTau(eph, targetWeights(eph, 'Mars'), 0, [0, 0, 0], 1e-3, null);
  assert.ok(Math.abs(got.tau - norm3(P) / C_KM_S) <= 1e-9, `tau ${got.tau} against exact ${norm3(P) / C_KM_S}`);
  assert.ok(got.errorSec <= 1e-9);
});

test('L2: a radial constant-velocity target matches the closed form', () => {
  // r_T(t) = (R + V t) xhat, observer at the origin.
  // c tau = R + V (t - tau)  =>  tau = (R + V t) / (c + V)
  const R = 2e8;
  const V = 25;
  const targetFn = (t) => [R + V * t, 0, 0];
  const eph = packOf(targetFn, ORIGIN);
  for (const t of [-5 * DAY, 0, 3.25 * DAY]) {
    const exact = (R + V * t) / (C_KM_S + V);
    const got = solveTau(eph, targetWeights(eph, 'Mars'), t, [0, 0, 0], V / C_KM_S, null);
    assert.ok(Math.abs(got.tau - exact) <= 1e-9, `t=${t}: tau ${got.tau} against ${exact}`);
  }
});

test('L3: the observer is NOT retarded — a stationary target settles in one step', () => {
  // With the target stationary, tau = |P - r_O(t)|/c with NO tau on the
  // right, so the fixed point is reached immediately. A solver that
  // retarded the observer would use r_O(t - tau) instead, and at 30 km/s
  // over a ~667 s light-time that observer is 20,000 km away.
  const P = [2e8, 0, 0];
  const Wv = 30;
  const observerFn = (t) => [0, Wv * t, 0];
  const eph = packOf(() => P, observerFn);
  const t = 4 * DAY;
  const o = observerFn(t);
  const correct = norm3(sub3(P, o)) / C_KM_S;
  const wrong = (() => { let x = correct; for (let i = 0; i < 50; i += 1) x = norm3(sub3(P, observerFn(t - x))) / C_KM_S; return x; })();
  assert.ok(Math.abs(correct - wrong) > 1e-4, `the two conventions must differ measurably here, they differ by ${Math.abs(correct - wrong)} s`);
  const got = solveTau(eph, targetWeights(eph, 'Mars'), t, o, 1e-6, null);
  assert.ok(Math.abs(got.tau - correct) <= 1e-9, `tau ${got.tau} against the reception-observer answer ${correct}`);
  assert.ok(Math.abs(got.tau - wrong) > 1e-5, 'the solver produced the retarded-observer answer');
});

test('L4: both moving — the two observer conventions are distinguished, and the right one is used', () => {
  const R = 2e8;
  const Wt = (2 * Math.PI) / (400 * DAY);
  const targetFn = (t) => [R * Math.cos(Wt * t), R * Math.sin(Wt * t), 0];
  const observerFn = (t) => [1e6 * Math.sin(Wt * 8 * t), 40 * t, 0];
  const eph = packOf(targetFn, observerFn);
  const t = 2.5 * DAY;
  const correct = tauExact(targetFn, observerFn, t);
  const wrong = (() => { let x = correct; for (let i = 0; i < 80; i += 1) x = norm3(sub3(targetFn(t - x), observerFn(t - x))) / C_KM_S; return x; })();
  assert.ok(Math.abs(correct - wrong) > 1e-3, `the conventions differ by only ${Math.abs(correct - wrong)} s here, so this case decides nothing`);
  const got = solveTau(eph, targetWeights(eph, 'Mars'), t, observerFn(t), 1e-3, null);
  assert.ok(Math.abs(got.tau - correct) <= 1e-6, `tau ${got.tau} against ${correct}`);
});

// ------------------------------------------------------------- L5 .. L7
test('L5: the emission time crosses record boundaries the reception time does not', () => {
  // 200-second records and a ~667-second light-time: emission is three or
  // four records behind reception, so the enclosure has to walk them.
  const R = 2e8;
  const Wt = (2 * Math.PI) / (400 * DAY);
  const targetFn = (t) => [R * Math.cos(Wt * t), R * Math.sin(Wt * t), 0];
  const eph = packOf(targetFn, ORIGIN, { intervalSec: 200, nrec: 400, initEt: -40000 });
  const tau = norm3(targetFn(0)) / C_KM_S;
  assert.ok(tau > 3 * 200, `the light-time ${tau} s must span several 200 s records for this case to bite`);
  const t = 1000;
  const got = solveTau(eph, targetWeights(eph, 'Mars'), t, [0, 0, 0], 1e-3, null);
  assert.ok(Math.abs(got.tau - tauExact(targetFn, ORIGIN, t)) <= 1e-6);
  // And a search over a window whose emissions sit in earlier records.
  const r = search(eph, { targetDeg: 0.0001, fromTdbSec: 800, toTdbSec: 30000 });
  assert.equal(r.execution.status, 'finished');
  assert.ok(r.uncertainty.numerical.widestEmissionWindowSec > 0);
});

test('L6: a near-zero separation is refused, not answered', () => {
  // The target runs at 30 km/s along the ECLIPTIC longitude 45 line and
  // passes exactly through the observer at t = 0, so |d| -> 0 there and
  // the direction is undefined at one interior point.
  //
  // Getting this case to test what it claims took three tries. Crawling
  // at 1e-3 km/s over two days barely moved the target, so the cells
  // near the origin failed the ROOT tests, not the separation test, and
  // the case spent seventy seconds bisecting to the floor to say
  // something else. Running along the x axis instead put the whole path
  // on the requested longitude's own line: f vanished identically, which
  // is a degenerate root function and again not a separation failure.
  //
  // A 30 degree offset between the motion and the request fixes both. On
  // the line d = s * uhat(45deg), so f = s sin(30deg) and
  // g = s cos(30deg): each vanishes only at s = 0, exactly where the
  // separation does. Away from the origin |f| grows at 15 km/s and the
  // cells exclude cleanly; the cells that straddle it cannot, and the
  // reason has to be the separation.
  const MOVE = 45 * (Math.PI / 180);
  const dir = atEclipticLongitude(MOVE, 1);
  const targetFn = (t) => [30 * t * dir[0], 30 * t * dir[1], 30 * t * dir[2]];
  const eph = packOf(targetFn, ORIGIN);
  const r = search(eph, { targetDeg: 75, fromTdbSec: -1000, toTdbSec: 1000 });
  assert.equal(r.completeness.established, false);
  assert.equal(r.eventCount.isExactTotal, false);
  assert.ok(r.accounting.unresolved.length > 0);
  const why = r.accounting.unresolved.map((u) => u.why).join(' | ');
  assert.ok(/cannot be shown to be separated/i.test(why), `expected a separation refusal somewhere, got ${why.slice(0, 300)}`);
  // And the refusal is LOCAL: the singular point is the only thing left
  // open, not the whole window.
  const open = r.accounting.unresolved.reduce((sum, u) => sum + (u.toTdbSec - u.fromTdbSec), 0);
  assert.ok(open <= 4, `the undecided region is ${open} s wide, so the refusal is not local to the singularity`);
  assert.ok(r.accounting.unresolved.every((u) => u.fromTdbSec <= 2 && u.toTdbSec >= -2), 'an undecided cell sits away from the singularity');
});

test('L7: a target faster than light does not get a contraction, and the result says so', () => {
  const targetFn = (t) => [2e8 + 4e5 * t, 0, 0];   // 4e5 km/s, above c
  const eph = packOf(targetFn, ORIGIN);
  const r = search(eph, { targetDeg: 0, fromTdbSec: -DAY, toTdbSec: DAY });
  assert.equal(r.completeness.established, false);
  assert.equal(r.eventCount.isExactTotal, false);
  const why7 = r.accounting.unresolved.map((u) => u.why).join(' | ');
  assert.ok(/not below c|contraction/i.test(why7), `expected a contraction refusal somewhere, got ${why7.slice(0, 300)}`);
});

// ------------------------------------------------------------ L8 .. L11
const CIRCLE = (() => {
  const R = 2e8;
  const Wt = (2 * Math.PI) / (400 * DAY);
  return { R, Wt, fn: (t) => [R * Math.cos(Wt * t), R * Math.sin(Wt * t), 0] };
})();

test('L8: roots at the interval ends are reported once each, not twice and not never', () => {
  const eph = packOf(CIRCLE.fn, ORIGIN);
  const inner = search(eph, { targetDeg: 3, fromTdbSec: -14 * DAY, toTdbSec: 14 * DAY });
  assert.equal(inner.completeness.established, true);
  assert.equal(inner.events.length, 1, 'the reference geometry must have exactly one crossing here');
  const root = inner.events[0].tdbSec;
  for (const [label, from, to] of [['start', root, root + 6 * DAY], ['end', root - 6 * DAY, root]]) {
    const r = search(eph, { targetDeg: 3, fromTdbSec: from, toTdbSec: to });
    const n = r.events.length;
    assert.ok(n <= 1, `${label}: one root reported ${n} times`);
    if (n === 1) assert.ok(Math.abs(r.events[0].tdbSec - root) < 1, `${label}: the event moved`);
  }
});

test('L9: a window with no crossing is a proven zero', () => {
  const eph = packOf(CIRCLE.fn, ORIGIN);
  const r = search(eph, { targetDeg: 180, fromTdbSec: -5 * DAY, toTdbSec: 5 * DAY });
  assert.equal(r.execution.status, 'finished');
  assert.equal(r.completeness.established, true);
  assert.equal(r.eventCount.found, 0);
  assert.equal(r.eventCount.isExactTotal, true);
  // The analytic reference does find a root of f here, at t = 667.13 s --
  // the ANTIPODE, because the body sits at longitude 0 and f vanishes on
  // the whole line. g < 0 there, so it is not a crossing of 180 degrees
  // and the operation is right to drop it. Asserted both ways.
  const antipode = rootExact(CIRCLE.fn, ORIGIN, 180, -5 * DAY, 5 * DAY);
  assert.ok(antipode !== null, 'this case is only interesting because f does vanish here');
  assert.ok(gExact(CIRCLE.fn, ORIGIN, antipode, 180) < 0, 'and it vanishes on the wrong side of the half-plane');
});

test('L10: two closely spaced roots are both found, or refused — never one', () => {
  // A target that crosses the target longitude, turns back, and crosses
  // again about half a day later.
  const R = 2e8;
  const A = 0.004;
  const Wf = (2 * Math.PI) / (0.7 * DAY);
  const fn = (t) => {
    const th = A * Math.sin(Wf * t) + 1e-7 * t / DAY;
    return [R * Math.cos(th), R * Math.sin(th), 0];
  };
  const eph = packOf(fn, ORIGIN, { ncoef: 32, intervalSec: DAY / 4, nrec: 400, initEt: -50 * DAY });
  const L = 0.05;
  const roots = [];
  const step = DAY / 400;
  let prev = fExact(fn, ORIGIN, -DAY, L);
  for (let t = -DAY + step; t <= DAY; t += step) {
    const cur = fExact(fn, ORIGIN, t, L);
    if (Math.sign(cur) !== Math.sign(prev) && prev !== 0) roots.push(rootExact(fn, ORIGIN, L, t - step, t));
    prev = cur;
  }
  assert.ok(roots.length >= 2, `this case needs at least two analytic roots, it has ${roots.length}`);
  const r = search(eph, { targetDeg: L, fromTdbSec: -DAY, toTdbSec: DAY });
  if (r.completeness.established) {
    assert.equal(r.events.length, roots.length, `proven, so the count must be exact: ${r.events.length} against ${roots.length}`);
  } else {
    assert.ok(r.accounting.unresolved.length > 0, 'not proven, so it must say where it could not decide');
  }
});

test('L11: a tangency is not closed either way', () => {
  // A real touch: the direction reaches the target longitude at one
  // instant and turns back. f has a double root, so exclusion cannot
  // exclude it and monotonicity cannot apply, and the honest answer is
  // that the cell stays open.
  //
  // The first version of this case subtracted a constant as well, which
  // made it a one-sided NEAR MISS that never reaches the longitude at
  // all. The operation proved zero events, correctly, and the case
  // decided nothing. A near miss is a different case and is L11b.
  const R = 2e8;
  const L = 2;
  const th0 = (L * Math.PI) / 180;
  const touch = (t) => atEclipticLongitude(th0 - 4e-14 * (t / 60) * (t / 60), R);
  const eph = packOf(touch, ORIGIN);
  const r = search(eph, { targetDeg: L, fromTdbSec: -2 * DAY, toTdbSec: 2 * DAY });
  assert.equal(r.completeness.established, false, 'a tangency must not be certified either way');
  assert.equal(r.eventCount.isExactTotal, false);
  assert.ok(r.accounting.unresolved.length > 0);
});

test('L11b: a near miss that never reaches the longitude is a proven zero', () => {
  const R = 2e8;
  const L = 2;
  const th0 = (L * Math.PI) / 180;
  const miss = (t) => atEclipticLongitude(th0 - 1e-9 - 4e-14 * (t / 60) * (t / 60), R);
  const eph = packOf(miss, ORIGIN);
  const r = search(eph, { targetDeg: L, fromTdbSec: -2 * DAY, toTdbSec: 2 * DAY });
  assert.equal(r.eventCount.found, 0);
  assert.equal(rootExact(miss, ORIGIN, L, -2 * DAY, 2 * DAY), null, 'the analytic reference must agree it never crosses');
  assert.equal(r.completeness.established, true, 'a miss with room to spare should be provable');
});

// ------------------------------------------------------------------ L12
test('L12: cancellation and a spent budget are execution states, with what was found', () => {
  const eph = packOf(CIRCLE.fn, ORIGIN);
  const spec = { targetDeg: 3, fromTdbSec: -14 * DAY, toTdbSec: 14 * DAY };
  const full = search(eph, spec);
  assert.equal(full.execution.status, 'finished');

  // A cancel that lands during enclosure construction, not between root
  // evaluations: the abort is checked inside `spend`, which every
  // enclosure and every light-time iteration calls.
  let n = 0;
  const signal = {};
  Object.defineProperty(signal, 'aborted', { get() { n += 1; return n > 12; } });
  const cut = search(eph, { ...spec, signal });
  assert.equal(cut.execution.status, 'cancelled');
  assert.equal(cut.execution.finished, false);
  assert.equal(cut.completeness.established, false);
  assert.equal(cut.eventCount.isExactTotal, false);

  const broke = search(eph, { ...spec, maxEvaluations: 20 });
  assert.equal(broke.execution.status, 'budget-exhausted');
  assert.equal(broke.completeness.established, false);
  assert.ok(broke.execution.evaluations <= 21);
});

// ------------------------------------------------- the operation's claims
test('the result names what it does not apply, and does not claim to be apparent', () => {
  const eph = packOf(CIRCLE.fn, ORIGIN);
  const r = search(eph, { targetDeg: 3, fromTdbSec: -14 * DAY, toTdbSec: 14 * DAY });
  assert.equal(r.mode, 'validated-retarded-geometric');
  assert.equal(r.request.timeScale.startsWith('TDB'), true);
  const missing = r.diagnostics.notApplied.join(' ');
  for (const term of ['aberration', 'deflection', 'Shapiro', 'precession', 'topocentric']) {
    assert.ok(missing.includes(term), `${term} must be named as not applied`);
  }
  assert.equal(RETARDED_CONTRACT.applied.length, 1);
  assert.equal(r.request.frame, 'j2000-mean-ecliptic');
});

test('light-time actually moves the event, and by about the light travel time', () => {
  // If the correction did nothing this whole operation would be pointless,
  // so the size of it is asserted rather than assumed.
  const eph = packOf(CIRCLE.fn, ORIGIN);
  const L = 3;
  const r = search(eph, { targetDeg: L, fromTdbSec: -14 * DAY, toTdbSec: 14 * DAY });
  assert.equal(r.events.length, 1);
  const retarded = r.events[0].tdbSec;
  const geometricRoot = (() => {
    const g = (t) => {
      const q = CIRCLE.fn(t);
      const l = (L * Math.PI) / 180;
      return Math.sin(l) * q[0] - Math.cos(l) * (CE * q[1] + SE * q[2]);
    };
    let lo = -14 * DAY; let hi = 14 * DAY; let fa = g(lo);
    for (let i = 0; i < 200; i += 1) { const m = (lo + hi) / 2; const fm = g(m); if (Math.sign(fm) === Math.sign(fa)) { lo = m; fa = fm; } else hi = m; }
    return (lo + hi) / 2;
  })();
  const shift = retarded - geometricRoot;
  const lightTime = CIRCLE.R / C_KM_S;
  assert.ok(shift > 0, 'the retarded event must come later: the direction lags');
  assert.ok(Math.abs(shift - lightTime) < 0.05 * lightTime,
    `the shift ${shift.toFixed(2)} s should be about the light time ${lightTime.toFixed(2)} s`);
  // And it agrees with the independent analytic root.
  const exact = rootExact(CIRCLE.fn, ORIGIN, L, -14 * DAY, 14 * DAY);
  assert.ok(Math.abs(retarded - exact) <= 1e-3, `solver ${retarded} against analytic ${exact}`);
  assert.ok(exact >= r.events[0].bracketTdbSec[0] && exact <= r.events[0].bracketTdbSec[1],
    'the analytic root must lie inside the reported bracket');
});
