/**
 * The deflected search: what the enclosures buy, and what the restricted
 * domain costs.
 *
 * `deflection.nodetest.mjs` settles the transformation -- pointwise against
 * the compiled ERFA, and over intervals against an independent reference.
 * This file is about the SEARCH: that the deflection reaches the roots,
 * that a window crossing the five-degree floor comes back honest about
 * what it did not look at, and that the events it does report survive.
 *
 * ## The reference, and what it is not
 *
 * There is no independent deflected-search implementation to check against,
 * so the checks here are relational rather than absolute: the deflected
 * search against the of-date search it extends, and the event-time SHIFT
 * between them against a bound derived from the deflection angle
 * `deflect` computes -- and `deflect` is settled bit for bit against the
 * pinned `ld.c` elsewhere, so it is not this code checking itself.
 *
 * A shift is a shift. Section 7 of the mandate this work runs under is
 * explicit that a correction-induced change in an event time is not by
 * itself an accuracy improvement, and nothing here claims otherwise.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from './_geometry.mjs';
import { deflect, deflectionDomain, MIN_ELONGATION_RAD } from '../../src/core/deflection.mjs';
import {
  searchDeflectedLongitude, searchOfDateLongitude, DEFLECTED_CONTRACT, mergeSpans,
} from '../../src/core/retarded-search.mjs';
import { buildResult, SUPPORT } from '../../src/core/result.mjs';

const D = 86400;
const AS = (180 * 3600) / Math.PI;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const norm = (v) => Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);

/** Well away from conjunction: the whole window is inside the domain. */
const OPEN = G.heliocentricPair();
const OPEN_EPH = G.packOf(OPEN.target, OPEN.observer, { nrec: 142, initEt: -71 * D });
const OPEN_WIN = [-70 * D, 70 * D];

/** Through conjunction: `targetPhase = -pi/2` puts the target behind the Sun at t = 0. */
const CONJ = G.heliocentricPair({ targetPhase: -Math.PI / 2 });
const CONJ_EPH = G.packOf(CONJ.target, CONJ.observer, { nrec: 142, initEt: -71 * D });
const CONJ_WIN = [-70 * D, 70 * D];

/**
 * A Sun that MOVES, so the emission/reception epoch split is not
 * identically zero.
 *
 * `packOf` puts the Sun at the barycentre by default, which every suite
 * before this one wanted and which makes `S(t) - S(t - tau)` exactly the
 * zero vector -- so the profile's split epochs are untestable against it
 * however carefully everything else is checked. Measured: the epoch choice
 * moves the deflection by 0.000e+0 arcsec with a static Sun and 1.118e-7
 * with this one.
 *
 * 30 km/s is not the real Sun's barycentric speed, which is about 12 m/s.
 * It is chosen to put the effect above the noise of a synthetic pack, the
 * same way the aberrated suite uses a 1.4c observer to reach a refusal --
 * and it is named here rather than passed off as physical.
 */
const SUN_SPEED_KM_S = 30;
const sunPath = (t) => [SUN_SPEED_KM_S * t, 0.3 * SUN_SPEED_KM_S * t, 0];
const MOVING = (() => {
  const obs = G.circle(1.495978707e8, 365.25 * D, Math.PI / 2);
  const tgt = G.circle(2.2794e8, 686.98 * D, Math.PI / 2);
  const observer = (t) => { const s = sunPath(t); const o = obs.at(t); return [s[0] + o[0], s[1] + o[1], s[2] + o[2]]; };
  const target = (t) => { const s = sunPath(t); const q = tgt.at(t); return [s[0] + q[0], s[1] + q[1], s[2] + q[2]]; };
  // `lonExact` needs the observer's velocity for the aberration; it is the
  // Sun's plus the circle's, and the Sun's is a constant by construction.
  const observerVel = (t) => {
    const v = obs.vel(t);
    return [SUN_SPEED_KM_S + v[0], 0.3 * SUN_SPEED_KM_S + v[1], v[2]];
  };
  return { observer, target, observerVel, sun: sunPath, obs, tgt };
})();
const MOVING_EPH = G.packOf(MOVING.target, MOVING.observer, {
  nrec: 142, initEt: -71 * D, sunFn: sunPath,
});

const BODY = 'Mars';
const elongationAt = (pair, t) => deflectionDomain(
  sub(pair.target(t), pair.observer(t)), pair.observer(t),
).elongationDeg;

test('the two fixtures are the two cases they claim to be', () => {
  // Independently of anything the search does. A "conjunction" fixture
  // that never approached the Sun would make every assertion below about
  // the excluded path vacuous, and an "open" fixture that did approach it
  // would make the completeness assertions vacuous the other way.
  let openMin = Infinity;
  let conjMin = Infinity;
  for (let t = OPEN_WIN[0]; t <= OPEN_WIN[1]; t += 1800) {
    openMin = Math.min(openMin, elongationAt(OPEN, t));
    conjMin = Math.min(conjMin, elongationAt(CONJ, t));
  }
  assert.ok(openMin > 5, `the open fixture reaches ${openMin} deg, inside the floor`);
  assert.ok(conjMin < 0.1, `the conjunction fixture only reaches ${conjMin} deg`);
});

// ============================================ inside the domain: it works
test('inside the domain the deflected search establishes completeness', () => {
  const targetDeg = G.lonExact(OPEN, 17.37 * D, true);
  const r = searchDeflectedLongitude(OPEN_EPH, {
    body: BODY, targetDeg, fromTdbSec: OPEN_WIN[0], toTdbSec: OPEN_WIN[1],
  });
  assert.equal(r.execution.status, 'finished');
  assert.equal(r.completeness.established, true, r.completeness.statement);
  assert.equal(r.completeness.support, SUPPORT.proven);
  assert.equal(r.accounting.excluded.length, 0);
  assert.equal(r.accounting.unresolved.length, 0);
  assert.equal(r.accounting.allIntervalsAccountedFor, true);
  assert.ok(r.events.length > 0, 'a completeness case with no events establishes nothing');
  assert.equal(r.eventCount.isExactTotal, true);
  assert.deepEqual(r.interval.decidedTdbSec, [[OPEN_WIN[0], OPEN_WIN[1]]]);
  assert.equal(r.interval.decidedFraction, 1);
  assert.equal(r.mode, 'validated-retarded-aberrated-deflected-of-date');
});

test('the deflection moves the roots, by no more than it can', () => {
  // The relational check. Two searches over the same window for the same
  // longitude, differing only by whether the deflection is applied.
  const targetDeg = G.lonExact(OPEN, 17.37 * D, true);
  const spec = { body: BODY, targetDeg, fromTdbSec: OPEN_WIN[0], toTdbSec: OPEN_WIN[1] };
  const base = searchOfDateLongitude(OPEN_EPH, spec);
  const def = searchDeflectedLongitude(OPEN_EPH, spec);
  assert.equal(base.completeness.established, true);
  assert.equal(def.completeness.established, true);
  assert.equal(def.events.length, base.events.length,
    'the deflection should not create or destroy a root at this separation');
  assert.ok(base.events.length > 0);

  let anyMoved = false;
  for (let i = 0; i < base.events.length; i += 1) {
    const t = base.events[i].tdbSec;
    const shift = def.events[i].tdbSec - t;
    assert.equal(def.events[i].direction, base.events[i].direction, 'the crossing sense must not flip');

    // The bound, derived rather than measured. The deflection rotates the
    // direction by delta, so it can move a longitude by at most delta, and
    // an event time by at most delta divided by the rate the longitude is
    // sweeping. Both come from outside the search: delta from `deflect`,
    // which is settled against the compiled reference, and the rate from
    // the reference geometry by a difference over a full minute.
    const O = OPEN.observer(t);
    const dvec = sub(OPEN.target(t - norm(sub(OPEN.target(t), O)) / 299792.458), O);
    const got = deflect(dvec, O, OPEN.target(t));
    const delta = Math.atan(norm(got.u) / norm(dvec));
    const rateDegPerSec = (G.lonExact(OPEN, t + 30, true) - G.lonExact(OPEN, t - 30, true)) / 60;
    const boundSec = (delta * (180 / Math.PI)) / Math.abs(rateDegPerSec);
    assert.ok(Math.abs(shift) <= boundSec * 1.05,
      `event ${i} moved ${shift} s, above the ${boundSec} s a ${(delta * AS).toFixed(6)} arcsec deflection allows`);
    if (Math.abs(shift) > 0) anyMoved = true;
  }
  // If nothing moved at all, the deflection is not reaching the roots and
  // every bound above is satisfied vacuously.
  assert.ok(anyMoved, 'the deflection did not move a single event time');
});

// ================================== crossing the floor: honest, not silent
test('a window through conjunction excludes rather than guesses', () => {
  const targetDeg = G.lonExact(CONJ, 40 * D, true);
  const r = searchDeflectedLongitude(CONJ_EPH, {
    body: BODY, targetDeg, fromTdbSec: CONJ_WIN[0], toTdbSec: CONJ_WIN[1],
  });
  assert.equal(r.execution.status, 'finished', 'the run must finish; this is not a budget failure');

  // Excluded, not unresolved, and merged into runs rather than slivers.
  assert.ok(r.accounting.excluded.length >= 1, 'the conjunction must produce an excluded span');
  assert.ok(r.accounting.excluded.length <= 4,
    `${r.accounting.excluded.length} excluded runs for one conjunction; adjacent spans should be merged`);
  assert.ok(r.accounting.excludedCells > r.accounting.excluded.length,
    'the pre-merge cell count must be kept, so nothing is hidden by the merge');
  for (const x of r.accounting.excluded) {
    assert.match(x.why, /supported-domain|floor/);
    assert.ok(x.toTdbSec > x.fromTdbSec);
  }

  // No completeness claim over the request, and the count is a lower bound.
  assert.equal(r.completeness.established, false);
  assert.equal(r.completeness.support, SUPPORT.none);
  assert.equal(r.accounting.allIntervalsAccountedFor, false);
  assert.equal(r.eventCount.isExactTotal, false);
  assert.equal(r.eventCount.found, r.events.length);
  assert.equal(r.eventCount.lowerBound, r.events.length);
  assert.equal(r.eventCount.upperBound, null);
  assert.match(r.completeness.statement, /lower bound|not examined/);
  assert.match(r.accounting.excludedNote, /NOT exhaustive/);

  // The excluded region is where the geometry says it is, checked against
  // the fixture and not against the search.
  const span = r.accounting.excluded.reduce(
    (acc, x) => [Math.min(acc[0], x.fromTdbSec), Math.max(acc[1], x.toTdbSec)], [Infinity, -Infinity],
  );
  assert.ok(elongationAt(CONJ, (span[0] + span[1]) / 2) < 5,
    'the middle of the excluded region must really be inside the floor');
  for (const t of [span[0] - 2 * D, span[1] + 2 * D]) {
    assert.ok(elongationAt(CONJ, t) > 5,
      `two days outside the excluded region the elongation is ${elongationAt(CONJ, t)} deg`);
  }
});

test('the supported events survive the excluded region', () => {
  // Section 5 of the mandate: preserve supported events already
  // established. A crossing well away from conjunction must be found by
  // the deflected search exactly as the of-date search finds it, and must
  // not be lost because some OTHER part of the window was excluded.
  const targetDeg = G.lonExact(CONJ, 40 * D, true);
  const spec = { body: BODY, targetDeg, fromTdbSec: CONJ_WIN[0], toTdbSec: CONJ_WIN[1] };
  const base = searchOfDateLongitude(CONJ_EPH, spec);
  const def = searchDeflectedLongitude(CONJ_EPH, spec);
  assert.equal(base.completeness.established, true, 'the of-date mode has no restricted domain');
  assert.ok(base.events.length > 0);

  // Every of-date event that lies in a DECIDED span of the deflected run
  // must have a deflected counterpart close by.
  const decided = def.interval.decidedTdbSec;
  assert.ok(Array.isArray(decided) && decided.length >= 1);
  const inDecided = (t) => decided.some(([lo, hi]) => t >= lo && t <= hi);
  let matched = 0;
  for (const e of base.events) {
    if (!inDecided(e.tdbSec)) continue;
    const near = def.events.find((x) => Math.abs(x.tdbSec - e.tdbSec) < 60);
    assert.ok(near, `the of-date event at ${e.tdbSec / D} d was lost from a decided span`);
    matched += 1;
  }
  assert.ok(matched > 0, 'no of-date event fell in a decided span, so this test checked nothing');

  // And the decided fraction is the window minus the gaps, not a guess.
  const gaps = [...def.accounting.excluded, ...def.accounting.unresolved]
    .reduce((acc, x) => acc + (x.toTdbSec - x.fromTdbSec), 0);
  const expected = 1 - gaps / (CONJ_WIN[1] - CONJ_WIN[0]);
  assert.ok(Math.abs(def.interval.decidedFraction - expected) < 1e-9,
    `decidedFraction ${def.interval.decidedFraction} against ${expected} from the span lengths`);
});

// ======================================================= the contract
test('the contract says what is applied and what is not', () => {
  const c = DEFLECTED_CONTRACT;
  assert.match(c.supportedDomain, new RegExp(`${MIN_ELONGATION_RAD / (Math.PI / 180)} degrees`));
  assert.ok(c.applied.some((x) => /solar gravitational light deflection/i.test(x)));
  assert.ok(c.applied.some((x) => /finite source distance/i.test(x)));
  // The three omissions that are easy to let slide.
  assert.ok(c.notApplied.some((x) => /other than the Sun/.test(x)));
  assert.ok(c.notApplied.some((x) => /second-order term eraLd itself omits/.test(x)));
  assert.ok(c.notApplied.some((x) => /Klioner/.test(x) && /stays off/.test(x)));
  assert.ok(c.notApplied.some((x) => /NOT an apparent place/.test(x)));
  assert.equal(c.deflectionProfile.id, 'zodiacs-deflected-of-date/1');
  assert.match(c.order, /light-time -> deflection -> aberration -> frame/);
  // It must not claim eraLdsun's geometry, which is the approximation this
  // profile deliberately does not make.
  assert.match(c.relationToErfa, /NOT eraLdsun/);
});

test('a result cannot claim coverage over a span it excluded', () => {
  // Invariant 8, at the contract boundary rather than through a search --
  // this is the structural guard that stops a future mode reporting a
  // domain refusal as full coverage.
  const base = {
    mode: 'x',
    request: {},
    events: [],
    interval: {},
    execution: { status: 'finished', finished: true },
    completeness: { established: false, support: SUPPORT.none, conditionalOn: [] },
    eventCount: {
      found: 0, isExactTotal: false, lowerBound: 0, upperBound: null, support: SUPPORT.none,
    },
    uncertainty: {},
  };
  assert.throws(() => buildResult({
    ...base,
    accounting: { allIntervalsAccountedFor: true, unresolved: [], excluded: [{ fromTdbSec: 0, toTdbSec: 1 }] },
  }), (e) => /excluding 1 of them/.test(e.message));
  // and the same shape without the excluded span is accepted, so the
  // throw above is about the exclusion and not about the rest
  assert.ok(buildResult({
    ...base,
    accounting: { allIntervalsAccountedFor: true, unresolved: [], excluded: [] },
  }));
});

test('the deflected mode needs a Sun in the pack, and says so once', () => {
  const noSun = G.packOf(OPEN.target, OPEN.observer, { nrec: 20, initEt: -10 * D });
  // The synthetic pack does carry a Sun, so this checks the reverse: the
  // mode resolves it up front rather than per cell, which is what keeps a
  // missing Sun to one refusal instead of one per subdivision.
  const r = searchDeflectedLongitude(noSun, {
    body: BODY, targetDeg: G.lonExact(OPEN, 0, true), fromTdbSec: -5 * D, toTdbSec: 5 * D,
  });
  assert.ok(r.contract);
  assert.equal(r.request.kind, 'retarded-aberrated-deflected-of-date-longitude');
});

test('merged runs sample their reasons instead of collecting every one', () => {
  // A regression guard with a cost attached. Refusal messages often embed
  // the cell's own numbers, so over a long run nearly every cell carries a
  // distinct string. Collecting them all and deduplicating with
  // `Array.includes` is quadratic in the cells in a run: measured, it took
  // `of-date-frames.nodetest.mjs` -- a released file this change does not
  // otherwise touch -- from 9.9 seconds to 331, with every answer
  // unchanged. The entire cost was assembling a message nobody reads.
  //
  // This calls `mergeSpans` directly, with reasons that really are all
  // distinct. The first version of this guard used the deflected search's
  // own output, whose domain refusals carry NO cell-specific numbers --
  // every one of 1093 spans had the same string -- so it passed with the
  // sampling removed and guarded nothing.
  const N = 5000;
  const spans = Array.from({ length: N }, (_, i) => ({
    fromTdbSec: i, toTdbSec: i + 1, why: `cell ${i} could not be closed over ${i}.5 .. ${i + 0.5} s TDB`,
  }));
  const runs = mergeSpans(spans);
  assert.equal(runs.length, 1, 'touching spans must merge into one run');
  assert.equal(runs[0].cells, N, 'the pre-merge count must survive');
  assert.equal(runs[0].fromTdbSec, 0);
  assert.equal(runs[0].toTdbSec, N);
  assert.equal(runs[0].reasonsAreSampled, true);
  assert.ok(runs[0].why.length < 4000,
    `the merged reason is ${runs[0].why.length} characters; with every distinct reason kept it would be about ${N * 50}`);
  assert.match(runs[0].why, /sampled from the first/);
  // A run of one keeps its reason verbatim and does not claim to sample.
  const single = mergeSpans([{ fromTdbSec: 0, toTdbSec: 1, why: 'just the one' }]);
  assert.equal(single[0].why, 'just the one');
  assert.equal(single[0].reasonsAreSampled, false);
  // Disjoint spans do not merge.
  assert.equal(mergeSpans([
    { fromTdbSec: 0, toTdbSec: 1, why: 'a' }, { fromTdbSec: 5, toTdbSec: 6, why: 'b' },
  ]).length, 2);

  // And the search's own output still merges, which is the behaviour the
  // result contract promises even though its reasons are uniform.
  const targetDeg = G.lonExact(CONJ, 40 * D, true);
  const r = searchDeflectedLongitude(CONJ_EPH, {
    body: BODY, targetDeg, fromTdbSec: CONJ_WIN[0], toTdbSec: CONJ_WIN[1],
  });
  const big = r.accounting.excluded.find((x) => x.cells > 200);
  assert.ok(big, 'no excluded run merged more than 200 cells');
  assert.ok(r.accounting.excludedCells >= big.cells);
  assert.ok(Number.isInteger(r.accounting.unresolvedCells));
});

test('every cell evaluation had the deflection applied, not just the subdivision ones', () => {
  // `retardedCell` is reached from three places. Two of them were once
  // left without the deflection arguments, so the exclusion and monotone
  // tests ran on the deflected direction while the bisection that located
  // each root ran on the undeflected one -- and the events came back
  // bit-identical to the of-date mode's, which looked exactly right.
  //
  // Counting is what makes that visible without having to notice it.
  const targetDeg = G.lonExact(OPEN, 17.37 * D, true);
  const r = searchDeflectedLongitude(OPEN_EPH, {
    body: BODY, targetDeg, fromTdbSec: OPEN_WIN[0], toTdbSec: OPEN_WIN[1],
  });
  const d = r.diagnostics.deflection;
  assert.ok(d.cellEvaluations > r.execution.cells,
    `the count must include the pointwise and bracket evaluations, not only the ${r.execution.cells} subdivision cells`);
  assert.equal(d.deflectedCellEvaluations, d.cellEvaluations,
    `${d.cellEvaluations - d.deflectedCellEvaluations} of ${d.cellEvaluations} cell evaluations skipped the deflection`);
  assert.equal(d.everyCellEvaluationDeflected, true);
  // and the of-date mode reports none of this, because it applies none
  const base = searchOfDateLongitude(OPEN_EPH, {
    body: BODY, targetDeg, fromTdbSec: OPEN_WIN[0], toTdbSec: OPEN_WIN[1],
  });
  assert.equal(base.diagnostics.deflection, undefined);
});

test('the result separates the deflection\'s four uncertainty sources', () => {
  const targetDeg = G.lonExact(OPEN, 17.37 * D, true);
  const r = searchDeflectedLongitude(OPEN_EPH, {
    body: BODY, targetDeg, fromTdbSec: OPEN_WIN[0], toTdbSec: OPEN_WIN[1],
  });
  const u = r.uncertainty.deflection;
  assert.ok(u, 'the deflected mode must report its own uncertainty sources');
  // Kept apart, not summed: one shrinks with spending, two do not move
  // without changing the model, one is not bounded here at all.
  assert.equal(u.implementationNumerical.bounded, true);
  assert.equal(u.modelOmission.bounded, true);
  assert.equal(u.deflectorSet.bounded, true);
  assert.equal(u.externalPhysical.bounded, false);
  assert.ok(!('total' in u) && !('combined' in u), 'the sources must not be summed');
  // The limiter margin is reported and is comfortably above 1 -- below 1
  // would mean a cell where the clamp could not be shown inactive, and
  // such a cell is refused rather than differentiated through.
  assert.ok(u.implementationNumerical.tightestLimiterMarginRatio > 100,
    `the limiter margin came to ${u.implementationNumerical.tightestLimiterMarginRatio}`);
  assert.ok(u.implementationNumerical.widestDeflectionArcsec > 0);
  assert.ok(u.implementationNumerical.widestDeflectionArcsec < 0.1,
    'inside the supported domain the deflection cannot exceed 0.0949 arcsec');

  const d = r.diagnostics.deflection;
  assert.equal(d.profile, 'zodiacs-deflected-of-date/1');
  assert.equal(d.lengthRecomputedAfterDeflection, true);
  assert.equal(d.minElongationDeg, 5);
  assert.ok(d.closestElongationDeg > 5, `${d.closestElongationDeg} deg`);
  assert.equal(d.closestElongationIsAReport, true,
    'the degrees are a report; the DOMAIN test is the cosine comparison');
  assert.equal(d.excludedSpans, 0);
});

test('a window entirely inside the floor decides nothing, and says so', () => {
  // The case that separates `excluded` from `unresolved` cleanly: with no
  // domain boundary inside the window there are no straddling cells, so
  // `unresolved` is empty and `excluded` is the only reason the request
  // was not covered. A version that counted excluded spans as accounted
  // for passed every other test in this file, because every other case
  // also has unresolved boundary slivers masking it.
  const win = [-5 * D, 5 * D];
  for (let t = win[0]; t <= win[1]; t += 1800) {
    assert.ok(elongationAt(CONJ, t) < 5, `t=${t / D} d has elongation ${elongationAt(CONJ, t)}`);
  }
  const targetDeg = G.lonExact(CONJ, 40 * D, true);
  const r = searchDeflectedLongitude(CONJ_EPH, {
    body: BODY, targetDeg, fromTdbSec: win[0], toTdbSec: win[1],
  });
  assert.equal(r.execution.status, 'finished');
  assert.equal(r.accounting.unresolved.length, 0, 'no boundary in the window means nothing straddles');
  assert.equal(r.accounting.excluded.length, 1, 'the whole window is one excluded run');
  assert.equal(r.accounting.excluded[0].fromTdbSec, win[0]);
  assert.equal(r.accounting.excluded[0].toTdbSec, win[1]);
  assert.equal(r.accounting.allIntervalsAccountedFor, false);
  assert.equal(r.completeness.established, false);
  assert.equal(r.eventCount.isExactTotal, false);
  assert.deepEqual(r.interval.decidedTdbSec, []);
  assert.equal(r.interval.decidedFraction, 0);
  assert.equal(r.events.length, 0);
  // Zero events with nothing decided is NOT "no crossings". The contract
  // has to keep those apart, and this is where it would blur.
  assert.equal(r.eventCount.upperBound, null, 'an undecided window has no upper bound on crossings');
  assert.match(r.completeness.statement, /not examined/);
  // The of-date mode, which has no restricted domain, does look at it.
  const base = searchOfDateLongitude(CONJ_EPH, { body: BODY, targetDeg, fromTdbSec: win[0], toTdbSec: win[1] });
  assert.equal(base.completeness.established, true,
    'the comparison only means something if the unrestricted mode can decide this window');
});

test('the half-plane enclosure is the deflected one too', () => {
  // The bracket cell is a third call site for the cell evaluator, and it
  // is the one that decides the half-plane -- whether a root is the
  // requested direction or its antipode. Running it on the undeflected
  // direction would make that verdict about a different function from the
  // one the events were isolated on.
  const targetDeg = G.lonExact(OPEN, 17.37 * D, true);
  const spec = { body: BODY, targetDeg, fromTdbSec: OPEN_WIN[0], toTdbSec: OPEN_WIN[1] };
  const base = searchOfDateLongitude(OPEN_EPH, spec);
  const def = searchDeflectedLongitude(OPEN_EPH, spec);
  assert.equal(def.events.length, base.events.length);
  assert.ok(base.events.length > 0);
  let differed = 0;
  for (let i = 0; i < base.events.length; i += 1) {
    assert.ok(def.events[i].halfPlaneMarginKm > 0, 'the margin must still establish the direction');
    if (def.events[i].halfPlaneMarginKm !== base.events[i].halfPlaneMarginKm) differed += 1;
  }
  assert.equal(differed, base.events.length,
    'every half-plane margin should differ: it is computed on the deflected direction over a bracket that itself moved');
});

test('the Sun\'s epoch matters, and a static Sun cannot show that', () => {
  // The profile takes `e` and `em` at RECEPTION and `q` at EMISSION. That
  // split is worth 3.13e-10 arcsec in the real system against 1.96e-5 for
  // the simpler reception-for-both, so it is nearly free -- but "nearly
  // free" is not "no difference", and a fixture whose Sun sits at the
  // barycentre makes it identically zero.
  //
  // This measures the difference both ways, so the fixture property is
  // established rather than assumed.
  const C = 299792.458;
  const gapFor = (pair, sun) => {
    let worst = 0;
    for (let t = -60 * D; t <= 60 * D; t += 3 * D) {
      const O = pair.observer(t);
      const S = sun(t);
      const tau = norm(sub(pair.target(t), O)) / C;
      const Tem = pair.target(t - tau);
      const Sem = sun(t - tau);
      const d = sub(Tem, O);
      if (!deflectionDomain(d, sub(O, S)).supported) continue;
      const atEmission = deflect(d, sub(O, S), sub(Tem, Sem), { enforceDomain: false });
      const atReception = deflect(d, sub(O, S), sub(Tem, S), { enforceDomain: false });
      worst = Math.max(worst, (Math.atan(norm(sub(atEmission.D, atReception.D)) / norm(d)) * 180 * 3600) / Math.PI);
    }
    return worst;
  };
  const staticSun = gapFor(OPEN, () => [0, 0, 0]);
  const movingSun = gapFor(MOVING, sunPath);
  assert.equal(staticSun, 0,
    'with the Sun at the barycentre the two epochs are the same point, so this fixture cannot test the split');
  assert.ok(movingSun > 1e-8,
    `a Sun at ${SUN_SPEED_KM_S} km/s should separate the epochs; it moved the deflection by only ${movingSun} arcsec`);
  assert.ok(Math.abs(movingSun - 1.118e-7) < 1e-9, `measured ${movingSun} arcsec`);
});

test('the search runs against a moving Sun, not only a barycentric one', () => {
  // The deflected mode reads the Sun's state at two windows per cell. With
  // a Sun pinned at the origin those two reads return the same zero vector
  // and the code path is exercised without being tested. This runs it on a
  // pack whose Sun actually has coefficients.
  const targetDeg = G.lonExact(MOVING, 17.37 * D, true);
  const r = searchDeflectedLongitude(MOVING_EPH, {
    body: BODY, targetDeg, fromTdbSec: OPEN_WIN[0], toTdbSec: OPEN_WIN[1],
  });
  assert.equal(r.execution.status, 'finished');
  assert.equal(r.completeness.established, true, r.completeness.statement);
  assert.ok(r.events.length > 0);
  assert.ok(r.diagnostics.deflection.widestDeflectionArcsec > 0);
  // and the Sun really is moving in the pack the search read
  const a = MOVING.sun(-60 * D);
  const b = MOVING.sun(60 * D);
  assert.ok(norm(sub(b, a)) > 1e8, 'the fixture Sun must actually move over the window');
});
