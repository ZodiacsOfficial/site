/**
 * The reduction and the search over a synthetic pack whose geometry this
 * file chose: the Earth is pinned at the barycentre and one body runs a
 * circle at a constant rate, so apparent longitude sweeps at a known rate
 * and the search has a real, continuous, wrapping function to work on.
 *
 * The sky in this fixture is fictional, and that is the point: what is being
 * checked is the machinery — the contract refusals, the wrap handling, and
 * that the bounded search's answer matches an independent dense scan of the
 * SAME function. Whether the reduction matches the real sky is tier B's job,
 * and no result here is evidence about that.
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
import { buildPack } from './_pack.mjs';
import { openPackFromBytes } from '../../src/index.mjs';
import { CORRECTED, PROTOTYPE } from '../../src/core/reduce.mjs';

const DAY = 86400;
const NCOEF = 16;
const REC_DAYS = 5;
const NREC = 200;
const INIT = -100 * DAY;
const INTERVAL = REC_DAYS * DAY;
const PERIOD_DAYS = 300;
const RADIUS_KM = 3e8;

/** Chebyshev coefficients of g on [lo, hi], by discrete cosine fit. */
function chebFit(g, lo, hi, n) {
  const c = new Array(n).fill(0);
  const m = 4 * n;
  const xs = [];
  const ys = [];
  for (let j = 0; j < m; j += 1) {
    const tau = Math.cos((Math.PI * (j + 0.5)) / m);
    xs.push(tau);
    ys.push(g(lo + ((tau + 1) / 2) * (hi - lo)));
  }
  for (let k = 0; k < n; k += 1) {
    let s = 0;
    for (let j = 0; j < m; j += 1) s += ys[j] * Math.cos(k * Math.acos(xs[j]));
    c[k] = ((k === 0 ? 1 : 2) / m) * s;
  }
  return c;
}

const omega = (2 * Math.PI) / (PERIOD_DAYS * DAY);
const orbit = [
  (et) => RADIUS_KM * Math.cos(omega * et),
  (et) => RADIUS_KM * Math.sin(omega * et) * Math.cos(0.4),
  (et) => RADIUS_KM * Math.sin(omega * et) * Math.sin(0.4),
];

const zero = () => new Array(3 * NCOEF).fill(0);
const fixedAt = (v) => () => {
  const out = zero();
  for (let comp = 0; comp < 3; comp += 1) out[comp * NCOEF] = v[comp];
  return out;
};
const orbiting = (r) => {
  const lo = INIT + r * INTERVAL;
  const out = [];
  for (let comp = 0; comp < 3; comp += 1) out.push(...chebFit(orbit[comp], lo, lo + INTERVAL, NCOEF));
  return out;
};

const bytes = buildPack({
  bodies: [
    { name: 'sun', frame: 'native', ncoef: NCOEF, nrec: NREC, initEt: INIT, intervalSec: INTERVAL, coeffs: fixedAt([0, 0, 0]) },
    { name: 'emb', frame: 'ssb', ncoef: NCOEF, nrec: NREC, initEt: INIT, intervalSec: INTERVAL, coeffs: zero },
    { name: 'moon', frame: 'ssb', ncoef: NCOEF, nrec: NREC, initEt: INIT, intervalSec: INTERVAL, coeffs: zero },
    { name: 'marsBary', frame: 'ssb', ncoef: NCOEF, nrec: NREC, initEt: INIT, intervalSec: INTERVAL, coeffs: orbiting },
    { name: 'venusBary', frame: 'ssb', ncoef: NCOEF, nrec: NREC, initEt: INIT, intervalSec: INTERVAL, coeffs: fixedAt([RADIUS_KM, 0, 0]) },
  ],
  derived: { earth399: { emrat: 81.30056822149722, from: 'moon' } },
});

const OPTS = { ...CORRECTED, deflection: 'none' };
let rt;
test('open the synthetic pack', async () => { rt = await openPackFromBytes(bytes); });

test('the fixture sweeps a full turn, so the wrap really is exercised', () => {
  const lons = [0, 75, 150, 225, 299].map((d) => rt.apparent('Mars', d, OPTS).lon);
  assert.equal(new Set(lons.map((x) => Math.floor(x / 90))).size >= 4, true, `only reached ${lons.map((x) => x.toFixed(1))}`);
});

// ---- contract ----

test('an unknown body is refused by name', () => {
  assert.throws(() => rt.apparent('Ceres', 0, OPTS), (e) => e.code === 'unknown-body');
});

test('an unknown reduction option is refused rather than ignored', () => {
  assert.throws(() => rt.apparent('Mars', 0, { ...OPTS, nutaion: '2000b' }), (e) => e.code === 'unsupported-option');
});

test('an out-of-range option value is refused', () => {
  for (const bad of [
    { nutation: '2000a' }, { aberration: 'relativistic' }, { deflection: 'jupiter' },
    { timescale: 'utc' }, { observerVelocity: 'central3600' }, { bias: 'yes' },
    { lightTimeIters: 0 }, { lightTimeIters: 2.5 }, { lightTimeIters: 100000 },
    { lightTimeTolSec: -1 }, { deflectionLimit: 0 },
  ]) {
    assert.throws(() => rt.apparent('Mars', 0, { ...OPTS, ...bad }), (e) => e.code === 'unsupported-option', JSON.stringify(bad));
  }
});

test('a non-finite instant is refused', () => {
  for (const t of [NaN, Infinity, -Infinity, 'today']) {
    assert.throws(() => rt.apparent('Mars', t, OPTS), (e) => e.code === 'bad-instant' || e.code === 'unsupported-option');
  }
});

test('an instant outside coverage is refused, and so is a light-time lookback that leaves it', () => {
  assert.throws(() => rt.apparent('Mars', -200, OPTS), (e) => e.code === 'out-of-coverage');
  assert.throws(() => rt.apparent('Mars', 900, OPTS), (e) => e.code === 'out-of-coverage');
});

test('IAU 2000A is not reachable, as the contract says', () => {
  assert.throws(() => rt.apparent('Mars', 0, { ...OPTS, nutation: '2000a' }), (e) => e.code === 'unsupported-option');
});

// ---- what the runtime advertises, and what a degenerate place does ----
//
// Both of these were found by driving the browser preview, not by reading
// the code: the interface listed ten bodies for a four-body pack, and one
// body sitting on the observer took down the whole places table with a
// message about a non-finite value.

test('the advertised body list contains only bodies this pack can answer for', () => {
  // This fixture carries the Sun, the Earth-Moon pair and two planets.
  // Six of the contract's ten have no segment here at all.
  assert.deepEqual([...rt.bodies].sort(), ['Mars', 'Moon', 'Sun', 'Venus']);
  // Advertised means the pack HAS this body, not that every instant of it
  // is well posed. Two of the four here sit on the observer by construction
  // and are refused for that -- a different answer from "no such body", and
  // the list is about the pack, so both are correct.
  for (const body of rt.bodies) {
    try {
      rt.apparent(body, 0, { ...OPTS, deflection: 'none' });
    } catch (error) {
      assert.equal(error.code, 'bad-geometry', `${body} is advertised but failed with ${error.code}`);
    }
  }
  for (const absent of ['Mercury', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']) {
    assert.equal(rt.bodies.includes(absent), false, `${absent} is advertised`);
    assert.throws(() => rt.apparent(absent, 0, OPTS), (e) => e.code === 'unknown-body');
  }
});

test('a body sitting on the observer is refused by code, not returned as NaN', () => {
  // The Earth is at the barycentre and this fixture's Moon record is zero,
  // so the geocentric Moon is exactly at the observer and has no direction.
  assert.throws(() => rt.apparent('Moon', 0, { ...OPTS, deflection: 'none' }), (e) => {
    assert.equal(e.code, 'bad-geometry');
    assert.match(e.message, /no determinable direction/);
    return true;
  });
});

test('the Sun on the observer with deflection on is refused the same way', () => {
  // Deflection divides by the Sun-observer distance. This fixture's Sun is
  // at the barycentre, where the Earth is.
  assert.throws(() => rt.apparent('Venus', 0, { ...OPTS, deflection: 'sun' }), (e) => e.code === 'bad-geometry');
});

test('every switch that can matter here does, and the ones that cannot are exactly zero', () => {
  const at = (o) => rt.apparent('Mars', 123.25, { ...OPTS, ...o }).lon;
  const base = at({});
  const arcsec = (o) => (at(o) - base) * 3600;

  // Live, with the sizes measured on this fixture rather than asserted from
  // theory: dropping nutation entirely is worth about 17 arcsec, the
  // five-term truncation about 0.03, and the frame bias about 0.007.
  assert.ok(Math.abs(arcsec({ nutation: 'none' })) > 10, `nutation off: ${arcsec({ nutation: 'none' })}`);
  assert.ok(Math.abs(arcsec({ nutation: 'ae' })) > 1e-3, `truncated nutation: ${arcsec({ nutation: 'ae' })}`);
  assert.ok(Math.abs(arcsec({ bias: false })) > 1e-3, `bias off: ${arcsec({ bias: false })}`);
  assert.ok(Math.abs(arcsec({ timescale: 'tt' })) > 0, 'TT-as-TDB must move something');

  // Exactly zero, and that is a property of the FIXTURE, not of the code:
  // the Earth is pinned at the barycentre with no velocity, so there is no
  // aberration to apply and no observer velocity to estimate. If either of
  // these ever becomes non-zero the fixture has stopped being what this file
  // says it is.
  assert.equal(arcsec({ aberration: 'none' }), 0);
  assert.equal(arcsec({ aberration: 'first' }), 0);
  assert.equal(arcsec({ observerVelocity: 'central60' }), 0);

  assert.notEqual(rt.apparent('Mars', 123.25, PROTOTYPE).lon, base);
});

test('the same call twice gives the same bits', () => {
  const a = rt.apparent('Mars', 55.125, OPTS);
  rt.apparent('Venus', 200.5, OPTS);
  const b = rt.apparent('Mars', 55.125, OPTS);
  for (const k of ['lon', 'lat', 'distKm', 'lightTimeSec']) assert.equal(a[k], b[k], k);
});

test('a system barycentre is labelled as one, every time', () => {
  assert.equal(rt.apparent('Mars', 10, OPTS).isSystemBarycentre, true);
  assert.equal(rt.apparent('Venus', 10, OPTS).isSystemBarycentre, false);
});

test('light time converges and is reported', () => {
  const r = rt.apparent('Mars', 10, OPTS);
  assert.equal(r.lightTimeConverged, true);
  assert.ok(r.lightTimeIters >= 2 && r.lightTimeIters <= CORRECTED.lightTimeIters);
  assert.ok(Math.abs(r.lightTimeSec - r.distKm / 299792.458) < 1e-6);
});

// ---- search ----

/** An independent root finder: dense scan, then plain bisection. */
function denseRoots(fn, a, b, stepDays) {
  const wrap = (d) => { let x = d % 360; if (x > 180) x -= 360; if (x <= -180) x += 360; return x; };
  const roots = [];
  let prev = wrap(fn(a));
  for (let t = a + stepDays; t <= b; t += stepDays) {
    const cur = wrap(fn(t));
    // Skip the antipode jump: a sign change with both ends near a half turn
    // is the wrap, not a root.
    if (prev * cur < 0 && Math.abs(prev) < 90 && Math.abs(cur) < 90) {
      let lo = t - stepDays; let hi = t; let flo = prev;
      for (let i = 0; i < 80; i += 1) {
        const m = (lo + hi) / 2;
        const fm = wrap(fn(m));
        if ((fm < 0) === (flo < 0)) { lo = m; flo = fm; } else hi = m;
      }
      roots.push((lo + hi) / 2);
    }
    prev = cur;
  }
  return roots;
}

test('the bounded search finds exactly the crossings a dense scan finds', () => {
  const from = 0; const to = 600;
  const target = 40;
  const r = rt.search({
    kind: 'longitude', body: 'Mars', targetDeg: target,
    fromTtDays: from, toTtDays: to, epsilonDeg: 1 / 3600,
    options: OPTS, maxEvaluations: 400000,
  });
  const reference = denseRoots((t) => rt.apparent('Mars', t, OPTS).lon - target, from, to, 0.25);
  assert.equal(r.execution.status, 'finished');
  assert.equal(r.accounting.allIntervalsAccountedFor, true, JSON.stringify(r.execution.reason ?? r.completeness.statement));
  assert.equal(r.eventCount.found, reference.length, `search found ${r.eventCount.found}, dense scan found ${reference.length}`);
  assert.equal(r.eventCount.conditionalTotal, reference.length);
  // The count agrees with a dense scan, and that is still not a proof: a
  // denser reference is corroboration, never completeness.
  assert.equal(r.completeness.established, false);
  assert.ok(reference.length >= 2, 'the window should contain more than one crossing');
  for (const t of reference) {
    const hit = r.events.find((c) => t >= c.bracketTtDays[0] && t <= c.bracketTtDays[1]);
    assert.ok(hit, `dense-scan root at ${t} is in no returned bracket`);
  }
  assert.equal(r.accounting.unresolved.length, 0);
  assert.ok(r.diagnostics.branches.antipodeGaps.length >= 1, 'a 600-day window must have crossed the antipode');
  assert.ok(r.diagnostics.branches.antipodeGaps.every((g) => g.excluded));
});

test('an aspect search agrees with a dense scan of the same difference', () => {
  const from = 0; const to = 400;
  const r = rt.search({
    kind: 'aspect', body: 'Mars', other: 'Venus', targetDeg: 90,
    fromTtDays: from, toTtDays: to, epsilonDeg: 1 / 3600,
    options: OPTS, maxEvaluations: 400000,
  });
  const reference = denseRoots(
    (t) => rt.apparent('Mars', t, OPTS).lon - rt.apparent('Venus', t, OPTS).lon - 90, from, to, 0.25,
  );
  assert.equal(r.accounting.allIntervalsAccountedFor, true);
  assert.equal(r.eventCount.found, reference.length);
  assert.equal(r.completeness.established, false);
});

test('a certified result never carries an unresolved interval, and vice versa', () => {
  const r = rt.search({
    kind: 'longitude', body: 'Mars', targetDeg: 40,
    fromTtDays: 0, toTtDays: 200, epsilonDeg: 1 / 3600, options: OPTS,
  });
  assert.equal(r.accounting.allIntervalsAccountedFor === true, r.accounting.unresolved.length === 0);
});

test('the bracket is the epsilon set: its width scales with epsilon, linearly', () => {
  const width = (eps) => {
    const r = rt.search({
      kind: 'longitude', body: 'Mars', targetDeg: 40,
      fromTtDays: 0, toTtDays: 200, epsilonDeg: eps, options: OPTS, maxEvaluations: 400000,
    });
    assert.equal(r.accounting.allIntervalsAccountedFor, true, `eps ${eps} should stay certified: this crossing is transversal`);
    assert.equal(r.events.length, 1);
    return r.events[0].bracketWidthSec;
  };
  const w1 = width(1 / 3600);
  const w2 = width(1);
  const ratio = w2 / w1 / 3600;
  assert.ok(Math.abs(ratio - 1) < 0.01, `bracket width should scale with epsilon; ratio was ${ratio}`);
  // A wider allowance does NOT make a transversal crossing uncertain -- only
  // a turning point near the level can do that, and the analytic suite
  // (cases C2 and D2) is where that is exercised, on functions whose
  // topology is known in closed form.
});

test('the six result parts are always present and never merged', () => {
  const r = rt.search({
    kind: 'longitude', body: 'Mars', targetDeg: 40,
    fromTtDays: 0, toTtDays: 200, epsilonDeg: 1 / 3600, options: OPTS,
  });
  for (const k of ['events', 'interval', 'execution', 'accounting', 'completeness', 'assumptions', 'eventCount', 'uncertainty', 'diagnostics']) {
    assert.ok(k in r, `missing ${k}`);
  }
  assert.equal(r.contract, 'zodiacs-precision-search/2');
  // The v1 names must be GONE, not deprecated. A consumer branching on
  // `certified` would otherwise read undefined; one branching on
  // `isolation` fails loudly, which is the point of versioning.
  for (const gone of ['certified', 'complete', 'isolation', 'candidates', 'budget', 'externalUncertainty']) {
    assert.equal(gone in r, false, `${gone} should not survive into v2`);
  }
  assert.equal(r.completeness.support, 'conditional');
  assert.equal(r.completeness.established, false);
  assert.ok(r.completeness.conditionalOn.length >= 1);
  assert.equal(r.eventCount.isExactTotal, false);
  assert.equal(r.uncertainty.model.bounded, false);
  assert.equal(r.uncertainty.physical.bounded, false);
  assert.equal(r.diagnostics.declaredBounds[0].proven, false);
  assert.ok(r.assumptions.every((x) => x.status === 'unverified'));
  assert.ok(r.diagnostics.declaredBounds[0].inflation >= 1);
});

test('epsilon has no default: the allowance must be declared', () => {
  assert.throws(() => rt.search({ kind: 'longitude', body: 'Mars', targetDeg: 40, fromTtDays: 0, toTtDays: 200, options: OPTS }),
    (e) => e.code === 'unsupported-option' && /declared before the search/.test(e.message));
});

test('the budget bounds the WHOLE search, not just the classifier', () => {
  const run = (maxEvaluations, robustness = true) => rt.search({
    kind: 'longitude', body: 'Mars', targetDeg: 40,
    fromTtDays: 0, toTtDays: 600, epsilonDeg: 1 / 3600, options: OPTS,
    maxEvaluations, robustness,
  });

  // What it costs to establish the topology, with the extra robustness
  // probe turned off so the two costs are not confused.
  const bare = run(400000, false);
  assert.equal(bare.execution.status, 'finished');
  assert.equal(bare.accounting.allIntervalsAccountedFor, true);
  const cost = bare.execution.evaluations;
  assert.ok(cost > 1000, `this window should cost a four-figure number of evaluations, cost ${cost}`);

  // One short of that refuses, and never spends more than it was allowed.
  // The branch scan and the derivative probes are inside the bound too,
  // which is the part that was wrong before this test existed: the budget
  // used to reach only the classifier, and a search could cost six times
  // what the caller allowed while reporting a number inside it.
  const tight = run(cost - 1, false);
  assert.equal(tight.accounting.allIntervalsAccountedFor, false);
  assert.equal(tight.eventCount.conditionalTotal, null);
  assert.equal(tight.execution.status, 'budget-exhausted');
  assert.equal(tight.execution.finished, false);
  assert.match(tight.execution.reason, /budget/);
  assert.ok(tight.execution.evaluations <= cost, `spent ${tight.execution.evaluations} of an allowance of ${cost - 1}`);

  const exact = run(cost, false);
  assert.equal(exact.execution.status, 'finished');
  assert.equal(exact.accounting.allIntervalsAccountedFor, true);
  assert.equal(exact.execution.evaluations, cost, 'the cost should be deterministic');
});

test('a budget that runs out during the robustness probe keeps the topology it established', () => {
  const full = rt.search({
    kind: 'longitude', body: 'Mars', targetDeg: 40,
    fromTtDays: 0, toTtDays: 600, epsilonDeg: 1 / 3600, options: OPTS, maxEvaluations: 400000,
  });
  const bare = rt.search({
    kind: 'longitude', body: 'Mars', targetDeg: 40,
    fromTtDays: 0, toTtDays: 600, epsilonDeg: 1 / 3600, options: OPTS, maxEvaluations: 400000, robustness: false,
  });
  assert.ok(full.execution.evaluations > bare.execution.evaluations, 'the robustness probe should cost something');

  const cut = rt.search({
    kind: 'longitude', body: 'Mars', targetDeg: 40,
    fromTtDays: 0, toTtDays: 600, epsilonDeg: 1 / 3600, options: OPTS,
    maxEvaluations: bare.execution.evaluations,
  });
  // Isolation was established inside the allowance; only the extra probe was
  // cut off. Reporting that as an unresolved topology would be a false
  // negative, and hiding the exhaustion would be worse, so both are said.
  assert.equal(cut.accounting.allIntervalsAccountedFor, true);
  assert.equal(cut.eventCount.conditionalTotal, full.eventCount.conditionalTotal);
  assert.equal(cut.execution.exhausted, true);
  assert.equal(cut.diagnostics.robustness.ran, false);
  assert.equal(cut.diagnostics.robustness.why, 'budget-exhausted');
});

test('cancellation stops the search and reports how far it got', () => {
  let n = 0;
  const signal = {};
  Object.defineProperty(signal, 'aborted', { get() { n += 1; return n > 30; } });
  assert.throws(
    () => rt.search({ kind: 'longitude', body: 'Mars', targetDeg: 40, fromTtDays: 0, toTtDays: 600, epsilonDeg: 1 / 3600, options: OPTS, signal }),
    (e) => e.code === 'cancelled' && typeof e.detail.evaluations === 'number',
  );
});

test('an unsupported event kind is refused', () => {
  assert.throws(() => rt.search({ kind: 'station', body: 'Mars', targetDeg: 0, fromTtDays: 0, toTtDays: 200, epsilonDeg: 1 }),
    (e) => e.code === 'unsupported-option');
  assert.throws(() => rt.search({ kind: 'aspect', body: 'Mars', targetDeg: 0, fromTtDays: 0, toTtDays: 200, epsilonDeg: 1 }),
    (e) => e.code === 'unsupported-option');
  assert.throws(() => rt.search({ kind: 'longitude', body: 'Mars', other: 'Venus', targetDeg: 0, fromTtDays: 0, toTtDays: 200, epsilonDeg: 1 }),
    (e) => e.code === 'unsupported-option');
});

test('dispose releases and refuses', () => {
  rt.dispose();
  assert.throws(() => rt.apparent('Mars', 0, OPTS), (e) => e.code === 'disposed');
});
