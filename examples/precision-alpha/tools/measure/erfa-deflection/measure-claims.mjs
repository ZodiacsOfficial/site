/**
 * Recompute every number DEFLECTION-PROFILE.md section 11 quotes.
 *
 *   node tools/measure/erfa-deflection/measure-claims.mjs
 *
 * Section 11 is prose, and prose drifts from the fixture it describes. This
 * regenerates each figure from the committed fixture and the module, so a
 * claim that has stopped being true is visible rather than quietly wrong.
 * `deflection.nodetest.mjs` asserts the ones that are load-bearing; this
 * covers the rest, including the ones that are only illustrative.
 */
import { readFileSync } from 'node:fs';
import * as G from '../../../test/tier-a/_geometry.mjs';
import { searchDeflectedLongitude, searchOfDateLongitude } from '../../../src/core/retarded-search.mjs';
import {
  deflect, deflectionAngle, deflectionAngleOf, deflectionAngleClosedForm,
  deflectionLimit, deflectionDomain, SRS, AU_KM,
} from '../../../src/core/deflection.mjs';

const FIX = JSON.parse(readFileSync(new URL('../../../test/tier-a/_erfa-ld-vectors.json', import.meta.url), 'utf8'));
const AS = (180 * 3600) / Math.PI;
const EPS = Number.EPSILON;
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => Math.sqrt(dot(a, a));
const unit = (a) => { const n = norm(a); return [a[0] / n, a[1] / n, a[2] / n]; };
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

const out = { fixture: { cases: FIX.count, components: FIX.count * 3 } };

// 11.1 bit-identity
let exact = 0;
for (const v of FIX.vectors) {
  const D = deflect(v.d, v.eVec, v.qVec, { enforceDomain: false }).D;
  for (let i = 0; i < 3; i += 1) if (D[i] === v.p1[i]) exact += 1;
}
out.bitIdentical = { exact, of: FIX.count * 3 };

// 11.2 linearity
const ref = FIX.vectors.find((x) => x.elongationDeg === 10 && x.sourceAu === 5.2 && !x.near && x.tilt === 0.7);
const base = deflect(ref.d, ref.eVec, ref.qVec, { enforceDomain: false }).D;
let pow2Exact = true; let worstGenEps = 0; let worstAngPos = 0; let worstAngNegDelta = 0;
for (const k of [2 ** -100, 2 ** -60, 0.5, 2, 2 ** 20, 2 ** 100]) {
  const s = deflect(ref.d.map((x) => x * k), ref.eVec, ref.qVec, { enforceDomain: false }).D;
  for (let i = 0; i < 3; i += 1) if (!(s[i] === base[i] * k)) pow2Exact = false;
}
for (const k of [1 / 3, 3.7, 1e6, 1e-30, 1e30, 0.1]) {
  const s = deflect(ref.d.map((x) => x * k), ref.eVec, ref.qVec, { enforceDomain: false }).D;
  for (let i = 0; i < 3; i += 1) worstGenEps = Math.max(worstGenEps, Math.abs(s[i] - base[i] * k) / Math.abs(base[i] * k) / EPS);
  worstAngPos = Math.max(worstAngPos, deflectionAngle(base, s));
}
for (const k of [-1, -0.5, -1e6]) {
  const s = deflect(ref.d.map((x) => x * k), ref.eVec, ref.qVec, { enforceDomain: false }).D;
  worstAngNegDelta = Math.max(worstAngNegDelta, Math.abs(deflectionAngle(base, s) - Math.PI));
}
let erfaLin = 0;
for (const v of FIX.vectors) {
  const dn = norm(v.d);
  for (let i = 0; i < 3; i += 1) {
    const want = v.p1FromUnitD[i] * dn;
    if (want !== 0) erfaLin = Math.max(erfaLin, Math.abs(v.p1[i] - want) / Math.abs(want));
  }
}
out.linearity = { pow2Exact, worstGeneralKEps: worstGenEps, worstAngleRadPositiveK: worstAngPos,
  worstAngleDeviationFromPiNegativeK: worstAngNegDelta, erfaOwnLinearityRel: erfaLin, erfaOwnLinearityEps: erfaLin / EPS };

// 11.3 the scale laws
const tanDelta = (d, q, e, emAu) => {
  const qdqpe = dot(q, [q[0] + e[0], q[1] + e[1], q[2] + e[2]]);
  const dlim = deflectionLimit(emAu);
  const w = SRS / emAu / Math.max(qdqpe, dlim);
  const deq = cross(d, cross(e, q));
  return { t: norm([w * deq[0], w * deq[1], w * deq[2]]) / norm(d), qdqpe, limited: qdqpe < dlim };
};
let wq = 0; let we = 0; let nq = 0; let ne = 0; let diverted = 0; let divertedNeg = 0; let onAxis = 0;
for (const v of FIX.vectors) {
  if (v.tilt) continue;
  const q = unit(v.qVec); const e = unit(v.eVec); const c = dot(q, e);
  const b = tanDelta(v.d, q, e, v.emAu);
  if (b.limited) continue;
  if (b.t === 0) { onAxis += 1; continue; }
  for (const lam of [1.0001, 0.999, 1.05, 0.5, 2]) {
    const g = tanDelta(v.d, q.map((x) => x * lam), e, v.emAu);
    if (g.limited) { diverted += 1; if (g.qdqpe < 0) divertedNeg += 1; continue; }
    wq = Math.max(wq, Math.abs((g.t - b.t) / b.t / ((1 - lam) / (lam + c)) - 1)); nq += 1;
  }
  for (const mu of [1.0001, 0.999, 1.05, 0.5, 2]) {
    const g = tanDelta(v.d, q, e.map((x) => x * mu), v.emAu);
    if (g.limited) { diverted += 1; if (g.qdqpe < 0) divertedNeg += 1; continue; }
    we = Math.max(we, Math.abs((g.t - b.t) / b.t / ((mu - 1) / (1 + mu * c)) - 1)); ne += 1;
  }
}
const cost = (elong) => {
  const v = FIX.vectors.find((x) => x.elongationDeg === elong && x.sourceAu === 5.2 && !x.near && !x.tilt);
  const q = unit(v.qVec); const e = unit(v.eVec);
  const b = tanDelta(v.d, q, e, v.emAu).t;
  const o = tanDelta(v.d, q.map((x) => x * 1.0001), e, v.emAu).t;
  return { deflectionArcsec: b * AS, percent: (100 * (o - b)) / b, arcsec: Math.abs(o - b) * AS };
};
out.scaleLaws = { qCases: nq, eCases: ne, worstQRel: wq, worstERel: we,
  perturbationsTotal: nq + ne + diverted, diverted, divertedWithNegativeDenominator: divertedNeg, onAxisSkipped: onAxis,
  cost: Object.fromEntries([0.3, 1, 5, 90].map((d) => [`${d}deg`, cost(d)])) };

// 11.4 / 11.5 the two routes
let worstClosed = 0; let worstRatio = 0; let worstNoisy = 0; let worstNoisyBound = 0; let inDomain = 0;
let worstNoisyAt = null;
for (const v of FIX.vectors) {
  const got = deflect(v.d, v.eVec, v.qVec, { enforceDomain: false });
  if (got.limiterActive) continue;
  const a = deflectionAngleOf(v.d, got);
  const b = deflectionAngleClosedForm(v.eVec, v.qVec);
  if (a === 0 && b === 0) continue;
  const rel = Math.abs(a - b) / b;
  const bound = (16 * EPS) / (1 + dot(unit(v.qVec), unit(v.eVec))) + 16 * EPS;
  worstClosed = Math.max(worstClosed, rel);
  worstRatio = Math.max(worstRatio, rel / bound);
  if (v.elongationDeg !== null && v.elongationDeg >= 5) inDomain = Math.max(inDomain, rel);
  const relNoisy = Math.abs(deflectionAngle(v.d, got.D) - a) / a;
  if (relNoisy > worstNoisy) { worstNoisy = relNoisy; worstNoisyAt = v; worstNoisyBound = (EPS * norm(v.d)) / norm(got.u); }
}
out.routes = { closedFormWorstRel: worstClosed, closedFormWorstRatioToBound: worstRatio,
  closedFormHeadroom: 1 / worstRatio, closedFormWorstRelInDomain: inDomain,
  noisyRouteWorstRel: worstNoisy, noisyRouteBoundAtWorst: worstNoisyBound,
  noisyRouteWorstAt: worstNoisyAt && { elongationDeg: worstNoisyAt.elongationDeg, sourceAu: worstNoisyAt.sourceAu, near: worstNoisyAt.near } };

// 11.6 the limiter
const eVec = [AU_KM, 0, 0]; const R = 30 * AU_KM;
const rampAt = (xi) => {
  const qVec = [-R * Math.cos(xi), R * Math.sin(xi), 0];
  const d = sub(qVec, eVec);
  const g = deflect(d, eVec, qVec, { enforceDomain: false });
  return { arcsec: deflectionAngleOf(d, g) * AS, limited: g.limiterActive };
};
out.limiter = {
  activeCases: FIX.vectors.filter((v) => deflect(v.d, v.eVec, v.qVec, { enforceDomain: false }).limiterActive).length,
  dlimBranches: { at0_39au: deflectionLimit(0.39), at1au: deflectionLimit(1), at5_2au: deflectionLimit(5.2) },
  ramp: Object.fromEntries([1e-6, 1e-5, 1e-4].map((x) => [`xi=${x}`, rampAt(x)])),
  threshold: FIX.vectors.filter((v) => v.thresholdFactor !== null && v.observerAu === 1)
    .map((v) => ({ factor: v.thresholdFactor,
      arcsec: deflectionAngleOf(v.d, deflect(v.d, v.eVec, v.qVec, { enforceDomain: false })) * AS,
      limited: deflect(v.d, v.eVec, v.qVec, { enforceDomain: false }).limiterActive })),
};

// 11.7 on axis
const ax = (label) => {
  const v = FIX.vectors.find((x) => x.axis === label);
  const g = deflect(v.d, v.eVec, v.qVec, { enforceDomain: false });
  return { qdqpe: g.qdqpe, limiterActive: g.limiterActive, uIsZero: g.u.every((x) => x === 0),
    dUnchanged: g.D.every((x, i) => x === v.d[i]), closedFormRad: deflectionAngleClosedForm(v.eVec, v.qVec) };
};
const offAxis = (xi) => {
  const qVec = [-R * Math.cos(xi), R * Math.sin(xi), 0];
  const d = sub(qVec, eVec);
  return { arcsec: deflectionAngleOf(d, deflect(d, eVec, qVec, { enforceDomain: false })) * AS,
    supported: deflectionDomain(d, eVec).supported };
};
out.onAxis = { aligned: ax('aligned'), antipodal: ax('antipodal'),
  tanPiOverTwo: Math.tan(Math.PI / 2), sinPi: Math.sin(Math.PI),
  offAxis: Object.fromEntries([1e-3, 2e-4].map((x) => [`xi=${x}`, offAxis(x)])) };

// ------------------------------------------------- section 12: the search
const DAY = 86400;
const OPEN = G.heliocentricPair();
const OPEN_EPH = G.packOf(OPEN.target, OPEN.observer, { nrec: 142, initEt: -71 * DAY });
const CONJ = G.heliocentricPair({ targetPhase: -Math.PI / 2 });
const CONJ_EPH = G.packOf(CONJ.target, CONJ.observer, { nrec: 142, initEt: -71 * DAY });
const WIN = [-70 * DAY, 70 * DAY];

const openTarget = G.lonExact(OPEN, 17.37 * DAY, true);
const openSpec = { body: 'Mars', targetDeg: openTarget, fromTdbSec: WIN[0], toTdbSec: WIN[1] };
const openBase = searchOfDateLongitude(OPEN_EPH, openSpec);
const openDef = searchDeflectedLongitude(OPEN_EPH, openSpec);
const shifts = openBase.events.map((e, i) => {
  const t = e.tdbSec;
  const O = OPEN.observer(t);
  const dv = sub(OPEN.target(t - norm(sub(OPEN.target(t), O)) / 299792.458), O);
  const g = deflect(dv, O, OPEN.target(t));
  const delta = Math.atan(norm(g.u) / norm(dv));
  const rate = (G.lonExact(OPEN, t + 30, true) - G.lonExact(OPEN, t - 30, true)) / 60;
  return {
    ofDateTdbSec: t,
    deflectedTdbSec: openDef.events[i].tdbSec,
    shiftSec: openDef.events[i].tdbSec - t,
    deflectionArcsec: delta * AS,
    boundSec: (delta * (180 / Math.PI)) / Math.abs(rate),
    bracketWidthSec: e.bracketWidthSec,
  };
});

const conjTarget = G.lonExact(CONJ, 40 * DAY, true);
const conjDef = searchDeflectedLongitude(CONJ_EPH, { body: 'Mars', targetDeg: conjTarget, fromTdbSec: WIN[0], toTdbSec: WIN[1] });
out.search = {
  insideDomain: {
    established: openDef.completeness.established,
    events: openDef.events.length,
    cells: openDef.execution.cells,
    evaluations: openDef.execution.evaluations,
    ofDateEvaluations: openBase.execution.evaluations,
    cellEvaluations: openDef.diagnostics.deflection.cellEvaluations,
    deflectedCellEvaluations: openDef.diagnostics.deflection.deflectedCellEvaluations,
    tightestLimiterMarginRatio: openDef.diagnostics.deflection.tightestLimiterMarginRatio,
    widestDeflectionArcsec: openDef.diagnostics.deflection.widestDeflectionArcsec,
    closestElongationDeg: openDef.diagnostics.deflection.closestElongationDeg,
    shifts,
  },
  throughConjunction: {
    status: conjDef.execution.status,
    established: conjDef.completeness.established,
    events: conjDef.events.length,
    excludedRuns: conjDef.accounting.excluded.length,
    excludedCells: conjDef.accounting.excludedCells,
    excludedSpanDays: conjDef.accounting.excluded.reduce((a, x) => a + (x.toTdbSec - x.fromTdbSec), 0) / DAY,
    unresolvedRuns: conjDef.accounting.unresolved.length,
    unresolvedCells: conjDef.accounting.unresolvedCells,
    unresolvedSpanSec: conjDef.accounting.unresolved.reduce((a, x) => a + (x.toTdbSec - x.fromTdbSec), 0),
    decidedSpans: conjDef.interval.decidedTdbSec.length,
    decidedFraction: conjDef.interval.decidedFraction,
    evaluations: conjDef.execution.evaluations,
  },
};

process.stdout.write(`${JSON.stringify(out, null, 1)}\n`);
