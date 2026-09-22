/**
 * The partition evaluation, by PARTITION-EVALUATION.md sections 5, 6 and 7.
 *
 *   node tools/measure/partition-evaluation.mjs --pack=/path/to.zeph \
 *        [--out=file.json] [--epoch=1975-01-01T00:00:00Z] [--case=F2]
 *        [--repeat=4] [--label=regression]
 *
 * Every threshold here is quoted from that document, which was committed
 * before the tuning began. Nothing in this file may quietly disagree with
 * it: where a number appears below, the section it comes from is named.
 *
 * The same construction serves the regression corpus (epoch 1975-01-01,
 * section 8 of DEFLECTION-EVALUATION.md) and the fresh holdout (epoch
 * 2007-03-15, section 7 here). The epoch is the ONLY declared difference.
 *
 * Research tool. Not in the published archive and not in the site build.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { openPackFile } from '../../src/node.mjs';
import { makeDeflectedReference } from '../../test/tier-b/_deflected-reference.mjs';
import { searchDeflectedLongitude } from '../../src/core/retarded-search.mjs';
import { searchDeflectedOverPartition } from '../../src/core/partitioned-search.mjs';
import { partitionDomain, PARTITION_DEFAULTS } from '../../src/core/domain-partition.mjs';
import { DEFLECTION_PROFILE } from '../../src/core/deflection.mjs';

const args = new Map();
for (const a of process.argv.slice(2)) { const [k, v] = a.split('='); args.set(k.replace(/^--/, ''), v ?? true); }
const PACK = args.get('pack');
const OUT = args.get('out') ?? null;
const EPOCH = args.get('epoch') ?? '1975-01-01T00:00:00Z';
const ONE = args.get('case') ?? null;
const REPEAT = Number(args.get('repeat') ?? 4);
const LABEL = args.get('label') ?? (EPOCH.startsWith('1975') ? 'regression' : 'holdout');
if (!PACK) { process.stderr.write('--pack is required\n'); process.exit(2); }

const DAY = 86400;
const J2000_UTC = Date.UTC(2000, 0, 1, 12);
const tdb = (iso) => (Date.parse(iso) - J2000_UTC) / 1000 + 69.184;
const plus = (iso, days) => `${new Date(Date.parse(iso) + days * DAY * 1000).toISOString().slice(0, 10)}T00:00:00Z`;

// ---------------------------------------------------- the frozen constants
/** DEFLECTION-EVALUATION.md section 6, unchanged and not reset anywhere. */
const BODIES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const STEP = { Moon: 300, Mercury: 900, Venus: 1800, Sun: 1800, Mars: 1800, Jupiter: 3600, Saturn: 3600, Uranus: 3600, Neptune: 3600, Pluto: 3600 };
const ROOT_TOLERANCE_SEC = 1e-3;
const MATCH_WINDOW_SEC = 1;
const WALL_CLOCK_BUDGET_MS = 300000;
/** PARTITION-EVALUATION.md section 3. One allowance for the whole request. */
const MAX_EVALUATIONS = 4_000_000;
const MAX_CELLS = 400_000;
/** PARTITION-EVALUATION.md section 4, frozen before any target was written. */
const BOUNDARY_TOLERANCE_SEC = PARTITION_DEFAULTS.boundaryToleranceSec;
const RELIGHT_WIDTH_RATIO = PARTITION_DEFAULTS.relightWidthRatio;
/** PARTITION-EVALUATION.md section 6, each with the baseline it came from. */
const P2_APPROACH_DEG = 0.5;
const P3_BOUNDARY_FRACTION = 0.01;
const P4_FACTOR = 4;
const P5_FACTOR = 2;
const P7_ORIGINAL_SCORE = 6;
/**
 * Section 6 names these cases by id, for the regression corpus only. The
 * holdout's windows are different windows, so the names cannot carry over;
 * the derived rule below is used there and is reported as derived.
 */
const NAMED_CONJUNCTION_HEAVY = ['F2', 'A2', 'F3', 'F7'];
const NAMED_NO_CONJUNCTION = ['F6', 'F1', 'F10'];
/**
 * The derived rule, stated before the run: a case is conjunction-heavy
 * when the partition PROVES some of its window excluded, and has no
 * conjunction when it proves none. It is checked against the named lists
 * on the regression corpus, and any disagreement is reported rather than
 * resolved in favour of either.
 */
const derivedClass = (row) => (row.partition.excludedSec > 0 ? 'conjunction-heavy' : 'no-conjunction');

const rt = await openPackFile(PACK);
const eph = rt.ephemeris;
const ref = makeDeflectedReference(eph);
const packDigest = rt.integrity?.computedDigest ?? null;
if (!packDigest) { process.stderr.write("the pack did not report a computed digest; a partition key without one is not an identity\n"); process.exit(2); }

// ------------------------------------------------------------- the cases
const CASES = [];
for (let i = 0; i < BODIES.length; i += 1) {
  const body = BODIES[i];
  const fromIso = plus(EPOCH, 900 * i);
  const toIso = plus(fromIso, 300);
  const from = tdb(fromIso);
  const to = tdb(toIso);
  const lon = ref.lonDeg(body, (from + to) / 2);
  if (lon === null) {
    CASES.push({ id: `F${i + 1}`, body, fromIso, toIso, skipped: 'the reference refuses the midpoint geometry' });
    CASES.push({ id: `A${i + 1}`, body, fromIso, toIso, skipped: 'the reference refuses the midpoint geometry' });
    continue;
  }
  const targetDeg = Number(lon.toFixed(6));
  CASES.push({ id: `F${i + 1}`, series: 'main', body, from, to, fromIso, toIso, targetDeg });
  CASES.push({ id: `A${i + 1}`, series: 'antipode', body, from, to, fromIso, toIso, targetDeg: Number(((targetDeg + 180) % 360).toFixed(6)) });
}

// --------------------------------------------------------------- helpers
const total = (spans) => spans.reduce((a, [lo, hi]) => a + (hi - lo), 0);
const inAny = (t, spans) => spans.some(([lo, hi]) => t >= lo && t <= hi);

/**
 * P-2, applied to one boundary span. The partition's own enclosure is not
 * consulted: the elongation is sampled INDEPENDENTLY, through the tier-b
 * reference, and the question is how close to the floor it ever comes.
 *
 * A span that never approaches the floor is a failure of the partition --
 * it would mean the classifier stopped bisecting somewhere the geometry
 * gave it no reason to.
 */
function approachesFloor(body, [lo, hi]) {
  const floor = DEFLECTION_PROFILE.minElongationDeg;
  const n = 64;
  let best = Infinity;
  let refusals = 0;
  for (let k = 0; k <= n; k += 1) {
    const t = lo + ((hi - lo) * k) / n;
    const el = ref.elongationDeg(body, t);
    if (el === null) { refusals += 1; continue; }
    best = Math.min(best, Math.abs(el - floor));
  }
  return { closestApproachDeg: Number.isFinite(best) ? best : null, refusals, samples: n + 1 - refusals };
}

/** Greedy nearest-pair matching, the same rule section 4 of the holdout uses. */
function match(events, roots) {
  const candidates = [];
  for (let i = 0; i < events.length; i += 1) {
    for (let j = 0; j < roots.length; j += 1) {
      const d = Math.abs(events[i].tdbSec - roots[j]);
      if (d <= MATCH_WINDOW_SEC) candidates.push({ i, j, d });
    }
  }
  candidates.sort((a, b) => a.d - b.d);
  const takenI = new Set(); const takenJ = new Set();
  const matched = [];
  for (const c of candidates) {
    if (takenI.has(c.i) || takenJ.has(c.j)) continue;
    takenI.add(c.i); takenJ.add(c.j);
    const e = events[c.i];
    matched.push({
      tdbSec: e.tdbSec,
      referenceTdbSec: roots[c.j],
      deltaSec: e.tdbSec - roots[c.j],
      bracketed: e.bracketTdbSec[0] <= roots[c.j] && roots[c.j] <= e.bracketTdbSec[1],
    });
  }
  return { matched, unmatchedEvents: events.filter((_, i) => !takenI.has(i)), unmatchedRoots: roots.filter((_, j) => !takenJ.has(j)) };
}

// ----------------------------------------------------------------- the run
const rows = [];
const scanCache = new Map();
for (const c of CASES) {
  if (ONE && c.id !== ONE) continue;
  if (c.skipped) { rows.push({ id: c.id, body: c.body, skipped: c.skipped }); continue; }
  const spec = { body: c.body, targetDeg: c.targetDeg, fromTdbSec: c.from, toTdbSec: c.to };

  // --- the baseline: the ORIGINAL search, unchanged, same budget
  const t0 = Date.now();
  const base = searchDeflectedLongitude(eph, { ...spec, maxEvaluations: MAX_EVALUATIONS, maxCells: MAX_CELLS });
  const baseMs = Date.now() - t0;

  // --- the partitioned path, COLD: partition cost charged to this request
  const t1 = Date.now();
  const part = searchDeflectedOverPartition(eph, {
    ...spec,
    packDigest,
    boundaryToleranceSec: BOUNDARY_TOLERANCE_SEC,
    relightWidthRatio: RELIGHT_WIDTH_RATIO,
    maxEvaluations: MAX_EVALUATIONS,
    maxCells: MAX_CELLS,
  });
  const partMs = Date.now() - t1;

  // --- the independent reference, for bracketing and for P-6
  const scanKey = `${c.body}|${c.targetDeg}|${c.from}|${c.to}`;
  if (!scanCache.has(scanKey)) scanCache.set(scanKey, ref.crossings(c.body, c.targetDeg, c.from, c.to, STEP[c.body]));
  const scan = scanCache.get(scanKey);

  // --- P-2: every boundary span must come within 0.5 deg of the floor
  const boundaryProbes = part.plan.boundary.map((s) => ({ span: s, widthSec: s[1] - s[0], ...approachesFloor(c.body, s) }));
  const p2Failures = boundaryProbes.filter((p) => p.closestApproachDeg === null || p.closestApproachDeg > P2_APPROACH_DEG);

  // --- P-3: total boundary width against the requested window
  const requestSec = c.to - c.from;
  const boundaryFraction = part.accounting.boundarySec / requestSec;

  // --- P-6: every baseline event inside a PROVED-ADMISSIBLE span found again
  const adm = part.plan.admissible;
  const baseInAdmissible = base.events.filter((e) => inAny(e.tdbSec, adm));
  const refound = baseInAdmissible.filter((e) => part.events.some((q) => Math.abs(q.tdbSec - e.tdbSec) <= MATCH_WINDOW_SEC));
  const lost = baseInAdmissible.filter((e) => !refound.includes(e));
  const m = match(part.events, scan.roots);
  const rootsInAdmissible = scan.roots.filter((t) => inAny(t, adm));
  const matchedInAdmissible = m.matched.filter((x) => inAny(x.referenceTdbSec, adm));

  rows.push({
    id: c.id,
    series: c.series,
    body: c.body,
    from: c.fromIso,
    to: c.toIso,
    targetDeg: c.targetDeg,
    requestDays: requestSec / DAY,
    baseline: {
      status: base.execution.status,
      established: base.completeness.established,
      events: base.events.length,
      evaluations: base.execution.evaluations,
      cells: base.execution.cells,
      ms: baseMs,
      withinWallClock: baseMs <= WALL_CLOCK_BUDGET_MS,
      excludedSpanDays: base.accounting.excluded.reduce((a, x) => a + (x.toTdbSec - x.fromTdbSec), 0) / DAY,
      unresolvedRuns: base.accounting.unresolved.length,
    },
    partition: {
      status: part.execution.status,
      finished: part.execution.finished,
      reason: part.execution.reason,
      events: part.events.length,
      eligibilityEstablished: part.eventCount.eligibilityEstablished,
      eligibilityAmbiguous: part.eventCount.eligibilityAmbiguous,
      overRequest: part.completeness.overRequest,
      exhaustiveOverAdmissible: part.completeness.exhaustiveOverAdmissible,
      mayHoldUnfoundSupportedEvents: part.completeness.mayHoldUnfoundSupportedEvents,
      evaluations: part.execution.evaluations,
      partitionEvaluations: part.execution.partitionEvaluations,
      searchEvaluations: part.execution.searchEvaluations,
      cells: part.execution.cells,
      ms: partMs,
      withinWallClock: partMs <= WALL_CLOCK_BUDGET_MS,
      admissibleSec: part.accounting.admissibleSec,
      excludedSec: part.accounting.excludedSec,
      boundarySec: part.accounting.boundarySec,
      unprocessedSec: part.accounting.unprocessedSec,
      coversRequestExactly: part.accounting.coversRequestExactly,
      admissibleSpans: adm.length,
      excludedSpans: part.plan.excluded.length,
      boundarySpans: part.plan.boundary.length,
      narrowestBoundarySec: part.plan.diagnostics.narrowestBoundarySec,
      widestBoundarySec: part.plan.diagnostics.widestBoundarySec,
    },
    reference: {
      roots: scan.roots.length,
      samples: scan.samples,
      stepSec: scan.stepSec,
      refusals: scan.refusals,
      rootsInAdmissible: rootsInAdmissible.length,
    },
    correspondence: {
      matched: m.matched.length,
      matchedInAdmissible: matchedInAdmissible.length,
      worstDeltaSec: m.matched.reduce((a, x) => Math.max(a, Math.abs(x.deltaSec)), 0),
      everyMatchedRootBracketed: m.matched.every((x) => x.bracketed),
      withinRootTolerance: m.matched.every((x) => Math.abs(x.deltaSec) <= ROOT_TOLERANCE_SEC) || null,
      unmatchedPartitionEvents: m.unmatchedEvents.length,
      unmatchedReferenceRootsInAdmissible: rootsInAdmissible.length - matchedInAdmissible.length,
    },
    p2: {
      boundarySpansProbed: boundaryProbes.length,
      worstClosestApproachDeg: boundaryProbes.reduce((a, p) => Math.max(a, p.closestApproachDeg ?? Infinity), 0),
      failures: p2Failures.length,
      failingSpans: p2Failures.slice(0, 5).map((p) => ({ span: p.span, widthSec: p.widthSec, closestApproachDeg: p.closestApproachDeg })),
    },
    p3: { boundaryFraction, limit: P3_BOUNDARY_FRACTION, pass: boundaryFraction <= P3_BOUNDARY_FRACTION },
    p6: {
      baselineEventsInAdmissible: baseInAdmissible.length,
      refound: refound.length,
      lost: lost.length,
      lostAt: lost.map((e) => e.tdbSec),
      claimsNoCompletenessOverExcludedRequest: !(part.completeness.overRequest && part.accounting.excludedSec > 0),
      claimsNoExhaustivenessWithLiveBoundary: !(part.completeness.exhaustiveOverAdmissible && part.completeness.mayHoldUnfoundSupportedEvents === undefined),
    },
    ratio: base.execution.evaluations / Math.max(1, part.execution.evaluations),
    /**
     * A baseline that stopped on its budget did not report a COST, it
     * reported a ceiling. The ratio above is then a lower bound on the
     * true factor, and P-4 is scored on it literally anyway: the
     * preregistration knew these two cases were exhausted when it set the
     * target, so re-reading the denominator now would be changing the
     * rule after seeing the result. The annotation is commentary beside
     * the score, not a substitute for it.
     */
    ratioIsLowerBound: base.execution.status !== 'finished',
    derivedClass: null,
  });
  process.stderr.write(`${c.id} ${c.body}: baseline ${base.execution.evaluations} (${base.execution.status}) -> partition ${part.execution.evaluations} (${part.execution.status}), ${(base.execution.evaluations / Math.max(1, part.execution.evaluations)).toFixed(2)}x\n`);
}
for (const r of rows) if (!r.skipped) r.derivedClass = derivedClass(r);

// ------------------------------------------- section 5: cold vs repeated
/**
 * The same partition answering several longitudes. The partition is paid
 * for ONCE; each longitude is a separate request with its own budget, and
 * the baseline is run on the same longitudes so the break-even is computed
 * rather than estimated.
 */
const longitudesFor = (t) => Array.from({ length: REPEAT }, (_, k) => Number((((t + 90 * k) % 360 + 360) % 360).toFixed(6)));
const repeated = [];
for (const c of CASES) {
  if (ONE && c.id !== ONE) continue;
  if (c.skipped || c.series !== 'main') continue;
  const targets = longitudesFor(c.targetDeg);
  const tp = Date.now();
  const plan = partitionDomain(eph, {
    body: c.body,
    fromTdbSec: c.from,
    toTdbSec: c.to,
    boundaryToleranceSec: BOUNDARY_TOLERANCE_SEC,
    relightWidthRatio: RELIGHT_WIDTH_RATIO,
    packDigest,
    maxEvaluations: MAX_EVALUATIONS,
    maxCells: MAX_CELLS,
  });
  const planMs = Date.now() - tp;
  let warmEval = 0; let warmMs = 0; let baseEval = 0; let baseMs = 0; let reusedAll = true;
  for (const targetDeg of targets) {
    const spec = { body: c.body, targetDeg, fromTdbSec: c.from, toTdbSec: c.to };
    const t2 = Date.now();
    const q = searchDeflectedOverPartition(eph, { ...spec, plan, packDigest, maxEvaluations: MAX_EVALUATIONS, maxCells: MAX_CELLS });
    warmMs += Date.now() - t2;
    warmEval += q.execution.evaluations;
    if (!q.execution.partitionReused) reusedAll = false;
    const t3 = Date.now();
    const bq = searchDeflectedLongitude(eph, { ...spec, maxEvaluations: MAX_EVALUATIONS, maxCells: MAX_CELLS });
    baseMs += Date.now() - t3;
    baseEval += bq.execution.evaluations;
  }
  const perQueryWarm = warmEval / targets.length;
  const perQueryBase = baseEval / targets.length;
  const saving = perQueryBase - perQueryWarm;
  repeated.push({
    id: c.id,
    body: c.body,
    longitudes: targets,
    partitionEvaluations: plan.execution.evaluations,
    partitionMs: planMs,
    partitionReusedEveryQuery: reusedAll,
    perQueryWarmEvaluations: perQueryWarm,
    perQueryBaselineEvaluations: perQueryBase,
    warmTotalEvaluations: warmEval,
    baselineTotalEvaluations: baseEval,
    warmMs,
    baselineMs: baseMs,
    /**
     * n such that partition + n*warm < n*baseline. Null when a single
     * query already costs more warm than baseline -- there is then no n,
     * and reporting a number would invent one.
     */
    breakEvenQueries: saving > 0 ? Math.floor(plan.execution.evaluations / saving) + 1 : null,
    breakEvenNote: saving > 0 ? null : 'no break-even: a warm query costs at least as much as a baseline query on this case',
  });
  process.stderr.write(`${c.id} repeated: plan ${plan.execution.evaluations}, warm ${perQueryWarm.toFixed(0)}/query vs baseline ${perQueryBase.toFixed(0)}/query\n`);
}

// ------------------------------------------------------- section 6 scoring
const live = rows.filter((r) => !r.skipped);
const named = (ids) => live.filter((r) => ids.includes(r.id));
const useNames = LABEL === 'regression' && !ONE;
const heavy = useNames ? named(NAMED_CONJUNCTION_HEAVY) : live.filter((r) => r.derivedClass === 'conjunction-heavy');
const light = useNames ? named(NAMED_NO_CONJUNCTION) : live.filter((r) => r.derivedClass === 'no-conjunction');

const moon = live.filter((r) => r.body === 'Moon');
const p1 = {
  target: 'both Moon cases reach finished within the unchanged 4,000,000-evaluation whole-request budget',
  baseline: moon.map((r) => ({ id: r.id, status: r.baseline.status, evaluations: r.baseline.evaluations })),
  now: moon.map((r) => ({ id: r.id, status: r.partition.status, evaluations: r.partition.evaluations, events: r.partition.events })),
  pass: moon.length === 0 ? null : moon.every((r) => r.partition.status === 'finished' && r.partition.evaluations <= MAX_EVALUATIONS),
  notScored: moon.length === 0 ? 'no Moon case in this run' : null,
};
const p2 = {
  target: `every reported boundary span comes within ${P2_APPROACH_DEG} degrees of the ${DEFLECTION_PROFILE.minElongationDeg}-degree floor`,
  spansProbed: live.reduce((a, r) => a + r.p2.boundarySpansProbed, 0),
  failures: live.reduce((a, r) => a + r.p2.failures, 0),
  worstCases: live.filter((r) => r.p2.failures > 0).map((r) => ({ id: r.id, failures: r.p2.failures, failingSpans: r.p2.failingSpans })),
  pass: live.every((r) => r.p2.failures === 0),
};
const p3 = {
  target: `total boundary width at most ${P3_BOUNDARY_FRACTION * 100}% of the requested window`,
  worst: live.reduce((a, r) => (r.p3.boundaryFraction > (a?.fraction ?? -1) ? { id: r.id, body: r.body, fraction: r.p3.boundaryFraction } : a), null),
  perCase: live.map((r) => ({ id: r.id, fraction: r.p3.boundaryFraction, pass: r.p3.pass })),
  failures: live.filter((r) => !r.p3.pass).map((r) => ({ id: r.id, fraction: r.p3.boundaryFraction })),
  pass: live.every((r) => r.p3.pass),
};
const p4 = {
  target: `cold end-to-end evaluations at most 1/${P4_FACTOR} of the baseline on every conjunction-heavy case`,
  basis: useNames ? `the case ids section 6 names: ${NAMED_CONJUNCTION_HEAVY.join(', ')}` : 'derived: the partition proves some of the window excluded',
  perCase: heavy.map((r) => ({
    id: r.id, body: r.body, baseline: r.baseline.evaluations, baselineStatus: r.baseline.status,
    cold: r.partition.evaluations, ratio: r.ratio, ratioIsLowerBound: r.ratioIsLowerBound,
    pass: r.ratio >= P4_FACTOR,
  })),
  againstATruncatedBaseline: heavy.filter((r) => r.ratioIsLowerBound).map((r) => r.id),
  againstATruncatedBaselineNote: 'the denominator on these is the 4,000,000 budget ceiling, not a measured cost: the baseline never finished, so the true factor is unknown and at least the ratio shown. Scored literally regardless.',
  pass: heavy.length === 0 ? null : heavy.every((r) => r.ratio >= P4_FACTOR),
  notScored: heavy.length === 0 ? 'no conjunction-heavy case in this run' : null,
};
const p5 = {
  target: `cold end-to-end evaluations at most ${P5_FACTOR}x the baseline on every case with no conjunction`,
  basis: useNames ? `the case ids section 6 names: ${NAMED_NO_CONJUNCTION.join(', ')}` : 'derived: the partition proves none of the window excluded',
  perCase: light.map((r) => ({ id: r.id, body: r.body, baseline: r.baseline.evaluations, cold: r.partition.evaluations, ratio: r.ratio, pass: r.partition.evaluations <= P5_FACTOR * r.baseline.evaluations })),
  pass: light.length === 0 ? null : light.every((r) => r.partition.evaluations <= P5_FACTOR * r.baseline.evaluations),
  notScored: light.length === 0 ? 'no conjunction-free case in this run' : null,
};
const p6 = {
  target: 'no baseline event inside a proved-admissible span is lost; no claim is stronger than what was proved',
  baselineEventsInAdmissible: live.reduce((a, r) => a + r.p6.baselineEventsInAdmissible, 0),
  lost: live.reduce((a, r) => a + r.p6.lost, 0),
  lostCases: live.filter((r) => r.p6.lost > 0).map((r) => ({ id: r.id, lostAt: r.p6.lostAt })),
  everyMatchedRootBracketed: live.every((r) => r.correspondence.everyMatchedRootBracketed),
  worstDeltaSec: live.reduce((a, r) => Math.max(a, r.correspondence.worstDeltaSec), 0),
  withinRootTolerance: live.every((r) => r.correspondence.worstDeltaSec <= ROOT_TOLERANCE_SEC),
  noCompletenessOverExcludedRequest: live.every((r) => r.p6.claimsNoCompletenessOverExcludedRequest),
  noExhaustivenessWithLiveBoundary: live.every((r) => !(r.partition.exhaustiveOverAdmissible && r.partition.boundarySec > 0 && r.partition.mayHoldUnfoundSupportedEvents !== true)),
  pass: null,
};
p6.pass = p6.lost === 0
  && p6.everyMatchedRootBracketed
  && p6.withinRootTolerance
  && p6.noCompletenessOverExcludedRequest
  && p6.noExhaustivenessWithLiveBoundary;

const originalScore = live.filter((r) => r.baseline.established).length;
const partitionScore = live.filter((r) => r.partition.overRequest).length;
const p7 = {
  target: `the original full-window completeness score, by the original rule, over the same cases; ${P7_ORIGINAL_SCORE} of 20 on the regression corpus`,
  denominator: live.length,
  originalRuleOnBaseline: originalScore,
  originalRuleOnPartitionedPath: partitionScore,
  agree: originalScore === partitionScore,
  disagreements: live.filter((r) => r.baseline.established !== r.partition.overRequest).map((r) => ({ id: r.id, baseline: r.baseline.established, partitioned: r.partition.overRequest })),
  newMetricExhaustiveOverAdmissible: live.filter((r) => r.partition.exhaustiveOverAdmissible).length,
  newMetricNote: 'a DIFFERENT claim with its own denominator: exhaustive over the spans the partition proves admissible, not over the request',
  pass: LABEL === 'regression' && !ONE ? originalScore === P7_ORIGINAL_SCORE : null,
  passNote: LABEL === 'regression' && !ONE ? null : 'the 6-of-20 figure is a property of the regression corpus; on any other corpus the score is reported, not scored',
};

const report = {
  tool: 'partition-evaluation',
  rule: 'PARTITION-EVALUATION.md sections 5, 6 and 7',
  label: LABEL,
  epoch: EPOCH,
  pack: PACK,
  packDigest,
  profile: DEFLECTION_PROFILE,
  knobs: { boundaryToleranceSec: BOUNDARY_TOLERANCE_SEC, relightWidthRatio: RELIGHT_WIDTH_RATIO, amended: false },
  budgets: { maxEvaluations: MAX_EVALUATIONS, maxCells: MAX_CELLS, wallClockMs: WALL_CLOCK_BUDGET_MS, rootToleranceSec: ROOT_TOLERANCE_SEC, matchWindowSec: MATCH_WINDOW_SEC },
  cases: rows,
  repeated,
  targets: { P1: p1, P2: p2, P3: p3, P4: p4, P5: p5, P6: p6, P7: p7 },
  verdict: {
    /**
     * Section 6: failing P-1 or P-6 fails the whole thing. A target that
     * this run did not SCORE -- because `--case` left it with no cases --
     * is null, and null is not a failure. A filtered run is partial by
     * construction and says so rather than borrowing a verdict.
     */
    fatal: p1.pass === false || p6.pass === false,
    partial: [p2, p3, p4, p5].some((x) => x.pass === false),
    notScored: Object.entries({ P1: p1, P2: p2, P3: p3, P4: p4, P5: p5, P6: p6, P7: p7 })
      .filter(([, x]) => x.pass === null).map(([k]) => k),
    filtered: ONE !== null,
    summary: null,
  },
};
report.verdict.summary = report.verdict.filtered
  ? `PARTIAL RUN (--case=${ONE}): not the declared evaluation, and no verdict is claimed from it`
  : report.verdict.fatal
  ? 'FAIL: P-1 or P-6 did not hold, and section 6 makes either fatal'
  : (report.verdict.partial
    ? 'PARTIAL: P-1 and P-6 hold; at least one of P-2..P-5 does not, and is recorded with its measured number'
    : 'PASS: every declared target held');

if (OUT) { mkdirSync(dirname(OUT), { recursive: true }); writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`); }
process.stdout.write(`${JSON.stringify(report.targets, null, 2)}\n${report.verdict.summary}\n`);
