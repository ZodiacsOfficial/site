/**
 * The validated geometric mode, against packs whose contents are exact
 * polynomials, so the answers are known in closed form.
 *
 * Named `.nodetest.mjs`, not `.test.mjs`: vitest's repo-wide glob collects
 * `*.test.mjs` and these are `node:test` suites.
 *
 * Every fixture puts the Earth at the origin and gives one body a position
 * that a Chebyshev series represents EXACTLY, so "the right answer" is
 * arithmetic rather than another numerical method's opinion.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPack } from './_pack.mjs';
import { parseContainerBytes } from '../../src/core/container.mjs';
import { memorySource } from '../../src/core/source.mjs';
import { Ephemeris } from '../../src/core/ephemeris.mjs';
import { searchGeometricLongitude } from '../../src/core/validated-search.mjs';
import { buildResult, SUPPORT } from '../../src/core/result.mjs';

const DAY = 86400;
const NCOEF = 20;
const NREC = 40;
const INTERVAL = DAY;
const INIT = -20 * DAY;
const EMRAT = 81.30056822149722;

/** Chebyshev coefficients of a0 + a1*(t-mid) + a2*(t-mid)^2, exactly. */
function quadratic(a0, a1, a2, radius) {
  const c = new Array(NCOEF).fill(0);
  c[0] = a0 + (a2 * radius * radius) / 2;
  c[1] = a1 * radius;
  c[2] = (a2 * radius * radius) / 2;
  return c;
}
const zeros = () => new Array(NCOEF).fill(0);

/**
 * @param {(record:number, mid:number, radius:number) => {x:number[],y:number[],z:number[]}} shape
 */
function packWith(shape) {
  const coeffs = (r) => {
    const radius = INTERVAL / 2;
    const mid = INIT + (r + 0.5) * INTERVAL;
    const { x, y, z } = shape(r, mid, radius);
    return [...x, ...y, ...z];
  };
  const bytes = buildPack({
    bodies: [
      { name: 'sun', frame: 'native', ncoef: NCOEF, nrec: NREC, initEt: INIT, intervalSec: INTERVAL, coeffs: () => [...zeros(), ...zeros(), ...zeros()] },
      { name: 'emb', frame: 'ssb', ncoef: NCOEF, nrec: NREC, initEt: INIT, intervalSec: INTERVAL, coeffs: () => [...zeros(), ...zeros(), ...zeros()] },
      { name: 'moon', frame: 'ssb', ncoef: NCOEF, nrec: NREC, initEt: INIT, intervalSec: INTERVAL, coeffs: () => [...zeros(), ...zeros(), ...zeros()] },
      { name: 'marsBary', frame: 'ssb', ncoef: NCOEF, nrec: NREC, initEt: INIT, intervalSec: INTERVAL, coeffs },
    ],
    derived: { earth399: { emrat: EMRAT, from: 'moon' } },
  });
  return new Ephemeris(memorySource(bytes), parseContainerBytes(bytes));
}

const R = 2e8;   // km, the constant y that fixes the half-plane
const V = 1e6;   // km per second of TT, a brisk but finite rate

/** x = V*(t - t0), y = R, z = 0. At lambda = 90 degrees, f = x. */
const linearPack = (t0) => packWith((r, mid, radius) => ({
  x: quadratic(V * (mid - t0), V, 0, radius),
  y: quadratic(R, 0, 0, radius),
  z: zeros(),
}));

/** x = A*((t - t0)^2 - d), y = R. Roots at t0 +/- sqrt(d). */
const quadraticPack = (t0, d, A = 1) => packWith((r, mid, radius) => ({
  x: quadratic(A * ((mid - t0) * (mid - t0) - d), 2 * A * (mid - t0), A, radius),
  y: quadratic(R, 0, 0, radius),
  z: zeros(),
}));

const search = (eph, spec) => searchGeometricLongitude(eph, { body: 'Mars', targetDeg: 90, ...spec });
const WINDOW = { fromTtDays: -10, toTtDays: 10 };

/**
 * Is the exact root `tSec` inside one of the returned brackets, allowing
 * one bracket width of slack?
 *
 * The slack is not a fudge. `Math.cos(Math.PI / 2)` is 6.1e-17, not zero,
 * so a root this file calls exact can sit a few picoseconds outside a
 * bracket whose endpoint IS the root. The first version of this helper had
 * no slack and reported a missing root for exactly that reason.
 */
function bracketed(events, tSec) {
  return events.some((e) => {
    const lo = e.bracketTtDays[0] * DAY;
    const hi = e.bracketTtDays[1] * DAY;
    const slack = Math.max(e.bracketWidthSec, 1e-6);
    return tSec >= lo - slack && tSec <= hi + slack;
  });
}

// ---- roots that land exactly on a boundary ----
//
// Cells and pieces are CLOSED intervals, so an instant where f is exactly
// zero is the right end of one and the left end of the next. Before the
// half-open convention both reported it, and a single root came back as
// `found: 2` with `isExactTotal: true`. These pin the convention at all
// three places a boundary can be: a record edge, the interval's right
// edge, and its left edge.

/**
 * y ramps through zero at `t0`; x is a constant that fixes the half-plane.
 * With target 0 degrees, sin(lambda) is EXACTLY zero, so f = -cosE*y and
 * the computed f at t0 is exactly -0 from either adjacent record. That is
 * the door in: 0 degrees is the one target angle whose trig weight
 * vanishes exactly, and an Aries ingress is the most ordinary query there
 * is.
 */
const rampPack = (t0) => packWith((r, mid, radius) => ({
  x: quadratic(2e8, 0, 0, radius),
  y: quadratic(V * (mid - t0), V, 0, radius),
  z: zeros(),
}));
const searchZero = (eph, spec) => searchGeometricLongitude(eph, { body: 'Mars', targetDeg: 0, ...spec });

test('a root exactly on a record boundary is reported once, not once per side', () => {
  const t0 = 3 * DAY;                                  // INIT + 23 records: a record edge
  const r = searchZero(rampPack(t0), WINDOW);
  assert.equal(r.completeness.established, true);
  assert.equal(r.eventCount.isExactTotal, true);
  assert.equal(r.eventCount.found, 1, `one root, reported ${r.eventCount.found} times`);
  assert.ok(bracketed(r.events, t0));
});

test('a root exactly at the right edge of the interval is still reported', () => {
  // Nothing follows the last cell, so the half-open rule has to make an
  // exception there or the root vanishes.
  const t0 = 5 * DAY;
  const r = searchZero(rampPack(t0), { fromTtDays: -10, toTtDays: 5 });
  assert.equal(r.completeness.established, true);
  assert.equal(r.eventCount.found, 1, 'the root at the right edge was dropped');
  assert.ok(bracketed(r.events, t0));
});

test('a root exactly at the left edge of the interval is reported once', () => {
  const t0 = -5 * DAY;
  const r = searchZero(rampPack(t0), { fromTtDays: -5, toTtDays: 10 });
  assert.equal(r.completeness.established, true);
  assert.equal(r.eventCount.found, 1, `one root, reported ${r.eventCount.found} times`);
  assert.ok(bracketed(r.events, t0));
});

test('every event the validated mode returns is at a distinct instant', () => {
  // A cheap invariant that would have caught the duplicate directly.
  for (const [label, eph, spec] of [
    ['record edge', rampPack(3 * DAY), WINDOW],
    ['right edge', rampPack(5 * DAY), { fromTtDays: -10, toTtDays: 5 }],
    ['interior', rampPack(3.25 * DAY), WINDOW],
  ]) {
    const r = searchZero(eph, spec);
    const seen = new Set(r.events.map((e) => e.ttDays));
    assert.equal(seen.size, r.events.length, `${label}: two events share an instant`);
  }
});

test('a linear crossing is found, bracketed, and the count is exact', () => {
  const t0 = 3.25 * DAY;
  const r = search(linearPack(t0), WINDOW);
  assert.equal(r.execution.status, 'finished');
  assert.equal(r.completeness.established, true);
  assert.equal(r.completeness.support, 'proven');
  assert.equal(r.eventCount.isExactTotal, true);
  assert.equal(r.eventCount.found, 1);
  const e = r.events[0];
  assert.ok(bracketed(r.events, t0), `the exact root ${t0 / DAY} is outside the bracket ${JSON.stringify(e.bracketTtDays)}`);
  assert.ok(e.bracketWidthSec <= 1e-3);
  assert.ok(e.halfPlaneMarginKm > 0);
});

test('the opposite direction is NOT counted as the requested event', () => {
  const t0 = 3.25 * DAY;
  const eph = linearPack(t0);
  const wanted = search(eph, { ...WINDOW, targetDeg: 90 });
  const antipode = search(eph, { ...WINDOW, targetDeg: 270 });
  assert.equal(wanted.eventCount.found, 1);
  // The same instant solves the LINE equation for both directions. Only the
  // half-plane condition separates them, and it must.
  assert.equal(antipode.eventCount.found, 0);
  assert.equal(antipode.completeness.established, true, 'proving there is no crossing is a real answer');
  assert.equal(antipode.eventCount.isExactTotal, true);
});

test('a target given as 450 or -270 degrees is the same request as 90', () => {
  const t0 = 3.25 * DAY;
  const eph = linearPack(t0);
  const a = search(eph, { ...WINDOW, targetDeg: 90 });
  const b = search(eph, { ...WINDOW, targetDeg: 450 });
  const c = search(eph, { ...WINDOW, targetDeg: -270 });
  for (const r of [b, c]) {
    assert.equal(r.request.normalisedTargetDeg, 90);
    assert.equal(r.eventCount.found, a.eventCount.found);
    assert.deepEqual(r.events.map((e) => e.ttDays), a.events.map((e) => e.ttDays));
  }
});

test('two well-separated crossings are both found, with the exact instants inside the brackets', () => {
  // The roots are at +/- 1.5 days, which are NOT record boundaries. Roots
  // that sit exactly on one are their own case, below.
  const t0 = 0;
  const d = (1.5 * DAY) ** 2;
  const r = search(quadraticPack(t0, d), WINDOW);
  assert.equal(r.completeness.established, true);
  assert.equal(r.eventCount.found, 2);
  for (const root of [t0 - Math.sqrt(d), t0 + Math.sqrt(d)]) {
    assert.ok(bracketed(r.events, root), `the exact root at ${root / DAY} days is in no bracket`);
  }
});

test('roots sitting exactly on record boundaries are found, and completeness is declined', () => {
  // +/- 2 days ARE record boundaries here. At the boundary the computed f
  // is 1.1e-8 km against a rounding allowance of 5.3e-3 km -- its sign is
  // noise -- so the cell on the far side cannot rule out a second root and
  // says so. Both roots are still found and bracketed. Declining is the
  // point: the alternative is an exact total decided by the sign of a
  // quantity smaller than the arithmetic's own error.
  const r = search(quadraticPack(0, (2 * DAY) ** 2), WINDOW);
  assert.equal(r.eventCount.found, 2, 'the roots themselves must still be found');
  for (const root of [-2 * DAY, 2 * DAY]) assert.ok(bracketed(r.events, root));
  assert.equal(r.completeness.established, false);
  assert.equal(r.eventCount.isExactTotal, false);
  assert.ok(r.accounting.unresolved.length > 0);
  assert.ok(r.eventCount.lowerBound >= 2, 'what was found is still a lower bound');
});

test('a tangency is left unresolved rather than certified either way', () => {
  const r = search(quadraticPack(0, 0), WINDOW);
  assert.equal(r.completeness.established, false, 'a double root cannot be closed by these two tests, and pretending otherwise is the failure mode');
  assert.equal(r.eventCount.isExactTotal, false);
  assert.ok(r.accounting.unresolved.length > 0);
  assert.equal(r.accounting.allIntervalsAccountedFor, false);
});

test('a near miss is either proven empty or left open, never proven wrong', () => {
  const r = search(quadraticPack(0, -1e-6), WINDOW);
  if (r.completeness.established) assert.equal(r.eventCount.found, 0);
  else assert.ok(r.accounting.unresolved.length > 0);
});

test('a close pair is either found as two or left open, never proven to be one', () => {
  const d = 1e-8;                    // roots 2e-4 s apart
  const r = search(quadraticPack(0, d), WINDOW);
  if (r.completeness.established) assert.equal(r.eventCount.found, 2);
  else assert.ok(r.accounting.unresolved.length > 0);
});

test('an interval with no crossing is PROVEN to have none', () => {
  const eph = packWith((r, mid, radius) => ({
    x: quadratic(5e7, 0, 0, radius),    // x fixed and positive: never crosses x = 0
    y: quadratic(R, 0, 0, radius),
    z: zeros(),
  }));
  const r = search(eph, WINDOW);
  assert.equal(r.completeness.established, true);
  assert.equal(r.eventCount.found, 0);
  assert.equal(r.eventCount.isExactTotal, true);
  assert.equal(r.accounting.unresolved.length, 0);
});

// ---- the aliasing family, in the validated mode ----
//
// T_n has exactly n simple roots in (-1, 1), at cos((2k+1)*pi/(2n)). Setting
// the x-series to T_n gives a body whose crossings are known exactly and
// which oscillates as fast as the record can represent. Nothing here is
// sampled, so there is no grid for it to alias against.
function chebPack(n) {
  return packWith((r, mid, radius) => {
    const x = zeros();
    x[n] = 1e8;
    return { x, y: quadratic(R, 0, 0, radius), z: zeros() };
  });
}

for (const n of [5, 11, 19]) {
  test(`a body whose x-component is T_${n} has exactly ${n} crossings per record, and all are found`, () => {
    const eph = chebPack(n);
    // One record, strictly inside so the roots are interior.
    const r = search(eph, { fromTtDays: 0.0001, toTtDays: 0.9999 });
    assert.equal(r.execution.status, 'finished');
    // Odd n puts a root at tau = 0, the record midpoint -- which is also
    // where the bisection splits, so a cell endpoint lands on the root and
    // its computed value (1.1e-8 km) is inside the rounding allowance
    // (1.8e-5 km). The neighbouring cell then declines rather than
    // claiming there is no second root there. Every root is still found.
    assert.equal(r.completeness.established, false, 'a root on a cell boundary is not provable to be the only one there');
    assert.equal(r.eventCount.found, n, `T_${n} has ${n} roots in the record`);
    // The exact roots, from the closed form.
    const radius = INTERVAL / 2;
    const mid = INIT + (20 + 0.5) * INTERVAL;   // record 20 covers [0, 1) days
    for (let k = 0; k < n; k += 1) {
      const tau = Math.cos(((2 * k + 1) * Math.PI) / (2 * n));
      const t = mid + tau * radius;
      assert.ok(bracketed(r.events, t), `the exact root at tau = ${tau.toFixed(6)} is in no returned bracket`);
    }
  });
}

test('the same body across many records: every record contributes its roots', () => {
  const n = 11;
  const r = search(chebPack(n), { fromTtDays: 0.0001, toTtDays: 5.9999 });
  assert.equal(r.eventCount.found, 6 * n, 'six records, each an exact T_11');
  assert.ok(r.interval.pieces >= 6);
  // Same reason as above: odd n puts a root on every record's midpoint.
  assert.equal(r.completeness.established, false);
  assert.equal(r.eventCount.lowerBound, 6 * n);
});

// ---- V5: partitioning preserves the event set ----
test('partitioning the interval preserves the events, under the boundary convention', () => {
  const n = 11;
  const eph = chebPack(n);
  const whole = search(eph, { fromTtDays: 0.0001, toTtDays: 5.9999 });

  const cuts = [0.0001, 1.37, 2.5, 4.111, 5.9999];
  const parts = [];
  for (let i = 1; i < cuts.length; i += 1) {
    parts.push(search(eph, { fromTtDays: cuts[i - 1], toTtDays: cuts[i] }));
  }
  // What V5 is about is the EVENT SET surviving partitioning, and it does.
  // Whether completeness is established is a separate question, and for
  // this fixture it is not, for the reason given above; the whole and the
  // parts agree on that too.
  assert.equal(whole.completeness.established, false);
  for (const [i, r] of parts.entries()) assert.equal(r.execution.status, 'finished', `part ${i + 1} did not finish`);
  // Boundary convention: an event at a cut belongs to the part whose
  // half-open [from, to) contains it, so the union is deduplicated by
  // instant to within a bracket width.
  const all = parts.flatMap((r) => r.events.map((e) => e.ttDays)).sort((a, b) => a - b);
  const deduped = all.filter((t, i) => i === 0 || t - all[i - 1] > 1e-6);
  assert.equal(deduped.length, whole.eventCount.found,
    `the parts found ${deduped.length} events, the whole found ${whole.eventCount.found}`);
  for (const t of whole.events.map((e) => e.ttDays)) {
    assert.ok(deduped.some((x) => Math.abs(x - t) < 1e-6), `the whole-interval event at ${t} is missing from the parts`);
  }
});

// ---- degeneracy ----
test('a body passing through the geocentre is reported as degenerate, not answered', () => {
  // x = V*(t - t0) and y = W*(t - t0): both vanish together, so the
  // direction is undefined there and the half-plane cannot be decided.
  const t0 = 3.25 * DAY;
  const eph = packWith((r, mid, radius) => ({
    x: quadratic(V * (mid - t0), V, 0, radius),
    y: quadratic(V * (mid - t0), V, 0, radius),
    z: zeros(),
  }));
  const r = search(eph, WINDOW);
  assert.equal(r.completeness.established, false);
  assert.ok(r.diagnostics.degenerate.length > 0, 'the undetermined direction must be reported');
  assert.match(r.diagnostics.degenerate[0].why, /not determined/);
});

// ---- limits, budget, cancellation ----
test('a spent budget is a status, not a silent short list', () => {
  const r = search(chebPack(19), { fromTtDays: 0.0001, toTtDays: 5.9999, maxEvaluations: 200 });
  assert.equal(r.execution.status, 'budget-exhausted');
  assert.equal(r.execution.finished, false);
  assert.equal(r.completeness.established, false);
  assert.equal(r.eventCount.isExactTotal, false);
  assert.equal(r.eventCount.support, 'none');
});

test('cancellation comes back as a result, keeping the events already isolated', () => {
  // It used to throw, which discarded every root the run had already
  // proved. `cancelled` is a named execution state; the result now carries
  // it, along with whatever was found before the stop.
  let n = 0;
  const signal = {};
  Object.defineProperty(signal, 'aborted', { get() { n += 1; return n > 50; } });
  const r = search(chebPack(19), { fromTtDays: 0.0001, toTtDays: 5.9999, signal });
  assert.equal(r.execution.status, 'cancelled');
  assert.equal(r.execution.finished, false);
  assert.equal(r.completeness.established, false);
  assert.equal(r.completeness.support, 'none');
  assert.equal(r.eventCount.isExactTotal, false);
  assert.equal(r.accounting.allIntervalsAccountedFor, false);
  assert.equal(typeof r.execution.evaluations, 'number');
  // Every event it did hand back is still a real bracketed root.
  for (const e of r.events) {
    assert.equal(e.bracketTtDays[0] <= e.ttDays && e.ttDays <= e.bracketTtDays[1], true);
  }
});

test('a pack whose declared coverage overhangs its records cannot be proved over the overhang', () => {
  // container.mjs tolerates a declared coverage up to a second wider than
  // the records at each end, seriesAt used to CLAMP the record index, and
  // pieceEdges never emits the end of the last record -- so the final
  // piece ran past the data on a bound that is only a bound for |tau| <= 1.
  // Measured on this fixture before the fix: the series reached 1.76e22 at
  // tau = 3 against a declared bound of 3.68e18, false by 4770x, the cell
  // was "excluded", and the answer was `found: 0, isExactTotal: true,
  // processedFraction: 1` over an interval where the evaluated function
  // changes sign.
  const N = 100;
  const t19at2 = (() => { let a = 1; let b = 2; for (let k = 2; k <= 19; k += 1) { const c = 4 * b - a; a = b; b = c; } return b; })();
  const xFor = (r) => { const c = zeros(); if (r === N - 1) { c[0] = -1e8 * t19at2; c[19] = 1e8; } else { c[0] = 2e8; } return c; };
  const yConst = () => { const c = zeros(); c[0] = 2e8; return c; };
  const bytes = buildPack({
    bodies: [
      ...['sun', 'emb', 'moon'].map((name) => ({
        name, frame: name === 'sun' ? 'native' : 'ssb', ncoef: NCOEF, nrec: N, initEt: 0, intervalSec: 1,
        coeffs: () => [...zeros(), ...zeros(), ...zeros()],
      })),
      { name: 'marsBary', frame: 'ssb', ncoef: NCOEF, nrec: N, initEt: 0, intervalSec: 1, coeffs: (r) => [...xFor(r), ...yConst(), ...zeros()] },
    ],
    derived: { earth399: { emrat: EMRAT, from: 'moon' } },
    coverage: { startEtSecTdb: -1, stopEtSecTdb: N + 1 },
  });
  const eph = new Ephemeris(memorySource(bytes), parseContainerBytes(bytes));
  assert.throws(
    () => searchGeometricLongitude(eph, { body: 'Mars', targetDeg: 90, fromTtDays: -0.9 / DAY, toTtDays: (N + 0.9) / DAY }),
    (e) => e.code === 'out-of-coverage',
    'the overhang was searched, and a bound that is not a bound there was used to prove a zero',
  );
  // Inside the records it still answers, so this is a refusal and not a ban.
  const inside = searchGeometricLongitude(eph, { body: 'Mars', targetDeg: 90, fromTtDays: 0, toTtDays: N / DAY });
  assert.equal(inside.completeness.established, true);
});

test('a result cannot say it found a different number of events than it returned', () => {
  // Three invariant gaps found by an adversarial review, all reachable by
  // hand-building a result: `found` disagreeing with the list, an exact
  // total with a null upper bound, and a missing conditionalOn producing a
  // raw TypeError instead of a coded refusal.
  const base = {
    mode: 'validated-geometric',
    request: {},
    events: [{ ttDays: 0 }, { ttDays: 1 }],
    interval: {},
    execution: { status: 'finished', finished: true, evaluations: 1, maxEvaluations: 2 },
    accounting: { allIntervalsAccountedFor: true, unresolved: [], note: '' },
    assumptions: [],
    completeness: { established: true, support: SUPPORT.proven, statement: '', conditionalOn: [] },
    eventCount: { found: 1, isExactTotal: true, lowerBound: 1, upperBound: 1, support: SUPPORT.proven, conditionalTotal: null, conditionalPossibleTotals: null },
    uncertainty: {},
    diagnostics: {},
  };
  assert.throws(() => buildResult(base), (e) => /found is 1 but 2 events/.test(e.message));
  assert.throws(
    () => buildResult({ ...base, eventCount: { ...base.eventCount, found: 2, lowerBound: 2, upperBound: null } }),
    (e) => /upperBound/.test(e.message),
  );
  assert.throws(
    () => buildResult({ ...base, eventCount: { ...base.eventCount, found: 2, lowerBound: 2, upperBound: 2 }, completeness: { established: true, support: SUPPORT.proven, statement: '' } }),
    (e) => e.code === 'unsupported-option' && /conditionalOn must be an array/.test(e.message),
  );
  // The corrected version is accepted.
  assert.ok(buildResult({ ...base, eventCount: { ...base.eventCount, found: 2, lowerBound: 2, upperBound: 2 } }));
});

test('seriesAt refuses to extrapolate rather than clamping the record index', () => {
  const eph = linearPack(0);
  const span = NREC * INTERVAL;
  assert.doesNotThrow(() => eph.seriesAt('marsBary', INIT));
  assert.doesNotThrow(() => eph.seriesAt('marsBary', INIT + span));
  assert.throws(() => eph.seriesAt('marsBary', INIT - 0.5), (e) => e.code === 'out-of-coverage');
  assert.throws(() => eph.seriesAt('marsBary', INIT + span + 0.5), (e) => e.code === 'out-of-coverage');
});

test('an instant outside coverage is refused', () => {
  assert.throws(() => search(linearPack(0), { fromTtDays: -100, toTtDays: 10 }), (e) => e.code === 'out-of-coverage');
});

test('an unknown body and an unknown option are refused', () => {
  const eph = linearPack(0);
  assert.throws(() => searchGeometricLongitude(eph, { body: 'Nibiru', targetDeg: 0, ...WINDOW }), (e) => e.code === 'unknown-body');
  assert.throws(() => searchGeometricLongitude(eph, { body: 'Mars', targetDeg: 0, ...WINDOW, epsilonDeg: 1 }), (e) => e.code === 'unsupported-option');
});

// ---- V2: the two modes cannot be confused ----
test('the validated result names a different quantity from the apparent one', () => {
  const r = search(linearPack(3.25 * DAY), WINDOW);
  assert.equal(r.mode, 'validated-geometric');
  assert.equal(r.request.geometric, true);
  assert.equal(r.request.frame, 'ecliptic-of-the-icrs-equator');
  assert.equal(r.request.kind, 'geometric-longitude');
  assert.ok(r.request.notApplied.some((x) => /light-time/.test(x)));
  assert.ok(r.request.notApplied.some((x) => /precession and nutation/.test(x)));
  // And it says what its proof does NOT cover.
  assert.equal(r.uncertainty.packVersusKernel.bounded, false);
  assert.equal(r.uncertainty.geometricVersusApparent.bounded, false);
  assert.equal(r.uncertainty.physical.bounded, false);
  assert.ok(r.uncertainty.numerical.roundingAllowanceKm >= 0);
  assert.match(r.uncertainty.numerical.derivativeBoundsAre, /Not sampled/);
});

test('the proven mode carries no assumptions, because that is what proven means', () => {
  const r = search(linearPack(3.25 * DAY), WINDOW);
  assert.equal(r.completeness.established, true);
  assert.deepEqual(r.assumptions, []);
  assert.deepEqual(r.completeness.conditionalOn, []);
});
