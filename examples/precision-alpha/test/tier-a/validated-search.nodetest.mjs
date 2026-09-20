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
  const t0 = 0;
  const d = (2 * DAY) ** 2;
  const r = search(quadraticPack(t0, d), WINDOW);
  assert.equal(r.completeness.established, true);
  assert.equal(r.eventCount.found, 2);
  for (const root of [t0 - Math.sqrt(d), t0 + Math.sqrt(d)]) {
    assert.ok(bracketed(r.events, root), `the exact root at ${root / DAY} days is in no bracket`);
  }
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
    assert.equal(r.completeness.established, true);
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
  assert.equal(r.completeness.established, true);
  assert.equal(r.eventCount.found, 6 * n, 'six records, each an exact T_11');
  assert.ok(r.interval.pieces >= 6);
});

// ---- V5: partitioning preserves the event set ----
test('partitioning the interval preserves the events, under the boundary convention', () => {
  const n = 11;
  const eph = chebPack(n);
  const whole = search(eph, { fromTtDays: 0.0001, toTtDays: 5.9999 });
  assert.equal(whole.completeness.established, true);

  const cuts = [0.0001, 1.37, 2.5, 4.111, 5.9999];
  const parts = [];
  for (let i = 1; i < cuts.length; i += 1) {
    const r = search(eph, { fromTtDays: cuts[i - 1], toTtDays: cuts[i] });
    assert.equal(r.completeness.established, true, `part ${i} was not established`);
    parts.push(r);
  }
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
  assert.equal(r.request.frame, 'j2000-mean-ecliptic');
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
