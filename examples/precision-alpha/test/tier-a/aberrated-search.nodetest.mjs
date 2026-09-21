/**
 * validated-retarded-aberrated, against the families declared in
 * ABERRATED-PREREGISTRATION.md section 6, in that order.
 *
 * The acceptance authority is that document, not this file: the minimum
 * non-empty counts it declares are accumulated in `LEDGER` as the cases run
 * and asserted at the end, so a family that quietly stopped covering
 * anything fails rather than passing silently. The earlier light-time
 * holdout had seven of twelve astronomical cases contain no crossings at
 * all; that is what the ledger exists to prevent happening again unnoticed.
 *
 * Every expected value comes from `_geometry.mjs`'s references, which do not
 * call the solver. What they share with it is `aberrate`, deliberately:
 * section 1 of the preregistration DEFINES the quantity as `aberrate`
 * applied to the light-time-corrected vector, and `aberrate` is settled
 * against ERFA and closed forms in `aberration.nodetest.mjs`. These cases
 * establish the SEARCH.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from './_geometry.mjs';
import {
  searchAberratedLongitude, searchRetardedLongitude, ABERRATED_CONTRACT, RETARDED_DEFAULTS,
} from '../../src/core/retarded-search.mjs';
import { searchGeometricLongitude } from '../../src/core/validated-search.mjs';
import { statePoint, targetWeights } from '../../src/core/retarded.mjs';
import { aberrateInterval } from '../../src/core/aberration.mjs';
import * as I from '../../src/core/interval.mjs';

const D = G.DAY;

/** The declared minimums of section 6, and what the run actually covered. */
const LEDGER = {
  'genuine crossings': { required: 8, seen: 0 },
  'no-crossing intervals': { required: 4, seen: 0 },
  'multiple crossings': { required: 3, seen: 0 },
  'boundary roots': { required: 2, seen: 0 },
  'close pairs': { required: 2, seen: 0 },
  'stationary / near-stationary': { required: 2, seen: 0 },
  'unresolved / invalid domain': { required: 4, seen: 0 },
};
const covered = (family) => { LEDGER[family].seen += 1; };

// ---------------------------------------------------------------- fixtures
/**
 * Opposition geometry: an Earth-like observer and a Mars-like target that
 * share a heliocentric longitude at t = 0, so the geocentric longitude
 * turns retrograde. Built once -- fitting 142 records of four series is the
 * expensive part of this file, not searching them.
 */
const RETRO = G.heliocentricPair();
const RETRO_EPH = G.packOf(RETRO.target, RETRO.observer, { nrec: 142, initEt: -71 * D });
const RETRO_WIN = [-70 * D, 70 * D];
/** Measured by scanning the reference, in `_geometry`'s own terms: see the probe in AB-RESULTS. */
const RETRO_MAX_DEG = 97.963881;
const RETRO_MIN_DEG = 82.036131;

/** A Moon-like companion: the geocentric direction laps every 27.32 days. */
const COMPANION = G.companionPair();
const COMPANION_EPH = G.packOf(COMPANION.target, COMPANION.observer, { nrec: 82, initEt: -41 * D });
const COMPANION_WIN = [-40 * D, 40 * D];

const searchAb = (eph, L, win, tuning = {}) => searchAberratedLongitude(eph,
  { body: 'Mars', targetDeg: L, fromTdbSec: win[0], toTdbSec: win[1], ...tuning });
const searchLt = (eph, L, win, tuning = {}) => searchRetardedLongitude(eph,
  { body: 'Mars', targetDeg: L, fromTdbSec: win[0], toTdbSec: win[1], ...tuning });

/**
 * Every reported root must sit inside its own bracket, and every bracket
 * must contain the reference root it is paired with. Containment is the
 * claim the operation actually makes; the midpoint is a convenience, and
 * near a tangency it is only as good as the bracket is narrow.
 */
function assertBracketsContain(result, reference, label) {
  assert.equal(result.events.length, reference.length,
    `${label}: found ${result.events.length} roots, the reference has ${reference.length}`);
  result.events.forEach((e, i) => {
    const [lo, hi] = e.bracketTdbSec;
    assert.ok(lo <= e.tdbSec && e.tdbSec <= hi, `${label}: root ${i} sits outside its own bracket`);
    assert.ok(lo <= reference[i] && reference[i] <= hi,
      `${label}: bracket ${i} [${lo}, ${hi}] (width ${hi - lo}) misses the reference root ${reference[i]}`);
  });
}

// =========================================================== the reduction
test('AB-R1: with the observer at rest the aberrated enclosure IS the light-time one', () => {
  // Not "close to": P = bm1 d + S v with v = 0 gives P = d, so the
  // enclosure of P must contain d itself, and the enclosure of P' must
  // contain d'. Checked on the arithmetic, before any search runs.
  const d = [I.iv(1.2e8, 1.20001e8), I.iv(-3e7, -2.9e7), I.iv(4e6, 4.1e6)];
  const dDot = [I.iv(-21, -20.5), I.iv(11, 11.5), I.iv(0.3, 0.4)];
  const dist = I.norm(d);
  const zero = [I.iv(0), I.iv(0), I.iv(0)];
  const ab = aberrateInterval(d, dDot, dist, zero, zero);
  assert.equal(ab.ok, true);
  for (let i = 0; i < 3; i += 1) {
    assert.ok(I.contains(ab.P[i], d[i]), `component ${i}: P does not contain d`);
    assert.ok(I.contains(ab.PDot[i], dDot[i]), `component ${i}: P' does not contain d'`);
  }
  assert.ok(ab.bm1.lo <= 1 && 1 <= ab.bm1.hi, 'bm1 must enclose exactly 1 at zero velocity');
  assert.equal(ab.speed.hi, 0);
});

test('AB-R2: with the observer at rest the SEARCH returns the light-time mode exactly', () => {
  const rest = { ...G.AT_REST, target: G.circle(2e8, 400 * D).at };
  const eph = G.packOf(rest.target, rest.observer, { nrec: 60, initEt: -30 * D });
  const win = [-25 * D, 25 * D];
  const lt = searchLt(eph, 3, win);
  const ab = searchAb(eph, 3, win);
  assert.equal(lt.events.length, 1, 'the reference geometry must have one crossing here');
  assert.equal(ab.events.length, lt.events.length);
  assert.equal(ab.completeness.established, lt.completeness.established);
  assert.deepEqual(ab.events[0].bracketTdbSec, lt.events[0].bracketTdbSec,
    'a motionless observer must not move the bracket');
  assert.equal(ab.events[0].tdbSec, lt.events[0].tdbSec);
  assert.equal(ab.execution.evaluations, lt.execution.evaluations,
    'the reduction must not cost extra evaluations either');
  assert.equal(ab.uncertainty.numerical.worstObserverSpeedOverC, 0);
});

// ============================================================ the ladder
test('AB-L: the three rungs differ by the corrections they name, and nothing else', () => {
  const L = 95;
  const win = RETRO_WIN;
  // Rung 1: no light-time, no aberration. Its own contract, its own units.
  const rung1 = searchGeometricLongitude(RETRO_EPH, {
    body: 'Mars', targetDeg: L, fromTtDays: win[0] / D, toTtDays: win[1] / D,
  });
  const rung2 = searchLt(RETRO_EPH, L, win);
  const rung3 = searchAb(RETRO_EPH, L, win);
  for (const [n, r] of [[1, rung1], [2, rung2], [3, rung3]]) {
    assert.equal(r.completeness.established, true, `rung ${n} did not establish completeness`);
  }
  assert.equal(rung1.events.length, rung2.events.length);
  assert.equal(rung2.events.length, rung3.events.length);

  // Rung 2 minus rung 1 is the light-time; rung 3 minus rung 2 is the
  // aberration. Both are attributed to a reference that applies exactly
  // that one correction and no other, so neither shift is "error".
  const refLt = G.rootsExact(RETRO, L, win[0], win[1], { aberrated: false, samples: 20000 });
  const refAb = G.rootsExact(RETRO, L, win[0], win[1], { aberrated: true, samples: 20000 });
  assertBracketsContain(rung2, refLt, 'rung 2');
  assertBracketsContain(rung3, refAb, 'rung 3');

  rung3.events.forEach((e, i) => {
    const lightTime = rung2.events[i].tdbSec - rung1.events[i].ttDays * D;
    const aberration = e.tdbSec - rung2.events[i].tdbSec;
    assert.ok(Math.abs(lightTime) > 1, `rung 2 - rung 1 is ${lightTime} s: this geometry does not exercise light-time`);
    assert.ok(Math.abs(aberration) > 1, `rung 3 - rung 2 is ${aberration} s: this geometry does not exercise aberration`);
    // and the aberration shift is the one the reference predicts
    const predicted = refAb[i] - refLt[i];
    assert.ok(Math.abs(aberration - predicted) <= 1e-3,
      `the measured aberration shift ${aberration} s is not the predicted ${predicted} s`);
  });

  assert.deepEqual(rung3.request.applied, ABERRATED_CONTRACT.applied);
  assert.ok(rung3.diagnostics.aberration.worstObserverSpeedOverC > 9e-5,
    'an Earth-like observer must register a real speed');
  assert.equal(rung3.diagnostics.aberration.potentialTermApplied, false);
  assert.equal(rung3.diagnostics.aberration.observerRetarded, false);
});

// ============================================== family 1: genuine crossings
for (const L of [83, 85, 87, 89, 91, 93, 95, 97]) {
  test(`AB-F1 L=${L}: a genuine crossing, isolated and bracketed`, () => {
    const r = searchAb(RETRO_EPH, L, RETRO_WIN);
    const ref = G.rootsExact(RETRO, L, RETRO_WIN[0], RETRO_WIN[1], { samples: 20000 });
    assert.ok(ref.length >= 1, 'this case must contain at least one crossing to count');
    assert.equal(r.execution.status, 'finished');
    assert.equal(r.completeness.established, true);
    assert.equal(r.eventCount.isExactTotal, true);
    assertBracketsContain(r, ref, `F1 L=${L}`);
    // These are transversal crossings, so the bracket is narrow and the
    // midpoint is inside the preregistered 1e-3 s.
    r.events.forEach((e, i) => assert.ok(Math.abs(e.tdbSec - ref[i]) <= 1e-3,
      `F1 L=${L} root ${i}: midpoint ${e.tdbSec} is ${Math.abs(e.tdbSec - ref[i])} s from the reference`));
    covered('genuine crossings');
  });
}

// ============================================ family 2: no-crossing intervals
for (const L of [99, 100, 180, 270]) {
  test(`AB-F2 L=${L}: no crossing, and the emptiness is established`, () => {
    const r = searchAb(RETRO_EPH, L, RETRO_WIN);
    assert.deepEqual(G.rootsExact(RETRO, L, RETRO_WIN[0], RETRO_WIN[1], { samples: 20000 }), [],
      'this case must genuinely be empty to count');
    assert.equal(r.execution.status, 'finished');
    assert.equal(r.events.length, 0);
    assert.equal(r.completeness.established, true);
    assert.equal(r.eventCount.isExactTotal, true);
    assert.equal(r.eventCount.upperBound, 0, 'a proven empty interval has an upper bound of zero');
    assert.equal(r.accounting.unresolved.length, 0);
    covered('no-crossing intervals');
  });
}

// ============================================== family 3: multiple crossings
for (const L of [10, 90, 200, 300]) {
  test(`AB-F3 L=${L}: three crossings of a lapping companion, all found`, () => {
    const r = searchAb(COMPANION_EPH, L, COMPANION_WIN);
    const ref = G.rootsExact(COMPANION, L, COMPANION_WIN[0], COMPANION_WIN[1], { samples: 20000 });
    assert.ok(ref.length >= 3, `this case must contain at least three crossings, the reference found ${ref.length}`);
    assert.equal(r.completeness.established, true);
    assert.equal(r.eventCount.isExactTotal, true);
    assertBracketsContain(r, ref, `F3 L=${L}`);
    covered('multiple crossings');
  });
}

// ================================================= family 4: boundary roots
for (const L of [91, 89]) {
  test(`AB-F4 L=${L}: adjacent half-open windows report a root exactly once`, () => {
    const ref = G.rootsExact(RETRO, L, RETRO_WIN[0], RETRO_WIN[1], { samples: 20000 });
    assert.equal(ref.length, 1, 'this case needs exactly one root for the tiling to be unambiguous');
    const root = ref[0];

    // Displaced splits: the root belongs to exactly one side, and which one
    // is decided by the half-open rule, not by luck.
    for (const off of [-1, -1e-3, 1e-3, 1]) {
      const m = root + off;
      const left = searchAb(RETRO_EPH, L, [RETRO_WIN[0], m]);
      const right = searchAb(RETRO_EPH, L, [m, RETRO_WIN[1]]);
      assert.equal(left.events.length + right.events.length, 1,
        `split at root${off >= 0 ? '+' : ''}${off}: reported ${left.events.length + right.events.length} times`);
      assert.equal(left.completeness.established, true, `split at root${off}: left not established`);
      assert.equal(right.completeness.established, true, `split at root${off}: right not established`);
      assert.equal(left.events.length === 1, off > 0, `split at root${off}: the root landed on the wrong side`);
    }

    // A split exactly on the root. Losing it is permitted -- the endpoint
    // value cannot be separated from zero -- but claiming completeness
    // while losing it is not.
    for (const [label, win] of [
      ['left', [RETRO_WIN[0], root]],
      ['right', [root, RETRO_WIN[1]]],
    ]) {
      const r = searchAb(RETRO_EPH, L, win);
      if (r.events.length === 0) {
        assert.equal(r.completeness.established, false, `${label}: lost the boundary root but still claimed completeness`);
        assert.equal(r.eventCount.isExactTotal, false, `${label}: lost the boundary root but still claimed an exact total`);
        assert.ok(r.accounting.unresolved.length >= 1, `${label}: lost the boundary root without recording it`);
      } else {
        assert.equal(r.events.length, 1, `${label}: reported the boundary root more than once`);
      }
    }
    covered('boundary roots');
  });
}

// ==================================================== family 5: close pairs
for (const [L, maxFraction] of [[RETRO_MAX_DEG - 0.004, 0.02], [RETRO_MAX_DEG - 0.064, 0.06]]) {
  test(`AB-F5 L=${L.toFixed(6)}: a close pair either side of the retrograde turn`, () => {
    const span = RETRO_WIN[1] - RETRO_WIN[0];
    const ref = G.rootsExact(RETRO, L, RETRO_WIN[0], RETRO_WIN[1], { samples: 200000 });
    // Established analytically FIRST: the pair and its separation come from
    // the reference, before the solver is asked anything.
    assert.equal(ref.length, 2, `this case must be a pair, the reference found ${ref.length}`);
    const separation = (ref[1] - ref[0]) / span;
    assert.ok(separation < 0.1, `separation ${separation} is not under a tenth of the window`);
    assert.ok(separation <= maxFraction, `separation ${separation} exceeds this case's declared ${maxFraction}`);

    const r = searchAb(RETRO_EPH, L, RETRO_WIN);
    assert.equal(r.completeness.established, true);
    assert.equal(r.eventCount.isExactTotal, true);
    assertBracketsContain(r, ref, `F5 L=${L}`);
    assert.notEqual(r.events[0].direction, r.events[1].direction,
      'a pair either side of a turning point must cross in opposite directions');
    covered('close pairs');
  });
}

// ========================================= family 6: stationary / tangency
for (const [label, L] of [['maximum', RETRO_MAX_DEG], ['minimum', RETRO_MIN_DEG]]) {
  test(`AB-F6 ${label}: at the retrograde turn the answer is honest about its own width`, () => {
    const r = searchAb(RETRO_EPH, L, RETRO_WIN);
    const ref = G.rootsExact(RETRO, L, RETRO_WIN[0], RETRO_WIN[1], { samples: 400000 });
    assert.equal(r.execution.status, 'finished');
    if (r.completeness.established) {
      // Containment still holds. The MIDPOINT does not have to be inside
      // 1e-3 s here and measurably is not: at a turning point f' -> 0, so
      // the sign of f stops being separable from zero while the bracket is
      // still wide, the bisection stops there rather than lying, and the
      // midpoint is only as good as the bracket. Measured on this case the
      // bracket runs to 2.1e-2 s against 8.1e-5 s for a transversal
      // crossing of the same geometry.
      assertBracketsContain(r, ref, `F6 ${label}`);
      const widest = Math.max(...r.events.map((e) => e.bracketWidthSec));
      assert.ok(widest > RETARDED_DEFAULTS.minWidthSec,
        `a near-tangency bracket of ${widest} s is at the subdivision floor, so this case is not near-tangent`);
    } else {
      assert.equal(r.eventCount.isExactTotal, false);
      assert.ok(r.accounting.unresolved.length >= 1);
    }
    covered('stationary / near-stationary');
  });
}

// ================================= family 7: unresolved and invalid domain
test('AB-F7a: an observer above c is refused by name, and not subdivided into the budget', () => {
  const so = G.straightObserver(1.4);
  const eph = G.packOf(() => [3e8, 0, 0], so.observer, { nrec: 20, initEt: -10 * D });
  const r = searchAberratedLongitude(eph, { body: 'Mars', targetDeg: 0, fromTdbSec: -2 * D, toTdbSec: 2 * D });
  assert.equal(r.execution.status, 'finished', 'the refusal must be reached, not run into the budget');
  assert.equal(r.completeness.established, false);
  assert.equal(r.eventCount.isExactTotal, false);
  const why = r.accounting.unresolved.map((u) => u.why).join(' | ');
  assert.match(why, /not below c.*aberration transformation is outside its domain/i);
  assert.match(why, /no subdivision changes that/i);
  // The whole point of the split: this used to cost 4,000,001 evaluations.
  assert.ok(r.execution.evaluations < 20000,
    `a hopeless domain failure spent ${r.execution.evaluations} evaluations`);
  covered('unresolved / invalid domain');
});

test('AB-F7b: an observer far below c but far above anything physical still works', () => {
  for (const beta of [0.5, 0.9]) {
    const so = G.straightObserver(beta, 90);
    const eph = G.packOf(() => [3e9, 0, 0], so.observer, { nrec: 20, initEt: -10 * D });
    const r = searchAberratedLongitude(eph, { body: 'Mars', targetDeg: 0.0001, fromTdbSec: -2 * D, toTdbSec: 2 * D });
    assert.equal(r.execution.status, 'finished', `beta=${beta}`);
    assert.equal(r.completeness.established, true, `beta=${beta}: a subluminal observer is inside the domain`);
    assert.ok(r.uncertainty.numerical.worstObserverSpeedOverC >= beta * 0.99,
      `beta=${beta}: the reported observer speed ${r.uncertainty.numerical.worstObserverSpeedOverC} does not match`);
  }
});

test('AB-F7c: a target above c is refused, and says it is the light-time that fails', () => {
  const eph = G.packOf((t) => [2e8 + 4e5 * t, 0, 0], RETRO.observer, { nrec: 20, initEt: -10 * D });
  const r = searchAberratedLongitude(eph, { body: 'Mars', targetDeg: 0, fromTdbSec: -D, toTdbSec: D });
  assert.equal(r.completeness.established, false);
  const why = r.accounting.unresolved.map((u) => u.why).join(' | ');
  assert.match(why, /not below c/i);
  assert.match(why, /contraction/i, 'the target case must name the contraction, not the aberration domain');
  covered('unresolved / invalid domain');
});

test('AB-F7d: a target passing through the observer is refused locally, not globally', () => {
  const dir = G.atEclipticLongitude((45 * Math.PI) / 180, 1);
  const eph = G.packOf((t) => [30 * t * dir[0], 30 * t * dir[1], 30 * t * dir[2]], () => [0, 0, 0],
    { nrec: 20, initEt: -10 * D });
  const r = searchAberratedLongitude(eph, { body: 'Mars', targetDeg: 75, fromTdbSec: -1000, toTdbSec: 1000 });
  assert.equal(r.completeness.established, false);
  const why = r.accounting.unresolved.map((u) => u.why).join(' | ');
  assert.match(why, /cannot be shown to be separated/i);
  const open = r.accounting.unresolved.reduce((sum, u) => sum + (u.toTdbSec - u.fromTdbSec), 0);
  assert.ok(open <= 4, `the undecided region is ${open} s wide, so the refusal is not local to the singularity`);
  covered('unresolved / invalid domain');
});

test('AB-F7e: a reception window past the target\'s records is refused, not raised', () => {
  const eph = G.packOf(RETRO.target, RETRO.observer, { nrec: 40, initEt: -20 * D, targetRecords: 5 });
  const r = searchAberratedLongitude(eph, { body: 'Mars', targetDeg: 90, fromTdbSec: 5 * D, toTdbSec: 7 * D });
  assert.equal(r.execution.status, 'finished');
  assert.equal(r.completeness.established, false);
  assert.match(r.accounting.unresolved.map((u) => u.why).join(' | '), /outside the stored records/i);
  covered('unresolved / invalid domain');
});

// ==================================================== guarantees and budgets
test('AB-G1: an exhausted evaluation budget reports it and never an exact total', () => {
  const r = searchAb(RETRO_EPH, 95, RETRO_WIN, { maxEvaluations: 500 });
  assert.equal(r.execution.status, 'budget-exhausted');
  assert.equal(r.execution.finished, false);
  assert.equal(r.completeness.established, false);
  assert.equal(r.eventCount.isExactTotal, false);
  assert.equal(r.eventCount.upperBound, null);
  assert.match(r.execution.reason, /evaluation budget of 500/);
  // The budget covers the ENCLOSURE work, not only the point evaluations:
  // a cell builder that spent unmetered series reads would overshoot here.
  assert.ok(r.execution.evaluations <= 501,
    `spent ${r.execution.evaluations} against a budget of 500, so some work is unmetered`);
});

test('AB-G2: an exhausted cell budget reports it too', () => {
  const r = searchAb(RETRO_EPH, 95, RETRO_WIN, { maxCells: 7 });
  assert.equal(r.execution.status, 'budget-exhausted');
  assert.equal(r.eventCount.isExactTotal, false);
  assert.match(r.execution.reason, /7 cells/);
});

test('AB-G3: cancellation is honoured at every stage, and never fakes a result', () => {
  for (const after of [1, 50, 400, 2000]) {
    let n = 0;
    const signal = { get aborted() { n += 1; return n > after; } };
    const r = searchAb(RETRO_EPH, 95, RETRO_WIN, { signal });
    assert.equal(r.execution.status, 'cancelled', `cancel after ${after}`);
    assert.equal(r.completeness.established, false, `cancel after ${after}`);
    assert.equal(r.eventCount.isExactTotal, false, `cancel after ${after}`);
    assert.equal(r.execution.evaluations, after, `cancel after ${after}: stopped at ${r.execution.evaluations}`);
    // Whatever it had already isolated is still reported, as a lower bound.
    assert.equal(r.eventCount.lowerBound, r.events.length);
  }
});

test('AB-G4: an unknown tuning option is refused rather than ignored', () => {
  assert.throws(() => searchAb(RETRO_EPH, 95, RETRO_WIN, { safetyFactor: 4 }), /unknown retarded-search option/);
  assert.throws(
    () => searchAberratedLongitude(RETRO_EPH, { body: 'Ceres', targetDeg: 0, fromTdbSec: 0, toTdbSec: 1 }),
    /not in the aberrated contract/,
  );
});

// ================================================ enclosure-level coverage
test('AB-E1: velocity parallel and antiparallel to the direction leaves it alone', () => {
  // p = (1 + beta) p_hat for parallel v, so the DIRECTION is unchanged and
  // the projection of P onto any w keeps its sign and its zero.
  const d = [I.iv(2e8), I.iv(0), I.iv(0)];
  const dDot = [I.iv(0), I.iv(0), I.iv(0)];
  const dist = I.norm(d);
  for (const sign of [1, -1]) {
    const v = [I.iv(sign * 1e-4), I.iv(0), I.iv(0)];
    const ab = aberrateInterval(d, dDot, dist, v, [I.iv(0), I.iv(0), I.iv(0)]);
    assert.equal(ab.ok, true);
    assert.ok(I.mig(ab.P[0]) > 0, 'the along-axis component must stay non-zero');
    assert.equal(I.mag(ab.P[1]), 0, 'a parallel velocity must not tilt the direction');
    assert.equal(I.mag(ab.P[2]), 0, 'a parallel velocity must not tilt the direction');
  }
});

test('AB-E2: a transverse velocity tilts the enclosure by the closed-form angle', () => {
  // For p_hat along x and v along y, the proper direction makes an angle
  // atan(gamma beta) with x. The enclosure must contain that tangent.
  const beta = 1e-4;
  const gamma = 1 / Math.sqrt(1 - beta * beta);
  const d = [I.iv(2e8), I.iv(0), I.iv(0)];
  const zero = [I.iv(0), I.iv(0), I.iv(0)];
  const v = [I.iv(0), I.iv(beta), I.iv(0)];
  const ab = aberrateInterval(d, zero, I.norm(d), v, zero);
  assert.equal(ab.ok, true);
  const ratio = I.div(ab.P[1], ab.P[0]);
  const expected = gamma * beta;
  assert.ok(ratio.lo <= expected && expected <= ratio.hi,
    `the tangent enclosure [${ratio.lo}, ${ratio.hi}] does not contain atan's argument ${expected}`);
});

test('AB-E3: an observer velocity that CHANGES across the interval is carried, not sampled', () => {
  // v and v' both enter P'. Zeroing v' would leave P' short by S v', which
  // on an Earth-like observer at 1 au is about 2e-3 km/s -- small, but the
  // enclosure either contains the truth or it does not.
  const d = [I.iv(1.4e8), I.iv(6e7), I.iv(2.6e7)];
  const dDot = [I.iv(-12), I.iv(25), I.iv(11)];
  const v = [I.iv(-9.9e-5, -9.8e-5), I.iv(1e-5), I.iv(4e-6)];
  const vDot = [I.iv(-2.1e-11, -1.9e-11), I.iv(1e-11), I.iv(4e-12)];
  const still = aberrateInterval(d, dDot, I.norm(d), v, [I.iv(0), I.iv(0), I.iv(0)]);
  const moving = aberrateInterval(d, dDot, I.norm(d), v, vDot);
  assert.equal(still.ok, true);
  assert.equal(moving.ok, true);
  const changed = [0, 1, 2].some((i) => moving.PDot[i].lo !== still.PDot[i].lo || moving.PDot[i].hi !== still.PDot[i].hi);
  assert.ok(changed, 'the observer acceleration did not reach P-dot at all');
});

test('AB-E4: the subluminal domain is enforced at the enclosure, both sides of the edge', () => {
  const d = [I.iv(2e8), I.iv(0), I.iv(0)];
  const zero = [I.iv(0), I.iv(0), I.iv(0)];
  const dist = I.norm(d);
  const inside = aberrateInterval(d, zero, dist, [I.iv(0.999), I.iv(0), I.iv(0)], zero);
  assert.equal(inside.ok, true, '0.999 c is inside the domain and must be accepted');

  // Above c by more than the stated widening: hopeless, and it says so.
  for (const beta of [1 + 1e-12, 2]) {
    const over = aberrateInterval(d, zero, dist, [I.iv(beta), I.iv(0), I.iv(0)], zero);
    assert.equal(over.ok, false, `beta=${beta}`);
    assert.equal(over.retry, false, `beta=${beta}: above c everywhere is not a narrow-the-cell problem`);
  }

  // An enclosure that merely straddles c can be tightened, so it is offered
  // for subdivision rather than written off.
  const straddle = aberrateInterval(d, zero, dist, [I.iv(0.99, 1.01), I.iv(0), I.iv(0)], zero);
  assert.equal(straddle.ok, false);
  assert.equal(straddle.retry, true, 'an enclosure that merely straddles c can be tightened');

  // Exactly c falls in the straddling case, not the hopeless one, and that
  // is the honest answer rather than a special case: `iv` widens by PAD, so
  // the enclosure of the point 1 genuinely reaches below c. The search then
  // subdivides to its enclosure floor and records the refusal, which costs
  // a bounded amount and never claims anything. Pretending the enclosure is
  // exact here would be claiming a bound the arithmetic does not give.
  const edge = aberrateInterval(d, zero, dist, [I.iv(1), I.iv(0), I.iv(0)], zero);
  assert.equal(edge.ok, false);
  assert.equal(edge.retry, true);
  assert.ok(I.iv(1).lo < 1, 'the widening is what puts exactly-c in the straddling case');
});

test('AB-E5: a zero-length direction is refused rather than normalised', () => {
  const zero = [I.iv(0), I.iv(0), I.iv(0)];
  const bad = aberrateInterval(zero, zero, I.iv(0), zero, zero);
  assert.equal(bad.ok, false);
  assert.match(bad.why, /cannot be shown to be separated/i);
});

test('AB-E6: emission crossing coefficient-record boundaries is walked, not clamped', () => {
  // 200-second records against a ~667-second light-time: the emission
  // window sits three or four records behind reception, and the observer's
  // velocity is read at reception, in a different record again.
  const eph = G.packOf(G.circle(2e8, 400 * D).at, RETRO.observer, { intervalSec: 200, nrec: 500, initEt: -50000 });
  const r = searchAberratedLongitude(eph, { body: 'Mars', targetDeg: 0.0001, fromTdbSec: 1000, toTdbSec: 40000 });
  assert.equal(r.execution.status, 'finished');
  assert.ok(r.uncertainty.numerical.widestEmissionWindowSec > 200,
    'the emission window must span more than one record for this case to bite');
  assert.equal(r.completeness.established, true);
});

test('AB-E7: many turns inside one seed cell are all found, not aliased away', () => {
  // The failure v1 of this package shipped: an angle making one turn per
  // sampling interval returned "no crossing, certified". A companion
  // lapping every 1.5 days inside eight-day seed cells is the same shape.
  const fast = G.companionPair({ offsetPeriodDays: 1.5 });
  // 40 coefficients, not the file's usual 20. Five and a third cycles of a
  // sinusoid do not fit in twenty Chebyshev terms: measured, the stored
  // path then sits 3.1e4 km from the intended one, the solver correctly
  // finds all 27 roots OF THAT POLYNOMIAL, and they are 1.5e3 s from the
  // ideal circle's. That is a fixture that tests the fit, not the search.
  const eph = G.packOf(fast.target, fast.observer, { nrec: 40, intervalSec: 8 * D, initEt: -160 * D, ncoef: 40 });
  const win = [-100 * D, -60 * D];

  // So assert the fixture first: the pack must be the geometry the
  // reference describes, to well inside what a root position cares about.
  const tw = targetWeights(eph, 'Mars');
  let worstFitKm = 0;
  for (let t = win[0]; t <= win[1]; t += 137) {
    const p = statePoint(eph, tw, t, null).pos;
    const q = fast.target(t);
    worstFitKm = Math.max(worstFitKm, G.norm3(G.sub3(p, q)));
  }
  assert.ok(worstFitKm < 1e-4, `the stored path is ${worstFitKm} km from the intended one, so this case tests the fit`);

  const ref = G.rootsExact(fast, 200, win[0], win[1], { samples: 200000 });
  assert.ok(ref.length >= 20, `this case needs many turns to test anything, the reference found ${ref.length}`);
  // Eight-day seed cells against a 1.5-day lap: about five turns per seed.
  assert.ok(ref.length > (win[1] - win[0]) / (8 * D),
    'there must be more roots than seed cells for the aliasing shape to be present');
  const r = searchAberratedLongitude(eph, { body: 'Mars', targetDeg: 200, fromTdbSec: win[0], toTdbSec: win[1] });
  assert.equal(r.completeness.established, true);
  assertBracketsContain(r, ref, 'E7 aliasing');
});

// ====================================================== the coverage ledger
test('AB-Z: section 6 of the preregistration was actually covered', () => {
  const short = Object.entries(LEDGER).filter(([, v]) => v.seen < v.required);
  assert.deepEqual(short, [],
    `families below their declared minimum: ${short.map(([k, v]) => `${k} ${v.seen}/${v.required}`).join(', ')}`);
});
