/**
 * Adversarial cases for the angular search, on functions whose answers are
 * known in closed form — no ephemeris, no pack, nothing to blame but the
 * algorithm.
 *
 * Named `.nodetest.mjs`, not `.test.mjs`: vitest's default glob collects
 * `*.test.mjs` repository-wide and these are `node:test` suites.
 *
 * The case that started this file: an angle making 96 turns across the 96
 * intervals of the default probe grid. Every sample reads the same wrapped
 * phase. Against the alpha at 542c0e72 that returned `no-crossing,
 * certified, count 0` where the truth is 96 — identical sampled phases
 * supporting an exhaustive zero-event conclusion.
 *
 * Two things are asserted of every case, and they are different:
 *
 *   1. NOTHING is ever established. The empirical mode may not set
 *      `completeness.established`, whatever it found.
 *   2. A CONDITIONAL claim still has to be right. When the search says the
 *      interval was fully accounted for and offers a conditional total,
 *      that total must equal the truth. A wrong conditional is still wrong.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { searchLongitudeEvent } from '../../src/core/search.mjs';

/** A Reducer-shaped stub whose longitude is a known function of TT days. */
const stub = (fn) => ({ apparent: (body, ttDays) => ({ lon: ((fn(ttDays) % 360) + 360) % 360 }) });

const wrap180 = (d) => { let x = d % 360; if (x > 180) x -= 360; if (x <= -180) x += 360; return x; };

/**
 * An independent count, by dense scan.
 *
 * Two details that the first version of this helper got wrong, both found
 * by it disagreeing with the search and the search turning out to be right:
 *
 *   - samples must not land ON the roots. A grid of round fractions hits
 *     every root of a function whose roots are round fractions, and a
 *     product of two exact zeros is not negative, so the sign change is
 *     missed. The grid is offset by an irrational fraction of a step.
 *   - a root exactly at an interval endpoint produces no sign change
 *     inside, so the endpoints are checked separately.
 *
 * Two grid sizes must agree, or the case is not well posed.
 */
function denseTruth(fn, a, b, target) {
  const g = (t) => wrap180(((fn(t) % 360) + 360) % 360 - target);
  const PHI = 0.3819660112501051;        // 2 - golden ratio; avoids rational roots
  const count = (n) => {
    const step = (b - a) / n;
    let c = 0;
    let prev = g(a + PHI * step);
    for (let i = 1; i < n; i += 1) {
      const cur = g(a + (i + PHI) * step);
      if (prev * cur < 0 && Math.abs(prev) < 90 && Math.abs(cur) < 90) c += 1;
      prev = cur;
    }
    return c;
  };
  const coarse = count(400_000);
  const fine = count(1_000_000);
  assert.equal(coarse, fine, `the dense reference disagrees with itself (${coarse} vs ${fine}); the case is not well posed`);
  const edges = [a, b].filter((t) => Math.abs(g(t)) < 1e-9).length;
  return fine + edges;
}

function run(fn, { a, b, target, epsilonDeg = 1 / 3600, ...rest }) {
  return searchLongitudeEvent(stub(fn), {
    kind: 'longitude', body: 'Sun', targetDeg: target,
    fromTtDays: a, toTtDays: b, epsilonDeg, maxEvaluations: 5_000_000, ...rest,
  });
}

/**
 * @param {object} c
 * @param {number|null} c.truth  null means "compute it densely"
 * @param {boolean} [c.mustResolve] the method is expected to account for the
 *   whole interval here; if it cannot, that is a regression worth failing on
 */
function check(name, fn, spec, { truth = null, mustResolve = true } = {}) {
  test(name, () => {
    const expected = truth ?? denseTruth(fn, spec.a, spec.b, spec.target);
    const r = run(fn, spec);

    // 1. Nothing is ever established by the empirical mode.
    assert.equal(r.completeness.established, false, 'the empirical mode may not establish completeness');
    assert.equal(r.eventCount.isExactTotal, false);
    assert.notEqual(r.completeness.support, 'proven');

    // 2. Every event returned is a real root: the function is within the
    //    allowance of the level somewhere inside the bracket.
    for (const e of r.events) {
      const lo = e.bracketTtDays[0];
      const hi = e.bracketTtDays[1];
      let near = false;
      for (let i = 0; i <= 64; i += 1) {
        const t = lo + ((hi - lo) * i) / 64;
        if (Math.abs(wrap180(((fn(t) % 360) + 360) % 360 - spec.target)) <= Math.max(1 / 3600, spec.epsilonDeg ?? 0) * 1.5) { near = true; break; }
      }
      assert.ok(near, `an event was reported at ${e.ttDays} with no root inside its bracket`);
    }
    assert.ok(r.events.length <= expected, `found ${r.events.length} events where only ${expected} exist`);

    // 3. A conditional total, if offered, must be the truth.
    if (r.eventCount.support === 'conditional') {
      assert.equal(r.eventCount.conditionalTotal, expected,
        `the search accounted for the whole interval and offered ${r.eventCount.conditionalTotal}, but the truth is ${expected}`);
      assert.equal(r.accounting.allIntervalsAccountedFor, true);
      assert.equal(r.accounting.unresolved.length, 0);
    } else {
      assert.equal(r.eventCount.conditionalTotal, null);
      assert.ok(!mustResolve, `this case should be resolvable, but the search left ${r.accounting.unresolved.length} interval(s) open and offered no total`);
    }

    if (mustResolve) {
      assert.equal(r.eventCount.found, expected, `found ${r.eventCount.found}, truth ${expected}`);
    }
  });
}

const D = 96;
const turning = (turns) => (t) => (t / D) * 360 * turns;
/**
 * Every case declares the rate its own function can reach. That is the
 * contract: the method cannot discover the rate by sampling — an angle
 * turning a whole number of times between samples is invisible to any grid
 * that aliases the same way — so the caller states it and the search checks
 * the step and the samples against the statement.
 */
const rateOfTurns = (turns) => Math.ceil((turns * 360) / D) + 10;

// ---- integer turns between sample points: the aliasing family ----
// 96 is the count that lands one whole turn on every interval of the
// default 97-point probe grid. 48 and 192 alias the same way.
check('96 turns across the 96 default sampling intervals', turning(96), { a: 0, b: D, target: 137, maxRateDegPerDay: rateOfTurns(96) });
check('48 turns: every other sample aliases', turning(48), { a: 0, b: D, target: 137, maxRateDegPerDay: rateOfTurns(48) });
check('192 turns: two turns per sampling interval', turning(192), { a: 0, b: D, target: 137, maxRateDegPerDay: rateOfTurns(192) });
check('95 turns: off by one from the aliasing grid', turning(95), { a: 0, b: D, target: 137, maxRateDegPerDay: rateOfTurns(95) });
check('3 turns: the easy case still works', turning(3), { a: 0, b: D, target: 137 });

// ---- fast oscillation whose sampled endpoints agree ----
check('96 oscillations, sampled endpoints identical',
  (t) => 100 + 40 * Math.sin((2 * Math.PI * t * 96) / D), { a: 0, b: D, target: 100, maxRateDegPerDay: 300 });
check('96 oscillations, target off centre',
  (t) => 100 + 40 * Math.sin((2 * Math.PI * t * 96) / D), { a: 0, b: D, target: 120, maxRateDegPerDay: 300 });
check('an oscillation that never reaches the target',
  (t) => 100 + 40 * Math.sin((2 * Math.PI * t) / D), { a: 0, b: D, target: 300 }, { truth: 0 });

// ---- close pairs, tangency, near miss ----
// A parabola in longitude: two roots 2*sqrt(d) apart, one tangency, one miss.
const parabola = (d) => (t) => 137 + 0.5 * ((t - 48) * (t - 48) - d);
check('two crossings a tenth of a day apart', parabola(0.0025), { a: 0, b: D, target: 137, maxRateDegPerDay: 60 }, { mustResolve: false });
check('two crossings two days apart', parabola(1), { a: 0, b: D, target: 137, maxRateDegPerDay: 60 });
// Not a near miss at all, once the wrap is taken into account: this
// parabola sweeps 1152 degrees each way, so it passes the target six times
// at t = 1.52, 10.05, 21.17, 74.83, 85.95 and 94.48. The first version of
// this case asserted a hand-computed truth of 0 and was wrong; the dense
// reference decides now.
check('a parabola whose vertex misses the level but whose sweep does not',
  parabola(-0.01), { a: 0, b: D, target: 137, maxRateDegPerDay: 60 });

test('an exact tangency is never certified, and never invents a crossing', () => {
  const r = run(parabola(0), { a: 0, b: D, target: 137, maxRateDegPerDay: 60 });
  assert.equal(r.completeness.established, false);
  assert.equal(r.eventCount.isExactTotal, false);
  // A tangency is measure zero. Whatever it reports, it may not claim to
  // have accounted for the interval AND report a count of anything other
  // than what a tangency can be: 0, 1 or 2 are all consistent.
  if (r.eventCount.support === 'conditional') {
    assert.ok([0, 1, 2].includes(r.eventCount.conditionalTotal));
  }
});

// ---- roots at the interval boundaries ----
test('a root exactly at the left boundary is reported, and said to be at the edge', () => {
  const r = run(turning(3), { a: 0, b: D, target: 0 });
  assert.ok(r.events.length >= 1);
  assert.ok(r.events.some((e) => e.atIntervalEdge === true), 'an edge root must be marked as one');
});

test('a root exactly at the right boundary is reported', () => {
  // 3 turns over the window puts lon back at 0 at t = D.
  const r = run(turning(3), { a: 1e-6, b: D, target: 0 });
  assert.ok(r.events.length >= 1);
});

// ---- multiple segment boundaries, and none ----
check('a target the angle passes 10 times, so 10 antipode splits', turning(10), { a: 0, b: D, target: 210, maxRateDegPerDay: rateOfTurns(10) });

test('an interval with no roots reports none, and does not claim to have proved it', () => {
  const r = run(() => 12.5, { a: 0, b: D, target: 137 });
  assert.equal(r.events.length, 0);
  assert.equal(r.eventCount.found, 0);
  assert.equal(r.completeness.established, false);
  assert.equal(r.execution.status, 'finished');
});

// ---- the aliasing diagnostic itself ----
test('the implied-travel diagnostic is reported, and is not called a bound', () => {
  const r = run(turning(96), { a: 0, b: D, target: 137, maxRateDegPerDay: rateOfTurns(96) });
  const al = r.diagnostics.aliasing;
  assert.equal(typeof al.worstImpliedTravelDeg, 'number');
  assert.equal(al.isABound, false);
  assert.ok(al.worstImpliedTravelDeg <= 90.0001,
    `the scan should refine until the angle moves under a quarter turn between samples, got ${al.worstImpliedTravelDeg}`);
  assert.ok(al.gridPoints > 97, 'the aliased case must have forced refinement past the initial grid');
});

test('a rate past the declared ceiling is refused, not answered', () => {
  const r = run((t) => 400 * t, { a: 0, b: 96, target: 137, maxRateDegPerDay: 20 });
  assert.equal(r.execution.status, 'refused');
  assert.equal(r.eventCount.support, 'none');
  assert.match(r.execution.reason, /past the declared maximum/);
  assert.equal(r.diagnostics.aliasing.detected, true);
});

test('a step too long for the declared rate is refused up front', () => {
  assert.throws(
    // 400 deg/day over a step of half a day turns 200 degrees, past a half
    // turn, so unwrapping a difference across it is not valid.
    () => run((t) => t, { a: 0, b: 96, target: 137, maxRateDegPerDay: 400, stepMs: 43_200_000 }),
    (e) => e.code === 'unsupported-option' && /not valid/.test(e.message),
  );
});

test('the rate ceiling is carried as an unverified assumption, and says why', () => {
  const r = run(turning(3), { a: 0, b: D, target: 137 });
  const rate = r.assumptions.find((x) => x.id === 'declared-rate-ceiling');
  assert.ok(rate, 'the rate ceiling must appear as an assumption');
  assert.equal(rate.status, 'unverified');
  assert.match(rate.basis, /CANNOT detect/);
  assert.equal(rate.value.declaredMaxRateDegPerDay, 20);
  // The honest reason it cannot be promoted by sampling: an angle turning a
  // whole number of times between every pair of samples is invisible to any
  // grid, however fine, that aliases the same way.
  assert.match(rate.wouldBeSettledBy, /polynomial derivative/);
});
