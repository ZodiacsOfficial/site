/**
 * Run the preregistered of-date holdout, once, and write what it did.
 *
 *   node tools/measure/of-date-holdout.mjs --pack /path/pack.zeph --out run.json
 *
 * The cases come from OF-DATE-PREREGISTRATION.md section 9a, which was
 * committed before this file existed. Nothing here chooses a case, a
 * tolerance or a pass rule; all three are transcribed.
 *
 * Every case runs all FOUR rungs of section 9a on identical instants, so
 * what rung 4 adds is a named frame rotation rather than "error".
 */
import { writeFileSync } from 'node:fs';
import { openPackFile } from '../../src/node.mjs';
import {
  searchRetardedLongitude, searchAberratedLongitude, searchOfDateLongitude,
} from '../../src/core/retarded-search.mjs';
import { searchGeometricLongitude } from '../../src/core/validated-search.mjs';
import { makeAberratedReference } from '../../test/tier-b/_aberrated-reference.mjs';
import { makeOfDateReference } from '../../test/tier-b/_of-date-reference.mjs';

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i].replace(/^--/, ''), process.argv[i + 1]);
const PACK = args.get('pack');
const OUT = args.get('out') ?? null;
if (!PACK) throw new Error('--pack is required');

const DAY = 86400;
const J2000_UTC = Date.UTC(2000, 0, 1, 12);
/** The harness converts, never the operation. TDB = UTC - J2000 + 69.184 s. */
const tdb = (iso) => (Date.parse(iso) - J2000_UTC) / 1000 + 69.184;
const plus = (iso, days) => `${new Date(Date.parse(iso) + days * DAY * 1000).toISOString().slice(0, 10)}T00:00:00Z`;

const BODIES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
/** The light-time and aberrated suites' constants, unchanged. */
const STEP = { Moon: 300, Mercury: 900, Venus: 1800, Sun: 1800, Mars: 1800, Jupiter: 3600, Saturn: 3600, Uranus: 3600, Neptune: 3600, Pluto: 3600 };
/** Section 7, inherited from the two earlier documents. */
const ROOT_TOLERANCE_SEC = 1e-3;
const MATCH_WINDOW_SEC = 1;

const rt = await openPackFile(PACK);
const eph = rt.ephemeris;
const refOfDate = makeOfDateReference(eph);
const refFixed = makeAberratedReference(eph);

// ---- the cases, by the rule of section 9a and nothing else
const CASES = [];
BODIES.forEach((body, i) => {
  const from = plus('1975-01-01T00:00:00Z', 900 * i);
  const to = plus(from, 300);
  const mid = (tdb(from) + tdb(to)) / 2;
  // Section 9a: read from the OF-DATE reference. An of-date longitude is
  // not a fixed-frame one, and reusing the aberrated targets would
  // silently change which instants each case is about.
  const targetDeg = Number(refOfDate.lonDeg(body, mid).toFixed(6));
  CASES.push({ id: `F${i + 1}`, series: 'main', body, from, to, targetDeg });
  CASES.push({ id: `B${i + 1}`, series: 'antipode', body, from, to, targetDeg: Number(((targetDeg + 180) % 360).toFixed(6)) });
});

const pair = (found, reference) => {
  const takenRef = new Set();
  const takenGot = new Set();
  const matched = [];
  for (let i = 0; i < found.length; i += 1) {
    let best = -1;
    let bestD = Infinity;
    for (let j = 0; j < reference.length; j += 1) {
      if (takenRef.has(j)) continue;
      const dd = Math.abs(found[i].tdbSec - reference[j]);
      if (dd < bestD) { bestD = dd; best = j; }
    }
    if (best >= 0 && bestD <= MATCH_WINDOW_SEC) {
      takenRef.add(best); takenGot.add(i);
      matched.push({ got: found[i], ref: reference[best], delta: found[i].tdbSec - reference[best] });
    }
  }
  return {
    matched,
    missed: reference.filter((_, j) => !takenRef.has(j)),
    extra: found.filter((_, i) => !takenGot.has(i)).map((e) => e.tdbSec),
  };
};

const rows = [];
for (const c of CASES) {
  const a = tdb(c.from);
  const b = tdb(c.to);
  const spec = { body: c.body, targetDeg: c.targetDeg, fromTdbSec: a, toTdbSec: b };

  const t0 = Date.now();
  const ofDate = searchOfDateLongitude(eph, spec);
  const ofdMs = Date.now() - t0;
  const t1 = Date.now();
  const aberrated = searchAberratedLongitude(eph, spec);
  const abMs = Date.now() - t1;
  const t2 = Date.now();
  const retarded = searchRetardedLongitude(eph, spec);
  const ltMs = Date.now() - t2;
  let geometric = null;
  try {
    geometric = searchGeometricLongitude(eph, { body: c.body, targetDeg: c.targetDeg, fromTtDays: a / DAY, toTtDays: b / DAY });
  } catch (error) {
    geometric = { refused: error.code ?? String(error) };
  }

  const refOfd = refOfDate.crossings(c.body, c.targetDeg, a, b, STEP[c.body]);
  const refAb = refFixed.crossings(c.body, c.targetDeg, a, b, STEP[c.body], true);
  const m = pair(ofDate.events, refOfd.roots);
  const worst = m.matched.length ? Math.max(...m.matched.map((x) => Math.abs(x.delta))) : null;
  const allBracketed = m.matched.every((x) => x.got.bracketTdbSec[0] <= x.ref && x.ref <= x.got.bracketTdbSec[1]);

  /**
   * What rung 4 added: the FRAME, and nothing else.
   *
   * Rung 3 and rung 4 look for the same numeric longitude in different
   * frames, so a case's two rungs are about genuinely different instants
   * and their difference is the frame rotation carried into time. This is
   * the number section 4 forbids reading as improved accuracy, and it is
   * checked against what the two REFERENCES predict for the same pair.
   */
  let ladder = null;
  /**
   * When the rungs disagree about HOW MANY crossings exist, the ladder is
   * undefined and the disagreement has to be attributed instead.
   *
   * It is attributed by the two INDEPENDENT references: if the of-date
   * reference and the fixed-frame reference show the same count
   * difference as their solvers do, the difference is the frame moving a
   * crossing across the window edge, not a solver losing one. Recorded
   * per case, with the longitude ranges that make it checkable by hand.
   */
  const frameSeparated = ofDate.events.length !== aberrated.events.length
    ? {
      ofDateRoots: ofDate.events.length,
      aberratedRoots: aberrated.events.length,
      ofDateReferenceRoots: refOfd.roots.length,
      aberratedReferenceRoots: refAb.roots.length,
      corroborated: refOfd.roots.length === ofDate.events.length
        && refAb.roots.length === aberrated.events.length,
      ofDateLongitudeRange: null,
      aberratedLongitudeRange: null,
    }
    : null;
  if (frameSeparated) {
    // The ranges the two frames sweep over the window, at the reference's
    // own step: the target sits inside one and outside the other, or the
    // window edge falls between them, and either way it is visible.
    const step = STEP[c.body];
    const n = Math.ceil((b - a) / step);
    let o0 = Infinity; let o1 = -Infinity; let f0 = Infinity; let f1 = -Infinity;
    for (let i = 0; i <= n; i += 1) {
      const t = i === n ? b : a + i * step;
      const x = refOfDate.lonDeg(c.body, t);
      const y = refFixed.lonDeg(c.body, t, true);
      o0 = Math.min(o0, x); o1 = Math.max(o1, x);
      f0 = Math.min(f0, y); f1 = Math.max(f1, y);
    }
    frameSeparated.ofDateLongitudeRange = [o0, o1];
    frameSeparated.aberratedLongitudeRange = [f0, f1];
    frameSeparated.targetInsideOfDateRange = c.targetDeg > o0 && c.targetDeg < o1;
    frameSeparated.targetInsideAberratedRange = c.targetDeg > f0 && c.targetDeg < f1;
  }
  if (geometric && !geometric.refused
    && geometric.events.length === retarded.events.length
    && retarded.events.length === aberrated.events.length
    && aberrated.events.length === ofDate.events.length
    && ofDate.events.length > 0) {
    ladder = ofDate.events.map((e, i) => ({
      crossing: i,
      lightTimeSec: retarded.events[i].tdbSec - geometric.events[i].ttDays * DAY,
      aberrationSec: aberrated.events[i].tdbSec - retarded.events[i].tdbSec,
      frameSec: e.tdbSec - aberrated.events[i].tdbSec,
      referenceFrameSec: refOfd.roots[i] !== undefined && refAb.roots[i] !== undefined
        ? refOfd.roots[i] - refAb.roots[i] : null,
    }));
  }

  const ts = ofDate.uncertainty.timeScale;
  rows.push({
    ...c,
    status: ofDate.execution.status,
    established: ofDate.completeness.established,
    isExactTotal: ofDate.eventCount.isExactTotal,
    found: ofDate.events.length,
    referenceRoots: refOfd.roots.length,
    missed: m.missed.length,
    extra: m.extra.length,
    worstDeltaSec: worst,
    everyReferenceRootBracketed: allBracketed,
    matchedRoots: m.matched.length,
    widestBracketSec: ofDate.events.length ? Math.max(...ofDate.events.map((e) => e.bracketWidthSec)) : null,
    directions: ofDate.events.map((e) => e.direction),
    unresolved: ofDate.accounting.unresolved.length,
    unresolvedWhy: ofDate.accounting.unresolved.slice(0, 2).map((u) => u.why),
    cells: ofDate.execution.cells,
    evaluations: ofDate.execution.evaluations,
    ms: ofdMs,
    frame: {
      widestFrameAngleSpanArcsec: ofDate.diagnostics.frameOfDate.widestFrameAngleSpanArcsec,
      requestWithinModelRange: ofDate.diagnostics.frameOfDate.requestWithinModelRange,
      tdbMinusTtUsedSec: ts.conversionApproximation.tdbMinusTtUsedSec,
      frameRateArcsecPerSec: ts.conversionApproximation.frameRateArcsecPerSec,
      conversionInducedLongitudeArcsec: ts.conversionApproximation.inducedLongitudeArcsec,
    },
    referenceStepSec: refOfd.stepSec,
    referenceSamples: refOfd.samples,
    aberratedRung: {
      status: aberrated.execution.status,
      established: aberrated.completeness.established,
      found: aberrated.events.length,
      referenceRoots: refAb.roots.length,
      evaluations: aberrated.execution.evaluations,
      ms: abMs,
    },
    lightTimeRung: {
      status: retarded.execution.status,
      established: retarded.completeness.established,
      found: retarded.events.length,
      evaluations: retarded.execution.evaluations,
      ms: ltMs,
    },
    geometricRung: geometric && geometric.refused
      ? { refused: geometric.refused }
      : { established: geometric.completeness.established, found: geometric.events.length },
    ladder,
    frameSeparated,
  });
  process.stderr.write(`${c.id} ${c.body} ${c.targetDeg} -> ${ofDate.events.length}/${refOfd.roots.length}`
    + ` est=${ofDate.completeness.established} ${ofdMs}ms\n`);
}

// ---- the preregistered pass rule, section 10, applied rather than eyeballed
const problems = [];
for (const r of rows) {
  const decided = r.established || (r.unresolved > 0 || r.status !== 'finished');
  if (!decided) problems.push(`${r.id}: neither established completeness nor gave a reason`);
  if (r.isExactTotal && r.unresolved > 0) problems.push(`${r.id}: an exact total with ${r.unresolved} unresolved intervals`);
  if (r.missed) problems.push(`${r.id}: missed ${r.missed} reference roots`);
  if (r.extra) problems.push(`${r.id}: reported ${r.extra} roots the reference does not have`);
  if (r.worstDeltaSec !== null && r.worstDeltaSec > ROOT_TOLERANCE_SEC) {
    problems.push(`${r.id}: worst root separation ${r.worstDeltaSec} s exceeds ${ROOT_TOLERANCE_SEC} s`);
  }
  if (!r.everyReferenceRootBracketed) problems.push(`${r.id}: a reference root lies outside its reported bracket`);
  if (!r.frame.requestWithinModelRange) problems.push(`${r.id}: the window is outside the declared model range`);
  for (const [i, l] of (r.ladder ?? []).entries()) {
    if (l.referenceFrameSec === null) {
      problems.push(`${r.id}: crossing ${i} has no reference frame shift to compare the ladder against`);
    } else if (Math.abs(l.frameSec - l.referenceFrameSec) > 2 * ROOT_TOLERANCE_SEC) {
      problems.push(`${r.id}: crossing ${i} shifted ${l.frameSec} s between rungs 3 and 4, the reference predicts ${l.referenceFrameSec} s`);
    }
  }
  /**
   * A case with crossings and no ladder needs the disagreement ATTRIBUTED,
   * not excused.
   *
   * The aberrated tool's rule was "crossings but no ladder is a failure",
   * and for rungs 1 to 3 that is right: they search the same frame, so a
   * count disagreement between them is a defect. Rung 4 does not search
   * the same frame. It looks for the same NUMERIC longitude measured from
   * a different origin, so a target a body reaches twice of-date can be
   * one it reaches once, or never, in the fixed frame -- a crossing pushed
   * across the window edge by the frame offset, which is the thing section
   * 4 forbids reading as either improved accuracy or a defect.
   *
   * So the clause is not dropped, it is replaced by a stronger one: the
   * two INDEPENDENT references must show the same count difference their
   * solvers do. If they do not, the difference is not the frame and the
   * case fails.
   */
  if (r.found > 0 && !r.ladder) {
    if (!r.frameSeparated) {
      problems.push(`${r.id}: found ${r.found} crossings but no rung comparison and no frame attribution`);
    } else if (!r.frameSeparated.corroborated) {
      problems.push(`${r.id}: the rungs disagree (${r.frameSeparated.aberratedRoots} against ${r.frameSeparated.ofDateRoots})`
        + ` and the independent references do not show the same difference`
        + ` (${r.frameSeparated.aberratedReferenceRoots} against ${r.frameSeparated.ofDateReferenceRoots})`);
    }
  }
}
const establishedCount = rows.filter((r) => r.established).length;
const usefulness = { established: establishedCount, of: rows.length, passes: establishedCount * 2 >= rows.length };
const withRoots = rows.filter((r) => r.found > 0).length;

const record = {
  ranAt: new Date().toISOString(),
  rule: 'OF-DATE-PREREGISTRATION.md section 9a',
  pack: {
    path: PACK,
    digest: rt.integrity.computedDigest,
    payloadSha256: rt.header.payloadSha256 ?? null,
    compiler: rt.header.compiler?.version ?? null,
    coverageTdbSec: [rt.coverage.startEtSecTdb, rt.coverage.stopEtSecTdb],
  },
  tolerances: { rootToleranceSec: ROOT_TOLERANCE_SEC, matchWindowSec: MATCH_WINDOW_SEC, referenceStepSec: STEP },
  rows,
  summary: {
    cases: rows.length,
    established: establishedCount,
    casesWithRoots: withRoots,
    totalRootsFound: rows.reduce((n, r) => n + r.found, 0),
    totalReferenceRoots: rows.reduce((n, r) => n + r.referenceRoots, 0),
    missed: rows.reduce((n, r) => n + r.missed, 0),
    extra: rows.reduce((n, r) => n + r.extra, 0),
    worstDeltaSec: Math.max(...rows.map((r) => r.worstDeltaSec ?? 0)),
    worstBracketSec: Math.max(...rows.map((r) => r.widestBracketSec ?? 0)),
    unresolvedIntervals: rows.reduce((n, r) => n + r.unresolved, 0),
    totalEvaluations: rows.reduce((n, r) => n + r.evaluations, 0),
    totalCells: rows.reduce((n, r) => n + r.cells, 0),
    totalMs: rows.reduce((n, r) => n + r.ms, 0),
    aberratedRungEvaluations: rows.reduce((n, r) => n + r.aberratedRung.evaluations, 0),
    aberratedRungMs: rows.reduce((n, r) => n + r.aberratedRung.ms, 0),
    widestFrameAngleSpanArcsec: Math.max(...rows.map((r) => r.frame.widestFrameAngleSpanArcsec)),
    conversionInducedLongitudeArcsec: Math.max(...rows.map((r) => r.frame.conversionInducedLongitudeArcsec)),
    // The frame shift, BOTH signs. A single "characteristic" figure would
    // be a selection: rung 4 moves a crossing forward or back depending on
    // which way the body's longitude is running at it.
    frameShiftRangeSec: (() => {
      const all = rows.flatMap((r) => (r.ladder ?? []).map((l) => l.frameSec));
      return all.length ? [Math.min(...all), Math.max(...all)] : null;
    })(),
    // Cases where the frame moved a crossing across the window edge, so
    // rung 3 and rung 4 have genuinely different event sets. Reported,
    // never averaged away.
    frameSeparatedCases: rows.filter((r) => r.frameSeparated).map((r) => ({
      id: r.id,
      body: r.body,
      ofDateRoots: r.frameSeparated.ofDateRoots,
      aberratedRoots: r.frameSeparated.aberratedRoots,
      corroborated: r.frameSeparated.corroborated,
    })),
    worstFrameLadderResidualSec: (() => {
      const all = rows.flatMap((r) => (r.ladder ?? [])
        .filter((l) => l.referenceFrameSec !== null)
        .map((l) => Math.abs(l.frameSec - l.referenceFrameSec)));
      return all.length ? Math.max(...all) : null;
    })(),
  },
  usefulness,
  passed: problems.length === 0 && usefulness.passes,
  problems,
};
rt.dispose();

const text = `${JSON.stringify(record, null, 2)}\n`;
if (OUT) writeFileSync(OUT, text);
process.stdout.write(`${JSON.stringify({ summary: record.summary, usefulness, passed: record.passed, problems }, null, 2)}\n`);
if (!record.passed) process.exitCode = 1;
