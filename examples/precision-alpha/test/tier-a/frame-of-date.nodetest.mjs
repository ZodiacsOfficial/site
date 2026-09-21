/**
 * The date-dependent frame, against PUBLISHED values and against the
 * released chain it has to agree with.
 *
 * Every expected number in the first section is copied from ERFA's own
 * regression suite, `src/t_erfa_c.c` at v2.0.1 (tagged 2023-10-13,
 * equivalent to SOFA Issue 2023-10-11). ERFA's
 * `vvd` comparator uses an ABSOLUTE tolerance, and the tolerances below
 * are the ones ERFA itself declares for each value.
 *
 * Round trips and orthogonality are in here too, and they are NOT the
 * point: a consistently wrong rotation passes both. The published vectors
 * are what make this a check against something external.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../../src/core/frames.mjs';
import * as N from '../../src/core/nutation.mjs';
import * as FD from '../../src/core/frame-of-date.mjs';
import * as I from '../../src/core/interval.mjs';
import { sinCos, sinCosInterval, ABS_ERR, MAX_ARG } from '../../src/core/trig.mjs';

const DAS2R = Math.PI / (180 * 3600);
const pt = (x) => I.iv(x);
const mid = (a) => (a.lo + a.hi) / 2;
/** ERFA hands its routines a two-part TT Julian date; this package uses centuries. */
const centuriesTT = (jd1, jd2) => ((jd1 - 2451545.0) + jd2) / 36525;

// ============================================ published ERFA/SOFA vectors
test('ERFA t_pfw06: the Fukushima-Williams bias-precession angles', () => {
  const t = centuriesTT(2400000.5, 50123.9999);
  const a = F.pfw06(t);
  assert.ok(Math.abs(a.gamb - -0.2243387670997995690e-5) <= 1e-16, `gamb ${a.gamb}`);
  assert.ok(Math.abs(a.phib - 0.4091014602391312808) <= 1e-12, `phib ${a.phib}`);
  assert.ok(Math.abs(a.psib - -0.9501954178013031895e-3) <= 1e-14, `psib ${a.psib}`);
  assert.ok(Math.abs(a.epsa - 0.4091014316587367491) <= 1e-12, `epsa ${a.epsa}`);
});

test('ERFA t_obl06: the IAU 2006 mean obliquity', () => {
  const got = N.meanObliquityArcsec(centuriesTT(2400000.5, 54388.0)) * DAS2R;
  assert.ok(Math.abs(got - 0.4090749229387258204) <= 1e-14, `obl06 ${got}`);
  // And NOT eraObl80, which differs by 0.042 arcsec at J2000 and is the
  // obliquity that pairs with IAU 1980, not with IAU 2006.
  assert.ok(Math.abs(got - 0.4090751347643816218) > 1e-9, 'this is obl06, not obl80');
});

test('ERFA t_nut00b: IAU 2000B nutation, raw, with the planetary-bias offsets', () => {
  // ERFA's nut00b does NOT carry the P03 adjustment -- that is nut06a --
  // so the comparison is against this package's `nut00b`, before
  // `adjustToP03`. Comparing the adjusted value here would be comparing
  // two different models and calling the difference an error.
  const t = centuriesTT(2400000.5, 53736.0);
  const n = N.nut00b(t);
  assert.ok(Math.abs(n.dpsi * DAS2R - -0.9632552291148362783e-5) <= 1e-13, `dpsi ${n.dpsi}`);
  assert.ok(Math.abs(n.deps * DAS2R - 0.4063197106621159367e-4) <= 1e-13, `deps ${n.deps}`);

  // the interval evaluation of the same model, at the same date
  const iv = FD.nut00bInterval(pt(t));
  assert.ok(Math.abs(mid(iv.dpsi) * DAS2R - -0.9632552291148362783e-5) <= 1e-13);
  assert.ok(Math.abs(mid(iv.deps) * DAS2R - 0.4063197106621159367e-4) <= 1e-13);
  assert.ok(iv.dpsi.lo <= n.dpsi && n.dpsi <= iv.dpsi.hi, 'the released value must be inside the enclosure');
  assert.ok(iv.deps.lo <= n.deps && n.deps <= iv.deps.hi);

  // The published 2000A value at the SAME date, as the scale of the model
  // difference. 2000B against a 2000A reference differs by a MODEL.
  const dpsi2000a = -0.9630909107115518431e-5;
  const gap = Math.abs(n.dpsi * DAS2R - dpsi2000a) / DAS2R;
  assert.ok(gap > 3e-5 && gap < 5e-4,
    `2000B-minus-2000A in dpsi is ${gap} arcsec at this date; if it were zero the models would be the same one`);
});

test('ERFA t_pmat06: the bias-precession matrix is fw2m with no nutation', () => {
  const t = centuriesTT(2400000.5, 50123.9999);
  const a = F.pfw06(t);
  const m = F.fw2m(a.gamb, a.phib, a.psib, a.epsa);
  const want = [
    [0.9999995505176007047, 0.8695404617348208406e-3, 0.3779735201865589104e-3],
    [-0.8695404723772031414e-3, 0.9999996219496027161, -0.1361752497080270143e-6],
    [-0.3779734957034089490e-3, -0.1924880847894457113e-6, 0.9999999285679971958],
  ];
  const tol = [[1e-12, 1e-14, 1e-14], [1e-14, 1e-12, 1e-14], [1e-14, 1e-14, 1e-12]];
  for (let i = 0; i < 3; i += 1) {
    for (let j = 0; j < 3; j += 1) {
      assert.ok(Math.abs(m[i][j] - want[i][j]) <= tol[i][j], `rbp[${i}][${j}] ${m[i][j]} vs ${want[i][j]}`);
    }
  }
});

test('ERFA t_ecm06: the mean-of-date rung IS the published ICRS-to-ecliptic matrix', () => {
  // eraEcm06 is `R1(eraObl06) . eraPmat06` -- the MEAN ecliptic and the
  // MEAN equinox of date. By the obliquity cancellation that is exactly
  // `R3(-psib) R1(phib) R3(gamb)`, which is this module's mean rung. So a
  // published 3x3 matrix checks the whole chain at once, and it is the
  // strongest external check available for this frame.
  const t = centuriesTT(2456165.5, 0.401182685);
  const { R } = FD.frameMatrixInterval(pt(t), { nutation: false });
  const want = [
    [0.9999952427708701137, -0.2829062057663042347e-2, -0.1229163741100017629e-2],
    [0.3084546876908653562e-2, 0.9174891871550392514, 0.3977487611849338124],
    [0.2488512951527405928e-5, -0.3977506604161195467, 0.9174935488232863071],
  ];
  for (let i = 0; i < 3; i += 1) {
    for (let j = 0; j < 3; j += 1) {
      assert.ok(Math.abs(mid(R[i][j]) - want[i][j]) <= 1e-14, `rm[${i}][${j}] ${mid(R[i][j])} vs ${want[i][j]}`);
      assert.ok(want[i][j] >= R[i][j].lo && want[i][j] <= R[i][j].hi,
        `the published rm[${i}][${j}] is outside the interval enclosure`);
    }
  }
});

test('ERFA ships no TRUE-equinox ecliptic matrix, so the third rung is not eraEcm06', () => {
  // The frame this package's of-date mode uses adds the nutation in
  // LONGITUDE, which moves the origin from the mean equinox to the true
  // one. ERFA has no routine for that -- eraEcm06, eraEqec06 and
  // eraEceq06 are all mean-equinox -- so the rung is validated by
  // construction and against the released reducer, not against a
  // published matrix. The difference between the two rungs is the thing
  // that would be invisible if they were confused, so its SIZE is
  // asserted: seventeen arcseconds, not twenty-five milliarcseconds.
  const t = centuriesTT(2456165.5, 0.401182685);
  const meanR = FD.frameMatrixInterval(pt(t), { nutation: false }).R.map((r) => r.map(mid));
  const trueR = FD.frameMatrixInterval(pt(t), { nutation: true }).R.map((r) => r.map(mid));
  const v = [0.3, -0.8, 0.52];
  const lon = (m) => {
    const w = [0, 1, 2].map((i) => m[i][0] * v[0] + m[i][1] * v[1] + m[i][2] * v[2]);
    return Math.atan2(w[1], w[0]);
  };
  const gapArcsec = Math.abs(lon(trueR) - lon(meanR)) / DAS2R;
  assert.ok(gapArcsec > 1 && gapArcsec < 20,
    `mean and true equinox differ by ${gapArcsec} arcsec; nutation in longitude is up to about 17`);
  assert.ok(gapArcsec > 0.025, 'this is nutation, not the 25 mas frame bias');
});

// ================================================ against the released chain
test('the frame matrix reproduces the released reducer chain', () => {
  const R1 = (a) => { const s = Math.sin(a); const c = Math.cos(a); return [[1, 0, 0], [0, c, s], [0, -s, c]]; };
  let worst = 0;
  for (let k = 0; k <= 30; k += 1) {
    const t = -1.5 + (3 * k) / 30;
    const { matrix, epsTrue } = F.npbMatrix(t, { nutation: '2000b', bias: true });
    const released = F.mul(R1(epsTrue), matrix);
    const { R } = FD.frameMatrixInterval(pt(t));
    for (let i = 0; i < 3; i += 1) {
      for (let j = 0; j < 3; j += 1) {
        worst = Math.max(worst, Math.abs(mid(R[i][j]) - released[i][j]));
        assert.ok(released[i][j] >= R[i][j].lo && released[i][j] <= R[i][j].hi,
          `t=${t}: the released chain's [${i}][${j}] is outside the enclosure`);
      }
    }
  }
  // Two independent evaluations of one model: this module's validated
  // trigonometry, and the released module's Math.sin. Agreement at this
  // level is a cross-check, not a tautology.
  assert.ok(worst < ABS_ERR, `worst element difference ${worst} exceeds the trig allowance ${ABS_ERR}`);
});

test('the obliquity cancels out of the ecliptic projection, and deps never enters it', () => {
  const t = 0.19;
  const { R } = FD.frameMatrixInterval(pt(t));
  const R3 = (a) => { const s = Math.sin(a); const c = Math.cos(a); return [[c, s, 0], [-s, c, 0], [0, 0, 1]]; };
  const R1 = (a) => { const s = Math.sin(a); const c = Math.cos(a); return [[1, 0, 0], [0, c, s], [0, -s, c]]; };
  const { gamb, phib, psib } = F.pfw06(t);
  const nut = N.adjustToP03(N.nut00b(t), t);
  const claim = F.mul(R3(-(psib + nut.dpsi * DAS2R)), F.mul(R1(phib), R3(gamb)));
  for (let i = 0; i < 3; i += 1) {
    for (let j = 0; j < 3; j += 1) {
      assert.ok(Math.abs(mid(R[i][j]) - claim[i][j]) < ABS_ERR,
        `[${i}][${j}]: the projection is not R3(-psi) R1(phib) R3(gamb)`);
    }
  }
  // deps is a real, large quantity here -- so the claim that it does not
  // enter is a claim about the construction, not about it being small.
  assert.ok(Math.abs(nut.deps) > 1, `deps is ${nut.deps} arcsec, too small for this case to mean anything`);
});

test('the frame is NOT the identity at J2000', () => {
  // Frame bias and nutation do not vanish because the precession epoch
  // does. A test suite that assumed they did would pass on a chain with
  // the bias silently dropped.
  const { R, angles } = FD.frameMatrixInterval(pt(0));
  const off = Math.abs(mid(R[0][1]));
  assert.ok(off > 1e-5, `the largest off-diagonal element at J2000 is ${off}; the frame looks like the identity`);
  assert.ok(Math.abs(mid(angles.dpsi)) > 10, `dpsi at J2000 is ${mid(angles.dpsi)} arcsec, expected about -13.9`);
  assert.ok(Math.abs(mid(angles.gamb) / DAS2R + 0.052928) < 1e-6, 'gamb at J2000 is the bias term');
});

test('orthogonality and determinant hold, which proves less than it looks', () => {
  for (let k = 0; k <= 12; k += 1) {
    const t = -1.5 + (3 * k) / 12;
    const m = FD.frameMatrixInterval(pt(t)).R.map((r) => r.map(mid));
    for (let i = 0; i < 3; i += 1) {
      for (let j = 0; j < 3; j += 1) {
        const dot = m[i][0] * m[j][0] + m[i][1] * m[j][1] + m[i][2] * m[j][2];
        assert.ok(Math.abs(dot - (i === j ? 1 : 0)) < 1e-14, `R R^T is not I at t=${t}`);
      }
    }
    const det = m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1])
      - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
      + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
    assert.ok(Math.abs(det - 1) < 1e-14, `det is ${det} at t=${t}`);
  }
});

// ============================================================== derivative
test('Rdot is the derivative of R, checked at a step that resolves the fastest term', () => {
  // The fastest IAU 2000B argument has a period of 5.49 days. An 8th-order
  // stencil with h = 3.65 days does not resolve it and reports an 82 per
  // cent error against a perfectly correct derivative -- measured, before
  // this comment existed. The step below is two orders finer.
  const h = 1e-6;                              // centuries; 0.037 days
  const Rat = (t) => FD.frameMatrixInterval(pt(t)).R.map((r) => r.map(mid));
  const stencil = [[-4, 1 / 280], [-3, -4 / 105], [-2, 1 / 5], [-1, -4 / 5], [1, 4 / 5], [2, -1 / 5], [3, 4 / 105], [4, -1 / 280]];
  let worst = 0;
  let scale = 0;
  for (let k = 0; k <= 8; k += 1) {
    const t = -1.5 + (3 * k) / 8;
    const fd = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (const [n, w] of stencil) {
      const M = Rat(t + n * h);
      for (let i = 0; i < 3; i += 1) for (let j = 0; j < 3; j += 1) fd[i][j] += (w * M[i][j]) / h;
    }
    const { Rdot } = FD.frameMatrixInterval(pt(t));
    for (let i = 0; i < 3; i += 1) {
      for (let j = 0; j < 3; j += 1) {
        worst = Math.max(worst, Math.abs(mid(Rdot[i][j]) - fd[i][j]));
        scale = Math.max(scale, Math.abs(fd[i][j]));
      }
    }
  }
  assert.ok(scale > 1e-3, `the derivative is only ${scale} per century, too small for this case to discriminate`);
  assert.ok(worst / scale < 1e-7, `Rdot differs from the finite difference by ${worst / scale} relative`);
});

test('the interval frame encloses the frame across the whole cell', () => {
  let widest = 0;
  for (const widthDays of [0.01, 1, 8]) {
    const w = widthDays / 36525;
    for (let k = 0; k < 12; k += 1) {
      const c = -1.2 + (2.4 * k) / 12;
      const cell = { lo: c - w / 2, hi: c + w / 2 };
      const { R } = FD.frameMatrixInterval(cell);
      for (let i = 0; i < 3; i += 1) for (let j = 0; j < 3; j += 1) widest = Math.max(widest, R[i][j].hi - R[i][j].lo);
      for (let s = 0; s <= 20; s += 1) {
        const t = cell.lo + ((cell.hi - cell.lo) * s) / 20;
        const M = FD.frameMatrixInterval(pt(t)).R.map((r) => r.map(mid));
        for (let i = 0; i < 3; i += 1) {
          for (let j = 0; j < 3; j += 1) {
            assert.ok(M[i][j] >= R[i][j].lo && M[i][j] <= R[i][j].hi,
              `width ${widthDays} d at t=${t}: element [${i}][${j}] escaped its enclosure`);
          }
        }
      }
    }
  }
  assert.ok(widest > 1e-9, 'the enclosures are suspiciously tight; this case may not be exercising width at all');
});

// =============================================================== time scale
test('the time model converts TDB to TT and says what it costs', () => {
  const { tdbMinusTt } = FD;
  assert.equal(typeof FD.TIME_MODEL.statedModelErrorSec, 'number');
  assert.ok(FD.TIME_MODEL.statedModelErrorSec > 0);
  const z = FD.ttCenturiesInterval(pt(0));
  const perSecond = 1 / (36525 * 86400);
  // dt/d(TDB s) is NOT exactly 1/(36525*86400): the TDB-TT rate shifts it.
  assert.ok(Math.abs(mid(z.dtdTdb) - perSecond) / perSecond < 1e-8);
  assert.notEqual(mid(z.dtdTdb), perSecond);
});

test('the validated trigonometry refuses an argument it cannot bound', () => {
  assert.throws(() => sinCos(MAX_ARG + 1), (e) => e.code === 'unsupported-option');
  assert.throws(() => sinCosInterval({ lo: 0, hi: MAX_ARG + 1 }), (e) => e.code === 'unsupported-option');
});

test('the interval sine contains an interior extremum the endpoints miss', () => {
  const HALF_PI = Math.PI / 2;
  for (const w of [0.2, 0.02, 1e-6]) {
    const iv = sinCosInterval({ lo: HALF_PI - w / 2, hi: HALF_PI + w / 2 });
    const ends = [sinCos(HALF_PI - w / 2).s, sinCos(HALF_PI + w / 2).s];
    assert.ok(iv.s.hi >= 1, `width ${w}: the enclosure tops out at ${iv.s.hi}, below the true maximum`);
    assert.ok(Math.max(...ends) < 1, `width ${w}: the endpoints already reach 1, so this case tests nothing`);
  }
});
