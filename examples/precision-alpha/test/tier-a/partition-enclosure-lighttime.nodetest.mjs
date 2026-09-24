/**
 * The light-time interval the partition applies to a cell, and the three
 * steps that make it a proof rather than a guess.
 *
 * `domain-partition.nodetest.mjs` covers what the partition claims about the
 * elongation. This file covers the quantity that claim is computed FROM.
 * `classifyCell` encloses the target over `[lo - T.hi, hi - T.lo]` -- the
 * emission instants that belong to receptions in `[lo, hi]` when the light
 * time lies anywhere in `T` -- and everything downstream of that enclosure
 * inherits whatever `T` is. So `T` has to be an interval that provably holds
 * `tau(t)` throughout the cell, and `deriveLightTime` establishes that in
 * three steps: it bounds `|tau'|` and sizes a candidate from it, it CHECKS
 * that the candidate maps into itself under `phi(tau) = |d|/c` instead of
 * assuming it, and it refuses outright when the target's speed bound over the
 * window it actually used is not below c, because Banach has nothing to say
 * about a map that does not contract. `classifyCell` then tightens `T` by
 * INTERSECTING it with `[dist.lo/c, dist.hi/c]`, which is sound because both
 * hold `tau(t)`, and hands the intersection to the children.
 *
 * ## Why the existing fixtures cannot see any of that
 *
 * Every constructed geometry in `domain-partition.nodetest.mjs` holds the
 * observer still and the target at a fixed range, which is what makes its
 * closed forms exact. Under those two conditions the light time is `L/c` at
 * every instant: a midpoint reading and an interval enclosure agree, and any
 * interval straddling `L/c` -- proved, guessed, or a point -- contains the
 * answer. `CONJUNCTION` does move both bodies and its light time does vary,
 * but at a few times 1e-5 of c the bound on `|tau'|` is of that order too, so
 * the light-time interval a cell admits is milliseconds wide and the emission
 * window is the cell shifted bodily by eleven minutes. A wrong end of that
 * interval is indistinguishable from the right one.
 *
 * The fixtures here break both conditions on purpose. The observer runs at
 * 3000 km/s, so it moves 6.0e5 km across a 200 s cell and its position over
 * that cell is an enclosure 6.0e5 km across rather than a point. The target
 * runs at 0.9 c, so the bound the pack gives on `|tau'|` is 9 rather than
 * 1e-4, and the light-time interval a 200 s cell admits is about 1800 s --
 * NINE TIMES the cell. That is the regime the three steps exist for, and it
 * is the regime in which the two ends of the interval name stretches of
 * trajectory that differ by degrees of apparent place.
 *
 * ## Where the expected answers come from
 *
 * The same place `domain-partition.nodetest.mjs` gets them: a pointwise
 * reference built from `_geometry.mjs`'s `tauExact`, which iterates the
 * reception fixed point to convergence and shares no line with the operation.
 * The floor crossings are bisected out of that reference. Nothing in this
 * file takes an expectation from `partitionDomain`'s own output.
 *
 * The geometries are relativistic, and that is deliberate rather than
 * careless. `straightObserver` in `_geometry.mjs` already exists to push
 * `beta` far above anything physical but still below 1, for the same reason:
 * the guards and the contraction argument are written in terms of `c`, and a
 * fixture at 1e-4 c never reaches them. The numbers below are chosen to put
 * the light-time interval on the same scale as the cell, not to model a body.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from './_geometry.mjs';
import { partitionDomain } from '../../src/core/domain-partition.mjs';
import { MIN_ELONGATION_RAD } from '../../src/core/deflection.mjs';
import { C_KM_S } from '../../src/core/retarded.mjs';

const DEG = Math.PI / 180;
/** The floor as a cosine. `cos` decreases, so BELOW the floor is ABOVE this. */
const COS_FLOOR = Math.cos(MIN_ELONGATION_RAD);
const BODY = 'Mars';
const AU_KM = 1.495978707e8;
/** Fast enough that the observer's position over a cell is not a point. */
const OBSERVER_SPEED_KM_S = 3000;

const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
// Not Math.hypot: the same cross-engine rounding note the core modules carry.
const { sub3, norm3 } = G;

// ========================================================= the reference
/**
 * `cos(elongation)` at one instant, pointwise, in doubles.
 *
 * `-(e_hat . d)/|d|` with `e` from the Sun to the observer at reception and
 * `d` light-time corrected, exactly as the profile defines it, with the light
 * time from `tauExact`. It shares no line with `elongationCosInterval`.
 */
function cosElongationExact(geom, t) {
  const O = geom.observer(t);
  const d = sub3(geom.target(t - G.tauExact(geom.target, geom.observer, t)), O);
  const e = sub3(O, geom.sun(t));
  return -dot3(e, d) / (norm3(e) * norm3(d));
}

const elongationDegExact = (geom, t) => (
  Math.acos(Math.max(-1, Math.min(1, cosElongationExact(geom, t)))) / DEG
);

/** Bisect the one floor crossing known to lie in [lo, hi]. */
function crossingBetween(geom, lo, hi) {
  const f = (t) => cosElongationExact(geom, t) - COS_FLOOR;
  let a = lo;
  let b = hi;
  let fa = f(a);
  assert.ok(Math.sign(fa) !== Math.sign(f(b)), `no floor crossing is bracketed by ${lo} .. ${hi}`);
  for (let i = 0; i < 300; i += 1) {
    const m = (a + b) / 2;
    if (!(m > a && m < b)) break;
    const fm = f(m);
    if (Math.sign(fm) === Math.sign(fa)) { a = m; fa = fm; } else b = m;
  }
  return (a + b) / 2;
}

/**
 * Every maximal interval of [from, to] on which the elongation is BELOW the
 * floor, by sampling then bisection.
 *
 * Sampling cannot establish its own completeness -- a passage narrower than
 * the spacing is invisible to it -- so it is used the one way that is sound,
 * to say where a passage IS, and every call site states the count the
 * geometry demands.
 */
function belowFloorSpans(geom, from, to, samples) {
  const f = (t) => cosElongationExact(geom, t) - COS_FLOOR;
  const crossings = [];
  let pt = from;
  let pv = f(from);
  for (let i = 1; i <= samples; i += 1) {
    const t = from + ((to - from) * i) / samples;
    const cv = f(t);
    if (pv !== 0 && cv !== 0 && Math.sign(cv) !== Math.sign(pv)) crossings.push(crossingBetween(geom, pt, t));
    pt = t;
    pv = cv;
  }
  const marks = [from, ...crossings, to];
  const spans = [];
  for (let i = 1; i < marks.length; i += 1) {
    if (f((marks[i - 1] + marks[i]) / 2) > 0) spans.push([marks[i - 1], marks[i]]);
  }
  return { spans, crossings };
}

// ======================================================== the geometries
/**
 * A target running in a straight line at a chosen fraction of c past a
 * moving observer, with the Sun at the barycentre.
 *
 * `radialFraction` splits the velocity between the line of sight and across
 * it, and the split is the knob the whole file turns. Across the line of
 * sight the target's APPARENT position moves fast, which is what a wrong
 * emission window shows up as; along it the RANGE moves fast, which is what
 * makes `tau` vary steeply within a cell and what makes the intersection in
 * `classifyCell` bite.
 *
 * The target is placed so that at reception 0 it sits on the observer-to-Sun
 * line at range `rangeKm`, which fixes the light time there at `rangeKm / c`
 * and puts the floor crossings within a few hundred seconds of the origin.
 * Nothing downstream relies on that placement being exact: every expected
 * instant is bisected from the reference.
 */
function linearPass({ rangeKm, beta, radialFraction = 0 }) {
  const period = (2 * Math.PI * AU_KM) / OBSERVER_SPEED_KM_S;
  const orbit = G.circle(AU_KM, period, 0);
  const observer = orbit.at;
  const sun = () => [0, 0, 0];
  const O0 = observer(0);
  // Unit vectors: `u` from the observer toward the Sun, `p` across it.
  const u = [-O0[0] / AU_KM, -O0[1] / AU_KM, -O0[2] / AU_KM];
  const across = [-u[1], u[0], 0];
  const an = norm3(across);
  const p = [across[0] / an, across[1] / an, 0];
  const tau0 = rangeKm / C_KM_S;
  const start = [O0[0] + rangeKm * u[0], O0[1] + rangeKm * u[1], O0[2] + rangeKm * u[2]];
  const speed = beta * C_KM_S;
  const transverse = Math.sqrt(1 - radialFraction * radialFraction);
  const v = [
    speed * (transverse * p[0] + radialFraction * u[0]),
    speed * (transverse * p[1] + radialFraction * u[1]),
    speed * radialFraction * u[2],
  ];
  const target = (t) => [
    start[0] + v[0] * (t + tau0),
    start[1] + v[1] * (t + tau0),
    start[2] + v[2] * (t + tau0),
  ];
  return { target, observer, sun };
}

/**
 * SWEEP -- 0.9 c straight across the line of sight, through the floor.
 *
 * Every component of the velocity is across the line of sight, so the range
 * changes only to second order and the elongation is close to a linear
 * function of time through the crossings: it falls through five degrees at
 * -249.4 s, reaches zero near the origin and climbs back through five degrees
 * at 272.2 s. The light time is 3878.5 s at the start of the request,
 * 2568.4 s at the origin and 2927.1 s at the end, so `tau` is nowhere near
 * constant even though `|tau'|` itself stays small.
 *
 * What the speed buys is the WIDTH of the light-time interval. The speed
 * bound over the emission window is 0.9 c, so `|tau'| <= 0.9/(1 - 0.9) = 9`
 * and a 200 s cell admits a light-time spread of about 1800 s. That is the
 * regime where `lo - T.hi` and `lo - T.lo` are 1800 s apart and name
 * genuinely different stretches of the trajectory: the emission instants
 * belonging to receptions in a 200 s cell occupy a 200 s stretch, and the
 * stretch starting at `lo - T.lo` begins 900 s after it ends.
 */
const SWEEP = linearPass({ rangeKm: 7.7e8, beta: 0.9 });
const SWEEP_CELL_SEC = 200;
/**
 * Records 200 s long, so the record-boundary seeds are 200 s cells and the
 * request's endpoints fall on record boundaries. `initEt` is offset by a half
 * record from the origin so the elongation minimum sits inside the cell
 * [-100, 100] rather than on the join between two cells.
 */
const SWEEP_EPH = G.packOf(SWEEP.target, SWEEP.observer, {
  intervalSec: SWEEP_CELL_SEC, initEt: -11900, nrec: 75, ncoef: 20,
});
const SWEEP_WIN = [-1900, 1900];

/**
 * PLUNGE -- the same 0.9 c, but nine tenths of it along the line of sight,
 * closing.
 *
 * The light time falls from 9679.1 s to 1133.8 s across a 2000 s request, a
 * factor of 8.5, and `|tau'|` reaches 8.47 -- so the cell [-1000, -800] alone
 * spans light times 1670.6 s apart. Two things follow that SWEEP cannot show.
 * The light-time iteration in `solveTau` contracts at the radial speed, 0.81,
 * not at the 0.5 its a-posteriori error bound is asked for, so the `tau` it
 * returns is NOT within the `errorSec` it reports and the first candidate
 * interval is not a self-map, which is what the plunge family asserts.
 *
 * `dist` is also wide here, but this fixture is NOT where the free
 * tightening is exercised: replacing the intersection with a point does not
 * change what the plunge case reports, because the plunge case decides
 * nothing either way. The tightening is observed in the bisected sweep,
 * where children inherit it and the verdicts move.
 */
const PLUNGE = linearPass({ rangeKm: 7.7e8, beta: 0.9, radialFraction: -0.9 });
const PLUNGE_EPH = G.packOf(PLUNGE.target, PLUNGE.observer, {
  intervalSec: 200, initEt: -26000, nrec: 140, ncoef: 20,
});
const PLUNGE_WIN = [-1000, 1000];

/**
 * LURCH -- a slow target with one brief, violent excursion in its path.
 *
 * The target drifts at 100 km/s at a range of 3.75e8 km and an elongation
 * near seven degrees, except for a Gaussian excursion of 2.6e7 km with a
 * 100 s width centred on emission instant 0, split evenly between the line of
 * sight and across it. Its peak speed is 2.23e5 km/s, which is 0.74 c and
 * below c -- but the stored record's own bound on the speed is not the peak
 * speed. `stateEnclosure` bounds the velocity over a sub-window as the value
 * at the midpoint plus the record's second-derivative bound times the
 * half-width, and the excursion's acceleration makes that 857376.7 km/s, or
 * 2.86 c.
 *
 * That is the state the subluminal check exists for, and the excursion's
 * LOCALITY is what puts the two speed bounds in `deriveLightTime` on opposite
 * sides of c for one cell: the crude window that sizes the candidate reaches
 * 1.2 half-widths either side of the nominal emission instant, while the
 * emission window the candidate then implies reaches `slope` half-widths, and
 * for the cell 800 .. 1000 s the excursion falls in the gap between the two.
 * The bound the first check sees is below c; the bound the loop sees on the
 * window it is actually about to use is not.
 */
const LURCH_RANGE_KM = 3.75e8;
const LURCH_AMPLITUDE_KM = 2.6e7;
const LURCH_WIDTH_SEC = 100;
function lurchGeometry() {
  const period = (2 * Math.PI * AU_KM) / OBSERVER_SPEED_KM_S;
  const orbit = G.circle(AU_KM, period, 0);
  const observer = orbit.at;
  const sun = () => [0, 0, 0];
  const O0 = observer(0);
  const u = [-O0[0] / AU_KM, -O0[1] / AU_KM, -O0[2] / AU_KM];
  const across = [-u[1], u[0], 0];
  const an = norm3(across);
  const p = [across[0] / an, across[1] / an, 0];
  const el = 7 * DEG;
  const sight = [
    u[0] * Math.cos(el) + p[0] * Math.sin(el),
    u[1] * Math.cos(el) + p[1] * Math.sin(el),
    u[2] * Math.cos(el),
  ];
  const sn = norm3(sight);
  const L = [sight[0] / sn, sight[1] / sn, sight[2] / sn];
  const start = [O0[0] + LURCH_RANGE_KM * L[0], O0[1] + LURCH_RANGE_KM * L[1], O0[2] + LURCH_RANGE_KM * L[2]];
  const drift = 100;
  // Half along the line of sight, half across it: the first widens `dist`,
  // the second is what the elongation sees.
  const m = [0.5 * L[0] - Math.sqrt(0.75) * p[0], 0.5 * L[1] - Math.sqrt(0.75) * p[1], 0.5 * L[2]];
  const bump = (t) => Math.exp(-((t / LURCH_WIDTH_SEC) * (t / LURCH_WIDTH_SEC)));
  const target = (t) => [
    start[0] + drift * p[0] * t + LURCH_AMPLITUDE_KM * bump(t) * m[0],
    start[1] + drift * p[1] * t + LURCH_AMPLITUDE_KM * bump(t) * m[1],
    start[2] + LURCH_AMPLITUDE_KM * bump(t) * m[2],
  ];
  return { target, observer, sun };
}
const LURCH = lurchGeometry();
const LURCH_EPH = G.packOf(LURCH.target, LURCH.observer, {
  intervalSec: 200, initEt: -8000, nrec: 60, ncoef: 20,
});
const LURCH_WIN = [400, 2200];

// ========================================================== the helpers
const spanTotal = (spans) => spans.reduce((acc, [lo, hi]) => acc + (hi - lo), 0);
const CLASSES = (r) => [
  ['admissible', r.admissible], ['excluded', r.excluded],
  ['boundary', r.boundary], ['unprocessed', r.unprocessed],
];

/** The four classes tile the request in order, merged, and disjoint. */
function assertTilesRequest(r, from, to, note) {
  for (const [name, list] of CLASSES(r)) {
    let prev = -Infinity;
    for (const [lo, hi] of list) {
      assert.ok(hi > lo, `${note}: ${name} span ${lo} .. ${hi} is empty or backwards`);
      assert.ok(lo >= from - 1e-9 && hi <= to + 1e-9,
        `${note}: ${name} span ${lo} .. ${hi} leaves the request ${from} .. ${to}`);
      assert.ok(lo > prev, `${note}: ${name} spans ${prev} and ${lo} are out of order or unmerged`);
      prev = hi;
    }
  }
  const all = CLASSES(r).flatMap(([, list]) => list).sort((x, y) => x[0] - y[0]);
  for (let i = 1; i < all.length; i += 1) {
    assert.ok(all[i][0] >= all[i - 1][1] - 1e-9,
      `${note}: ${all[i - 1]} and ${all[i]} overlap; no instant may belong to two classes`);
  }
  const total = spanTotal(all);
  assert.ok(Math.abs(total - (to - from)) <= 1e-6,
    `${note}: the four classes cover ${total} s of a ${to - from} s request`);
}

/**
 * The conservative direction, as a containment and never as an equality.
 *
 * An excluded span claims the elongation is below the floor at every instant,
 * so it must sit inside a true below-floor interval; an admissible span
 * claims the opposite, so it may not overlap one at all. Neither is required
 * to reach the transition -- that residue is what boundary is for.
 */
function assertOwnership(r, below, note) {
  for (const [lo, hi] of r.excluded) {
    const host = below.find(([a, b]) => lo >= a - 1e-9 && hi <= b + 1e-9);
    assert.ok(host,
      `${note}: excluded ${lo} .. ${hi} is not inside any below-floor interval ${JSON.stringify(below)}`);
  }
  for (const [lo, hi] of r.admissible) {
    for (const [a, b] of below) {
      const overlap = Math.min(hi, b) - Math.max(lo, a);
      assert.ok(overlap <= 1e-9,
        `${note}: admissible ${lo} .. ${hi} overlaps the below-floor interval ${a} .. ${b} by ${overlap} s`);
    }
  }
}

/**
 * Every admitted instant is at or above the floor, sampled directly.
 *
 * `assertOwnership` compares span endpoints against a list of below-floor
 * intervals bisected from the reference, so a passage finer than the sampling
 * that found those intervals is invisible to it. This samples the elongation
 * INSIDE each admitted span instead, at 30 s or finer, and reports the
 * instant and the value when one is below the floor -- which is the failure
 * an admission that rests on a point reading actually produces.
 */
function assertAdmittedClearsTheFloor(r, geom, note) {
  assert.ok(r.admissible.length > 0, `${note}: nothing admitted, so this check is vacuous`);
  for (const [lo, hi] of r.admissible) {
    const steps = Math.max(200, Math.ceil((hi - lo) / 30));
    for (let k = 0; k <= steps; k += 1) {
      const t = lo + ((hi - lo) * k) / steps;
      const el = elongationDegExact(geom, t);
      assert.ok(el >= MIN_ELONGATION_RAD / DEG - 1e-9,
        `${note}: the ADMITTED span ${lo} .. ${hi} reaches ${el} deg at ${t} s TDB, below the`
        + ' five-degree floor the admission claims to hold at every instant');
    }
  }
}

/** Every true crossing inside the request must lie in a boundary span. */
function assertCrossingsOwnedByBoundary(r, crossings, note) {
  assert.ok(crossings.length > 0, `${note}: no crossing to own, so this check is vacuous`);
  for (const t of crossings) {
    const owner = r.boundary.find(([lo, hi]) => t >= lo - 1e-9 && t <= hi + 1e-9);
    assert.ok(owner,
      `${note}: the crossing at ${t} s TDB is in no boundary span; boundary is ${JSON.stringify(r.boundary)}`);
  }
}

// ======================================================= the fixtures first
test('the fixtures move: observer, light-time and apparent place all change across one cell', () => {
  // The observer is not a point over a cell. Both halves of that matter: the
  // displacement is what makes a midpoint reading differ from an enclosure,
  // and the speed is what enters the `|tau'|` bound alongside the target's.
  const o0 = SWEEP.observer(-100);
  const o1 = SWEEP.observer(100);
  const omid = SWEEP.observer(0);
  const moved = norm3(sub3(o1, o0));
  assert.ok(moved > 5.9e5,
    `the observer moves only ${moved} km across a ${SWEEP_CELL_SEC} s cell, so a midpoint reading would do`);
  const halfGap = Math.max(norm3(sub3(omid, o0)), norm3(sub3(o1, omid)));
  assert.ok(halfGap > 2.9e5,
    `the observer's midpoint is only ${halfGap} km from the ends of the cell`);

  // The light time is not a constant, in either fixture, at either scale.
  const sweepTau = [-1900, 0, 1900].map((t) => G.tauExact(SWEEP.target, SWEEP.observer, t));
  assert.ok(sweepTau[0] - sweepTau[1] > 1300,
    `SWEEP's light time varies by only ${sweepTau[0] - sweepTau[1]} s across the request`);
  const plungeTau = [-1000, 0, 1000].map((t) => G.tauExact(PLUNGE.target, PLUNGE.observer, t));
  assert.ok(plungeTau[0] / plungeTau[2] > 8,
    `PLUNGE's light time only falls by a factor ${plungeTau[0] / plungeTau[2]} across the request`);
  const cellTau = Math.abs(G.tauExact(PLUNGE.target, PLUNGE.observer, -100)
    - G.tauExact(PLUNGE.target, PLUNGE.observer, 100));
  assert.ok(cellTau > 800,
    `PLUNGE's light time varies by only ${cellTau} s across one 200 s cell, so a point interval would hold it`);

  /**
   * The condition the whole file needs, stated as a measurement rather than
   * assumed from the algebra.
   *
   * A 0.9 c speed bound gives `|tau'| <= 9`, so the light-time interval for a
   * 200 s cell is about 1800 s wide and `lo - T.lo` sits about 900 s after
   * the emission instants the cell is actually about. If the target's
   * apparent place barely moved over 900 s of emission time, reading it at
   * the wrong end of the interval would cost nothing and nothing in this file
   * could tell a proved interval from a guessed one.
   */
  const atMinimum = elongationDegExact(SWEEP, 0);
  const nineHundredLater = elongationDegExact(SWEEP, 900);
  assert.ok(atMinimum < 0.01,
    `SWEEP's elongation at the origin is ${atMinimum} deg, not the minimum the fixture is built around`);
  assert.ok(nineHundredLater - atMinimum > 13,
    `900 s of reception time moves SWEEP's apparent place by only`
    + ` ${nineHundredLater - atMinimum} deg, against the 14.87 the fixture is built for`);
});

test('a light-time interval nine times the cell: the sweep at seed width', () => {
  /**
   * The boundary tolerance is above the 200 s record length, so no cell is
   * ever bisected: every verdict here is issued on a light-time interval
   * `deriveLightTime` produced for that cell, with no inheritance and no
   * tightening in between. That isolates the emission window from everything
   * else the operation does with `T`.
   *
   * At this width the enclosures are far too loose to resolve the floor -- a
   * 1800 s light-time spread on a target crossing the sky at 0.9 c is tens of
   * degrees of apparent place -- so the honest answer over most of the
   * request is BOUNDARY, and the one thing that must not happen is a verdict
   * inside the passage.
   */
  const r = partitionDomain(SWEEP_EPH, {
    body: BODY,
    fromTdbSec: SWEEP_WIN[0],
    toTdbSec: SWEEP_WIN[1],
    boundaryToleranceSec: 250,
  });
  assert.equal(r.execution.status, 'finished');
  assertTilesRequest(r, SWEEP_WIN[0], SWEEP_WIN[1], 'sweep at seed width');

  // One passage, from the geometry: the path crosses the line of sight once.
  const { spans, crossings } = belowFloorSpans(SWEEP, SWEEP_WIN[0], SWEEP_WIN[1], 40000);
  assert.equal(spans.length, 1, `the sweep should have one passage below the floor, not ${spans.length}`);
  assert.equal(crossings.length, 2);
  assert.ok(spans[0][1] - spans[0][0] > 500,
    `the passage is only ${spans[0][1] - spans[0][0]} s wide, too narrow to own a 200 s cell`);

  assertOwnership(r, spans, 'sweep at seed width');
  assertCrossingsOwnedByBoundary(r, crossings, 'sweep at seed width');
  // The passage is 521.7 s wide against 200 s cells, so at least two whole
  // cells lie inside it. An enclosure reading emission instants 900 s away
  // from the ones those cells are about sees the target thirteen degrees
  // clear of the floor and admits them; this asserts they were not admitted.
  const admittedInside = r.admissible.reduce(
    (n, [lo, hi]) => n + Math.max(0, Math.min(hi, spans[0][1]) - Math.max(lo, spans[0][0])), 0,
  );
  assert.equal(admittedInside, 0,
    `${admittedInside} s of the passage was admitted; admissible is ${JSON.stringify(r.admissible)}`);
  // Not vacuous the other way either: something was proved somewhere.
  assert.ok(r.admissible.length > 0, 'nothing at all was admitted, so the ownership check proves nothing');
});

test('the same sweep bisected to 30 s, against crossings it did not compute', () => {
  /**
   * Now the cells descend to 25 s and the children inherit the tightened
   * interval rather than deriving their own, which is the path the free
   * tightening in `classifyCell` sits on. The intersection it forms is with
   * `[dist.lo/c, dist.hi/c]`, an interval that holds `tau(t)` over the cell;
   * replacing it with a single number -- the midpoint of `dist`, say -- gives
   * the children a light time that need not be any instant's light time, and
   * the emission window built from it is both too narrow and displaced.
   *
   * The passage is 521.7 s wide and the partition resolves both of its ends
   * to 25 s here, so the excluded span and the admissible spans come within
   * 25 s of the true crossings on both sides. That is what makes the
   * containment sharp: a span displaced by more than that in either direction
   * stops being contained.
   */
  const r = partitionDomain(SWEEP_EPH, {
    body: BODY,
    fromTdbSec: SWEEP_WIN[0],
    toTdbSec: SWEEP_WIN[1],
    boundaryToleranceSec: 30,
  });
  assert.equal(r.execution.status, 'finished');
  assertTilesRequest(r, SWEEP_WIN[0], SWEEP_WIN[1], 'sweep bisected');

  const { spans, crossings } = belowFloorSpans(SWEEP, SWEEP_WIN[0], SWEEP_WIN[1], 40000);
  assert.equal(spans.length, 1);
  assertOwnership(r, spans, 'sweep bisected');
  assertCrossingsOwnedByBoundary(r, crossings, 'sweep bisected');

  // The run has to have got close enough for the containment to mean
  // something: an excluded span far inside the passage would be contained
  // whatever the light-time interval did.
  assert.ok(r.excluded.length === 1, `expected one excluded span, got ${JSON.stringify(r.excluded)}`);
  const [exLo, exHi] = r.excluded[0];
  assert.ok(exLo - spans[0][0] < 40 && spans[0][1] - exHi < 40,
    `the excluded span ${exLo} .. ${exHi} does not come within 40 s of the passage ${JSON.stringify(spans[0])}`);
  assert.ok(r.boundary.length === 2 && r.boundary.every(([lo, hi]) => hi - lo <= 60),
    `the two transitions should be left as spans at the tolerance, not ${JSON.stringify(r.boundary)}`);
});

test('a plunging light-time: the first candidate interval is not a self-map here', () => {
  /**
   * The cell -1000 .. -800 is the one to follow. `solveTau` is handed a
   * contraction factor of 0.5 for its a-posteriori error bound; the map here
   * contracts at 0.81, so the light time it returns for that cell's midpoint
   * is 8637.104 s where the true value is 8837.772 s -- 200.7 s out, against
   * an `errorSec` of 24.1 s. Adding the `|tau'|` allowance of 910.0 s gives a
   * candidate of [7703.0, 9571.2], and the light times actually taken over
   * that cell run from 8008.5 s to 9679.1 s. The candidate misses the top of
   * the range by 107.9 s. It is a guess, and on this geometry it is wrong.
   *
   * What makes the result sound anyway is the step after it. `phi(T) =
   * [dist.lo/c, dist.hi/c]` is computed on the emission window the candidate
   * implies and CHECKED for containment in `T`; the failure widens `T` and
   * the loop runs again, and here it closes on the second attempt, so
   * `widestTauWidenings` is 1. A version that returned the first candidate
   * unconditionally, or that checked containment against some window other
   * than the one the candidate implies, reports 0 -- and hands on an interval
   * nothing has shown to hold any instant's light time.
   */
  const r = partitionDomain(PLUNGE_EPH, {
    body: BODY,
    fromTdbSec: PLUNGE_WIN[0],
    toTdbSec: PLUNGE_WIN[1],
    boundaryToleranceSec: 60,
  });
  assert.equal(r.execution.status, 'finished');
  assertTilesRequest(r, PLUNGE_WIN[0], PLUNGE_WIN[1], 'plunge');
  assert.ok(r.diagnostics.widestTauWidenings >= 1,
    'no light-time interval on this fixture needed widening, so the self-mapping check was never exercised');
  // The condition that makes the widening necessary rather than incidental:
  // one 200 s cell spans a range of light times 1670.6 s wide, so no point
  // and no narrow interval could hold it.
  const spread = G.tauExact(PLUNGE.target, PLUNGE.observer, -1000)
    - G.tauExact(PLUNGE.target, PLUNGE.observer, -800);
  assert.ok(spread > 1600,
    `the light time varies by only ${spread} s across the cell -1000 .. -800`);

  const { spans, crossings } = belowFloorSpans(PLUNGE, PLUNGE_WIN[0], PLUNGE_WIN[1], 40000);
  assert.equal(spans.length, 1, `expected one passage, got ${JSON.stringify(spans)}`);
  assertOwnership(r, spans, 'plunge');
  assertCrossingsOwnedByBoundary(r, crossings, 'plunge');

  /**
   * What those two helpers establish here, stated rather than implied: very
   * little, because on this fixture the partition decides nothing at all.
   * The whole request comes back as one boundary span, with `admissible` and
   * `excluded` both empty, so `assertOwnership` iterates two empty lists and
   * `assertCrossingsOwnedByBoundary` finds both crossings inside a span that
   * covers everything. They are kept because they would fire if a change
   * made this fixture start deciding, and the SHAPE is asserted below so
   * that "decides nothing" is a checked property rather than a coincidence
   * the two helpers quietly pass over.
   *
   * Refusing everything is the right answer at 0.81 radial: an 1800 s
   * light-time interval over a 200 s cell puts the emission enclosure across
   * most of the trajectory, and nothing can be proved from it either way.
   * The content of this case is the widening asserted above -- that the
   * first candidate was NOT a self-map and the loop had to fix it -- not the
   * verdicts, which the sweep families carry.
   */
  assert.deepEqual(r.admissible, [],
    `the plunge fixture decided ${JSON.stringify(r.admissible)} admissible; if it now decides`
    + ' anything, the ownership assertions above became live and this comment is stale');
  assert.deepEqual(r.excluded, [], `the plunge fixture decided ${JSON.stringify(r.excluded)} excluded`);
  assert.deepEqual(r.boundary, [PLUNGE_WIN], 'the whole request should be one boundary span');
});

test('a speed bound above c over the emission window is a refusal, not a verdict', () => {
  /**
   * Two subluminal checks stand in `deriveLightTime` and they are about
   * different windows. The first is about the crude window that sizes the
   * candidate; the second is about the emission window the candidate implies,
   * inside the widening loop, and it is the one that guards the interval the
   * partition is about to use. They are distinguishable in the output because
   * only the first adds "so the light-time iteration is not a contraction
   * here" to its sentence.
   *
   * LURCH reaches both. For the cells from 1000 s on, the excursion is inside
   * the crude window and the first check refuses. For the cell 800 .. 1000 s
   * it is not, and only the loop's own bound -- 857376.7 km/s, 2.86 c, over
   * the window that cell's candidate implies -- is above c. Removing the
   * second check leaves that cell with no refusal at all: it stays boundary,
   * because the enclosures are hopeless there anyway, but it is boundary
   * without a reason, and the run no longer records that the contraction the
   * Banach argument needs was never established for it.
   */
  const r = partitionDomain(LURCH_EPH, {
    body: BODY,
    fromTdbSec: LURCH_WIN[0],
    toTdbSec: LURCH_WIN[1],
    boundaryToleranceSec: 250,
  });
  assert.equal(r.execution.status, 'finished');
  assertTilesRequest(r, LURCH_WIN[0], LURCH_WIN[1], 'lurch');

  const notContraction = /so the light-time iteration is not a contraction here$/;
  const speedBound = /km\/s, which is not below c$/;
  const fromTheLoop = r.boundaryReasons.filter((x) => speedBound.test(x.why));
  const fromTheSizing = r.boundaryReasons.filter((x) => notContraction.test(x.why));
  assert.ok(fromTheSizing.length > 0,
    `no cell refused on the crude window's speed bound: ${JSON.stringify(r.boundaryReasons)}`);
  assert.ok(fromTheLoop.length > 0,
    `no cell refused on the emission window's own speed bound: ${JSON.stringify(r.boundaryReasons)}`);
  for (const x of fromTheLoop) {
    const owner = r.boundary.find(([lo, hi]) => x.fromTdbSec >= lo - 1e-9 && x.toTdbSec <= hi + 1e-9);
    assert.ok(owner, `the refused span ${x.fromTdbSec} .. ${x.toTdbSec} is not inside a boundary span`);
    // A refusal that is not retryable: the span is reported at the width it
    // was refused at, never bisected toward the tolerance.
    assert.equal(x.toTdbSec - x.fromTdbSec, 200,
      `a non-retryable refusal was bisected: ${x.fromTdbSec} .. ${x.toTdbSec}`);
  }
  /**
   * The excursion's true peak speed is below c; the bound the pack gives is
   * not. Both halves matter: a fixture that were genuinely superluminal
   * would make these refusals correct for a reason that has nothing to do
   * with enclosure width, which is a different and much weaker case.
   *
   * The peak is DIFFERENTIATED rather than computed from the amplitude. The
   * algebraic figure -- amplitude times sqrt(2/e) over the width -- is
   * 223,018.6 km/s, and the geometry's actual peak is 211,006.7 km/s at
   * t = 70.7 s, because the bump's direction vector has length 0.9458 and
   * not 1. The algebra is about a construction; this is about the fixture.
   */
  let peak = 0;
  for (let t = LURCH_WIN[0] - 800; t <= LURCH_WIN[1] + 400; t += 0.05) {
    const a = LURCH.target(t - 0.05);
    const b = LURCH.target(t + 0.05);
    const v = Math.sqrt((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2 + (b[2] - a[2]) ** 2) / 0.1;
    if (v > peak) peak = v;
  }
  assert.ok(peak < C_KM_S, `the excursion's own peak speed ${peak} km/s is not below c`);
  assert.ok(peak > 0.7 * C_KM_S, `the excursion only reaches ${peak / C_KM_S} c, too slow to matter`);

  /**
   * The quoted bounds are read back out of the refusal messages, which the
   * source emits only inside `if (!(vMax < C_KM_S))` and which print that
   * same `vMax`. So this is a message-consistency check -- it can fail on an
   * exact equality with c, on a NaN, or if the text were ever decoupled from
   * its branch -- and not evidence about the geometry. The evidence about
   * the geometry is the differentiated peak above and the verdicts below.
   */
  const bounds = fromTheLoop.map((x) => Number(x.why.match(/is (\d+\.\d+) km\/s/)[1]));
  assert.ok(bounds.every((b) => b > C_KM_S), `a refusal quoted a bound below c: ${bounds}`);

  /**
   * And the verdicts, against the reference, which this family did not check
   * at all in its first form: it worked entirely on message text, so a run
   * that refused correctly while ADMITTING the excursion would have passed.
   *
   * LURCH has a real below-floor passage at 1165.72 .. 1368.09 s, bottoming
   * out at 2.870 degrees. The two spans this run admits, 400 .. 800 and
   * 1800 .. 2200, hold minimum elongations of 6.488 and 5.646 degrees, and
   * neither touches the passage.
   */
  const truth = belowFloorSpans(LURCH, LURCH_WIN[0], LURCH_WIN[1], 40000);
  assert.equal(truth.spans.length, 1,
    `LURCH should have one below-floor passage, not ${JSON.stringify(truth.spans)}`);
  assert.ok(r.admissible.length > 0,
    'this run admits nothing, so the verdict check below is vacuous');
  assertOwnership(r, truth.spans, 'lurch');
  assertAdmittedClearsTheFloor(r, LURCH, 'lurch');
});
