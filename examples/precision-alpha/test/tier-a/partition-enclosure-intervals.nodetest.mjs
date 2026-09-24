/**
 * The three enclosures a classification verdict rests on, and what goes
 * wrong when one of them is read at a point instead of over the cell.
 *
 * `classifyCell` builds the target over its emission window, the observer
 * over the cell, and the Sun over the cell, and hands all three to the
 * shared elongation expression. The partition suite's other fixtures hold
 * the observer at a fixed point and leave the Sun at the barycentre, and
 * against a body that does not move a midpoint reading and an interval
 * enclosure are the same thing to within the series roundoff. A partition
 * that read either of them at the cell's midpoint would agree with this one
 * on every one of those geometries -- and a midpoint reading is not an
 * enclosure, so the verdict it supports is a statement about one instant
 * wearing the words of a statement about a span.
 *
 * So the two fixtures here each move exactly one of the two. MOVING_OBSERVER
 * sweeps the observer round a stationary Sun, with a stationary target
 * across it; MOVING_SUN holds the observer and the target still and sweeps
 * the Sun across the observer's sky at the same angular rate. In both the
 * elongation falls through the five-degree floor to zero at the origin of
 * time and climbs back out, in both the request is exactly one record so the
 * first cell to be classified is the whole 84,000-second window, and in both
 * that cell's midpoint sits at an elongation of fifteen degrees -- ten
 * degrees clear of the floor -- while its interior reaches conjunction
 * 18,000 seconds away. A reading taken at the
 * midpoint therefore admits the whole window, conjunction included; the
 * enclosure over the same window spans 1.22 rad of the moving body's
 * direction and decides nothing. The second family measures that divergence
 * rather than assuming it.
 *
 * ## Where the expected answers come from
 *
 * From the geometry, pointwise, through `_geometry.mjs`'s `tauExact` and the
 * definition of the elongation written out again here in doubles. Nothing in
 * this file reads an instant or a span off `partitionDomain`'s own output.
 * MOVING_SUN's elongation is exact in closed form -- the observer and the
 * target are both fixed, so `d` does not move at all, and the Sun and the
 * target lie on exact ecliptic-longitude directions from the observer, which
 * makes the elongation at reception `t` exactly the Sun's swing angle. The
 * closed form is checked against the pointwise reference before any case
 * uses it. MOVING_OBSERVER has no closed form: its 1.0e7 km orbit gives a
 * target 1.0e10 km away a parallax of up to 0.057 degrees. That maximum is
 * reached near quadrature and would be worth 69 s at the sweep rate; at the
 * crossings themselves the displacement is nearly along the line of sight,
 * and the measured shift there is 6.0 s, the crossings landing at plus and
 * minus 6,005.99 s against the closed form's 6,000. Small either way, and
 * not assumed: the crossings are bisected out of the pointwise reference
 * rather than taken from the rate.
 *
 * ## Speeds
 *
 * Both sweeps are 1.4544e-5 rad/s, five degrees of elongation every 6,000
 * seconds, about a 1.0e7 km lever arm: 145 km/s for whichever body is
 * moving. That is five times the Earth's orbital speed and it is not offered
 * as physical. It is chosen so that the moving body's position enclosure
 * over the opening cell spans a large fraction of its own distance, which is
 * the condition under which a midpoint reading and an enclosure give
 * different verdicts, while staying slow enough that the elongation is still
 * decidable at the default 60-second boundary tolerance. The existing
 * partition suite makes the same trade for its drifting Sun and names it the
 * same way.
 *
 * ## What is NOT established here
 *
 * The third enclosure. The target is stationary in both fixtures on purpose,
 * so that the only enclosure wide enough to decide anything is the one the
 * fixture is about and a refused verdict is attributable to it. The emission
 * window and the light-time interval are the subject of other families in
 * `domain-partition.nodetest.mjs`. MOVING_OBSERVER's light-time does vary --
 * by 11.9 s across the window, measured in the first family -- but this file
 * asserts nothing about how that interval is derived.
 *
 * The last two families are about a guard rather than a geometry.
 * `classifyCell` refuses a span whose target and observer cannot be bounded
 * apart, and `deriveLightTime` carries the same refusal. On a freshly
 * derived cell the second is unreachable: `deriveLightTime` returns the very
 * light-time interval whose emission window it has just tested for
 * separation, and `classifyCell` rebuilds the same three enclosures from it,
 * so the two separations are the same number. On a cell that INHERITS its
 * interval it is unreachable for a different reason, and that reason is a
 * property of `stateEnclosure` rather than of the partition -- narrowing a
 * window cannot widen the enclosure -- so it is asserted directly, on the
 * enclosures themselves. Neither family establishes what `classifyCell`
 * would do if its guard were reached, because nothing found here reaches it.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from './_geometry.mjs';
import * as I from '../../src/core/interval.mjs';
import { partitionDomain } from '../../src/core/domain-partition.mjs';
import {
  MIN_ELONGATION_RAD, COS_MIN_ELONGATION_GUARD,
  elongationCosInterval, classifyElongationCos,
} from '../../src/core/deflection.mjs';
import { targetWeights, observerWeights, stateEnclosure } from '../../src/core/retarded.mjs';

const DEG = Math.PI / 180;
/** The floor as a cosine. `cos` decreases, so BELOW the floor is ABOVE this. */
const COS_FLOOR = Math.cos(MIN_ELONGATION_RAD);
const BODY = 'Mars';
const { sub3, norm3 } = G;
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// ========================================================= the reference
/**
 * `cos(elongation)` at one instant, in doubles, from the geometry's own
 * functions: `-(e_hat . d)/|d|`, with `e` from the Sun to the observer at
 * reception and `d` light-time corrected. It shares no line with
 * `elongationCosInterval`, and the light-time comes from `tauExact`, which
 * iterates to a fixed point and owes the partition nothing.
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
  for (let i = 0; i < 200; i += 1) {
    const m = (a + b) / 2;
    if (!(m > a && m < b)) break;
    const fm = f(m);
    if (Math.sign(fm) === Math.sign(fa)) { a = m; fa = fm; } else b = m;
  }
  return (a + b) / 2;
}

/**
 * Every instant of [from, to] where the elongation is below the floor, as
 * maximal spans, by sampling then bisection.
 *
 * The method this package exists to replace, used the one way that is sound:
 * to say where a passage IS. Each call site states the number of passages
 * the geometry demands, so a passage finer than the sampling is a failed
 * assertion rather than a quiet agreement.
 */
function belowFloorSpans(geom, from, to, samples) {
  const f = (t) => cosElongationExact(geom, t) - COS_FLOOR;
  const edges = [];
  let pt = from;
  let pv = f(from);
  for (let i = 1; i <= samples; i += 1) {
    const t = from + ((to - from) * i) / samples;
    const cv = f(t);
    if (pv !== 0 && cv !== 0 && Math.sign(cv) !== Math.sign(pv)) edges.push(crossingBetween(geom, pt, t));
    pt = t;
    pv = cv;
  }
  const marks = [from, ...edges, to];
  const out = [];
  for (let i = 1; i < marks.length; i += 1) {
    if (f((marks[i - 1] + marks[i]) / 2) > 0) out.push([marks[i - 1], marks[i]]);
  }
  return { spans: out, crossings: edges };
}

// ======================================================== the geometries
/**
 * Five degrees of elongation every 6,000 seconds. Every instant quoted
 * below -- the crossings near plus and minus 6,000 s, the fifteen-degree
 * elongation at the opening cell's midpoint -- is this rate times a time and
 * nothing else.
 */
const SWEEP_RAD_S = MIN_ELONGATION_RAD / 6000;
/** The lever arm the sweep turns about: observer to Sun in both fixtures. */
const LEVER_KM = 1.0e7;
/** Far enough that the observer's own displacement is a parallax, not a shape. */
const TARGET_RANGE_KM = 1.0e10;
const AU_KM = 1.495978707e8;

/**
 * The request is exactly one record of every body in the pack, so the
 * partition opens with exactly one seed and the first cell to be classified
 * is the whole window. That is what puts the midpoint at 18,000 s, fifteen
 * degrees clear of the floor, with the conjunction at the origin 18,000 s
 * away from it and well inside the same cell.
 */
const WIN = [-24000, 60000];
const SEED_SEC = WIN[1] - WIN[0];
const SEED_MID = (WIN[0] + WIN[1]) / 2;
const INIT_ET = WIN[0] - 2 * SEED_SEC;
const NREC = 5;

/**
 * MOVING_OBSERVER -- a stationary Sun at the barycentre, a stationary target
 * 1.0e10 km away across it, and an observer sweeping round the Sun at
 * 1.0e7 km and 145 km/s.
 *
 * The elongation is the observer's heliocentric longitude to within the
 * parallax named in the header, so it passes through zero at the origin of
 * time and through the floor about 6,000 s either side. The light-time is
 * not constant here: the sweep changes the range by 3.6e6 km across the
 * window, which is 11.9 s of light-time.
 */
const MOVING_OBSERVER = {
  observer: (t) => G.atEclipticLongitude(SWEEP_RAD_S * t, LEVER_KM),
  target: () => G.atEclipticLongitude(Math.PI, TARGET_RANGE_KM),
  sun: () => [0, 0, 0],
};
const MOVING_OBSERVER_EPH = G.packOf(MOVING_OBSERVER.target, MOVING_OBSERVER.observer, {
  intervalSec: SEED_SEC, initEt: INIT_ET, nrec: NREC,
});

/**
 * MOVING_SUN -- the mirror image: the observer and the target are both
 * fixed, and the Sun sweeps across the observer's sky at 1.0e7 km and
 * 145 km/s.
 *
 * Holding the observer still is the point of the pair. The only enclosure
 * that is wide over a cell here is the Sun's, so a verdict this fixture
 * cannot support is a verdict the Sun's enclosure alone refuses, and the
 * elongation is the Sun's swing angle exactly.
 */
const OBSERVER_AT = G.atEclipticLongitude(0, AU_KM);
const offsetFrom = (base, v) => [base[0] + v[0], base[1] + v[1], base[2] + v[2]];
const movingSunPath = (t) => offsetFrom(OBSERVER_AT, G.atEclipticLongitude(SWEEP_RAD_S * t, LEVER_KM));
const MOVING_SUN = {
  observer: () => OBSERVER_AT,
  target: () => offsetFrom(OBSERVER_AT, G.atEclipticLongitude(0, TARGET_RANGE_KM)),
  sun: movingSunPath,
};
const MOVING_SUN_EPH = G.packOf(MOVING_SUN.target, MOVING_SUN.observer, {
  intervalSec: SEED_SEC, initEt: INIT_ET, nrec: NREC, sunFn: movingSunPath,
});

/**
 * COINCIDENT -- a stationary target sitting on a stationary observer.
 *
 * `|d|` is zero at every instant, so no enclosure can bound the pair apart
 * and the direction the elongation is an angle between does not exist. Used
 * only by the fifth family, which is about which guard refuses it.
 */
const COINCIDENT = {
  observer: () => OBSERVER_AT,
  target: () => OBSERVER_AT,
  sun: () => [0, 0, 0],
};
const COINCIDENT_EPH = G.packOf(COINCIDENT.target, COINCIDENT.observer, {
  intervalSec: SEED_SEC, initEt: INIT_ET, nrec: NREC,
});

// =================================================== the truth, in full
/** Bisected out of the reference: the parallax moves these off +-6,000 s. */
const MOVING_OBSERVER_BELOW = [[
  crossingBetween(MOVING_OBSERVER, -12000, -600),
  crossingBetween(MOVING_OBSERVER, 600, 12000),
]];
/** Closed form, checked against the reference in the first family. */
const MOVING_SUN_BELOW = [[-6000, 6000]];

// ========================================================== the helpers
const CLASSES = (r) => [
  ['admissible', r.admissible], ['excluded', r.excluded],
  ['boundary', r.boundary], ['unprocessed', r.unprocessed],
];

/** The four classes tile the request in order, merged and disjoint. */
function assertTilesRequest(r, from, to, note) {
  const all = [];
  for (const [name, list] of CLASSES(r)) {
    let prev = -Infinity;
    for (const [lo, hi] of list) {
      assert.ok(hi > lo, `${note}: ${name} span ${lo} .. ${hi} is empty or backwards`);
      assert.ok(lo >= from - 1e-9 && hi <= to + 1e-9,
        `${note}: ${name} span ${lo} .. ${hi} leaves the request ${from} .. ${to}`);
      assert.ok(lo > prev, `${note}: ${name} spans ${prev} and ${lo} are out of order or unmerged`);
      prev = hi;
      all.push([lo, hi]);
    }
  }
  all.sort((x, y) => x[0] - y[0]);
  for (let i = 1; i < all.length; i += 1) {
    assert.ok(all[i][0] >= all[i - 1][1] - 1e-9,
      `${note}: ${all[i - 1]} and ${all[i]} overlap; no instant may belong to two classes`);
  }
  const total = all.reduce((n, [lo, hi]) => n + (hi - lo), 0);
  assert.ok(Math.abs(total - (to - from)) <= 1e-6,
    `${note}: the four classes cover ${total} s of a ${to - from} s request`);
}

/**
 * THE assertion this file exists for: every instant of every ADMITTED span
 * is at or above the floor, checked against the pointwise reference.
 *
 * Sampled at 30 s or finer against a passage 12,000 s wide, and the worst
 * instant found is named in the failure rather than a bare count. A run that
 * admitted nothing would satisfy this vacuously, so that is refused first.
 */
function assertAdmittedClearsTheFloor(r, geom, note) {
  assert.ok(r.admissible.length > 0, `${note}: nothing was admitted, so this check is vacuous`);
  let worstDeg = Infinity;
  let worstAt = null;
  for (const [lo, hi] of r.admissible) {
    const steps = Math.max(200, Math.ceil((hi - lo) / 30));
    for (let i = 0; i <= steps; i += 1) {
      const t = lo + ((hi - lo) * i) / steps;
      const deg = elongationDegExact(geom, t);
      if (deg < worstDeg) { worstDeg = deg; worstAt = t; }
    }
  }
  assert.ok(worstDeg >= 5,
    `${note}: an ADMITTED span reaches an elongation of ${worstDeg} deg at ${worstAt} s TDB,`
    + ' below the five-degree floor the admission claims to hold at every instant;'
    + ` admissible is ${JSON.stringify(r.admissible)}`);
}

/** Excluded spans lie inside a true passage; the crossings lie in boundary. */
function assertOwnership(r, below, crossings, note) {
  for (const [lo, hi] of r.excluded) {
    const host = below.find(([a, b]) => lo >= a - 1e-9 && hi <= b + 1e-9);
    assert.ok(host,
      `${note}: excluded ${lo} .. ${hi} is not inside any below-floor interval ${JSON.stringify(below)}`);
  }
  assert.ok(crossings.length > 0, `${note}: no crossing to own, so this check is vacuous`);
  for (const t of crossings) {
    assert.ok(r.boundary.some(([lo, hi]) => t >= lo - 1e-9 && t <= hi + 1e-9),
      `${note}: the crossing at ${t} s TDB is in no boundary span; boundary is ${JSON.stringify(r.boundary)}`);
  }
}

/**
 * `classifyCell`'s chain, rebuilt here over a span, with the observer or the
 * Sun optionally collapsed to the span's midpoint.
 *
 * It calls the same `elongationCosInterval` and the same
 * `classifyElongationCos` the operation calls. The point is to compare two
 * readings of one expression, so a second expression would be the wrong
 * instrument; what the comparison establishes is a property of the FIXTURE,
 * not a verdict about the operation. The emission window comes from
 * `tauExact` at the midpoint with 180 s of slack either side, which is
 * fifteen times the 11.9 s the light-time moves across the window; against a
 * stationary target the target enclosure is identical either way, and that
 * is what keeps the difference between the two readings attributable to the
 * one body that was collapsed.
 */
function verdictOver(eph, geom, lo, hi, { observerAtMidpoint = false, sunAtMidpoint = false } = {}) {
  const targets = targetWeights(eph, BODY);
  const observer = observerWeights(eph);
  const sun = targetWeights(eph, 'Sun');
  const m = (lo + hi) / 2;
  const tau = G.tauExact(geom.target, geom.observer, m);
  const R = stateEnclosure(eph, targets, lo - tau - 180, hi - tau + 180);
  const O = observerAtMidpoint
    ? stateEnclosure(eph, observer, m, m)
    : stateEnclosure(eph, observer, lo, hi);
  const S = sunAtMidpoint
    ? stateEnclosure(eph, sun, m, m)
    : stateEnclosure(eph, sun, lo, hi);
  const d = I.vSub(R.pos, O.pos);
  const dist = I.norm(d);
  const eRaw = I.vSub(O.pos, S.pos);
  const en = I.norm(eRaw);
  const e = [I.div(eRaw[0], en), I.div(eRaw[1], en), I.div(eRaw[2], en)];
  const cos = elongationCosInterval(e, d, dist);
  return { cos, verdict: classifyElongationCos(cos), O, S, R, dist };
}

/** The widest component of a position enclosure, in km. */
const spread = (state) => Math.max(...state.pos.map(I.width));

// =========================================== 1. the fixtures themselves
test('the two fixtures sweep one body each, and sweep it through the floor', () => {
  // Every case below reads its instants off these constructions. If a
  // construction is not what its comment says, the cases that use it agree
  // with the partition about a geometry neither of them has.

  // 1. MOVING_SUN's elongation is exactly the Sun's swing angle, checked
  //    against the pointwise reference. The reference iterates the
  //    light-time, but in this fixture it provably cannot matter: the
  //    observer and the target are both fixed, so `d` is constant and so is
  //    tau. The check establishes the closed form, not anything about
  //    light-time; the light-time fixtures are next door.
  for (const t of [-24000, -6135, 0, 18000, 60000]) {
    const closed = Math.abs(SWEEP_RAD_S * t) / DEG;
    const measured = elongationDegExact(MOVING_SUN, t);
    assert.ok(Math.abs(measured - closed) < 1e-9,
      `MOVING_SUN: the elongation at ${t} s is ${measured} deg against the closed form's ${closed}`);
  }

  // 2. Both fixtures cross the floor exactly twice, the passage between the
  //    crossings is one span rather than two, and it bottoms out at
  //    conjunction. MOVING_OBSERVER's crossings are not at +-6,000 s --
  //    the parallax of its own orbit moves them by 6.0 s, to +-6,005.99 --
  //    and the shift is computed below and reported in the failure message
  //    rather than only bounded, so a fixture that drifted would say by how
  //    much.
  for (const [note, geom, below] of [
    ['MOVING_OBSERVER', MOVING_OBSERVER, MOVING_OBSERVER_BELOW],
    ['MOVING_SUN', MOVING_SUN, MOVING_SUN_BELOW],
  ]) {
    const truth = belowFloorSpans(geom, WIN[0], WIN[1], 6000);
    assert.equal(truth.spans.length, 1, `${note}: ${truth.spans.length} passages, not one`);
    assert.equal(truth.crossings.length, 2, `${note}: ${truth.crossings.length} crossings, not two`);
    assert.ok(Math.abs(truth.spans[0][0] - below[0][0]) < 1e-6,
      `${note}: the entry is at ${truth.spans[0][0]} s, not the ${below[0][0]} s the cases use`);
    assert.ok(Math.abs(truth.spans[0][1] - below[0][1]) < 1e-6,
      `${note}: the exit is at ${truth.spans[0][1]} s, not the ${below[0][1]} s the cases use`);
    assert.ok(elongationDegExact(geom, 0) < 1e-6,
      `${note}: the passage bottoms out at ${elongationDegExact(geom, 0)} deg, not at conjunction`);
    /**
      * The parallax bound. A 1.0e7 km orbit against a 1.0e10 km range is at
      * most atan(1e7/1e10) = 0.0573 deg of displacement, worth 69 s at the
      * sweep rate -- but only near quadrature, where the displacement is
      * across the line of sight. At the crossings it is nearly along it,
      * and the measured shift is 6.0 s. The assertion allows the full 69 s
      * because that is what the geometry bounds; the measured value is in
      * the message so a drift is legible rather than merely caught.
      */
    const shift = [below[0][0] + 6000, below[0][1] - 6000];
    assert.ok(Math.abs(shift[0]) < 69 && Math.abs(shift[1]) < 69,
      `${note}: its crossings are ${below[0]}, moved ${shift} s from +-6000 s, further`
      + ' than the 69 s the orbit\'s parallax can account for');

    // The midpoint of the one opening cell is far clear of the floor. This
    // is the whole shape of the trap: a reading taken there says fifteen
    // degrees while 18,000 s away, inside the same cell, the elongation is
    // zero.
    const mid = elongationDegExact(geom, SEED_MID);
    assert.ok(mid > 14.9 && mid < 15.1,
      `${note}: the opening cell's midpoint is at ${mid} deg, not the fifteen the trap needs`);
  }

  // 3. The pack really is one record across the request, so the partition
  //    opens with one seed whose midpoint is that instant.
  const r = partitionDomain(MOVING_OBSERVER_EPH, {
    body: BODY, fromTdbSec: WIN[0], toTdbSec: WIN[1],
  });
  assert.equal(r.diagnostics.seeds, 1,
    `the request must be one seed for the midpoint to be the first cell classified, not ${r.diagnostics.seeds}`);

  // 4. The moving body moves and the still ones are still, measured as
  //    enclosure spread over the opening cell in km, because that is the
  //    quantity the classification consumes.
  const mo = verdictOver(MOVING_OBSERVER_EPH, MOVING_OBSERVER, WIN[0], WIN[1]);
  assert.ok(spread(mo.O) > 8e6,
    `MOVING_OBSERVER: the observer's enclosure spans only ${spread(mo.O)} km over the cell`);
  assert.ok(spread(mo.S) < 1, `MOVING_OBSERVER: its Sun moves by ${spread(mo.S)} km and should not`);
  const ms = verdictOver(MOVING_SUN_EPH, MOVING_SUN, WIN[0], WIN[1]);
  assert.ok(spread(ms.S) > 8e6,
    `MOVING_SUN: the Sun's enclosure spans only ${spread(ms.S)} km over the cell`);
  assert.ok(spread(ms.O) < 1, `MOVING_SUN: its observer moves by ${spread(ms.O)} km and should not`);

  // 5. MOVING_OBSERVER's light-time varies across the window. A fixture
  //    whose light-time is a constant cannot tell an interval that contains
  //    the answer from one that merely guesses it, which is the condition
  //    the review named.
  const tauNear = G.tauExact(MOVING_OBSERVER.target, MOVING_OBSERVER.observer, 0);
  const tauFar = G.tauExact(MOVING_OBSERVER.target, MOVING_OBSERVER.observer, WIN[1]);
  assert.ok(tauNear - tauFar > 10,
    `MOVING_OBSERVER: the light-time moves by only ${tauNear - tauFar} s across the window`);
});

// ====================================== 2. the divergence, measured once
test('over the cell that decides, a midpoint reading and an enclosure disagree', () => {
  // This family establishes the CONDITION the two partition families below
  // depend on, and establishes it without asking the partition anything:
  // one elongation expression, over one span, evaluated twice -- with all
  // three bodies enclosed over the span, and with the one moving body
  // collapsed to the span's midpoint -- and the two answers required to fall
  // on opposite sides of the floor. If a later change slowed the sweep, or
  // widened the record so that the window stopped being a single cell, this
  // goes red here instead of leaving the families below passing for a reason
  // they are not about.
  for (const [note, eph, geom, collapse, body] of [
    ['MOVING_OBSERVER', MOVING_OBSERVER_EPH, MOVING_OBSERVER, { observerAtMidpoint: true }, 'O'],
    ['MOVING_SUN', MOVING_SUN_EPH, MOVING_SUN, { sunAtMidpoint: true }, 'S'],
  ]) {
    const enclosed = verdictOver(eph, geom, WIN[0], WIN[1]);
    const midpoint = verdictOver(eph, geom, WIN[0], WIN[1], collapse);

    assert.equal(midpoint.verdict, 'admissible',
      `${note}: a midpoint reading of the opening cell gives ${midpoint.verdict}, so nothing is at stake here`);
    assert.equal(enclosed.verdict, 'boundary',
      `${note}: the enclosure over the same cell gives ${enclosed.verdict}; the cell must be undecidable`);

    // Not marginally admissible. The midpoint reading clears the guard by
    // 0.0303 in cosine -- an elongation of fifteen degrees against a
    // five-degree floor, so ten degrees of real margin -- and the threshold
    // below is set at 0.025 to leave the assertion room rather than sit
    // flush against the measurement.
    assert.ok(midpoint.cos.hi < COS_MIN_ELONGATION_GUARD - 0.025,
      `${note}: the midpoint reading's cos.hi is ${midpoint.cos.hi}, only just inside the`
      + ` ${COS_MIN_ELONGATION_GUARD} guard`);
    /**
      * And not marginally undecidable either. The enclosure's `cos.hi` is
      * 3.22 -- outside the range of a cosine entirely, because a decoupled
      * interval box over 84,000 seconds of a 1.22 rad sweep is very loose.
      * That is what is asserted: not that the enclosure brackets the
      * conjunction tightly, but that it is nowhere near tight enough to
      * admit, which is the honest reading of the number.
      */
    assert.ok(enclosed.cos.hi > 1,
      `${note}: the enclosure's cos.hi is ${enclosed.cos.hi}, inside the range of a`
      + ' cosine, so this cell is much tighter than the case this test is about');

    // The divergence, measured in the quantity the verdict is read from.
    const widened = I.width(enclosed.cos) - I.width(midpoint.cos);
    assert.ok(widened > 0.5,
      `${note}: enclosing the span instead of reading its midpoint widens cos(elongation)`
      + ` by only ${widened}; a sweep this small cannot separate the two readings`);
    // And in kilometres, on the body that was collapsed.
    const over = spread(enclosed[body]);
    const at = spread(midpoint[body]);
    assert.ok(over > 8e6 && at < 1,
      `${note}: the collapsed body spans ${over} km over the cell and ${at} km at its midpoint`);
  }
});

// ============================ 3. the observer, enclosed over a real cell
test('a moving observer: no span is admitted over the conjunction it sweeps through', () => {
  // The failure this is about is not a lost span or a loose bound. It is a
  // run that ADMITS a span containing an elongation of zero: a proof that
  // the profile's domain holds at every instant of a span that in fact
  // contains a solar conjunction. Admissible is the class the partitioned
  // search skips the domain test on, so a wrong admission is not
  // conservative in any direction.
  const truth = belowFloorSpans(MOVING_OBSERVER, WIN[0], WIN[1], 6000);
  assert.equal(truth.spans.length, 1);
  const r = partitionDomain(MOVING_OBSERVER_EPH, {
    body: BODY, fromTdbSec: WIN[0], toTdbSec: WIN[1],
  });
  assert.equal(r.execution.status, 'finished');
  assert.equal(r.unprocessed.length, 0, 'a finished run examined everything');
  assertTilesRequest(r, WIN[0], WIN[1], 'MOVING_OBSERVER');
  assertAdmittedClearsTheFloor(r, MOVING_OBSERVER, 'MOVING_OBSERVER');
  assertOwnership(r, truth.spans, truth.crossings, 'MOVING_OBSERVER');

  // Non-vacuity, four ways. A run that decided nothing, or that resolved
  // the passage into more pieces than it has, would be a different failure
  // and this family should not be the one reporting it.
  assert.equal(r.admissible.length, 2,
    `the window is admissible on both sides of the passage, not in ${r.admissible.length} spans`);
  assert.equal(r.excluded.length, 1, `${r.excluded.length} excluded runs for one passage`);
  assert.equal(r.boundary.length, 2, 'one boundary run per transition');
  // And no admitted span may be the opening cell itself, the cell whose
  // midpoint reads fifteen degrees of elongation while its interior reaches
  // conjunction.
  for (const [lo, hi] of r.admissible) {
    assert.ok(hi - lo < SEED_SEC - 1,
      `the whole ${SEED_SEC} s cell was admitted as ${lo} .. ${hi}`);
  }
});

// ================================= 4. the Sun, enclosed over a real cell
test('a moving Sun: no span is admitted over the conjunction it sweeps through', () => {
  // The mirror of the family above. Here the observer and the target are
  // both fixed, `d` does not move at all, and every verdict the run issues
  // about the elongation rests on the Sun's enclosure alone.
  const r = partitionDomain(MOVING_SUN_EPH, {
    body: BODY, fromTdbSec: WIN[0], toTdbSec: WIN[1],
  });
  assert.equal(r.execution.status, 'finished');
  assert.equal(r.unprocessed.length, 0, 'a finished run examined everything');
  assertTilesRequest(r, WIN[0], WIN[1], 'MOVING_SUN');
  assertAdmittedClearsTheFloor(r, MOVING_SUN, 'MOVING_SUN');
  assertOwnership(r, MOVING_SUN_BELOW, [-6000, 6000], 'MOVING_SUN');

  assert.equal(r.admissible.length, 2,
    `the window is admissible on both sides of the passage, not in ${r.admissible.length} spans`);
  assert.equal(r.excluded.length, 1, `${r.excluded.length} excluded runs for one passage`);
  assert.equal(r.boundary.length, 2, 'one boundary run per transition');
  for (const [lo, hi] of r.admissible) {
    assert.ok(hi - lo < SEED_SEC - 1,
      `the whole ${SEED_SEC} s cell was admitted as ${lo} .. ${hi}`);
  }
});

// ================================== 5. which guard refuses an undefined d
test('a target on the observer is refused by the light-time derivation, before any cell', () => {
  // `classifyCell` and `deriveLightTime` both refuse a span whose target and
  // observer cannot be bounded apart, and they say different things about
  // it. Which sentence comes back is the observable form of which guard runs
  // first, and the ordering is what makes `classifyCell`'s copy unreachable
  // from here: `deriveLightTime` returns the very light-time interval whose
  // emission window it has just tested for separation, and `classifyCell`
  // rebuilds the same three enclosures from it.
  //
  // So this asserts the ordering, not a verdict. If the refusal ever moved
  // -- if a cell reached the classification carrying a separation the
  // light-time derivation had not established -- the sentence attached to
  // the boundary span would change and this goes red.
  const r = partitionDomain(COINCIDENT_EPH, {
    body: BODY, fromTdbSec: WIN[0], toTdbSec: WIN[1], boundaryToleranceSec: 6000,
  });
  assert.equal(r.execution.status, 'finished');
  assertTilesRequest(r, WIN[0], WIN[1], 'COINCIDENT');
  assert.equal(r.admissible.length, 0, 'a pair that cannot be separated admits nothing');
  assert.equal(r.excluded.length, 0, 'and excludes nothing: undecidable is not excluded');
  assert.equal(r.boundary.length, 1, 'the whole request is one merged boundary span');
  assert.ok(r.boundaryReasons.length > 0, 'a boundary span of this shape must carry a reason');
  for (const { why } of r.boundaryReasons) {
    assert.ok(why.includes('cannot be shown to be separated over this seed'),
      `the refusal came back as "${why}", which is not the light-time derivation's`);
    assert.ok(!why.includes('so the direction is undefined'),
      `the classification's own separation guard answered instead: "${why}"`);
  }
});

// ============ 6. why the classification's copy of that guard is redundant
test('narrowing a cell cannot widen the separation its enclosures establish', () => {
  // The other half of the reachability argument, and the half that is not
  // about the partition at all. A cell that INHERITS a light-time interval
  // does not re-derive one, so the separation it works from is not the
  // number `deriveLightTime` checked: it is the number the same enclosures
  // give over a narrower reception span and a narrower emission window. That
  // is only safe if `stateEnclosure` is monotone under narrowing, and
  // monotone is something to be shown rather than assumed.
  //
  // Checked over three levels of halving on both fixtures: every component
  // of every child enclosure lies inside its parent's, and the separation's
  // proved lower bound never falls. A change that broke either would let an
  // inherited cell lose a separation its ancestor proved, which is the case
  // `classifyCell`'s guard would then have to catch.
  for (const [note, eph, geom] of [
    ['MOVING_OBSERVER', MOVING_OBSERVER_EPH, MOVING_OBSERVER],
    ['MOVING_SUN', MOVING_SUN_EPH, MOVING_SUN],
  ]) {
    const targets = targetWeights(eph, BODY);
    const observer = observerWeights(eph);
    const sun = targetWeights(eph, 'Sun');
    const tau = G.tauExact(geom.target, geom.observer, SEED_MID);
    // One light-time interval, inherited unchanged by every span below.
    // That is the worst case for the argument: a cell that tightens it gets
    // a narrower emission window still.
    const T = { lo: tau - 60, hi: tau + 60 };
    const enclosuresOf = (lo, hi) => {
      const O = stateEnclosure(eph, observer, lo, hi);
      const R = stateEnclosure(eph, targets, lo - T.hi, hi - T.lo);
      const S = stateEnclosure(eph, sun, lo, hi);
      return { O, R, S, dist: I.norm(I.vSub(R.pos, O.pos)) };
    };
    const key = ([lo, hi]) => `${lo}:${hi}`;
    let level = [[WIN[0], WIN[1]]];
    let parents = new Map([[key(level[0]), enclosuresOf(WIN[0], WIN[1])]]);
    assert.ok(parents.get(key(level[0])).dist.lo > 0,
      `${note}: the opening cell's own separation is not established, so there is nothing to inherit`);
    for (let depth = 0; depth < 3; depth += 1) {
      const next = [];
      const computed = new Map();
      for (const span of level) {
        const [lo, hi] = span;
        const parent = parents.get(key(span));
        const m = (lo + hi) / 2;
        for (const child of [[lo, m], [m, hi]]) {
          const got = enclosuresOf(child[0], child[1]);
          for (const which of ['O', 'R', 'S']) {
            for (let comp = 0; comp < 3; comp += 1) {
              const inner = got[which].pos[comp];
              const outer = parent[which].pos[comp];
              // Slack for the relative widening every interval operation
              // applies; the containments here are whole kilometres.
              const slack = (outer.hi - outer.lo) * 1e-12 + 1e-6;
              assert.ok(inner.lo >= outer.lo - slack && inner.hi <= outer.hi + slack,
                `${note}: at depth ${depth} the ${which} enclosure's component ${comp} over`
                + ` ${child[0]} .. ${child[1]} is [${inner.lo}, ${inner.hi}], outside its parent's`
                + ` [${outer.lo}, ${outer.hi}]`);
            }
          }
          assert.ok(got.dist.lo >= parent.dist.lo - Math.abs(parent.dist.lo) * 1e-12,
            `${note}: at depth ${depth} the child ${child[0]} .. ${child[1]} proves a separation of`
            + ` ${got.dist.lo} km where its parent proved ${parent.dist.lo} km`);
          computed.set(key(child), got);
          next.push(child);
        }
      }
      level = next;
      parents = computed;
    }
    // Non-vacuity: the enclosures really do narrow as the cells do, so the
    // containment above is a constraint rather than an identity.
    const whole = enclosuresOf(WIN[0], WIN[1]);
    const eighth = enclosuresOf(WIN[0], WIN[0] + SEED_SEC / 8);
    const wide = spread(whole.O) + spread(whole.R) + spread(whole.S);
    const narrow = spread(eighth.O) + spread(eighth.R) + spread(eighth.S);
    assert.ok(wide - narrow > 1e6,
      `${note}: an eighth of the cell encloses only ${wide - narrow} km less than the whole of it`);
  }
});
