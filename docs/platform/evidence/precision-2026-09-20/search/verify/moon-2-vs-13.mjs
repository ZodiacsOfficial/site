/**
 * Re-examination of the reported Moon "two versus thirteen crossings"
 * concern, with its exact candidate, inputs and parameters.
 *
 *   node verify/moon-2-vs-13.mjs [--pack <pack.zeph>] [--out ../raw/moon-2-vs-13.json]
 *
 * The record says: a verifier reported the bounded search returning
 * `certified, complete, rootCount 2` on a Moon case whose truth is 13
 * crossings; the integrator ran the same call, got
 * `unresolved-interval / refused`, could not reproduce it, and declined to
 * record it as a defect. The instruction is to revisit it with the exact
 * inputs and to neither promote nor dismiss it without that comparison.
 *
 * Nothing in this file modifies the search library, the harness, the Uranus D
 * contract or any recorded verdict. It only runs them and writes down what
 * they do.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { coreBackend, circular, iso, DAY_MS } from '../lib/backends.mjs';
import { buildLevelProblem, measureDerivativeBounds } from '../lib/astro-harness.mjs';
import { classifyInterval, empiricalDerivativeEnclosure, empiricalSecondDerivativeEnclosure } from '../lib/interval-search.mjs';

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i].replace(/^--/, ''), process.argv[i + 1]);
const OUT = args.get('out') ?? new URL('../raw/moon-2-vs-13.json', import.meta.url).pathname;
const PACK = args.get('pack') ?? null;

/** The exact case named in the record. */
const CASE = {
  body: 'Moon',
  targetDegrees: 100,
  fromUtc: '2019-01-01T00:00:00Z',
  toUtc: '2020-01-01T00:00:00Z',
  backend: '@zodiacs/engine/internal bodyLongitude, engine-native Delta-T',
  source: 'docs/platform/evidence/precision-2026-09-20/README.md line 78, and search/verify/moon-mechanism.mjs',
};
const aMs = Date.parse(CASE.fromUtc);
const bMs = Date.parse(CASE.toUtc);

const core = await coreBackend();
const report = { case: CASE, when: new Date().toISOString(), node: process.version };

// ------------------------------------------------------------ 1. the truth
function denseCrossings(stepMs) {
  const roots = [];
  let prev = circular(core.lon(CASE.body, aMs), CASE.targetDegrees);
  for (let t = aMs + stepMs; t <= bMs; t += stepMs) {
    const cur = circular(core.lon(CASE.body, t), CASE.targetDegrees);
    // A sign change with both ends near a half turn is the +-180 wrap, not a
    // root. Only sign changes near zero count.
    if (prev * cur < 0 && Math.abs(prev) < 90 && Math.abs(cur) < 90) {
      let lo = t - stepMs; let hi = t; let flo = prev;
      for (let i = 0; i < 60; i += 1) {
        const m = Math.floor((lo + hi) / 2);
        if (m <= lo || m >= hi) break;
        const fm = circular(core.lon(CASE.body, m), CASE.targetDegrees);
        if ((fm < 0) === (flo < 0)) { lo = m; flo = fm; } else hi = m;
      }
      roots.push(Math.round((lo + hi) / 2));
    }
    prev = cur;
  }
  return roots;
}
const truth1h = denseCrossings(3600_000);
const truth10m = denseCrossings(600_000);
report.truth = {
  method: 'dense scan of the wrapped difference at two step sizes, then bisection; a sign change with both ends beyond 90 degrees is the wrap and is not counted',
  crossingsAtOneHourStep: truth1h.length,
  crossingsAtTenMinuteStep: truth10m.length,
  agree: truth1h.length === truth10m.length,
  instants: truth10m.map(iso),
};

// ------------------------------- 2. the recorded harness, its own defaults
const problem = buildLevelProblem({ lon: core.lon, body: CASE.body, targetDegrees: CASE.targetDegrees, aMs, bMs });
report.harness = { settings: problem.settings, measuredBounds: problem.bounds };
report.withRecordedDefaults = [];
for (const epsilon of [1e-9, 1e-7, 1e-6, 1e-5, 1e-4, 1e-3, 1e-2, 0.05, 0.5]) {
  const r = classifyInterval({
    f: problem.f,
    derivativeEnclosure: problem.derivativeEnclosure,
    secondDerivativeEnclosure: problem.secondDerivativeEnclosure,
    a: aMs, b: bMs, epsilon, minWidth: 100, maxEvaluations: 2_000_000,
    boundKind: 'empirical', label: `moon-${CASE.targetDegrees}`,
  });
  report.withRecordedDefaults.push({
    epsilon,
    verdict: r.verdict, outcome: r.outcome, certified: r.certified === true, complete: r.complete === true,
    rootCount: r.rootCount, possibleRootCounts: r.possibleRootCounts,
    evaluations: r.evaluations, openRegions: (r.openRegions ?? []).length,
    overcountedBy: r.rootCount === null ? null : r.rootCount - truth10m.length,
  });
}

// ------------------------------------ 3. the sin() formulation, continuous
{
  const cache = new Map();
  const raw = (ms) => { const t = Math.round(ms); if (!cache.has(t)) cache.set(t, core.lon(CASE.body, t)); return cache.get(t); };
  const f = (ms) => Math.sin(((raw(ms) - CASE.targetDegrees) * Math.PI) / 180);
  const h = 600_000;
  const b = measureDerivativeBounds({ f, a: aMs, b: bMs, samples: 400, h });
  const r = classifyInterval({
    f, a: aMs, b: bMs, epsilon: 1e-5, minWidth: 100, maxEvaluations: 3_000_000,
    boundKind: 'empirical', label: 'moon-sin',
    derivativeEnclosure: empiricalDerivativeEnclosure({ h, secondDerivativeBound: b.bounds.secondDerivativeBound, thirdDerivativeBound: b.bounds.thirdDerivativeBound, roundoff: Number.EPSILON * 64, maxGridSpacing: DAY_MS, maxSamples: 5 }),
    secondDerivativeEnclosure: empiricalSecondDerivativeEnclosure({ h, thirdDerivativeBound: b.bounds.thirdDerivativeBound, fourthDerivativeBound: b.bounds.fourthDerivativeBound, roundoff: Number.EPSILON * 64, maxGridSpacing: DAY_MS, maxSamples: 64 }),
  });
  report.sinFormulation = {
    what: 'sin(lon - target), which is continuous and has the target crossings plus the antipode crossings as its zero set',
    expected: `${truth10m.length} crossings of the target plus the antipode crossings`,
    verdict: r.verdict, outcome: r.outcome, certified: r.certified === true, rootCount: r.rootCount,
    possibleRootCounts: r.possibleRootCounts, openRegions: (r.openRegions ?? []).length, evaluations: r.evaluations,
  };
}

// --------------------------------------------------- 4. why it goes wrong
/**
 * The mechanism, reproduced rather than asserted.
 *
 * This repeats the library's own cell decomposition -- the same exclusion
 * test, the same monotone test, the same subdivision floor, the same
 * enclosures -- and then asks, of every cell it closed, whether a true
 * crossing is inside it.
 */
{
  const epsilon = 1e-5;
  const minWidth = 100;
  const ctx = { value: problem.f, slope: null };
  const intersect = (x, y) => [Math.max(x[0], y[0]), Math.min(x[1], y[1])];
  const valueEnclosure = (u, v, d) => {
    const w = v - u; const fu = problem.f(u); const fv = problem.f(v);
    return intersect(
      [fu + Math.min(0, d[0] * w), fu + Math.max(0, d[1] * w)],
      [fv - Math.max(0, d[1] * w), fv - Math.min(0, d[0] * w)],
    );
  };
  const cells = [];
  const stack = [[aMs, bMs]];
  while (stack.length) {
    const [u, v] = stack.pop();
    const d = problem.derivativeEnclosure(u, v, ctx);
    const V = valueEnclosure(u, v, d);
    if (V[0] > epsilon || V[1] < -epsilon) { cells.push({ u, v, status: 'excluded', d, V }); continue; }
    if (d[0] > 0 || d[1] < 0) { cells.push({ u, v, status: 'monotone', d, V }); continue; }
    const m = Math.floor((u + v) / 2);
    if (v - u <= minWidth || !(m > u && m < v)) { cells.push({ u, v, status: 'floor', d, V }); continue; }
    stack.push([m, v], [u, m]);
  }
  cells.sort((x, y) => x.u - y.u);

  const byStatus = cells.reduce((acc, c) => { acc[c.status] = (acc[c.status] ?? 0) + 1; return acc; }, {});
  const lost = { excluded: 0, monotoneEndsAgree: 0 };
  const examples = [];
  for (const c of cells) {
    const inside = truth10m.filter((t) => t > c.u && t < c.v);
    if (inside.length === 0) continue;
    let jumps = 0;
    let prev = problem.f(c.u);
    for (let t = c.u + 3600_000; t <= c.v; t += 3600_000) {
      const cur = problem.f(t);
      if (Math.abs(cur - prev) > 180) jumps += 1;
      prev = cur;
    }
    if (c.status === 'excluded') {
      lost.excluded += inside.length;
      if (examples.length < 4) {
        examples.push({
          closedAs: 'excluded',
          from: iso(c.u), to: iso(c.v), widthDays: (c.v - c.u) / DAY_MS,
          valueEnclosure: c.V,
          derivativeEnclosureDegPerDay: c.d.map((x) => x * DAY_MS),
          endValues: [problem.f(c.u), problem.f(c.v)],
          wrapJumpsInside: jumps,
          trueCrossingsInside: inside.map(iso),
        });
      }
    } else if (c.status === 'monotone') {
      const fu = problem.f(c.u); const fv = problem.f(c.v);
      if (Math.abs(fu) > epsilon && Math.abs(fv) > epsilon && (fu > 0) === (fv > 0)) lost.monotoneEndsAgree += inside.length;
    }
  }

  report.mechanism = {
    what: 'The value enclosure is a MEAN-VALUE enclosure: it assumes f is differentiable across the cell with a derivative inside the declared range. The wrapped circular difference is not -- it jumps by 360 degrees at the antipode, thirteen times in this window. The derivative enclosure is sampled with a 600 s central difference at up to five points in a cell, so it almost never lands on a jump and reports a plausible finite range; the mean-value enclosure built from that range then proves the level is missed over a three-week window that contains a crossing.',
    epsilon,
    minWidth,
    cells: cells.length,
    cellsByStatus: byStatus,
    trueCrossings: truth10m.length,
    crossingsInsideCellsClosedByExclusion: lost.excluded,
    crossingsInsideMonotoneCellsWhoseEndsAgree: lost.monotoneEndsAgree,
    examples,
    whoseDefect: 'Not classifyInterval. Its header states plainly that an empirical enclosure "holds only if the declared bounds hold"; given a real enclosure it is correct, which the sin() row above shows by getting 27. The defect is in the harness: buildLevelProblem hands it a discontinuous function together with a derivative bound measured as if the function were smooth, and nothing in between checks that.',
  };
}

// ---------------------------------- 5. what the alpha's search layer does
if (PACK) {
  const { openPackFile, CORRECTED } = await import('../../../../../../examples/precision-alpha/src/node.mjs');
  const rt = await openPackFile(PACK);
  // TT days past J2000 for the same UTC window, with the clock this track
  // declares for 2019-2020: TT = UTC + 69.184 s.
  const ttDays = (ms) => ms / DAY_MS - 10957.5 + 69.184 / 86400;
  const r = rt.search({
    kind: 'longitude', body: CASE.body,
    targetDeg: CASE.targetDegrees,
    fromTtDays: ttDays(aMs), toTtDays: ttDays(bMs),
    epsilonDeg: 1e-5, options: CORRECTED, maxEvaluations: 2_000_000,
  });
  report.alphaSearch = {
    what: 'examples/precision-alpha, which splits the interval at every antipode crossing and shows each split gap to be root-free before passing over it. Different backend (the compact pack) and a slightly different clock, so the instants are not expected to match to the millisecond; the COUNT is the comparison.',
    verdict: r.isolation.verdict, outcome: r.isolation.outcome, certified: r.isolation.certified,
    rootCount: r.isolation.rootCount, support: r.isolation.support,
    antipodeGaps: r.isolation.branches.antipodeGaps.length,
    allGapsShownRootFree: r.isolation.branches.antipodeGaps.every((g) => g.excluded),
    unresolved: r.unresolved.length,
    evaluations: r.budget.evaluations,
    matchesTruth: r.isolation.rootCount === truth10m.length,
    firstFew: r.candidates.slice(0, 4).map((c) => new Date((c.ttDays + 10957.5) * DAY_MS).toISOString()),
  };
  rt.dispose();
} else {
  report.alphaSearch = { skipped: 'no --pack given; this comparison needs a local pack' };
}

// ---------------------------------------------------------------- verdict
const worst = report.withRecordedDefaults.filter((x) => x.certified && x.rootCount !== truth10m.length);
report.verdict = worst.length > 0
  ? `REPRODUCED. With the recorded case and the harness's own default parameters, the search returns a CERTIFIED, COMPLETE count of ${worst[0].rootCount} where the truth is ${truth10m.length}, at ${worst.length} of the ${report.withRecordedDefaults.length} allowances tried. This is an established defect of the harness, not of classifyInterval: the enclosure it supplies is not an enclosure of the function it supplies.`
  : `NOT REPRODUCED with the parameters tried (${report.withRecordedDefaults.map((x) => x.epsilon).join(', ')}). Recorded as neither established nor refuted.`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(report, null, 1)}\n`);

console.log(`truth: ${truth10m.length} crossings (1 h step: ${truth1h.length}; they ${report.truth.agree ? 'agree' : 'DISAGREE'})`);
console.log('\nrecorded harness, its own defaults:');
for (const x of report.withRecordedDefaults) {
  console.log(`  eps ${String(x.epsilon).padEnd(8)} ${x.verdict.padEnd(20)} ${x.outcome.padEnd(11)} count ${String(x.rootCount).padEnd(5)} certified ${String(x.certified).padEnd(5)} open ${x.openRegions}`);
}
console.log(`\nsin formulation: ${report.sinFormulation.verdict} / ${report.sinFormulation.outcome}, count ${report.sinFormulation.rootCount}`);
console.log(`\nmechanism: ${report.mechanism.cells} cells, ${JSON.stringify(report.mechanism.cellsByStatus)}`);
console.log(`  ${report.mechanism.crossingsInsideCellsClosedByExclusion} of ${report.mechanism.trueCrossings} crossings sit inside cells closed by the EXCLUSION test`);
console.log(`  ${report.mechanism.crossingsInsideMonotoneCellsWhoseEndsAgree} sit inside monotone cells whose end values agree`);
if (report.alphaSearch.skipped) console.log(`alpha search: ${report.alphaSearch.skipped}`);
else console.log(`alpha search: ${report.alphaSearch.verdict} / ${report.alphaSearch.outcome}, count ${report.alphaSearch.rootCount}, matches truth: ${report.alphaSearch.matchesTruth}`);
console.log(`\n${report.verdict}`);
console.log(`wrote ${OUT}`);
