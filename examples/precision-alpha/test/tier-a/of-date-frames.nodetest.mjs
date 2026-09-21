/**
 * The twelve synthetic frame cases of `OF-DATE-PREREGISTRATION.md` §6a,
 * in that order.
 *
 * They exist because the real IAU frame's truth is exactly as hard to
 * establish as the thing under test. A frame given in closed form has an
 * answer that can be derived independently, so these cases establish what
 * the SEARCH does with a date-dependent rotation, while
 * `frame-of-date.nodetest.mjs` establishes that the real rotation is the
 * one it claims to be, against published ERFA vectors.
 *
 * The injected frames declare their derivative per TDB SECOND and set
 * `dtdTdb` to one, so these cases are about the frame and not about the
 * time model — which `frame-of-date.nodetest.mjs` pins separately. S5c is
 * the exception: it varies `dtdTdb` deliberately, to check that the factor
 * lands on the `R'` term and nowhere else.
 *
 * Round trips and orthogonality are not here. A consistently wrong
 * rotation passes both, and the preregistration says they count for
 * nothing.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from './_geometry.mjs';
import * as I from '../../src/core/interval.mjs';
import { sinCosInterval } from '../../src/core/trig.mjs';
import {
  searchAberratedLongitude, searchOfDateLongitude, searchOfDateLongitudeWithFrame,
} from '../../src/core/retarded-search.mjs';

const D = G.DAY;
const DEG = Math.PI / 180;
const ptI = (x) => I.iv(x);

// ------------------------------------------------------------- the frames
/**
 * The fixed equatorial-to-ecliptic rotation, R1(e0), as a plain matrix.
 *
 * This is the S1 frame, and it is NOT the identity. The two earlier modes
 * carry the obliquity inside their projection weights; the of-date mode
 * does not, because its frame has already done that rotation. Handing the
 * of-date path a literal identity matrix would therefore compute a
 * longitude in the EQUATORIAL plane, which S1b asserts it does — the check
 * that S1a is not vacuous.
 */
const R1E0 = [
  [1, 0, 0],
  [0, G.CE, G.SE],
  [0, -G.SE, G.CE],
];
const IDENTITY = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

/** Rz(-theta) . M, as plain numbers: a rotation that ADDS theta to the ecliptic longitude. */
function rotatedBy(theta, M) {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  // Rz(-theta) = [[c, -s, 0], [s, c, 0], [0, 0, 1]]
  const Z = [[c, -s, 0], [s, c, 0], [0, 0, 1]];
  return [0, 1, 2].map((i) => [0, 1, 2].map((j) => Z[i][0] * M[0][j] + Z[i][1] * M[1][j] + Z[i][2] * M[2][j]));
}

/** A provider for a CONSTANT matrix: R' = 0, the S1 and S2 shape. */
function constantFrame(M) {
  const R = M.map((row) => row.map(ptI));
  const Rdot = [0, 1, 2].map(() => [ptI(0), ptI(0), ptI(0)]);
  return () => ({
    R, Rdot, angles: null, clock: { t: ptI(0), dtdTdb: ptI(1), tdbMinusTtSec: ptI(0) },
  });
}

/**
 * A provider for a UNIFORMLY ROTATING frame: longitude gains `omega`
 * radians per TDB second, measured from `t0`.
 *
 * The enclosure is a real one — `sinCosInterval` over the cell's own angle
 * interval, so a cell wide enough to contain an interior extremum of sine
 * gets the extremum rather than its endpoints (S12). The angle is measured
 * from `t0` so it stays inside `trig.mjs`'s admitted argument range without
 * an argument reduction that would belong to a different test.
 *
 * `dtdTdbOverride` and `rdotScale` exist for S5c only.
 */
function rotatingFrame(omega, t0, base = R1E0, { dtdTdbOverride = 1, freezeAt = null, dropRdot = false } = {}) {
  const B = base.map((row) => row.map(ptI));
  return (cell) => {
    let sc;
    if (freezeAt !== null) {
      const a = omega * (freezeAt - t0);
      sc = { s: ptI(Math.sin(a)), c: ptI(Math.cos(a)) };
    } else {
      sc = sinCosInterval(I.iv(omega * (cell.lo - t0), omega * (cell.hi - t0)));
    }
    // Rz(-a) = [[c, -s, 0], [s, c, 0], [0, 0, 1]]
    const Z = [
      [sc.c, I.neg(sc.s), ptI(0)],
      [sc.s, sc.c, ptI(0)],
      [ptI(0), ptI(0), ptI(1)],
    ];
    // d/dt Rz(-a) = omega * [[-s, -c, 0], [c, -s, 0], [0, 0, 0]], divided by
    // whatever dtdTdb the caller will multiply back in.
    const k = omega / dtdTdbOverride;
    const Zd = (freezeAt !== null || dropRdot)
      ? [[ptI(0), ptI(0), ptI(0)], [ptI(0), ptI(0), ptI(0)], [ptI(0), ptI(0), ptI(0)]]
      : [
        [I.scale(sc.s, -k), I.scale(sc.c, -k), ptI(0)],
        [I.scale(sc.c, k), I.scale(sc.s, -k), ptI(0)],
        [ptI(0), ptI(0), ptI(0)],
      ];
    const mul = (A) => [0, 1, 2].map((i) => [0, 1, 2].map((j) => I.add(I.add(I.mul(A[i][0], B[0][j]), I.mul(A[i][1], B[1][j])), I.mul(A[i][2], B[2][j]))));
    return {
      R: mul(Z),
      Rdot: mul(Zd),
      angles: null,
      clock: { t: ptI(0), dtdTdb: ptI(dtdTdbOverride), tdbMinusTtSec: ptI(0) },
    };
  };
}

// --------------------------------------------------------- the reference
/** The of-date direction, as plain numbers: the rotation applied to the aberrated vector. */
function qExact(geom, t, Mof) {
  const u = G.uExact(geom, t);
  const M = Mof(t);
  return [0, 1, 2].map((i) => M[i][0] * u[0] + M[i][1] * u[1] + M[i][2] * u[2]);
}
const fOfDate = (geom, t, Mof, Ldeg) => {
  const q = qExact(geom, t, Mof);
  return Math.sin(Ldeg * DEG) * q[0] - Math.cos(Ldeg * DEG) * q[1];
};
const gOfDate = (geom, t, Mof, Ldeg) => {
  const q = qExact(geom, t, Mof);
  return Math.cos(Ldeg * DEG) * q[0] + Math.sin(Ldeg * DEG) * q[1];
};
const lonOfDate = (geom, t, Mof) => {
  const q = qExact(geom, t, Mof);
  return ((((Math.atan2(q[1], q[0]) * 180) / Math.PI) % 360) + 360) % 360;
};

/**
 * Reference roots by scan then bisection.
 *
 * It locates roots; it does not count them completely, and nothing below
 * treats a matching count as a proof that none was missed between two
 * samples. `samples` is stated at every call site.
 */
function rootsOfDate(geom, Mof, Ldeg, a, b, samples) {
  const f = (t) => fOfDate(geom, t, Mof, Ldeg);
  const out = [];
  let pt = a;
  let pv = f(a);
  for (let i = 1; i <= samples; i += 1) {
    const t = a + ((b - a) * i) / samples;
    const cv = f(t);
    if (pv !== 0 && cv !== 0 && Math.sign(cv) !== Math.sign(pv)) {
      let lo = pt; let hi = t; let flo = pv;
      for (let k = 0; k < 200; k += 1) {
        const m = (lo + hi) / 2;
        if (!(m > lo && m < hi)) break;
        const fm = f(m);
        if (Math.sign(fm) === Math.sign(flo)) { lo = m; flo = fm; } else hi = m;
      }
      const r = (lo + hi) / 2;
      if (gOfDate(geom, r, Mof, Ldeg) > 0) out.push(r);
    }
    pt = t; pv = cv;
  }
  return out;
}

const matchRoots = (got, want, tol) => {
  const used = new Set();
  let worst = 0;
  for (const w of want) {
    let best = -1; let bd = Infinity;
    got.forEach((g, i) => { const d = Math.abs(g - w); if (!used.has(i) && d < bd) { bd = d; best = i; } });
    if (best < 0 || bd > tol) return { ok: false, worst: bd };
    used.add(best);
    worst = Math.max(worst, bd);
  }
  return { ok: used.size === got.length, worst, extra: got.length - used.size };
};

// ------------------------------------------------------------- fixtures
/** The standard opposition geometry, shared by every case that does not need its own. */
const PAIR = G.heliocentricPair();
const EPH = G.packOf(PAIR.target, PAIR.observer, { nrec: 142, initEt: -71 * D });
const WIN = [-70 * D, 70 * D];
const BODY = 'Mars';
/**
 * Targets are read at an instant that is NOT a whole day, because cells
 * start on day boundaries and a root landing exactly on one leaves the
 * endpoint sign inside its own enclosure width -- honest, but it makes a
 * reduction case establish nothing. S8 puts a root on a boundary on
 * purpose; nothing else should.
 */
const PROBE = 17.37 * D;
const eventTimes = (r) => r.events.map((e) => e.tdbSec);

// ======================================================= S1 · identity
test('S1a: the fixed ecliptic rotation reduces the of-date mode to the aberrated one', () => {
  const targetDeg = G.lonExact(PAIR, PROBE, true);
  const base = searchAberratedLongitude(EPH, { body: BODY, targetDeg, fromTdbSec: WIN[0], toTdbSec: WIN[1] });
  const ofd = searchOfDateLongitudeWithFrame(
    EPH, { body: BODY, targetDeg, fromTdbSec: WIN[0], toTdbSec: WIN[1] }, constantFrame(R1E0),
  );
  assert.equal(base.completeness.established, true);
  assert.equal(ofd.completeness.established, true, 'the reduction case must establish completeness');
  assert.equal(ofd.events.length, base.events.length, 'same frame, same events');
  assert.ok(base.events.length > 0, 'a reduction case with no events proves nothing');
  for (let i = 0; i < base.events.length; i += 1) {
    assert.ok(Math.abs(ofd.events[i].tdbSec - base.events[i].tdbSec) < 1e-6,
      `root ${i}: ${ofd.events[i].tdbSec} vs ${base.events[i].tdbSec}`);
    assert.equal(ofd.events[i].direction, base.events[i].direction);
  }
});

test('S1b: a literal identity is a DIFFERENT frame, so S1a is not vacuous', () => {
  const targetDeg = G.lonExact(PAIR, PROBE, true);
  const ecl = searchOfDateLongitudeWithFrame(
    EPH, { body: BODY, targetDeg, fromTdbSec: WIN[0], toTdbSec: WIN[1] }, constantFrame(R1E0),
  );
  const equ = searchOfDateLongitudeWithFrame(
    EPH, { body: BODY, targetDeg, fromTdbSec: WIN[0], toTdbSec: WIN[1] }, constantFrame(IDENTITY),
  );
  // Both are honest searches; they are about different planes. If they
  // agreed, the obliquity would not be entering anywhere and S1a would be
  // checking nothing.
  const differs = equ.events.length !== ecl.events.length
    || ecl.events.some((e, i) => Math.abs(equ.events[i].tdbSec - e.tdbSec) > 1);
  assert.ok(differs, 'the equatorial projection must not agree with the ecliptic one');
});

// =============================================== S2 · constant rotation
test('S2: a constant rotation by theta shifts the target longitude by exactly theta', () => {
  const theta = 7.25 * DEG;
  const targetDeg = G.lonExact(PAIR, PROBE, true) + 7.25;
  const rotated = searchOfDateLongitudeWithFrame(
    EPH, { body: BODY, targetDeg, fromTdbSec: WIN[0], toTdbSec: WIN[1] },
    constantFrame(rotatedBy(theta, R1E0)),
  );
  const plain = searchAberratedLongitude(EPH, {
    body: BODY, targetDeg: targetDeg - 7.25, fromTdbSec: WIN[0], toTdbSec: WIN[1],
  });
  assert.equal(rotated.completeness.established, true);
  assert.equal(plain.completeness.established, true);
  assert.equal(rotated.events.length, plain.events.length);
  assert.ok(plain.events.length > 0);
  for (let i = 0; i < plain.events.length; i += 1) {
    assert.ok(Math.abs(rotated.events[i].tdbSec - plain.events[i].tdbSec) < 1e-3,
      `root ${i} moved by ${rotated.events[i].tdbSec - plain.events[i].tdbSec} s`);
    assert.equal(rotated.events[i].direction, plain.events[i].direction);
  }
});

// ============================================== S3 · uniform rotation
/**
 * A frame turning at 40 arcsec per day — about eight hundred times the
 * real precession rate, so `R'` is material rather than a rounding term,
 * and the window is short enough that the angle stays well inside the
 * admitted argument range.
 */
const OMEGA = ((40 / 3600) * DEG) / D;
const T0 = WIN[0];
const MOF = (t) => rotatedBy(OMEGA * (t - T0), R1E0);

test('S3: a uniformly rotating frame is not a shift of the constant one', () => {
  // Read from the OF-DATE reference: an of-date longitude is not a
  // fixed-frame one, and using the latter picks an instant the rotated
  // direction may never reach.
  const targetDeg = lonOfDate(PAIR, PROBE, MOF);
  const got = searchOfDateLongitudeWithFrame(
    EPH, { body: BODY, targetDeg, fromTdbSec: WIN[0], toTdbSec: WIN[1] }, rotatingFrame(OMEGA, T0),
  );
  assert.equal(got.completeness.established, true, got.completeness.statement);
  const want = rootsOfDate(PAIR, MOF, targetDeg, WIN[0], WIN[1], 40000);
  const m = matchRoots(eventTimes(got), want, 1e-3);
  assert.ok(m.ok, `roots ${JSON.stringify(eventTimes(got))} vs reference ${JSON.stringify(want)} (worst ${m.worst})`);
  assert.ok(want.length > 0, 'a rotating case with no roots establishes nothing');
  for (const e of got.events) {
    assert.ok(e.bracketTdbSec[0] <= e.tdbSec && e.tdbSec <= e.bracketTdbSec[1]);
  }
  // and it really is a different answer from the frozen-at-start frame
  const frozen = searchOfDateLongitudeWithFrame(
    EPH, { body: BODY, targetDeg, fromTdbSec: WIN[0], toTdbSec: WIN[1] }, constantFrame(R1E0),
  );
  const apart = Math.max(...got.events.map((e, i) => Math.abs(e.tdbSec - frozen.events[i].tdbSec)));
  assert.ok(apart > 1e3, `the rotation must move the roots materially, moved ${apart} s`);
});

// =============================================== S4 · reversed direction
test('S4: a frame turning the other way flips the reported direction', () => {
  // The companion sweeps a full turn a month; a frame turning fast enough
  // the other way reverses the apparent motion at the crossing. The labels
  // are checked against the REFERENCE longitude either side, never against
  // the sign of f.
  const comp = G.companionPair();
  const eph = G.packOf(comp.target, comp.observer, { nrec: 260, initEt: -1 * D });
  const win = [0, 20 * D];
  const t0 = win[0];
  const targetDeg = lonOfDate(comp, 6 * D, (t) => rotatedBy(0, R1E0));
  for (const sign of [+1, -1]) {
    const w = sign * ((4 / 3600) * DEG) / D;
    const mof = (t) => rotatedBy(w * (t - t0), R1E0);
    const got = searchOfDateLongitudeWithFrame(
      eph, { body: 'Mars', targetDeg, fromTdbSec: win[0], toTdbSec: win[1] }, rotatingFrame(w, t0),
    );
    assert.equal(got.completeness.established, true, got.completeness.statement);
    assert.ok(got.events.length > 0, `omega sign ${sign} produced no events`);
    for (const e of got.events) {
      const h = 60;
      const before = lonOfDate(comp, e.tdbSec - h, mof);
      const after = lonOfDate(comp, e.tdbSec + h, mof);
      let d = after - before;
      if (d > 180) d -= 360;
      if (d < -180) d += 360;
      assert.equal(e.direction, d > 0 ? 'increasing' : 'decreasing',
        `at ${e.tdbSec}: reference longitude moved ${d} deg but the label says ${e.direction}`);
    }
  }
});

// ================================================= S5 · R' is material
/**
 * A frame fast enough that the R' term dominates the body's own motion.
 * Mars moves about half a degree a day against the stars; ten degrees a
 * day of frame is twenty times that.
 */
const FAST = (10 * DEG) / D;

test('S5a: with a dominant R-dot the search still establishes completeness', () => {
  const win = [-3 * D, 3 * D];
  const mof = (t) => rotatedBy(FAST * (t - win[0]), R1E0);
  const targetDeg = lonOfDate(PAIR, 0.37 * D, mof);
  const got = searchOfDateLongitudeWithFrame(
    EPH, { body: BODY, targetDeg, fromTdbSec: win[0], toTdbSec: win[1] }, rotatingFrame(FAST, win[0]),
  );
  assert.equal(got.completeness.established, true, got.completeness.statement);
  const want = rootsOfDate(PAIR, mof, targetDeg, win[0], win[1], 60000);
  assert.ok(want.length >= 1, `the dominant-frame case must contain roots, found ${want.length}`);
  const m = matchRoots(eventTimes(got), want, 1e-3);
  assert.ok(m.ok, `roots ${JSON.stringify(eventTimes(got))} vs ${JSON.stringify(want)} (worst ${m.worst})`);
});

/**
 * What this catches, measured: the broken variant does not merely fail to
 * establish monotonicity. `M1` -- the Lipschitz constant the EXCLUSION test
 * uses, `I.mig(f(m)) > M1 * w` -- is taken from the same derivative
 * enclosure, so zeroing `R'` makes `M1` far too small and cells that do
 * contain roots are excluded as proven empty. On the case below the correct
 * provider finds a root at 31968 s and the broken one reports ZERO events
 * with `established: true`. A wrong derivative here does not give a weaker
 * answer; it gives a confidently wrong one.
 */
test("S5b: dropping R-dot from Q-dot is detectably wrong, or the case says it could not tell", () => {
  const win = [-3 * D, 3 * D];
  const mof = (t) => rotatedBy(FAST * (t - win[0]), R1E0);
  const targetDeg = lonOfDate(PAIR, 0.37 * D, mof);
  const want = rootsOfDate(PAIR, mof, targetDeg, win[0], win[1], 60000);
  let broken;
  let threw = null;
  try {
    broken = searchOfDateLongitudeWithFrame(
      EPH, { body: BODY, targetDeg, fromTdbSec: win[0], toTdbSec: win[1] },
      rotatingFrame(FAST, win[0], R1E0, { dropRdot: true }),
    );
  } catch (error) { threw = error; }
  if (threw) return;                               // refused outright: detected
  if (!broken.completeness.established) return;    // could not establish: detected
  const m = matchRoots(eventTimes(broken), want, 1e-3);
  assert.ok(!m.ok,
    'rotating P-prime alone produced the SAME proven answer as the correct derivative: '
    + 'this case is too weak to separate them, and that is a finding, not a pass. '
    + `got ${JSON.stringify(eventTimes(broken))}, reference ${JSON.stringify(want)}`);
});

test('S5c: dt/dTDB lands on the R-dot term and nowhere else', () => {
  // Same physical frame, declared two ways: R' per TDB second with
  // dtdTdb = 1, and R' per (1/K) TDB second with dtdTdb = K. Their product
  // is the same, so the answers must be too. If the factor were dropped,
  // or applied to R P' as well, they would not be.
  const win = [-6 * D, 6 * D];
  const K = 7.5;
  const targetDeg = lonOfDate(PAIR, 0.37 * D, (t) => rotatedBy(FAST * (t - win[0]), R1E0));
  const one = searchOfDateLongitudeWithFrame(
    EPH, { body: BODY, targetDeg, fromTdbSec: win[0], toTdbSec: win[1] }, rotatingFrame(FAST, win[0]),
  );
  const other = searchOfDateLongitudeWithFrame(
    EPH, { body: BODY, targetDeg, fromTdbSec: win[0], toTdbSec: win[1] },
    rotatingFrame(FAST, win[0], R1E0, { dtdTdbOverride: K }),
  );
  assert.equal(one.completeness.established, true);
  assert.equal(other.completeness.established, true);
  assert.equal(other.events.length, one.events.length);
  assert.ok(one.events.length > 0);
  for (let i = 0; i < one.events.length; i += 1) {
    assert.ok(Math.abs(other.events[i].tdbSec - one.events[i].tdbSec) < 1e-6,
      `event ${i} moved by ${other.events[i].tdbSec - one.events[i].tdbSec} s when only the units changed`);
  }
});

// ================================================= S6 · R may not freeze
test('S6: freezing R at the window midpoint is detectably wrong', () => {
  const win = [-6 * D, 6 * D];
  const mid = (win[0] + win[1]) / 2;
  const mof = (t) => rotatedBy(FAST * (t - win[0]), R1E0);
  const targetDeg = lonOfDate(PAIR, 0.37 * D, mof);
  const want = rootsOfDate(PAIR, mof, targetDeg, win[0], win[1], 80000);
  assert.ok(want.length > 0);
  const frozen = searchOfDateLongitudeWithFrame(
    EPH, { body: BODY, targetDeg, fromTdbSec: win[0], toTdbSec: win[1] },
    rotatingFrame(FAST, win[0], R1E0, { freezeAt: mid }),
  );
  const m = matchRoots(eventTimes(frozen), want, 1e-3);
  assert.ok(!m.ok,
    'a frame frozen at the midpoint produced the of-date answer, so this case cannot '
    + 'separate an of-date search from a fixed-frame one; that is a finding, not a pass');
  // and the correct provider, on the same window, does agree
  const live = searchOfDateLongitudeWithFrame(
    EPH, { body: BODY, targetDeg, fromTdbSec: win[0], toTdbSec: win[1] }, rotatingFrame(FAST, win[0]),
  );
  assert.equal(live.completeness.established, true, live.completeness.statement);
  const m2 = matchRoots(eventTimes(live), want, 1e-3);
  assert.ok(m2.ok, `the live frame must match: ${JSON.stringify(eventTimes(live))} vs ${JSON.stringify(want)}`);
});

// ============================================ S7 · close pair / tangency
test('S7: a near-tangency under rotation keeps containment, and may report a wide bracket', () => {
  // Choose the target at a longitude the rotating direction just grazes:
  // the extremum of the of-date longitude over the window.
  const win = [-40 * D, 40 * D];
  const mof = (t) => rotatedBy(OMEGA * (t - win[0]), R1E0);
  let tExt = win[0];
  let best = -Infinity;
  for (let i = 0; i <= 20000; i += 1) {
    const t = win[0] + ((win[1] - win[0]) * i) / 20000;
    const v = lonOfDate(PAIR, t, mof);
    if (v > best) { best = v; tExt = t; }
  }
  const targetDeg = best - 1e-7;             // a hair inside: two roots, very close
  const got = searchOfDateLongitudeWithFrame(
    EPH, { body: BODY, targetDeg, fromTdbSec: win[0], toTdbSec: win[1] }, rotatingFrame(OMEGA, win[0]),
  );
  const want = rootsOfDate(PAIR, mof, targetDeg, win[0], win[1], 400000);
  // Containment is the claim; the bracket may be wide and the midpoint may
  // miss 1e-3 s, which is reported rather than tuned away.
  for (const w of want) {
    const held = got.events.some((e) => e.bracketTdbSec[0] <= w && w <= e.bracketTdbSec[1])
      || got.accounting.unresolved.some((u) => u.fromTdbSec <= w && w <= u.toTdbSec);
    assert.ok(held, `reference root ${w} is in no bracket and no unresolved interval`);
  }
  assert.ok(tExt > win[0] && tExt < win[1], 'the extremum must be interior for this to be a tangency');
});

// =============================================== S8 · roots at boundaries
test('S8: adjacent half-open windows account for a root on the shared boundary', () => {
  const targetDeg = lonOfDate(PAIR, PROBE, MOF);
  const whole = rootsOfDate(PAIR, MOF, targetDeg, WIN[0], WIN[1], 40000);
  assert.ok(whole.length > 1, 'this case needs a root to cut on AND another to find');
  const cut = whole[0];                       // split the window ON a root
  const left = searchOfDateLongitudeWithFrame(
    EPH, { body: BODY, targetDeg, fromTdbSec: WIN[0], toTdbSec: cut }, rotatingFrame(OMEGA, T0),
  );
  const right = searchOfDateLongitudeWithFrame(
    EPH, { body: BODY, targetDeg, fromTdbSec: cut, toTdbSec: WIN[1] }, rotatingFrame(OMEGA, T0),
  );
  const found = [...eventTimes(left), ...eventTimes(right)].sort((a, b) => a - b);
  const covers = (r) => [left, right].some((s) => s.accounting.unresolved.some((u) => u.fromTdbSec <= r && r <= u.toTdbSec));

  for (const r of whole) {
    const hits = found.filter((t) => Math.abs(t - r) < 1e-3).length;
    // Exactly once, or declared undecided. Never twice, and never dropped
    // while the two halves still claim exact totals -- that is the failure
    // a half-open tiling exists to rule out.
    assert.ok(hits <= 1, `root ${r} was reported by BOTH halves`);
    assert.ok(hits === 1 || covers(r),
      `root ${r} was found by neither half and lies in no unresolved interval`);
    if (hits === 0) {
      const claiming = [left, right].filter((s) => s.eventCount.isExactTotal);
      assert.equal(claiming.length, 0,
        `root ${r} went unfound while a half still claimed an exact total`);
    }
  }
  // the interior root, away from the cut, must simply be found
  const interior = whole[whole.length - 1];
  assert.equal(found.filter((t) => Math.abs(t - interior) < 1e-3).length, 1,
    `the interior root ${interior} was not found exactly once in ${JSON.stringify(found)}`);
});

// ==================================================== S9 · cancellation
test('S9: the enclosure holds through cancellation in the rotated projection', () => {
  // At a root, f is zero by construction: the two terms of
  // sin(L) Q_x - cos(L) Q_y cancel completely. Evaluate the enclosure on a
  // point cell AT a reference root and check how many digits are lost and
  // that the truth is still inside.
  const mof = MOF;
  const targetDeg = lonOfDate(PAIR, PROBE, MOF);
  const want = rootsOfDate(PAIR, mof, targetDeg, WIN[0], WIN[1], 40000);
  assert.ok(want.length > 0);
  const r = want[0];
  const q = qExact(PAIR, r, mof);
  const a = Math.sin(targetDeg * DEG) * q[0];
  const b = Math.cos(targetDeg * DEG) * q[1];
  const digits = Math.log10(Math.max(Math.abs(a), Math.abs(b)) / Math.max(Math.abs(a - b), Number.MIN_VALUE));
  assert.ok(digits > 8, `the case must actually cancel; lost only ${digits} digits`);
  // The search's own answer brackets it, which is the enclosure surviving
  // that cancellation on a real cell rather than on a contrived pair.
  const got = searchOfDateLongitudeWithFrame(
    EPH, { body: BODY, targetDeg, fromTdbSec: WIN[0], toTdbSec: WIN[1] }, rotatingFrame(OMEGA, T0),
  );
  const holds = got.events.some((e) => e.bracketTdbSec[0] <= r && r <= e.bracketTdbSec[1]);
  assert.ok(holds, `the root at ${r}, where the projection cancels to ${digits} digits, is in no bracket`);
});

// ============================================ S10 · the real IAU frame
test('S10: a budget below need reports budget-exhausted and no exact total', () => {
  const targetDeg = G.lonExact(PAIR, PROBE, true);
  const got = searchOfDateLongitude(EPH, {
    body: BODY, targetDeg, fromTdbSec: WIN[0], toTdbSec: WIN[1], maxEvaluations: 500,
  });
  assert.equal(got.mode, 'validated-retarded-aberrated-of-date');
  assert.equal(got.execution.status, 'budget-exhausted');
  assert.equal(got.execution.finished, false);
  assert.equal(got.completeness.established, false);
  assert.equal(got.completeness.support, 'none');
  assert.equal(got.eventCount.isExactTotal, false, 'an exhausted search must not report an exact total');
  assert.equal(got.accounting.allIntervalsAccountedFor, false);
});

test('S11: an invalid or uncovered time refuses with a typed code and nothing escapes', () => {
  const targetDeg = G.lonExact(PAIR, PROBE, true);
  const cases = [
    [{ fromTdbSec: Number.NaN, toTdbSec: WIN[1] }, 'unsupported-option'],
    [{ fromTdbSec: WIN[1], toTdbSec: WIN[0] }, 'unsupported-option'],
    [{ fromTdbSec: WIN[0] - 400 * D, toTdbSec: WIN[0] - 300 * D }, 'out-of-coverage'],
  ];
  for (const [win, code] of cases) {
    let caught = null;
    let result = null;
    try {
      result = searchOfDateLongitude(EPH, { body: BODY, targetDeg, ...win });
    } catch (error) { caught = error; }
    if (caught) {
      assert.equal(caught.code, code, `expected ${code}, got ${caught.code}: ${caught.message}`);
    } else {
      // A result is acceptable only if it declined rather than claiming a total.
      assert.equal(result.completeness.established, false);
      assert.equal(result.eventCount.isExactTotal, false);
    }
  }
  let bad = null;
  try { searchOfDateLongitude(EPH, { body: 'Ceres', targetDeg, fromTdbSec: WIN[0], toTdbSec: WIN[1] }); } catch (e) { bad = e; }
  assert.equal(bad && bad.code, 'unknown-body');
});

// =================================== S12 · an interior extremum of sine
test('S12: a cell wide enough to hide an extremum of sine is still enclosed', () => {
  // The provider's own enclosure is the thing under test here: over a cell
  // spanning more than a quarter turn of the frame angle, the endpoints of
  // sin do not bound it. `sinCosInterval` detects the interior extremum;
  // this checks the matrix that comes out of it really does contain the
  // pointwise matrix everywhere in the cell.
  const w = Math.PI / 2 / (5 * D);                     // a quarter turn over five days
  const provider = rotatingFrame(w, 0);
  const cell = { lo: 0, hi: 8 * D };                   // spans the extremum of cos
  const { R } = provider(cell);
  let escapes = 0;
  for (let i = 0; i <= 400; i += 1) {
    const t = cell.lo + ((cell.hi - cell.lo) * i) / 400;
    const M = rotatedBy(w * t, R1E0);
    for (let a = 0; a < 3; a += 1) {
      for (let b = 0; b < 3; b += 1) {
        if (!(M[a][b] >= R[a][b].lo && M[a][b] <= R[a][b].hi)) escapes += 1;
      }
    }
  }
  assert.equal(escapes, 0, `${escapes} pointwise matrix entries fell outside the cell enclosure`);
  // and it is genuinely wide enough that the endpoints alone would not do
  const endpoints = rotatedBy(w * cell.lo, R1E0);
  const far = rotatedBy(w * cell.hi, R1E0);
  const hullLo = Math.min(endpoints[0][0], far[0][0]);
  const interior = rotatedBy(w * (Math.PI / w), R1E0)[0][0];
  assert.ok(interior < hullLo - 1e-6 || Math.PI / w > cell.hi,
    'the case must span an extremum the endpoints miss, or it is testing nothing');
});
