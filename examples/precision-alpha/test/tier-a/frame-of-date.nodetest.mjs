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
 *
 * The rung this mode actually uses — mean ecliptic, TRUE equinox — has no
 * published matrix, because ERFA ships none. The second section reaches it
 * anyway, through an exact identity to the published mean-equinox matrix,
 * and says in as many words which part of it that still leaves unchecked.
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

// ================================ the true-equinox rung, assembled another way
/*
 * The rung with no published matrix, reached by a route that shares no
 * code with the one under test.
 *
 * ERFA ships no true-equinox ecliptic matrix, so the test above can only
 * say the two rungs differ by roughly the right amount. That is a weak
 * statement: a construction that leaked the obliquity, or tilted the
 * ecliptic pole, or applied the nutation as a rotation about the wrong
 * axis, would still land somewhere between 1 and 20 arcsec.
 *
 * There IS an exact relation to test. The true equinox is the mean
 * equinox displaced ALONG THE MEAN ECLIPTIC by the nutation in longitude
 * -- that is what the nutation in longitude is. Both frames therefore
 * share the ecliptic pole, and one is the other turned about it:
 *
 *     Frame_true(t) = R3(-dpsi(t)) . Frame_mean(t)
 *
 * The implementation does not do that. It folds `dpsi` into the
 * Fukushima-Williams `psi` angle and builds one matrix from three
 * rotations, `R3(-psi) R1(phib) R3(gamb)`.
 *
 * ## What this establishes, and what it does not
 *
 * Establishes, precisely: that **`dpsi` enters `psi` additively and enters
 * nothing else**. An obliquity leak, a tilted pole, a rotation about the
 * wrong axis, a sign, or `dpsi` reaching `gamb` instead all move one of
 * the two residuals below. And at ERFA's own test epoch the mean side of
 * the identity is the PUBLISHED `t_ecm06` matrix, so the true-equinox
 * matrix there follows from nine published literals, one scalar and one
 * elementary rotation -- an assembly that shares no code with the
 * Fukushima-Williams chain, though it does share that chain's `dpsi`.
 *
 * It is NOT an independent route in the strong sense. `meanToTrue` builds
 * both of its matrices with `frameMatrixInterval`, so `true . mean^T =
 * R3(-dpsi)` is an algebraic identity of the one line `psi = psib +
 * dpsi`. That line is worth pinning -- it is where every structural way of
 * getting this rung wrong would show -- but a reader should not take
 * "identity" for "second implementation".
 *
 * Does NOT establish: the nutation MODEL. `dpsi` is this repository's
 * 2000B-with-P03 value on both sides of the identity, so a wrong `dpsi`
 * is invisible here -- it would move the frame and the reference by the
 * same amount. Measured rather than assumed: removing the P03 adjustment
 * from the implementation leaves BOTH identity tests passing, and is
 * caught only by the separate test below that reads the adjusted and raw
 * values apart. An earlier version of this comment listed "a missing P03
 * factor" among the things the residuals catch, twelve lines above the
 * sentence saying they do not.
 *
 * The mean rung has no such blind spot: one published matrix pins its
 * model and its assembly together. Here they are pinned by two different
 * tests -- `t_nut00b` above for the raw 2000B series against ERFA's own
 * published vector, and this identity for the assembly -- and two tests
 * covering two things is not the same as one test covering both.
 * **The two rungs are still not equally checked, and nothing here should
 * be read as saying they are.** What has changed is that the true rung is
 * now checked against an exact identity rather than an order of
 * magnitude.
 */

/** The transformation carrying the mean-equinox frame to the true-equinox one. */
function meanToTrue(t) {
  const mean = FD.frameMatrixInterval(pt(t), { nutation: false }).R.map((r) => r.map(mid));
  const tru = FD.frameMatrixInterval(pt(t), { nutation: true }).R.map((r) => r.map(mid));
  // true . mean^T
  const M = [0, 1, 2].map((i) => [0, 1, 2].map((j) => tru[i][0] * mean[j][0] + tru[i][1] * mean[j][1] + tru[i][2] * mean[j][2]));
  return { mean, tru, M };
}

/** Nine epochs spanning 1850 to 2150, so this is not a statement about J2000. */
const TRUE_EQUINOX_EPOCHS = [-1.5, -1, -0.5, -0.13, 0, 0.13, 0.5, 1, 1.5];

test('the true-equinox frame is the mean-equinox one turned about the ECLIPTIC POLE', () => {
  // A rotation about the ecliptic pole leaves the third row and column
  // alone. This is what fails if the obliquity leaks into the projection,
  // if `deps` reaches the ecliptic frame, or if the nutation is applied
  // about the equatorial pole instead.
  for (const t of TRUE_EQUINOX_EPOCHS) {
    const { M } = meanToTrue(t);
    const off = Math.max(
      Math.abs(M[0][2]), Math.abs(M[1][2]), Math.abs(M[2][0]), Math.abs(M[2][1]), Math.abs(M[2][2] - 1),
    );
    assert.ok(off <= 1e-15, `at t=${t} the mean-to-true transformation is not a rotation about the ecliptic pole: ${off}`);
  }
});

test('and it turns by exactly the nutation in longitude, P03 adjustment included', () => {
  // Measured: worst 1.3e-12 arcsec over these nine epochs, which is
  // 0.03 of an eps radian. The tolerance is an order above the worst, not
  // fitted to it.
  let worst = 0;
  for (const t of TRUE_EQUINOX_EPOCHS) {
    const { M } = meanToTrue(t);
    const theta = Math.atan2(M[0][1], M[0][0]) / DAS2R;
    const dpsi = mid(FD.frameAnglesInterval(pt(t), { nutation: true }).dpsi);
    // R3(-dpsi): the turn is the NEGATIVE of the nutation in longitude.
    worst = Math.max(worst, Math.abs(theta + dpsi));
  }
  assert.ok(worst <= 1e-11, `the mean-to-true turn differs from -dpsi by ${worst} arcsec`);
});

test('the P03 factor is checked separately, because the identity cannot see it', () => {
  // The identity above is blind to a dpsi that is consistently wrong, and
  // the P03 factor is exactly such a thing: removing it from the
  // implementation leaves that test passing. So the factor is checked
  // here instead, directly, by reading the adjusted and raw values apart.
  //
  // This does not make the identity sensitive to dpsi. It covers the one
  // part of dpsi that `t_nut00b` cannot, because `t_nut00b` pins the RAW
  // 2000B series and the P03 adjustment is applied after it. Measured:
  // the factor moves dpsi by up to 6.0e-5 arcsec over these epochs, which
  // is ten million times the identity's own tolerance -- so if it were
  // ever folded into the identity, it would be visible there too.
  let widest = 0;
  for (const t of TRUE_EQUINOX_EPOCHS) {
    const adjusted = mid(FD.frameAnglesInterval(pt(t), { nutation: true }).dpsi);
    const raw = mid(FD.nut00bInterval(pt(t)).dpsi);
    widest = Math.max(widest, Math.abs(adjusted - raw));
  }
  assert.ok(widest > 1e-5, `the P03 adjustment moves dpsi by at most ${widest} arcsec, which the identity could not resolve`);
  assert.ok(widest < 1e-3, `the P03 adjustment moves dpsi by ${widest} arcsec, which is far more than the 0.47 ppm it should`);
});

test('so at ERFA\'s test epoch the TRUE-equinox matrix follows from the PUBLISHED one', () => {
  // The one place this reaches something external. The mean side is
  // `t_ecm06`, copied from ERFA's regression suite above; turning it by
  // -dpsi about the ecliptic pole must give the matrix this mode uses.
  // The ASSEMBLY here is independent -- nine literals, one scalar, one
  // hand-written rotation, no `frameMatrixInterval` on the reference side
  // -- but `dpsi` is still the implementation's, so this inherits the
  // blindness described in the block comment above.
  //
  // The published literals carry ~19 significant figures and the identity
  // holds to 1e-12 arcsec, so the tolerance here is the published
  // matrix's own 1e-14, not a looser one chosen to make it pass.
  const t = centuriesTT(2456165.5, 0.401182685);
  const published = [
    [0.9999952427708701137, -0.2829062057663042347e-2, -0.1229163741100017629e-2],
    [0.3084546876908653562e-2, 0.9174891871550392514, 0.3977487611849338124],
    [0.2488512951527405928e-5, -0.3977506604161195467, 0.9174935488232863071],
  ];
  const dpsi = mid(FD.frameAnglesInterval(pt(t), { nutation: true }).dpsi) * DAS2R;
  const c = Math.cos(dpsi);
  const sn = Math.sin(dpsi);
  // R3(-dpsi) . published, written out rather than run through the
  // module's own rotation helpers -- a reference that borrowed them would
  // be checking the implementation against itself.
  const want = [
    [c * published[0][0] - sn * published[1][0], c * published[0][1] - sn * published[1][1], c * published[0][2] - sn * published[1][2]],
    [sn * published[0][0] + c * published[1][0], sn * published[0][1] + c * published[1][1], sn * published[0][2] + c * published[1][2]],
    [published[2][0], published[2][1], published[2][2]],
  ];
  const { R } = FD.frameMatrixInterval(pt(t), { nutation: true });
  for (let i = 0; i < 3; i += 1) {
    for (let j = 0; j < 3; j += 1) {
      assert.ok(Math.abs(mid(R[i][j]) - want[i][j]) <= 1e-14,
        `true-equinox rm[${i}][${j}] ${mid(R[i][j])} vs published-plus-rotation ${want[i][j]}`);
      assert.ok(want[i][j] >= R[i][j].lo && want[i][j] <= R[i][j].hi,
        `the assembled rm[${i}][${j}] is outside the interval enclosure`);
    }
  }
});

test('the assembled reference would catch the sign, which is the easiest thing to get wrong', () => {
  // R3(+dpsi) instead of R3(-dpsi) is one character, and at these
  // magnitudes it is a 2 x 17 arcsec error rather than a wrong-looking
  // matrix. Assert that the wrong sign does NOT pass, so the test above
  // is known to have a side.
  const t = centuriesTT(2456165.5, 0.401182685);
  const dpsi = mid(FD.frameAnglesInterval(pt(t), { nutation: true }).dpsi) * DAS2R;
  const { R } = FD.frameMatrixInterval(pt(t), { nutation: true });
  const mean = FD.frameMatrixInterval(pt(t), { nutation: false }).R.map((r) => r.map(mid));
  const c = Math.cos(-dpsi);
  const sn = Math.sin(-dpsi);
  const wrong = [
    [c * mean[0][0] - sn * mean[1][0], c * mean[0][1] - sn * mean[1][1], c * mean[0][2] - sn * mean[1][2]],
    [sn * mean[0][0] + c * mean[1][0], sn * mean[0][1] + c * mean[1][1], sn * mean[0][2] + c * mean[1][2]],
    [mean[2][0], mean[2][1], mean[2][2]],
  ];
  let worst = 0;
  for (let i = 0; i < 3; i += 1) {
    for (let j = 0; j < 3; j += 1) worst = Math.max(worst, Math.abs(mid(R[i][j]) - wrong[i][j]));
  }
  assert.ok(worst > 1e-9, `the wrong sign is only ${worst} from the right one, so the identity does not pin it`);
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
  // OF-DATE-PREREGISTRATION.md section 7 declares 1e-15 for this, and
  // section 7's whole premise is that its figures are inherited rather
  // than re-chosen. The assertion used to be `< ABS_ERR` (4e-15), which
  // is four times looser than what was declared -- nothing turned on it,
  // the measured worst is 2.2e-16, but the declared number is the one to
  // enforce.
  assert.ok(worst < 1e-15,
    `worst element difference ${worst} exceeds the 1e-15 section 7 declares (the trig allowance alone is ${ABS_ERR})`);
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
  // Four widths, 25 centres, 41 samples each: 4,100 pointwise matrices,
  // 36,900 element checks. The widths span three orders so the interval
  // sine's extremum handling is exercised at the wide end and its
  // roundoff at the narrow one. An earlier commit message quoted "4 cell
  // widths, 10,400 samples" for a probe that was never committed; these
  // are the numbers of the test that is here.
  let samples = 0;
  for (const widthDays of [0.01, 1, 8, 64]) {
    const w = widthDays / 36525;
    for (let k = 0; k < 25; k += 1) {
      const c = -1.2 + (2.4 * k) / 25;
      const cell = { lo: c - w / 2, hi: c + w / 2 };
      const { R } = FD.frameMatrixInterval(cell);
      for (let i = 0; i < 3; i += 1) for (let j = 0; j < 3; j += 1) widest = Math.max(widest, R[i][j].hi - R[i][j].lo);
      for (let s = 0; s <= 40; s += 1) {
        const t = cell.lo + ((cell.hi - cell.lo) * s) / 40;
        samples += 1;
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
  assert.equal(samples, 4 * 25 * 41, 'the sample count the header quotes must be the sample count it runs');
});

test('pfw06 and the mean obliquity read the exported tables and are unchanged by it', () => {
  // The interval chain reads PFW06_COEFFICIENTS and OBL06_COEFFICIENTS so
  // that it evaluates the same numbers the released reducer's polynomials
  // are written from, rather than a transcribed copy. That is only worth
  // anything if the two really are the same numbers, so the tables are
  // evaluated by plain Horner here and compared with the released
  // functions BIT FOR BIT, over the whole supported range.
  //
  // A commit message once claimed this at 20,001 points for a probe that
  // was never committed. This is that check, committed.
  const horner = (c, t) => { let v = 0; for (let i = c.length - 1; i >= 0; i -= 1) v = v * t + c[i]; return v; };
  // Not `N`: that is the nutation module in this file's imports, and
  // shadowing it here made `N.OBL06_COEFFICIENTS` undefined.
  const POINTS = 20000;
  let checked = 0;
  for (let i = 0; i <= POINTS; i += 1) {
    const t = -2 + (4 * i) / POINTS;                  // 1800 to 2200
    const a = F.pfw06(t);
    assert.equal(horner(F.PFW06_COEFFICIENTS.gamb, t) * DAS2R, a.gamb, `gamb at t=${t}`);
    assert.equal(horner(F.PFW06_COEFFICIENTS.phib, t) * DAS2R, a.phib, `phib at t=${t}`);
    assert.equal(horner(F.PFW06_COEFFICIENTS.psib, t) * DAS2R, a.psib, `psib at t=${t}`);
    assert.equal(horner(N.OBL06_COEFFICIENTS, t), N.meanObliquityArcsec(t), `obl06 at t=${t}`);
    checked += 1;
  }
  assert.equal(checked, POINTS + 1);
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
