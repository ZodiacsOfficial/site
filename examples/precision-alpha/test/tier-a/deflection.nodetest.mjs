/**
 * The pointwise solar deflection, against ERFA's own arithmetic.
 *
 * `_erfa-ld-vectors.json` is not a transliteration of `eraLd`: it is the
 * output of the PINNED `ld.c`, its body extracted verbatim, compiled with
 * gcc and run. `tools/measure/erfa-deflection/make-vectors.mjs` regenerates
 * it, and the fixture carries the digests of both C files so a drifting
 * reference is visible rather than silent.
 *
 * The comparison is committed rather than compiled in CI because CI has no
 * compiler step and should not grow one for this.
 *
 * What a match against ERFA does and does not establish: it settles that
 * this implements the same FIRST-ORDER model. It says nothing about the
 * model's own accuracy -- an independent ray integration puts `eraLd`'s
 * omitted second-order term at 2.08e-3 arcsec at 0.3 degrees of elongation
 * (see `DEFLECTION-PROFILE.md` section 0), which is larger than every
 * implementation difference measured here.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as I from '../../src/core/interval.mjs';
import {
  deflect, deflectInterval, deflectionDomain, deflectionAngle, deflectionAngleOf,
  deflectionAngleClosedForm,
  deflectionLimit, SRS, AU_KM, SOLAR_RADIUS_KM, MIN_ELONGATION_RAD, DEFLECTION_PROFILE,
} from '../../src/core/deflection.mjs';

const FIX = JSON.parse(readFileSync(new URL('./_erfa-ld-vectors.json', import.meta.url), 'utf8'));
const AS = (180 * 3600) / Math.PI;
const DEG = Math.PI / 180;
const norm = (a) => Math.hypot(a[0], a[1], a[2]);
const unit = (a) => { const n = norm(a); return [a[0] / n, a[1] / n, a[2] / n]; };
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// ========================================== against ERFA's own arithmetic
test('the fixture is ERFA 2.0.1 / SOFA 2023-10-11, by digest', () => {
  assert.equal(FIX.erfa.version, '2.0.1');
  assert.equal(FIX.erfa.sofa, '2023-10-11');
  assert.equal(FIX.sources['ld.c'],
    'affa41a6028f8f2ec23978c6b707771ab654438c2bdb9fcd4a1c4b1a42dad06a');
  assert.equal(FIX.constants.SRS, SRS);
  assert.ok(FIX.count >= 358, `only ${FIX.count} vectors`);
  // The families matter more than the count: each was added because
  // something was otherwise untested. Removing one silently would leave a
  // passing suite with a hole in it.
  const has = (f) => FIX.vectors.some(f);
  assert.ok(has((v) => v.tilt !== 0), 'no case takes d out of the e-q plane');
  assert.ok(has((v) => v.observerAu !== 1), 'every case puts the observer at 1 au');
  assert.ok(has((v) => v.dlim !== 1e-6), 'dlim never leaves the max(em^2, 1) constant branch');
  assert.ok(has((v) => v.axis === 'antipodal') && has((v) => v.axis === 'aligned'),
    'the on-axis cases are missing');
  assert.ok(has((v) => v.thresholdFactor !== null && v.thresholdFactor < 1)
    && has((v) => v.thresholdFactor !== null && v.thresholdFactor > 1),
    'the limiter threshold is not straddled');
});

test('deflect reproduces the compiled eraLd bit for bit on every fixture case', () => {
  // Bit for bit, not to a tolerance. ERFA leaves normalisation to its
  // caller, so the norm routine is part of THIS module's contract rather
  // than the reference's, and it is observable: generating the fixture
  // with `Math.hypot` instead of `sqrt` of the sum of squares put 14 of
  // 792 components up to 4 ulp away. Both sides now use `sqrt`, which the
  // core requires anyway (see the note in `frames.mjs`), and the
  // comparison is exact -- so it tests the transformation rather than two
  // normalisers.
  let exact = 0;
  let total = 0;
  const off = [];
  for (const v of FIX.vectors) {
    // `enforceDomain: false`: the MODEL is defined everywhere the fixture
    // covers. Whether this profile SUPPORTS a geometry is a separate
    // question, tested below. Conflating the two would make the comparison
    // silently skip every near-Sun case, which is where it matters most.
    const got = deflect(v.d, v.eVec, v.qVec, { enforceDomain: false });
    for (let i = 0; i < 3; i += 1) {
      total += 1;
      if (got.D[i] === v.p1[i]) exact += 1;
      else if (off.length < 5) {
        off.push(`elongation ${v.elongationDeg} deg, source ${v.sourceAu} au,`
          + ` near=${v.near}, tilt=${v.tilt}, component ${i}: ${got.D[i]} vs ${v.p1[i]}`);
      }
    }
  }
  assert.equal(total, FIX.count * 3, `${total} components for ${FIX.count} cases`);
  assert.equal(exact, total, `${total - exact} of ${total} components differ:\n  ${off.join('\n  ')}`);
});

// ============================ the property everything downstream rests on
test('eraLd is linear in d: a positive rescaling cannot move a root', () => {
  // This is why the validated search can hand the deflection its
  // deliberately unnormalised vector without reintroducing an interval
  // division. If this fails, the search's enclosure argument fails with it.
  //
  //     D = d + w (d x (e x q)) = (I - w [e x q]_x) d
  //
  // and w, e, q, em, dlim do not involve d at all, so the map is linear in
  // d. The three claims below are DIFFERENT strengths and are asserted
  // separately rather than as one loose tolerance.
  const v = FIX.vectors.find((x) => x.elongationDeg === 10 && x.sourceAu === 5.2
    && !x.near && x.tilt === 0.7);
  assert.ok(v, 'the reference geometry is missing from the fixture');
  // A tilted case on purpose: with tilt 0 the z components are all exactly
  // zero and an exactness claim about them is vacuous.
  assert.ok(v.d.every((x) => x !== 0), 'the reference d must have no zero component');
  const base = deflect(v.d, v.eVec, v.qVec, { enforceDomain: false }).D;

  // (1) EXACT, for a power of two. Scaling by 2^n only shifts exponents, so
  // every product and sum in the chain scales with it and nothing rounds
  // differently. Checked over 200 binades, which is most of the range a
  // double has.
  for (const k of [2 ** -100, 2 ** -60, 0.5, 2, 2 ** 20, 2 ** 100]) {
    const scaled = deflect(v.d.map((x) => x * k), v.eVec, v.qVec, { enforceDomain: false }).D;
    for (let i = 0; i < 3; i += 1) {
      // `===` and not assert.equal: the latter is Object.is, which
      // separates -0 from 0, and a sign of zero is not part of the claim.
      assert.ok(scaled[i] === base[i] * k,
        `k=${k} component ${i}: ${scaled[i]} is not exactly ${base[i] * k}`);
    }
  }

  // (2) For a general k, exactness is NOT the claim and asserting it was
  // the original mistake here: k*d rounds on the way in and base*k rounds
  // in the comparison, at different places. The derived bound is the two
  // roundings, 2 eps; measured worst over these k is 0.97 eps.
  for (const k of [1 / 3, 3.7, 1e6, 1e-30, 1e30, 0.1]) {
    const scaled = deflect(v.d.map((x) => x * k), v.eVec, v.qVec, { enforceDomain: false }).D;
    for (let i = 0; i < 3; i += 1) {
      const want = base[i] * k;
      const rel = Math.abs(scaled[i] - want) / Math.abs(want);
      assert.ok(rel <= 4 * Number.EPSILON,
        `k=${k} component ${i} drifted ${(rel / Number.EPSILON).toFixed(2)} eps`);
    }
  }

  // (3) The DIRECTION is what a root reads, and the sign of k is the whole
  // domain of the argument. k > 0 leaves it fixed; k < 0 reverses it, which
  // moves a longitude by 180 degrees and flips every projection. The search
  // relies on its vector being positively scaled, so both halves are pinned.
  for (const k of [1 / 3, 3.7, 1e6, 1e-30, 1e30, 0.1]) {
    const scaled = deflect(v.d.map((x) => x * k), v.eVec, v.qVec, { enforceDomain: false }).D;
    assert.ok(deflectionAngle(base, scaled) < 1e-16,
      `k=${k} moved the direction by ${deflectionAngle(base, scaled)} rad`);
  }
  for (const k of [-1, -0.5, -1e6]) {
    const scaled = deflect(v.d.map((x) => x * k), v.eVec, v.qVec, { enforceDomain: false }).D;
    assert.equal(deflectionAngle(base, scaled), Math.PI,
      `k=${k} must reverse the direction exactly, not approximately`);
    // and the consequence a caller would actually meet
    const lon = (p) => Math.atan2(p[1], p[0]);
    assert.ok(Math.abs(Math.abs(lon(scaled) - lon(base)) - Math.PI) < 1e-15,
      'a negative rescaling moves the longitude by pi');
  }
});

test('the linearity is the reference implementation\'s, not this transliteration\'s', () => {
  // The fixture runs the compiled eraLd twice per case -- once on the raw d
  // and once on unit(d) -- so the property can be read off ERFA's own
  // output without this module taking part. Worst relative gap 2.75e-16,
  // about one ulp, over all 264 cases.
  let worst = 0;
  let worstAt = null;
  let compared = 0;
  for (const v of FIX.vectors) {
    const dn = Math.sqrt(v.d[0] ** 2 + v.d[1] ** 2 + v.d[2] ** 2);
    for (let i = 0; i < 3; i += 1) {
      const want = v.p1FromUnitD[i] * dn;
      if (want === 0) continue;
      compared += 1;
      const rel = Math.abs(v.p1[i] - want) / Math.abs(want);
      if (rel > worst) { worst = rel; worstAt = v; }
    }
  }
  assert.ok(compared > 500, `only ${compared} components carried the comparison`);
  assert.ok(worst <= 4 * Number.EPSILON,
    `ERFA's own output is linear only to ${(worst / Number.EPSILON).toFixed(2)} eps`
    + ` (elongation ${worstAt?.elongationDeg}, source ${worstAt?.sourceAu} au)`);
});

// ==================================== q and e, and the price of mis-scaling
test('q and e are not scale-free, and the law says exactly what that costs', () => {
  // The other half of the rescaling argument, and the one that is easy to
  // get backwards: d needs no normalisation, q and e need it absolutely.
  // Derived, not thresholded. With c = q_hat . e_hat, and em held correct:
  //
  //   |q| x lam :  q.(q+e) -> lam(lam + c),  e x q -> lam(e x q_hat)
  //                so the deflection scales by (1 + c)/(lam + c)
  //   |e| x mu  :  q.(q+e) -> 1 + mu c,      e x q -> mu(e_hat x q)
  //                so the deflection scales by mu(1 + c)/(1 + mu c)
  //
  // The two laws are different functions, so matching both is a check on
  // the structure and not just on a sensitivity being nonzero.
  const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross3 = (a, b) => [
    a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0],
  ];
  // The TANGENT of the deflection, which is what the laws describe; taking
  // atan first would test the law plus a second function.
  const tanDelta = (d, q, e, emAu) => {
    const qdqpe = dot3(q, [q[0] + e[0], q[1] + e[1], q[2] + e[2]]);
    const dlim = deflectionLimit(emAu);
    const w = SRS / emAu / Math.max(qdqpe, dlim);
    const deq = cross3(d, cross3(e, q));
    return { t: norm([w * deq[0], w * deq[1], w * deq[2]]) / norm(d), qdqpe, limited: qdqpe < dlim };
  };

  let worstQ = 0; let worstE = 0; let nQ = 0; let nE = 0;
  let diverted = 0; let divertedNegative = 0; let onAxis = 0;
  for (const v of FIX.vectors) {
    if (v.tilt) continue;
    const q = unit(v.qVec); const e = unit(v.eVec);
    const c = dot3(q, e);
    const base = tanDelta(v.d, q, e, v.emAu);
    if (base.limited) continue;
    if (base.t === 0) { onAxis += 1; continue; }   // chi = 0: nothing to be relative to
    for (const lam of [1.0001, 0.999, 1.05, 0.5, 2]) {
      const got = tanDelta(v.d, q.map((x) => x * lam), e, v.emAu);
      if (got.limited) { diverted += 1; if (got.qdqpe < 0) divertedNegative += 1; continue; }
      worstQ = Math.max(worstQ, Math.abs((got.t - base.t) / base.t / ((1 - lam) / (lam + c)) - 1));
      nQ += 1;
    }
    for (const mu of [1.0001, 0.999, 1.05, 0.5, 2]) {
      const got = tanDelta(v.d, q, e.map((x) => x * mu), v.emAu);
      if (got.limited) { diverted += 1; if (got.qdqpe < 0) divertedNegative += 1; continue; }
      worstE = Math.max(worstE, Math.abs((got.t - base.t) / base.t / ((mu - 1) / (1 + mu * c)) - 1));
      nE += 1;
    }
  }
  assert.ok(nQ > 600 && nE > 600, `only ${nQ} and ${nE} cases carried the laws`);
  assert.ok(onAxis > 0, 'the chi = 0 cases are missing');
  assert.ok(worstQ < 1e-10, `the |q| law is out by ${worstQ} relative`);
  assert.ok(worstE < 1e-10, `the |e| law is out by ${worstE} relative`);
  // Every excluded case was excluded for one reason, and it is worth
  // naming: shrinking |q| near conjunction drives q.(q+e) NEGATIVE, and
  // ERFA's max() is what stops the unlimited form deflecting the wrong way.
  assert.ok(diverted > 0, 'no case exercised the limiter, so the exclusion is untested');
  assert.equal(divertedNegative, diverted,
    `${diverted - divertedNegative} of ${diverted} diverted cases had a positive denominator,`
    + ' so the limiter is doing something this test has not accounted for');

  // What it costs, at the geometry the profile's docstring quotes. The
  // amplification is 1/(lam + c) and 1 + c = 1 - cos(chi) is about chi^2/2,
  // so a fixed relative error in |q| is worth ~2/chi^2 of the deflection.
  const quote = (elong) => {
    const v = FIX.vectors.find((x) => x.elongationDeg === elong && x.sourceAu === 5.2
      && !x.near && !x.tilt);
    const q = unit(v.qVec); const e = unit(v.eVec);
    const base = tanDelta(v.d, q, e, v.emAu).t;
    const off = tanDelta(v.d, q.map((x) => x * 1.0001), e, v.emAu).t;
    return { pct: (100 * (off - base)) / base, arcsec: Math.abs(off - base) * AS, baseArcsec: base * AS };
  };
  const five = quote(5);
  const third = quote(0.3);
  assert.ok(Math.abs(five.pct + 1.8162) < 1e-3, `5 deg: ${five.pct}`);
  assert.ok(Math.abs(five.baseArcsec - 0.078215) < 1e-5, `5 deg deflection ${five.baseArcsec}`);
  assert.ok(Math.abs(third.pct + 83.6912) < 1e-3, `0.3 deg: ${third.pct}`);
  assert.ok(third.arcsec > 1, `0.3 deg costs ${third.arcsec} arcsec, which should be over an arcsecond`);
  // Far from the Sun it is genuinely small, which is why the amplification
  // has to be stated with the geometry rather than as one number.
  const ninety = quote(90);
  assert.ok(Math.abs(ninety.pct) < 0.01, `90 deg: ${ninety.pct}`);
});

// ================================================= an independent route
test('the closed form (SRS/em)tan(chi/2) agrees with the vector path', () => {
  // Shares no code with `deflect`: it never forms d x (e x q) and never
  // touches d. See the derivation on `deflectionAngleClosedForm`, including
  // why the coplanarity it assumes is exact for real geometry.
  //
  // The tolerance is DERIVED per case, not fitted. The conditioning of both
  // routes is set by the cancellation in 1 + q.e: the vector path forms it
  // as q.(q+e), the closed form reaches it through atan2 and a half-angle,
  // and each carries a relative error of order eps/(1 + cos chi). Sixteen
  // units of that, plus sixteen for the rest of the chain, bounds every
  // case with 11x to spare -- worst measured ratio to the bound is 0.0874.
  let worst = 0; let worstAt = null; let worstRatio = 0; let compared = 0; let onAxis = 0;
  for (const v of FIX.vectors) {
    const got = deflect(v.d, v.eVec, v.qVec, { enforceDomain: false });
    if (got.limiterActive) continue;               // the closed form has no limiter
    const cosChi = dot(unit(v.qVec), unit(v.eVec));
    const a = deflectionAngleOf(v.d, got);
    const b = deflectionAngleClosedForm(v.eVec, v.qVec);
    // chi = 0 exactly: the source is on the Sun-observer ray, e x q is the
    // zero vector, and BOTH routes return exactly zero. That is agreement,
    // not a case to divide through. (chi = pi is the other on-axis case and
    // it is not agreement at all -- see the on-axis test.)
    if (a === 0 && b === 0) { onAxis += 1; continue; }
    const rel = Math.abs(a - b) / b;
    const bound = (16 * Number.EPSILON) / (1 + cosChi) + 16 * Number.EPSILON;
    compared += 1;
    if (rel > worst) { worst = rel; worstAt = v; }
    worstRatio = Math.max(worstRatio, rel / bound);
    assert.ok(rel <= bound,
      `elongation ${v.elongationDeg} deg, source ${v.sourceAu} au, near=${v.near}:`
      + ` ${rel} exceeds the derived bound ${bound}`);
  }
  assert.ok(compared > 250, `only ${compared} cases were compared`);
  assert.ok(onAxis > 0, 'the chi = 0 cases are missing, so the zero branch is untested');
  assert.ok(worstRatio < 1, 'the derived bound must hold, not merely nearly hold');
  // There is deliberately no flat tolerance on `worst`. An earlier version
  // had one, and adding the cases that sit against the limiter threshold
  // broke it -- not because anything got less accurate, but because those
  // cases have 1 + cos(chi) around 1e-6 and the cancellation is worse by
  // exactly that factor. A number that has to be raised whenever a harder
  // case is added is not a bound; the per-case derived one above is. What
  // is asserted instead is that the worst case is a cancellation case.
  const worstCos = dot(unit(worstAt.qVec), unit(worstAt.eVec));
  assert.ok(1 + worstCos < 1e-5,
    `the worst disagreement (${worst}) is at 1 + cos(chi) = ${1 + worstCos},`
    + ' which is not a cancellation case, so the explanation above is wrong');
  // Inside the supported domain the two routes are far closer, and that is
  // the operationally useful figure.
  let inDomain = 0;
  for (const v of FIX.vectors) {
    if (v.elongationDeg === null || v.elongationDeg < 5) continue;
    const got = deflect(v.d, v.eVec, v.qVec, { enforceDomain: false });
    if (got.limiterActive) continue;
    const exact = deflectionAngleClosedForm(v.eVec, v.qVec);
    if (exact === 0) continue;
    inDomain = Math.max(inDomain, Math.abs(deflectionAngleOf(v.d, got) - exact) / exact);
  }
  assert.ok(inDomain < 1e-12, `inside the supported domain the routes differ by ${inDomain}`);
});

test('the deflection angle must be read from the perturbation, not from d and D', () => {
  // This pins a property of the MEASUREMENT, not of the model, and it is
  // here because getting it wrong produced a 5.9e-8 "disagreement" between
  // two routes that are algebraically identical.
  //
  // D = d + u with |u|/|d| around 1e-10, so forming d x D subtracts two
  // nearly equal products and the answer is made of what cancels. The
  // derived bound on that route is eps |d| / |u|; it is not a bound anyone
  // should be paying, which is why `deflect` returns u.
  let worstNoisy = 0; let worstNoisyAt = null; let worstRatio = 0;
  let worstClean = 0; let worstBeyond = 0;
  for (const v of FIX.vectors) {
    const got = deflect(v.d, v.eVec, v.qVec, { enforceDomain: false });
    if (got.limiterActive) continue;
    const clean = deflectionAngleOf(v.d, got);
    const noisy = deflectionAngle(v.d, got.D);
    const exact = deflectionAngleClosedForm(v.eVec, v.qVec);
    if (clean === 0) continue;                     // on axis; nothing to be relative to
    const relNoisy = Math.abs(noisy - clean) / clean;
    const bound = (Number.EPSILON * norm(v.d)) / norm(got.u);
    if (relNoisy > worstNoisy) { worstNoisy = relNoisy; worstNoisyAt = v; }
    worstRatio = Math.max(worstRatio, relNoisy / bound);
    // Per case, not max against max: the two maxima fall on different
    // geometries, and comparing them compares two unrelated numbers. This
    // asks, at each case, how far the noisy route is beyond what the clean
    // route GUARANTEES there -- the same derived bound test 6 uses.
    if (exact > 0) {
      const cleanBound = (16 * Number.EPSILON) / (1 + dot(unit(v.qVec), unit(v.eVec)))
        + 16 * Number.EPSILON;
      worstBeyond = Math.max(worstBeyond, relNoisy / cleanBound);
      worstClean = Math.max(worstClean, Math.abs(clean - exact) / exact / cleanBound);
    }
    assert.ok(relNoisy <= bound,
      `the noisy route exceeded its own derived bound at elongation ${v.elongationDeg}`);
  }
  // The two routes are algebraically the same quantity, so any gap is the
  // instrument.
  assert.ok(worstNoisy > 1e-8,
    `the noisy route is only ${worstNoisy} out; if it has become accurate this note is stale`);
  // Where the worst case sits is a fact about the fixture, so it is
  // reported rather than pinned to coordinates that move when a family is
  // added. What is pinned is the mechanism: the worst case must be one
  // where the deflection is a tiny fraction of |d|, which is what drives
  // the cancellation.
  assert.ok((norm(deflect(worstNoisyAt.d, worstNoisyAt.eVec, worstNoisyAt.qVec,
    { enforceDomain: false }).u) / norm(worstNoisyAt.d)) < 1e-9,
  `the worst noisy case is at elongation ${worstNoisyAt.elongationDeg} deg,`
  + ` source ${worstNoisyAt.sourceAu} au, near=${worstNoisyAt.near}, and its`
  + ' deflection is not small relative to |d|, so the explanation is wrong');
  assert.ok(worstRatio <= 1, 'eps |d| / |u| must bound the noisy route');
  // The clean route stays inside the bound it is entitled to, everywhere.
  assert.ok(worstClean <= 1,
    `the clean route reached ${worstClean} times its own derived bound`);
  // The noisy route blows through that same bound by orders of magnitude.
  assert.ok(worstBeyond > 1e4,
    `the noisy route only reached ${worstBeyond} times the clean route's bound;`
    + ' if that gap has closed, `deflect` no longer needs to return u');
});

// ============================== finite distance is not the star approximation
test('the distant-source approximation is wrong by arcseconds for planets', () => {
  // eraLdsun passes q = p. This measures what that costs, so the profile's
  // claim to use finite distance is backed by the number it avoids rather
  // than by the assertion that it is better.
  let worst = 0;
  let worstAt = null;
  const inDomain = { worst: 0, at: null };
  for (const v of FIX.vectors) {
    const finite = deflect(v.d, v.eVec, v.qVec, { enforceDomain: false });
    // the star approximation: q := the observed direction
    const star = deflect(v.d, v.eVec, unit(v.d).map((x) => x * norm(v.qVec)), { enforceDomain: false });
    const gap = Math.abs(deflectionAngle(v.d, finite.D) - deflectionAngle(v.d, star.D)) * AS;
    if (gap > worst) { worst = gap; worstAt = v; }
    if (v.elongationDeg >= 5 && gap > inDomain.worst) { inDomain.worst = gap; inDomain.at = v; }
  }
  assert.ok(worst > 0.5,
    `the distant-source approximation differs by at most ${worst} arcsec across the fixture;`
    + ' if that is now small the profile no longer needs to justify finite distance');
  // Inside the supported domain it is smaller but still far from nothing.
  assert.ok(inDomain.worst > 1e-3,
    `inside the supported domain the gap is only ${inDomain.worst} arcsec`);
});

// ==================================================== the limiter, exactly
test('the module\'s own limiter fires, and without it the model is NaN on axis', () => {
  // This test exists because a mutation that deleted `Math.max(qdqpe, dlim)`
  // from `deflect` outright passed the entire suite. Every limiter test
  // below reimplements the clamp in a local closure and checks the
  // ARITHMETIC; none of them went through the module, and the fixture's
  // smallest elongation was 0.3 degrees against a 0.08103 degree threshold,
  // so the branch was never taken. The fixture now carries cases inside it.
  const active = FIX.vectors.filter(
    (v) => deflect(v.d, v.eVec, v.qVec, { enforceDomain: false }).limiterActive);
  assert.ok(active.length >= 10,
    `only ${active.length} fixture cases reach the limiter; the branch is barely covered`);
  // The compiled reference took the same branch on each of them -- test 2
  // already compares bit for bit, so this only has to confirm the cases are
  // really inside and not merely labelled so.
  for (const v of active) {
    const got = deflect(v.d, v.eVec, v.qVec, { enforceDomain: false });
    assert.ok(got.qdqpe < got.dlim, `case is labelled limited but ${got.qdqpe} >= ${got.dlim}`);
    assert.equal(got.dlim, deflectionLimit(got.emAu));
  }

  // Both branches of dlim = 1e-6 / max(em^2, 1).
  assert.equal(deflectionLimit(0.39), 1e-6, 'inside 1 au the limit is the constant branch');
  assert.equal(deflectionLimit(1), 1e-6);
  assert.ok(Math.abs(deflectionLimit(5.2) - 1e-6 / 5.2 ** 2) < 1e-22);
  assert.ok(FIX.vectors.some((v) => v.dlim !== 1e-6), 'only one dlim branch is in the fixture');

  // On axis the clamp is not an accuracy convention, it is what stops a
  // division by zero: q = -e gives q.(q+e) = 0 exactly.
  const antipodal = FIX.vectors.find((v) => v.axis === 'antipodal');
  const got = deflect(antipodal.d, antipodal.eVec, antipodal.qVec, { enforceDomain: false });
  assert.equal(got.qdqpe, 0, 'the antipodal case must give exactly zero, not nearly zero');
  assert.equal(got.limiterActive, true);
  assert.ok(Number.isFinite(got.D[0]) && Number.isFinite(got.D[1]) && Number.isFinite(got.D[2]));
  // and what the unlimited form would have produced there
  const unlimited = SRS / got.emAu / got.qdqpe;
  assert.equal(unlimited, Infinity);
  assert.ok(Number.isNaN(unlimited * 0), 'Infinity x |e x q| = NaN is what the clamp prevents');
});

test('inside the limiter the model is replaced by a ramp that goes the wrong way', () => {
  // "Artificially reduced toward zero" is vague, and the shape is specific
  // and checkable. With w clamped at SRS/em/dlim and |e x q| = sin(xi),
  // the limited deflection is PROPORTIONAL to xi -- it falls linearly to
  // zero on the axis, where the model it replaces diverges.
  const eVec = [AU_KM, 0, 0];
  const R = 30 * AU_KM;
  const at = (xi) => {
    const qVec = [-R * Math.cos(xi), R * Math.sin(xi), 0];
    const d = sub(qVec, eVec);
    const got = deflect(d, eVec, qVec, { enforceDomain: false });
    return { arcsec: deflectionAngleOf(d, got) * AS, limited: got.limiterActive };
  };
  const a = at(1e-6); const b = at(1e-5); const c = at(1e-4);
  assert.ok(a.limited && b.limited && c.limited, 'these must all be inside the limiter');
  // Linear: ten times the angle, ten times the deflection, to five digits.
  assert.ok(Math.abs(b.arcsec / a.arcsec - 10) < 1e-4, `${b.arcsec} / ${a.arcsec}`);
  assert.ok(Math.abs(c.arcsec / b.arcsec - 10) < 1e-4, `${c.arcsec} / ${b.arcsec}`);
  // The true model goes the other way entirely: 2 SRS / (em xi), rising.
  const trueAt = (xi) => ((2 * SRS) / Math.tan(xi / 2) / 2) * AS;
  assert.ok(trueAt(1e-6) > trueAt(1e-5) && trueAt(1e-5) > trueAt(1e-4),
    'the unlimited model must rise as the axis is approached');
  assert.ok(trueAt(1e-6) / a.arcsec > 1e5,
    `at xi = 1e-6 the clamp returns ${a.arcsec} arcsec where the model says ${trueAt(1e-6)}`);
});

test('on axis: exactly zero from both sides, for two different reasons', () => {
  // The two on-axis cases are built by writing the vectors down rather than
  // by putting 0 and 180 degrees through the law of sines -- that route
  // cannot produce a true antipode, because Math.sin(Math.PI) is 1.2246e-16
  // and not 0, and it lands 25 microarcsec off the axis on a denominator of
  // 1.5e-32 instead of 0.
  const aligned = FIX.vectors.find((v) => v.axis === 'aligned');
  const antipodal = FIX.vectors.find((v) => v.axis === 'antipodal');

  // chi = 0: source beyond the observer on the same ray. e x q is exactly
  // the zero vector, the denominator is a healthy 2, and the deflection is
  // zero because there is no transverse direction to bend into.
  const al = deflect(aligned.d, aligned.eVec, aligned.qVec, { enforceDomain: false });
  assert.equal(al.qdqpe, 2);
  assert.equal(al.limiterActive, false);
  assert.deepEqual(al.u, [0, 0, 0]);
  assert.deepEqual(al.D, aligned.d, 'D must be d, bit for bit');
  assert.equal(deflectionAngleClosedForm(aligned.eVec, aligned.qVec), 0,
    'the closed form agrees at chi = 0');

  // chi = pi: the ray passes through the centre of the Sun. Same zero
  // vector, same zero answer -- but here it is NOT the model's answer. The
  // model diverges, and zero comes out only because sin(pi) cancels
  // exactly before the clamped denominator can be applied.
  const an = deflect(antipodal.d, antipodal.eVec, antipodal.qVec, { enforceDomain: false });
  assert.deepEqual(an.u, [0, 0, 0]);
  assert.deepEqual(an.D, antipodal.d);
  const cf = deflectionAngleClosedForm(antipodal.eVec, antipodal.qVec);
  assert.ok(Math.abs(cf - Math.PI / 2) < 1e-8,
    `the closed form should be a quarter turn away from agreeing, not ${cf}`);
  // -- and even that is only finite because Math.tan(Math.PI / 2) is
  // 1.633e16 rather than infinite. The mathematical value diverges.
  assert.ok(Math.tan(Math.PI / 2) > 1e16 && Number.isFinite(Math.tan(Math.PI / 2)));

  // The discontinuity, measured: an arbitrarily small move off the axis
  // gives an answer that is not arbitrarily small. This is the distinction
  // section 5 of the profile turns on -- a finite number here is not an
  // observable direction, and the supported domain excludes all of it.
  const R = antipodal.sourceAu * AU_KM;
  const off = (xi) => {
    const qVec = [-R * Math.cos(xi), R * Math.sin(xi), 0];
    const d = sub(qVec, antipodal.eVec);
    return deflectionAngleOf(d, deflect(d, antipodal.eVec, qVec, { enforceDomain: false })) * AS;
  };
  assert.equal(deflectionAngleOf(antipodal.d, an), 0);
  assert.ok(off(1e-3) > 4, `a 0.2 arcsec move off axis gives ${off(1e-3)} arcsec of deflection`);
  assert.ok(off(2e-4) > 0.8);
  // and every one of these is far outside the supported domain
  assert.ok(deflectionDomain(sub([-R * Math.cos(1e-3), R * Math.sin(1e-3), 0], antipodal.eVec),
    antipodal.eVec).supported === false);
});


test('dlim is phi^2/2 -- the separation where limiting begins, not an error cap', () => {
  // ld.c Note 4. Checked as an identity rather than quoted: for a distant
  // source at angular separation phi, q.(q+e) = 1 - cos(phi) = 2 sin^2(phi/2),
  // so setting it equal to dlim gives phi = 2 asin(sqrt(dlim/2)).
  for (const dlim of [1e-6, 1e-10, 1e-14]) {
    const phi = 2 * Math.asin(Math.sqrt(dlim / 2));
    const reconstructed = 2 * Math.sin(phi / 2) ** 2;
    assert.ok(Math.abs(reconstructed - dlim) <= 4 * Number.EPSILON * dlim,
      `dlim ${dlim}: round trip gave ${reconstructed}`);
    // and the small-angle form phi ~ sqrt(2 dlim) agrees to the expected order
    assert.ok(Math.abs(phi - Math.sqrt(2 * dlim)) / phi < 1e-6);
  }
  // ERFA's own default at 1 au: 291.70 arcsec, INSIDE the solar disc.
  const phiErfa = 2 * Math.asin(Math.sqrt(1e-6 / 2)) * AS;
  assert.ok(Math.abs(phiErfa - 291.7025) < 1e-3, `${phiErfa}`);
  const solarRadiusArcsec = Math.asin(SOLAR_RADIUS_KM / AU_KM) * AS;
  assert.ok(Math.abs(solarRadiusArcsec - 959.231) < 1e-2, `${solarRadiusArcsec}`);
  assert.ok(phiErfa < solarRadiusArcsec,
    'ERFA\'s limiter threshold must sit inside the solar disc, not outside it');
  assert.ok(Math.abs(solarRadiusArcsec / phiErfa - 3.2884) < 1e-3);
});

test('the deflection peaks AT the limiter threshold, at 5.7586 arcsec -- not a tenth of one', () => {
  // The comment in reduce.mjs says ERFA's clamp "silently caps the
  // deflection at roughly a tenth of an arcsecond". It does not. Two
  // grid searches during review missed this by sweeping a range that did
  // not contain the peak, so this test brackets it from both sides.
  const dlim = 1e-6;
  const em = 1;
  const delta = (phi) => Math.atan(
    (SRS / em) * Math.sin(phi) / Math.max(2 * Math.sin(phi / 2) ** 2, dlim),
  );
  const phiLim = 2 * Math.asin(Math.sqrt(dlim / 2));
  const peak = delta(phiLim) * AS;
  assert.ok(Math.abs(peak - 5.758572) < 1e-5, `peak ${peak} arcsec`);
  assert.ok(peak > 50 * 0.1, 'the peak is nowhere near a tenth of an arcsecond');

  // Unimodal: rising below the threshold, falling above it.
  for (const f of [0.5, 0.9, 0.99]) assert.ok(delta(phiLim * f) < delta(phiLim), `rising at ${f}`);
  for (const f of [1.01, 1.1, 2, 10]) assert.ok(delta(phiLim * f) < delta(phiLim), `falling at ${f}`);

  // And it is 3.29x a limb-grazing ray, which is the figure that makes the
  // "cap" reading obviously wrong.
  const phiLimb = Math.asin(SOLAR_RADIUS_KM / AU_KM);
  const limb = delta(phiLimb) * AS;
  assert.ok(Math.abs(limb - 1.751181) < 1e-5, `limb ${limb} arcsec`);
  assert.ok(Math.abs(peak / limb - 3.2884) < 1e-3);
});

test('the limiter transition is piecewise: the derivative jumps', () => {
  // Nothing in this profile differentiates across it -- the domain excludes
  // the transition entirely -- and this test exists so that stays true by
  // assertion rather than by intention.
  const dlim = 1e-6;
  const em = 1;
  const delta = (phi) => Math.atan(
    (SRS / em) * Math.sin(phi) / Math.max(2 * Math.sin(phi / 2) ** 2, dlim),
  );
  const phiLim = 2 * Math.asin(Math.sqrt(dlim / 2));
  const h = phiLim * 1e-6;
  const left = (delta(phiLim) - delta(phiLim - h)) / h;
  const right = (delta(phiLim + h) - delta(phiLim)) / h;
  assert.ok(left > 0 && right < 0, `slopes ${left} and ${right} should straddle zero`);
  const jump = right - left;
  assert.ok(Math.abs(jump) > 0.5 * Math.abs(left), 'the jump should be the same order as the slopes');
  // The threshold is far outside the supported domain, which is the
  // reason the jump never has to be differentiated through.
  assert.ok(phiLim < MIN_ELONGATION_RAD / 60, 'the transition must be far inside the domain floor');
});

// ============================================== the four domain boundaries
test('the four boundaries are four different boundaries', () => {
  const eVec = [AU_KM, 0, 0];
  const at = (elongDeg) => {
    const phi = elongDeg * DEG;
    const R = 5.2 * AU_KM;
    const psi = Math.asin((AU_KM * Math.sin(phi)) / R);
    const chi = Math.PI - phi - psi;
    const qVec = [R * Math.cos(chi), R * Math.sin(chi), 0];
    return deflectionDomain(sub(qVec, eVec), eVec);
  };
  const disc = at(0.2);        // inside the solar disc
  const between = at(0.1);     // inside the disc, outside the limiter
  const wide = at(10);         // supported

  assert.equal(wide.supported, true);
  assert.equal(wide.obstructed, false);
  assert.equal(wide.withinLimiter, false);

  assert.equal(disc.supported, false);
  assert.equal(disc.obstructed, true, '0.2 deg = 720 arcsec is inside the 959 arcsec disc');
  assert.equal(disc.withinLimiter, false, '720 arcsec is OUTSIDE the 291.7 arcsec limiter threshold');

  // Obstructed but not limited is a real region, and that is the point:
  // the boundaries are not nested the way a reader might assume.
  assert.ok(between.obstructed && !between.withinLimiter);
});

test('the apparent solar radius is not a constant, and the domain uses the computed one', () => {
  // Over a year the Earth runs 0.9833 to 1.0166 au, so the disc runs
  // 943.5 to 975.5 arcsec. A fixed arcsecond threshold would be inside the
  // disc at one end of the year and outside it at the other.
  const at = (au) => deflectionDomain([0, 1, 0], [au * AU_KM, 0, 0]).apparentSolarRadiusArcsec;
  const near = at(0.983301);
  const far = at(1.016646);
  assert.ok(Math.abs(near - 975.521) < 0.05, `perihelion ${near}`);
  assert.ok(Math.abs(far - 943.525) < 0.05, `aphelion ${far}`);
  assert.ok(near > far, 'the disc is larger when the Earth is closer');
});

test('outside the domain it refuses with a typed code, and says which boundary', () => {
  const eVec = [AU_KM, 0, 0];
  const R = 5.2 * AU_KM;
  const phi = 1 * DEG;
  const psi = Math.asin((AU_KM * Math.sin(phi)) / R);
  const chi = Math.PI - phi - psi;
  const qVec = [R * Math.cos(chi), R * Math.sin(chi), 0];
  const d = sub(qVec, eVec);

  assert.throws(() => deflect(d, eVec, qVec), (e) => {
    assert.equal(e.code, 'out-of-domain');
    assert.match(e.message, /elongation/);
    assert.ok(e.detail.domain.elongationDeg < 5);
    return true;
  });
  // and the same geometry computes fine when the caller asks for the model
  // rather than the profile
  const got = deflect(d, eVec, qVec, { enforceDomain: false });
  assert.ok(Number.isFinite(got.D[0]));
  assert.equal(got.domain.supported, false);
  assert.equal(got.limiterActive, false, 'one degree is far outside the limiter');
});

test('degenerate geometries refuse rather than returning a non-finite direction', () => {
  const eVec = [AU_KM, 0, 0];
  const qVec = [0, 5 * AU_KM, 0];
  assert.throws(() => deflect([0, 0, 0], eVec, qVec, { enforceDomain: false }),
    (e) => e.code === 'bad-geometry');
  assert.throws(() => deflect([1, 1, 1], [0, 0, 0], qVec, { enforceDomain: false }),
    (e) => e.code === 'bad-geometry');
  assert.throws(() => deflect([1, 1, 1], eVec, [0, 0, 0], { enforceDomain: false }),
    (e) => e.code === 'bad-geometry');
});

test('the profile declares what it omits, including the model\'s own second-order term', () => {
  assert.equal(DEFLECTION_PROFILE.id, 'zodiacs-deflected-of-date/1');
  assert.deepEqual([...DEFLECTION_PROFILE.deflectors], ['Sun']);
  assert.equal(DEFLECTION_PROFILE.minElongationDeg, 5);
  // The omission that is a property of the MODEL, not of this code, must be
  // named -- it is larger near conjunction than anything measured here.
  assert.ok(DEFLECTION_PROFILE.notApplied.some((s) => /second-order term eraLd itself omits/.test(s)));
  assert.ok(DEFLECTION_PROFILE.notApplied.some((s) => /Klioner/.test(s) && /stays off/.test(s)));
  assert.ok(DEFLECTION_PROFILE.notApplied.some((s) => /other than the Sun/.test(s)));
  // and the limiter description must not read as an error bound
  assert.match(DEFLECTION_PROFILE.limiter, /not an error cap/);
});

// ============================================================== intervals
//
// A local analytic geometry, deliberately not shared with `_geometry.mjs`.
// That file serves the aberrated and of-date suites, which are released
// results with published holdouts behind them; an edit made here for the
// deflection must not be able to move what those suites measure. Thirty
// lines of duplication buys the suites independence -- the same trade
// `_geometry.mjs` itself records against the light-time suite.
//
// Every derivative below is differentiated BY HAND from the closed form, so
// the truth the enclosures are tested against never comes out of the
// enclosures.
const AU = AU_KM;
/**
 * The toy geometry. The radii BREATHE on purpose.
 *
 * An earlier version put both bodies on exact circles about the Sun. That
 * makes `d|e|/dt` and `d|q|/dt` identically zero, which makes the
 * correction term in the unit-vector derivative
 * `e' = (E' - e |E|')/|E|` identically zero too -- so two mutations that
 * deleted that term outright passed every test. The fixture was the hole,
 * not the assertions. `en'` and `qn'` are now non-zero and
 * `the test geometry exercises what it claims to` asserts it.
 */
function toy(t, o = {}) {
  const {
    aT = 5.2, wO = 2e-7, wT = 5e-8, psi = 0.9, drift = 3.0, tilt = 0.05,
    eO = 0.02, wRO = 7e-8, eT = 0.05, wRT = 3e-8,
  } = o;
  const S = [drift * t, 0.3 * drift * t, 0];
  const Sd = [drift, 0.3 * drift, 0];

  const rO = AU * (1 + eO * Math.cos(wRO * t));
  const rOd = -AU * eO * wRO * Math.sin(wRO * t);
  const aO = wO * t;
  const uO = [Math.cos(aO), Math.sin(aO), 0];
  const uOd = [-wO * Math.sin(aO), wO * Math.cos(aO), 0];
  const O = [0, 1, 2].map((i) => S[i] + rO * uO[i]);
  const Od = [0, 1, 2].map((i) => Sd[i] + rOd * uO[i] + rO * uOd[i]);

  const rT = aT * AU * (1 + eT * Math.sin(wRT * t));
  const rTd = aT * AU * eT * wRT * Math.cos(wRT * t);
  const a = wT * t + psi;
  const ct = Math.cos(tilt); const st = Math.sin(tilt);
  const uT = [Math.cos(a), ct * Math.sin(a), st * Math.sin(a)];
  const uTd = [-wT * Math.sin(a), ct * wT * Math.cos(a), st * wT * Math.cos(a)];
  const T = [0, 1, 2].map((i) => S[i] + rT * uT[i]);
  const Td = [0, 1, 2].map((i) => Sd[i] + rTd * uT[i] + rT * uTd[i]);

  return {
    eRaw: sub(O, S), eRawDot: sub(Od, Sd),
    qRaw: sub(T, S), qRawDot: sub(Td, Sd),
    d: sub(T, O), dDot: sub(Td, Od),
  };
}
/** Close to the domain floor: 5.65 degrees of elongation, 0.0684 arcsec. */
const NEAR_FLOOR = { psi: 4.88 };
const T_REF = 1.234e7;
const pointI = (v) => v.map((x) => I.iv(x));
/**
 * A VALID but crude input box over [t0, t1]: hull a dense sample and
 * inflate. Crude on purpose -- the question these tests ask is whether
 * `deflectInterval`'s OUTPUT contains the truth given a sound input box,
 * not how tight anyone can make the input.
 */
function toyBox(t0, t1, o = {}, n = 400, inflate = 1e-6) {
  const keys = ['eRaw', 'eRawDot', 'qRaw', 'qRawDot', 'd', 'dDot'];
  const acc = {};
  for (let i = 0; i <= n; i += 1) {
    const g = toy(t0 + ((t1 - t0) * i) / n, o);
    for (const k of keys) acc[k] = i === 0 ? pointI(g[k]) : I.vHull(acc[k], pointI(g[k]));
  }
  for (const k of keys) {
    acc[k] = acc[k].map((x) => {
      const w = Math.max(Math.abs(x.lo), Math.abs(x.hi)) * inflate;
      return I.iv(x.lo - w, x.hi + w);
    });
  }
  return acc;
}
const within = (x, box) => x >= box.lo && x <= box.hi;
const callToy = (b) => deflectInterval(b.d, b.dDot, I.norm(b.d), b.eRaw, b.eRawDot, b.qRaw, b.qRawDot);

test('degenerate intervals reproduce the pointwise transformation', () => {
  // The interval form must be the SAME function, not a near relative. With
  // zero-width inputs it cannot return the pointwise answer exactly --
  // every operation widens by PAD -- so the claim is containment, and the
  // width is reported so a regression that loosened it would show.
  let checked = 0;
  let worstWidth = 0;
  for (let t = 0; t < 4e7; t += 3.7e5) {
    const g = toy(t);
    let pt;
    try { pt = deflect(g.d, g.eRaw, g.qRaw); } catch { continue; }   // out of domain
    const r = callToy({
      d: pointI(g.d), dDot: pointI(g.dDot), eRaw: pointI(g.eRaw),
      eRawDot: pointI(g.eRawDot), qRaw: pointI(g.qRaw), qRawDot: pointI(g.qRawDot),
    });
    assert.equal(r.ok, true, `the interval form refused a geometry the pointwise form accepted at t=${t}: ${r.why}`);
    checked += 1;
    for (let i = 0; i < 3; i += 1) {
      assert.ok(within(pt.D[i], r.D[i]),
        `t=${t} component ${i}: ${pt.D[i]} is outside [${r.D[i].lo}, ${r.D[i].hi}]`);
      worstWidth = Math.max(worstWidth, I.width(r.D[i]) / Math.max(1, Math.abs(pt.D[i])));
    }
  }
  assert.ok(checked > 50, `only ${checked} instants were inside the supported domain`);
  assert.ok(worstWidth < 1e-13,
    `a degenerate cell should be within a few PAD of a point; worst relative width ${worstWidth}`);
});

test('a cell encloses the transformation at every instant inside it', () => {
  for (const span of [60, 3600, 86400, 10 * 86400]) {
    const t0 = 1.234e7;
    const r = callToy(toyBox(t0, t0 + span));
    assert.equal(r.ok, true, `span ${span}s: ${r.why}`);
    for (let k = 0; k <= 200; k += 1) {
      const t = t0 + (span * k) / 200;
      const g = toy(t);
      const pt = deflect(g.d, g.eRaw, g.qRaw);
      for (let i = 0; i < 3; i += 1) {
        assert.ok(within(pt.D[i], r.D[i]),
          `span ${span}s, t=${t}, component ${i}: ${pt.D[i]} outside [${r.D[i].lo}, ${r.D[i].hi}]`);
      }
    }
  }
});

test('the derivative encloses every difference quotient the cell admits', () => {
  // By the mean value theorem, (D(b) - D(a))/(b - a) EQUALS D' at some
  // interior point, so it must lie in DDot. That is exact -- there is no
  // truncation term to get wrong.
  //
  // This replaced a central-difference check, which reported 143 failures
  // on a 60-second cell and none on a ten-day one. The direction gave it
  // away: a narrower cell cannot make a correct enclosure worse. The step
  // was 1e-3 s against components of 7e8 km, so the difference carried
  // about five significant digits and the reference, not the enclosure,
  // was wrong.
  for (const span of [60, 3600, 86400, 10 * 86400]) {
    const t0 = 1.234e7;
    const r = callToy(toyBox(t0, t0 + span));
    assert.equal(r.ok, true, `span ${span}s: ${r.why}`);
    const Dat = (t) => { const g = toy(t); return deflect(g.d, g.eRaw, g.qRaw).D; };
    const pairs = [[t0, t0 + span]];
    for (let k = 0; k < 40; k += 1) {
      pairs.push([t0 + (span * k) / 40, t0 + (span * (k + 1)) / 40]);
    }
    for (const [a, b] of pairs) {
      const Da = Dat(a); const Db = Dat(b);
      for (let i = 0; i < 3; i += 1) {
        const quotient = (Db[i] - Da[i]) / (b - a);
        assert.ok(within(quotient, r.DDot[i]),
          `span ${span}s, [${a}, ${b}] component ${i}: ${quotient} outside [${r.DDot[i].lo}, ${r.DDot[i].hi}]`);
      }
    }
  }
});

test('the length is recomputed, because d -> D is not a rescaling', () => {
  // The linearity that lets `d` go in unnormalised does NOT make the map a
  // positive scalar multiple -- it is (I - w[e x q]_x) -- so an enclosure
  // of |d| is not one of |D|. Aberration takes the length as a separate
  // argument and uses it inside S = |d| + (d.v)/(1 + bm1), so passing the
  // old length beside the new vector would evaluate neither transformation.
  const t0 = 1.234e7;
  const b = toyBox(t0, t0 + 3600);
  const r = callToy(b);
  assert.equal(r.ok, true);
  // It is returned at all, and it encloses the truth.
  for (let k = 0; k <= 50; k += 1) {
    const g = toy(t0 + (3600 * k) / 50);
    const D = deflect(g.d, g.eRaw, g.qRaw).D;
    assert.ok(within(norm(D), r.dist), 'the returned length must enclose |D|');
  }
  // |D| = |d| sec(delta), because u is perpendicular to d.
  const g = toy(t0 + 1800);
  const got = deflect(g.d, g.eRaw, g.qRaw);
  const perp = Math.abs(dot(g.d, got.u)) / (norm(g.d) * norm(got.u));
  assert.ok(perp < 1e-15, `u should be perpendicular to d; cos is ${perp}`);
  const worst = 0.094847 / AS;
  assert.ok(Math.abs(1 / Math.cos(worst) - 1 - 1.057e-13) < 1e-16,
    `sec(delta) - 1 at the domain's largest deflection is ${1 / Math.cos(worst) - 1}`);

  // At a geometry near the domain floor the difference is larger than the
  // enclosures are wide, so the two are DISJOINT and inheriting `dist`
  // would hand aberration a length the deflected vector does not have.
  // Asserted here because containment alone cannot see the difference:
  // where the deflection is small, |d|'s enclosure contains |D| too, and a
  // mutation that inherited `dist` passed every other test in this file.
  const near = toy(T_REF, NEAR_FLOOR);
  const nearIn = I.iv(norm(near.d));
  const nr = callToy({
    d: pointI(near.d), dDot: pointI(near.dDot), eRaw: pointI(near.eRaw),
    eRawDot: pointI(near.eRawDot), qRaw: pointI(near.qRaw), qRawDot: pointI(near.qRawDot),
  });
  assert.equal(nr.ok, true, nr.why);
  assert.ok(deflectionDomain(near.d, near.eRaw).elongationDeg < 6,
    'the near-floor geometry must actually be near the floor');
  assert.ok(nr.dist.lo > nearIn.hi,
    `|D| = [${nr.dist.lo}, ${nr.dist.hi}] must be disjoint from |d| = [${nearIn.lo}, ${nearIn.hi}]`);
  assert.ok(within(norm(deflect(near.d, near.eRaw, near.qRaw).D), nr.dist));
});

test('outside the elongation floor it says EXCLUDED, not unresolved', () => {
  // The two are different answers and the search must not merge them. A
  // narrower cell resolves an unresolved one and never an excluded one,
  // and a result that counted an excluded span as covered would claim
  // completeness over a region this profile has no answer for.
  //
  // The toy geometry is swept until the target passes behind the Sun.
  const o = { aT: 5.2, wO: 2e-7, wT: 5e-8, psi: 0.0 };
  let excluded = null; let straddle = null; let supported = null;
  for (let t = 0; t < 1.4e8 && (!excluded || !straddle || !supported); t += 2e4) {
    const r = callToy(toyBox(t, t + 600, o, 60));
    if (r.ok) { supported = supported ?? { t, r }; continue; }
    if (r.excluded === true) excluded = excluded ?? { t, r };
    else if (/straddles/.test(r.why)) straddle = straddle ?? { t, r };
  }
  assert.ok(supported, 'the sweep never found a supported cell');
  assert.ok(excluded, 'the sweep never found a wholly excluded cell');
  assert.ok(straddle, 'the sweep never found a cell straddling the floor');

  // Excluded: not retryable, and it says so.
  assert.equal(excluded.r.excluded, true);
  assert.equal(excluded.r.retry, false, 'an excluded cell must not ask to be subdivided');
  assert.match(excluded.r.why, /no subdivision changes that/);
  // and the geometry really is inside the floor, checked independently
  assert.ok(excluded.r.cosElongation.lo > Math.cos(MIN_ELONGATION_RAD) - 1e-14,
    'the excluded cell should be inside the floor by the cosine test');
  const g = toy(excluded.t + 300, o);
  assert.ok(deflectionDomain(g.d, g.eRaw).elongationDeg < 5,
    'the pointwise domain check must agree that the excluded cell is inside the floor');

  // Straddling: retryable, and NOT marked excluded.
  assert.equal(straddle.r.retry, true, 'a straddling cell must be subdividable');
  assert.notEqual(straddle.r.excluded, true, 'a straddling cell is not excluded');

  // And the pointwise transformation refuses the same geometry, by the
  // same floor, so the two forms agree about the domain.
  assert.throws(() => deflect(g.d, g.eRaw, g.qRaw), (e) => e.code === 'out-of-domain');
});

test('a cell that cannot rule the limiter out is refused, not differentiated', () => {
  // The clamp makes w piecewise and its derivative jump. Rather than
  // differentiate through it, the enclosure demands q.(q+e) be provably
  // above the largest dlim the cell admits. Inside the supported domain
  // that is never close, so this is exercised with the domain guard's own
  // geometry removed -- the point is that the limiter check is a SEPARATE
  // gate and not a consequence of the elongation floor.
  const AUv = [AU, 0, 0];
  const R = 30 * AU;
  const near = (xi) => {
    const q = [-R * Math.cos(xi), R * Math.sin(xi), 0];
    return { q, d: sub(q, AUv) };
  };
  const g0 = near(1e-4);                           // deep inside the limiter
  const z = [I.iv(0), I.iv(0), I.iv(0)];
  const r = deflectInterval(pointI(g0.d), z, I.iv(norm(g0.d)), pointI(AUv), z, pointI(g0.q), z);
  assert.equal(r.ok, false);
  // The elongation floor catches it first, which is the designed order --
  // so the limiter gate is reached by asking for a geometry the floor
  // allows and the limiter does not. No such geometry exists at 1 au
  // (the floor is 18000 arcsec and the threshold 291.7), and that is worth
  // asserting rather than leaving implicit.
  const floorArcsec = (MIN_ELONGATION_RAD * 180 * 3600) / Math.PI;
  const thresholdArcsec = deflectionDomain([0, 1, 0], AUv).limiterThresholdArcsec;
  assert.ok(floorArcsec > 60 * thresholdArcsec,
    `the floor (${floorArcsec}) should be far outside the limiter threshold (${thresholdArcsec})`);
  // The gate is still live code: it fires when handed a q.(q+e) that the
  // floor never produces, which is what a future profile with a lower
  // floor would hit.
  const tiny = 1e-5;
  const qt = [-R * Math.cos(tiny), R * Math.sin(tiny), 0];
  const direct = deflectInterval(
    [I.iv(1, 1), I.iv(0), I.iv(0)], z, I.iv(1),     // d along +x: elongation 180 deg
    pointI(AUv), z, pointI(qt), z,
  );
  assert.equal(direct.ok, false);
  assert.match(direct.why, /limiter threshold/);
  assert.equal(direct.retry, true, 'a limiter refusal is about width, so it is retryable');
  assert.notEqual(direct.excluded, true, 'a limiter refusal is not a domain exclusion');
});

test('degenerate geometries refuse over intervals too, with retry set', () => {
  const z = [I.iv(0), I.iv(0), I.iv(0)];
  const e = pointI([AU, 0, 0]);
  const q = pointI([0, 5 * AU, 0]);
  const d = pointI([-AU, 5 * AU, 0]);
  // zero-length d
  let r = deflectInterval(z, z, I.iv(0), e, z, q, z);
  assert.equal(r.ok, false); assert.equal(r.retry, true);
  // observer at the Sun's centre
  r = deflectInterval(d, z, I.norm(d), z, z, q, z);
  assert.equal(r.ok, false); assert.equal(r.retry, true);
  assert.match(r.why, /centre of the Sun/);
  // target at the Sun's centre
  r = deflectInterval(d, z, I.norm(d), e, z, z, z);
  assert.equal(r.ok, false); assert.equal(r.retry, true);
  assert.match(r.why, /centre of the Sun/);
  // a d enclosure straddling zero length is retryable, not excluded
  const straddling = [I.iv(-1, 1), I.iv(-1, 1), I.iv(-1, 1)];
  r = deflectInterval(straddling, z, I.norm(straddling), e, z, q, z);
  assert.equal(r.ok, false); assert.equal(r.retry, true);
  assert.notEqual(r.excluded, true);
});

test('the test geometry exercises what it claims to', () => {
  // The fixture, checked independently of the thing it tests. A geometry
  // that silently zeroes a term makes every assertion about that term
  // vacuous, which is exactly what happened with the circular version.
  const g = toy(T_REF);
  const enDot = dot(g.eRaw, g.eRawDot) / norm(g.eRaw);
  const qnDot = dot(g.qRaw, g.qRawDot) / norm(g.qRaw);
  assert.ok(Math.abs(enDot) > 1e-3, `d|e|/dt is ${enDot} km/s, so the unit-vector correction is untested`);
  assert.ok(Math.abs(qnDot) > 1e-3, `d|q|/dt is ${qnDot} km/s, so the unit-vector correction is untested`);
  // The Sun moves, so e' is not the observer's velocity and q' is not the
  // target's -- a static Sun would make two more terms vacuous.
  assert.ok(norm(sub(toy(T_REF + 1000).eRaw, g.eRaw)) > 0, 'e must vary');
  // The near-floor geometry is inside the domain but close to its edge.
  const near = deflectionDomain(toy(T_REF, NEAR_FLOOR).d, toy(T_REF, NEAR_FLOOR).eRaw);
  assert.equal(near.supported, true);
  assert.ok(near.elongationDeg > 5 && near.elongationDeg < 6, `${near.elongationDeg} deg`);
});

test('the derivative matches an independent reference at a point', () => {
  // The mean-value test above establishes that DDot is a VALID enclosure
  // over a cell. It cannot establish that it is the right derivative: on a
  // cell whose input box is wide, DDot is wide too, and six mutations that
  // dropped whole terms still enclosed every difference quotient.
  //
  // With degenerate inputs DDot is a near-point -- 3.5e-15 relative width
  // -- so comparing it against a reference that shares no derivative
  // formula with it is sharp. The reference is a Richardson-extrapolated
  // central difference of `deflect`, which is itself settled bit for bit
  // against the compiled ERFA; the step is large on purpose, because at
  // these magnitudes the error is roundoff rather than truncation
  // (measured: 3.06e-11 at h = 800 s falling to 2.85e-12 at h = 6400 s,
  // against an h^4 truncation term below 1e-15).
  const H = 6400;
  const Dat = (t, o) => { const g = toy(t, o); return deflect(g.d, g.eRaw, g.qRaw).D; };
  const reference = (t, o) => {
    const cd = (h) => {
      const a = Dat(t - h, o); const b = Dat(t + h, o);
      return [0, 1, 2].map((i) => (b[i] - a[i]) / (2 * h));
    };
    const c1 = cd(H); const c2 = cd(2 * H);
    return [0, 1, 2].map((i) => (4 * c1[i] - c2[i]) / 3);
  };
  let worst = 0;
  let checked = 0;
  for (const o of [{}, NEAR_FLOOR, { psi: 2.1 }, { psi: 0.3, aT: 1.52 }, { psi: 3.4, aT: 30 }]) {
    for (const t of [T_REF, T_REF + 4e6, T_REF + 9e6]) {
      const g = toy(t, o);
      const r = callToy({
        d: pointI(g.d), dDot: pointI(g.dDot), eRaw: pointI(g.eRaw),
        eRawDot: pointI(g.eRawDot), qRaw: pointI(g.qRaw), qRawDot: pointI(g.qRawDot),
      });
      if (!r.ok) continue;                          // outside the supported domain
      checked += 1;
      const ref = reference(t, o);
      for (let i = 0; i < 3; i += 1) {
        const centre = (r.DDot[i].lo + r.DDot[i].hi) / 2;
        worst = Math.max(worst, Math.abs(ref[i] - centre) / Math.abs(ref[i]));
      }
    }
  }
  assert.ok(checked >= 8, `only ${checked} geometries were inside the supported domain`);
  assert.ok(worst < 1e-9,
    `the derivative differs from the independent reference by ${worst} relative`);
});

test('the caller owns the chain rule on q, and it is load-bearing', () => {
  // `deflectInterval` differentiates with respect to whatever variable the
  // caller's `qRawDot` is in. In the search that variable is RECEPTION
  // time while `q` is evaluated at EMISSION, so the caller must carry the
  // `(1 - dtau/dt)` factor. Doing it inside would hide a chain rule in a
  // routine that cannot see the light-time.
  //
  // This pins the obligation by showing what dropping it costs. It runs on
  // a retarded toy with a light-time that varies linearly, so `dtau/dt` is
  // a constant chosen here rather than solved for -- the point is the
  // factor, not the light-time.
  const TAU0 = 275;
  const TAU_RATE = 3e-4;
  const tau = (t) => TAU0 + TAU_RATE * (t - T_REF);
  const K = 1 - TAU_RATE;
  /** Observer and Sun at reception, target and Sun at emission. Hand-differentiated. */
  const retarded = (t, withChainRule = true) => {
    const now = toy(t);
    const em = toy(t - tau(t));
    const k = withChainRule ? K : 1;
    return {
      eRaw: now.eRaw,
      eRawDot: now.eRawDot,
      qRaw: em.qRaw,
      qRawDot: em.qRawDot.map((x) => x * k),
      // `d` and its derivative always carry the factor: this test is about
      // `q` alone, and letting two things move at once would prove nothing.
      d: sub(em.qRaw, now.eRaw),
      dDot: sub(em.qRawDot.map((x) => x * K), now.eRawDot),
    };
  };
  const call = (g) => deflectInterval(
    pointI(g.d), pointI(g.dDot), I.iv(norm(g.d)),
    pointI(g.eRaw), pointI(g.eRawDot), pointI(g.qRaw), pointI(g.qRawDot),
  );
  // The reference: a Richardson-extrapolated difference of `u` itself,
  // which `deflect` returns directly -- so no cancellation, and no
  // derivative formula shared with the thing under test.
  const H = 6400;
  const uAt = (t) => { const g = retarded(t); return deflect(g.d, g.eRaw, g.qRaw).u; };
  const cd = (h) => {
    const a = uAt(T_REF - h); const b = uAt(T_REF + h);
    return [0, 1, 2].map((i) => (b[i] - a[i]) / (2 * h));
  };
  const c1 = cd(H); const c2 = cd(2 * H);
  const reference = [0, 1, 2].map((i) => (4 * c1[i] - c2[i]) / 3);

  const right = call(retarded(T_REF, true));
  const wrong = call(retarded(T_REF, false));
  assert.equal(right.ok, true, right.why);
  assert.equal(wrong.ok, true);
  const gap = (r) => Math.max(...[0, 1, 2].map((i) => {
    const centre = (r.uDot[i].lo + r.uDot[i].hi) / 2;
    return Math.abs(reference[i] - centre) / Math.abs(reference[i]);
  }));
  assert.ok(gap(right) < 1e-8, `with the chain rule the gap is ${gap(right)}`);
  assert.ok(gap(wrong) > 1e-6,
    `without it the gap is only ${gap(wrong)}; if that is now negligible this obligation is not load-bearing`);

  // And the reason it has to be tested on `uDot` rather than `DDot`:
  // `DDot = dDot + uDot` with |uDot| a tiny fraction of |dDot|, so the
  // same error is four orders smaller there and invisible.
  const dRel = Math.max(...[0, 1, 2].map((i) => {
    const a = (right.DDot[i].lo + right.DDot[i].hi) / 2;
    const b = (wrong.DDot[i].lo + wrong.DDot[i].hi) / 2;
    return Math.abs(a - b) / Math.abs(a);
  }));
  const uRel = Math.max(...[0, 1, 2].map((i) => {
    const a = (right.uDot[i].lo + right.uDot[i].hi) / 2;
    const b = (wrong.uDot[i].lo + wrong.uDot[i].hi) / 2;
    return Math.abs(a - b) / Math.abs(a);
  }));
  assert.ok(uRel / dRel > 1e3,
    `the error should be far more visible in uDot than in DDot; ratio ${uRel / dRel}`);
});
