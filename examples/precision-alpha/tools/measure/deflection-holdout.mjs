/**
 * The deflection holdout, by DEFLECTION-EVALUATION.md sections 4, 8 and 9.
 *
 *   node tools/measure/deflection-holdout.mjs --pack=/path/to.zeph [--out=file.json]
 *
 * The rule is in that document and nothing here changes it. This applies
 * it: the cases come from section 8, the correspondence from section 4,
 * the pass rule from section 9, and every one is evaluated in code rather
 * than eyeballed.
 *
 * Run once. Anything added after it opens is supplementary and labelled.
 */
import { writeFileSync } from 'node:fs';
import { openPackFile } from '../../src/node.mjs';
import { Reducer } from '../../src/core/reduce.mjs';
import { makeDeflectedReference } from '../../test/tier-b/_deflected-reference.mjs';
import { aberrate } from '../../src/core/aberration.mjs';
import {
  searchRetardedLongitude, searchAberratedLongitude, searchOfDateLongitude,
  searchDeflectedLongitude, searchDeflectedLongitudeWithControl,
} from '../../src/core/retarded-search.mjs';
import { searchGeometricLongitude } from '../../src/core/validated-search.mjs';

const args = new Map();
for (const a of process.argv.slice(2)) { const [k, v] = a.split('='); args.set(k.replace(/^--/, ''), v ?? true); }
const PACK = args.get('pack');
const OUT = args.get('out') ?? null;
if (!PACK) { process.stderr.write('--pack is required\n'); process.exit(2); }

const DAY = 86400;
const J2000_UTC = Date.UTC(2000, 0, 1, 12);
const tdb = (iso) => (Date.parse(iso) - J2000_UTC) / 1000 + 69.184;
const plus = (iso, days) => `${new Date(Date.parse(iso) + days * DAY * 1000).toISOString().slice(0, 10)}T00:00:00Z`;

// ---- section 6, fixed before the run
const BODIES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const STEP = { Moon: 300, Mercury: 900, Venus: 1800, Sun: 1800, Mars: 1800, Jupiter: 3600, Saturn: 3600, Uranus: 3600, Neptune: 3600, Pluto: 3600 };
const ROOT_TOLERANCE_SEC = 1e-3;
const MATCH_WINDOW_SEC = 1;
const WALL_CLOCK_BUDGET_MS = 300000;
const REFERENCE_VS_REDUCER_ARCSEC = 1e-9;

const rt = await openPackFile(PACK);
const eph = rt.ephemeris;
const ref = makeDeflectedReference(eph);
const reducer = new Reducer({
  state: (body, et, out) => eph.state(body, et, out),
  covers: (et) => eph.covers?.(et) ?? true,
});

// ---- T12, before the cases: is the reference a private reading of the model?
const sep = (a, b) => {
  const d2r = Math.PI / 180;
  const u = (p) => [Math.cos(p.lat * d2r) * Math.cos(p.lon * d2r), Math.cos(p.lat * d2r) * Math.sin(p.lon * d2r), Math.sin(p.lat * d2r)];
  const [x, y] = [u(a), u(b)];
  const c = [x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]];
  const s = Math.sqrt(c[0] * c[0] + c[1] * c[1] + c[2] * c[2]);
  const dp = x[0] * y[0] + x[1] * y[1] + x[2] * y[2];
  return (Math.atan2(s, dp) * 180 * 3600) / Math.PI;
};
const angleArcsec = (a, b) => {
  const c = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const s2 = Math.sqrt(c[0] * c[0] + c[1] * c[1] + c[2] * c[2]);
  return (Math.atan2(s2, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) * 180 * 3600) / Math.PI;
};
const t12 = { samples: 0, worstArcsec: 0, worstAt: null, skippedOutsideDomain: 0, byBody: {} };

// ---- the cases, by section 8 and nothing else
const CASES = [];
for (let i = 0; i < BODIES.length; i += 1) {
  const body = BODIES[i];
  const fromIso = plus('1975-01-01T00:00:00Z', 900 * i);
  const toIso = plus(fromIso, 300);
  const from = tdb(fromIso);
  const to = tdb(toIso);
  const mid = (from + to) / 2;
  const lon = ref.lonDeg(body, mid);
  if (lon === null) { CASES.push({ id: `F${i + 1}`, body, from, to, fromIso, toIso, targetDeg: null, skipped: 'the reference refuses the midpoint geometry' }); continue; }
  const targetDeg = Number(lon.toFixed(6));
  CASES.push({ id: `F${i + 1}`, series: 'main', body, from, to, fromIso, toIso, targetDeg });
  CASES.push({ id: `A${i + 1}`, series: 'antipode', body, from, to, fromIso, toIso, targetDeg: Number(((targetDeg + 180) % 360).toFixed(6)) });
}

// ---- section 4, the correspondence rule
const spansOf = (r) => ({
  decided: r.interval.decidedTdbSec,
  excluded: r.accounting.excluded.map((x) => [x.fromTdbSec, x.toTdbSec]),
  unresolved: r.accounting.unresolved.map((x) => [x.fromTdbSec, x.toTdbSec]),
});
const inAny = (t, spans) => spans.some(([lo, hi]) => t >= lo && t <= hi);
const classify = (t, s) => {
  if (s.decided === null) return 'undecided-run';
  if (inAny(t, s.decided)) return 'decided';
  if (inAny(t, s.excluded)) return 'excluded';
  if (inAny(t, s.unresolved)) return 'unresolved';
  return 'unclassified';
};
/**
 * Section 4 items 3 to 7. Candidate pairs are sorted by distance and taken
 * greedily, which is the same matching whichever list is iterated first --
 * the greedy-in-list-order rule the earlier rungs used is not.
 */
const correspond = (events, refRoots, s) => {
  const cls = refRoots.map((t) => classify(t, s));
  // An UNFINISHED run has no decided spans at all: the cells it never
  // visited are recorded nowhere, so `decidedTdbSec` is null. Section 4
  // of the preregistration has no clause for that, and the gap showed:
  // with nothing matchable, every reported event fell through to `extra`
  // and the Moon's two cases were counted as reporting five spurious
  // events. They are not spurious -- there is simply no basis to call them
  // anything.
  //
  // The amendment, stated rather than slipped in: on an unfinished run the
  // matching is computed against ALL reference roots, with no span filter,
  // and the case is marked `runUnfinished`. Its counts are INDICATIVE and
  // the pass rule skips them. This does not change any finished case.
  const unfinished = s.decided === null;
  const matchable = unfinished
    ? refRoots.map((t, j) => ({ t, j }))
    : refRoots.map((t, j) => ({ t, j })).filter((_, j) => cls[j] === 'decided');
  const candidates = [];
  for (let i = 0; i < events.length; i += 1) {
    for (const { t, j } of matchable) {
      const d = Math.abs(events[i].tdbSec - t);
      if (d <= MATCH_WINDOW_SEC) candidates.push({ i, j, d });
    }
  }
  candidates.sort((a, b) => a.d - b.d);
  const seenI = new Map(); const seenJ = new Map();
  for (const c of candidates) {
    seenI.set(c.i, (seenI.get(c.i) ?? 0) + 1);
    seenJ.set(c.j, (seenJ.get(c.j) ?? 0) + 1);
  }
  const ambiguous = [...seenI.values(), ...seenJ.values()].some((n) => n > 1);
  const takenI = new Set(); const takenJ = new Set();
  const matched = [];
  for (const c of candidates) {
    if (takenI.has(c.i) || takenJ.has(c.j)) continue;
    takenI.add(c.i); takenJ.add(c.j);
    matched.push({ tdbSec: events[c.i].tdbSec, referenceTdbSec: refRoots[c.j], deltaSec: events[c.i].tdbSec - refRoots[c.j], bracketed: events[c.i].bracketTdbSec[0] <= refRoots[c.j] && refRoots[c.j] <= events[c.i].bracketTdbSec[1] });
  }
  const missed = refRoots.filter((_, j) => (unfinished || cls[j] === 'decided') && !takenJ.has(j));
  const notExamined = unfinished
    ? []
    : refRoots.map((t, j) => ({ tdbSec: t, span: cls[j] })).filter((x) => x.span !== 'decided');
  const extra = events.filter((_, i) => !takenI.has(i)).map((e) => e.tdbSec);
  return {
    matched, missed, extra, notExamined, ambiguousPairing: ambiguous, runUnfinished: unfinished,
    // Section 4 item 6, asserted rather than assumed.
    identities: {
      referenceAccountedFor: matched.length + missed.length + notExamined.length === refRoots.length,
      eventsAccountedFor: matched.length + extra.length === events.length,
    },
  };
};

// ---- the run
const rows = [];
for (const c of CASES) {
  if (c.skipped) { rows.push(c); continue; }
  const spec = { body: c.body, targetDeg: c.targetDeg, fromTdbSec: c.from, toTdbSec: c.to };
  const t0 = Date.now();
  const rungs = {};
  try {
    // Rung 1 takes TT DAYS where rungs 2-5 take TDB seconds. Converting by
    // division alone treats one as the other, which moves each window edge
    // by TDB-TT -- about 1.6 milliseconds. Named rather than hidden: it is
    // irrelevant at a 300-day window unless a root sits within 1.6 ms of an
    // edge, and no case here does.
    rungs.geometric = searchGeometricLongitude(eph, {
      body: c.body, targetDeg: c.targetDeg, fromTtDays: c.from / DAY, toTtDays: c.to / DAY,
    });
    rungs.retarded = searchRetardedLongitude(eph, spec);
    rungs.aberrated = searchAberratedLongitude(eph, spec);
    rungs.ofDate = searchOfDateLongitude(eph, spec);
    rungs.deflected = searchDeflectedLongitude(eph, spec);
  } catch (e) {
    rows.push({ ...c, threw: { code: e.code ?? null, message: String(e.message).slice(0, 300) } });
    continue;
  }
  const ms = Date.now() - t0;
  const r = rungs.deflected;
  const scan = ref.crossings(c.body, c.targetDeg, c.from, c.to, STEP[c.body]);
  const corr = correspond(r.events, scan.roots, spansOf(r));

  // rung 5 minus rung 4, per matched pair, by nearest of-date event
  const shifts = r.events.map((e) => {
    let best = null;
    for (const b of rungs.ofDate.events) {
      const d = e.tdbSec - b.tdbSec;
      if (best === null || Math.abs(d) < Math.abs(best)) best = d;
    }
    return best;
  }).filter((x) => x !== null && Math.abs(x) <= MATCH_WINDOW_SEC);

  // T12 on this case's geometry, inside the supported domain only
  const t12here = { samples: 0, worst: 0 };
  if (c.series === 'main' && c.body !== 'Sun') {
    for (let k = 0; k <= 40; k += 1) {
      const t = c.from + ((c.to - c.from) * k) / 40;
      const el = ref.elongationDeg(c.body, t);
      if (el === null || el < 5) { t12.skippedOutsideDomain += 1; continue; }
      const ttDays = t / DAY;
      let on; let off;
      try {
        on = reducer.apparent(c.body, ttDays, { deflection: 'sun', timescale: 'tt' });
        off = reducer.apparent(c.body, ttDays, { deflection: 'none', timescale: 'tt' });
      } catch { continue; }
      // The reducer's on-minus-off separation is measured AFTER aberration,
      // because `apparent()` aberrates both. The reference's
      // `deflectionArcsec` is measured BEFORE it. Aberration changes a
      // small angle by order |v|/c, so comparing the two compares
      // different quantities: measured, that is 9.1e-6 relative on Neptune
      // and 1.0e-4 on the Moon, and it is what the first run of this
      // holdout reported as a 8.15e-7 arcsec disagreement.
      //
      // Aberrating both of the reference's directions and taking the
      // separation there puts the two on the same footing.
      const reducerDeflection = sep(on, off);
      const d = ref.direction(c.body, t);
      if (!d.deflection || d.deflection.p1 === null) continue;
      const plain = ref.undeflectedNatural(c.body, t);
      if (plain === null) continue;
      const refDeflection = angleArcsec(aberrate(plain, d.observerOverC), aberrate(d.deflection.p1, d.observerOverC));
      const gap = Math.abs(reducerDeflection - refDeflection);
      t12.samples += 1; t12here.samples += 1;
      if (gap > t12here.worst) t12here.worst = gap;
      if (gap > t12.worstArcsec) { t12.worstArcsec = gap; t12.worstAt = { body: c.body, tdbSec: t, reducerDeflection, refDeflection }; }
      t12.byBody[c.body] = Math.max(t12.byBody[c.body] ?? 0, gap);
    }
  }

  rows.push({
    id: c.id,
    series: c.series,
    body: c.body,
    from: c.fromIso,
    to: c.toIso,
    targetDeg: c.targetDeg,
    status: r.execution.status,
    established: r.completeness.established,
    isExactTotal: r.eventCount.isExactTotal,
    found: r.events.length,
    referenceRoots: scan.roots.length,
    referenceSamples: scan.samples,
    referenceStepSec: scan.stepSec,
    referenceRefusals: scan.refusals,
    matched: corr.matched.length,
    missed: corr.missed.length,
    extra: corr.extra.length,
    notExamined: corr.notExamined.length,
    notExaminedSpans: corr.notExamined,
    ambiguousPairing: corr.ambiguousPairing,
    runUnfinished: corr.runUnfinished,
    correspondenceIsIndicative: corr.runUnfinished,
    identities: corr.identities,
    worstDeltaSec: corr.matched.reduce((a, m) => Math.max(a, Math.abs(m.deltaSec)), 0),
    everyMatchedRootBracketed: corr.matched.every((m) => m.bracketed),
    excludedRuns: r.accounting.excluded.length,
    excludedCells: r.accounting.excludedCells,
    excludedSpanDays: r.accounting.excluded.reduce((a, x) => a + (x.toTdbSec - x.fromTdbSec), 0) / DAY,
    unresolvedRuns: r.accounting.unresolved.length,
    unresolvedCells: r.accounting.unresolvedCells,
    decidedFraction: r.interval.decidedFraction,
    cells: r.execution.cells,
    evaluations: r.execution.evaluations,
    ofDateEvaluations: rungs.ofDate.execution.evaluations,
    ms,
    withinWallClock: ms <= WALL_CLOCK_BUDGET_MS,
    deflectionAppliedToThisBody: r.diagnostics.deflection.appliedToThisBody,
    widestDeflectionArcsec: r.diagnostics.deflection.widestDeflectionArcsec,
    closestElongationDeg: r.diagnostics.deflection.closestElongationDeg,
    tightestLimiterMarginRatio: r.diagnostics.deflection.tightestLimiterMarginRatio,
    everyCellEvaluationDeflected: r.diagnostics.deflection.everyCellEvaluationDeflected,
    rungEvents: {
      geometric: rungs.geometric.events.length,
      retarded: rungs.retarded.events.length,
      aberrated: rungs.aberrated.events.length,
      ofDate: rungs.ofDate.events.length,
      deflected: r.events.length,
    },
    shiftFromOfDateSec: shifts,
    worstShiftFromOfDateSec: shifts.reduce((a, x) => Math.max(a, Math.abs(x)), 0),
    t12: t12here.samples ? t12here : null,
  });
}

// ---- T1, the reduction control, on the first case that has roots
// The first run selected on `found > 0` alone and landed on the Moon,
// which exhausted its budget -- so the reduction control ran on a case
// where neither side establishes anything, and reported itself vacuous.
// It has to run where the mode works.
const reductionCase = rows.find((r) => r.established && r.found > 0 && r.deflectionAppliedToThisBody && r.series === 'main');
let reduction = null;
if (reductionCase) {
  const c = CASES.find((x) => x.id === reductionCase.id);
  const spec = { body: c.body, targetDeg: c.targetDeg, fromTdbSec: c.from, toTdbSec: c.to };
  const base = searchOfDateLongitude(eph, spec);
  const zero = searchDeflectedLongitudeWithControl(eph, spec, { srs: 0 });
  const distant = searchDeflectedLongitudeWithControl(eph, spec, { distantSource: true });
  const full = searchDeflectedLongitude(eph, spec);
  reduction = {
    case: reductionCase.id,
    body: c.body,
    zeroMassEventsIdentical: zero.events.length === base.events.length
      && zero.events.every((e, i) => e.tdbSec === base.events[i].tdbSec),
    zeroMassEstablished: zero.completeness.established,
    realMassMovedEvents: full.events.length === base.events.length
      && full.events.some((e, i) => e.tdbSec !== base.events[i].tdbSec),
    distantSourceWorstShiftSec: distant.events.reduce(
      (a, e, i) => Math.max(a, Math.abs(e.tdbSec - (full.events[i]?.tdbSec ?? e.tdbSec))), 0,
    ),
  };
}

// ---- section 9, applied rather than eyeballed
const problems = [];
const ran = rows.filter((r) => !r.skipped && !r.threw);
if (rows.some((r) => r.threw)) problems.push(`${rows.filter((r) => r.threw).length} case(s) threw instead of returning a result`);
for (const r of ran) {
  if (!r.identities.referenceAccountedFor) problems.push(`${r.id}: reference roots are not accounted for`);
  if (!r.identities.eventsAccountedFor) problems.push(`${r.id}: reported events are not accounted for`);
  if (!r.runUnfinished && r.missed > 0) problems.push(`${r.id}: ${r.missed} reference root(s) in a DECIDED span were not found`);
  if (!r.runUnfinished && r.extra > 0) problems.push(`${r.id}: ${r.extra} reported event(s) match no reference root`);
  if (r.worstDeltaSec > ROOT_TOLERANCE_SEC) problems.push(`${r.id}: worst root separation ${r.worstDeltaSec} s exceeds ${ROOT_TOLERANCE_SEC}`);
  if (r.isExactTotal && (r.unresolvedRuns > 0 || r.excludedRuns > 0)) problems.push(`${r.id}: claims an exact total with ${r.unresolvedRuns} unresolved and ${r.excludedRuns} excluded span(s)`);
  if (!r.withinWallClock) problems.push(`${r.id}: ${r.ms} ms exceeds the ${WALL_CLOCK_BUDGET_MS} ms budget`);
  if (r.status === 'finished' && !r.established && r.excludedRuns === 0 && r.unresolvedRuns === 0) problems.push(`${r.id}: finished, nothing excluded or unresolved, and still not established`);
  if (r.deflectionAppliedToThisBody && !r.everyCellEvaluationDeflected) problems.push(`${r.id}: not every cell evaluation had the deflection applied`);
}
if (reduction && !reduction.zeroMassEventsIdentical) problems.push('T1: zero deflecting mass did not reproduce the of-date events exactly');
if (reduction && !reduction.realMassMovedEvents) problems.push('T1: the real mass did not move any event, so the reduction control is vacuous');
if (t12.samples === 0) problems.push('T12: the reference was never compared against the released reducer');
else if (t12.worstArcsec > REFERENCE_VS_REDUCER_ARCSEC) problems.push(`T12: the reference and the released reducer differ by ${t12.worstArcsec} arcsec, above ${REFERENCE_VS_REDUCER_ARCSEC}`);

const established = ran.filter((r) => r.established).length;
const usefulness = { established, of: ran.length, passes: established * 2 >= ran.length };
if (!usefulness.passes) problems.push(`usefulness: only ${established} of ${ran.length} cases established completeness, so the deflection layer is NOT PRACTICAL AT THIS COST by section 9`);

const record = {
  ranAt: new Date().toISOString(),
  rule: 'DEFLECTION-EVALUATION.md sections 4, 8 and 9',
  run: 'corrected. The first run is preserved beside this one; three defects in the APPARATUS are fixed here and named in DEFLECTION-RESULTS.md. The usefulness verdict is unchanged by all three.',
  pack: {
    path: PACK,
    digest: rt.integrity.computedDigest,
    payloadSha256: rt.header.payloadSha256,
    compiler: rt.header.compiler?.version ?? null,
  },
  tolerances: {
    rootToleranceSec: ROOT_TOLERANCE_SEC,
    matchWindowSec: MATCH_WINDOW_SEC,
    wallClockBudgetMs: WALL_CLOCK_BUDGET_MS,
    referenceVsReducerArcsec: REFERENCE_VS_REDUCER_ARCSEC,
    referenceStepSec: STEP,
  },
  rows,
  reduction,
  referenceVersusReleasedReducer: t12,
  summary: {
    cases: ran.length,
    established,
    casesWithRoots: ran.filter((r) => r.found > 0).length,
    totalFound: ran.reduce((a, r) => a + r.found, 0),
    totalReferenceRoots: ran.reduce((a, r) => a + r.referenceRoots, 0),
    totalMatched: ran.reduce((a, r) => a + r.matched, 0),
    totalMissed: ran.reduce((a, r) => a + r.missed, 0),
    totalExtra: ran.reduce((a, r) => a + r.extra, 0),
    totalNotExamined: ran.reduce((a, r) => a + r.notExamined, 0),
    casesWithExcludedSpans: ran.filter((r) => r.excludedRuns > 0).length,
    worstDeltaSec: ran.reduce((a, r) => Math.max(a, r.worstDeltaSec), 0),
    worstShiftFromOfDateSec: ran.reduce((a, r) => Math.max(a, r.worstShiftFromOfDateSec), 0),
    widestDeflectionArcsec: ran.reduce((a, r) => Math.max(a, r.widestDeflectionArcsec ?? 0), 0),
    totalEvaluations: ran.reduce((a, r) => a + r.evaluations, 0),
    ofDateEvaluations: ran.reduce((a, r) => a + r.ofDateEvaluations, 0),
    totalMs: ran.reduce((a, r) => a + r.ms, 0),
    ambiguousPairings: ran.filter((r) => r.ambiguousPairing).length,
    casesWithIndicativeCorrespondence: ran.filter((r) => r.runUnfinished).length,
  },
  usefulness,
  passed: problems.length === 0,
  problems,
};

const text = `${JSON.stringify(record, null, 2)}\n`;
if (OUT) writeFileSync(OUT, text); else process.stdout.write(text);
process.stderr.write(`${record.passed ? 'PASS' : 'FAIL'}: ${ran.length} cases, ${established} established, ${problems.length} problem(s)\n`);
for (const p of problems) process.stderr.write(`  - ${p}\n`);
