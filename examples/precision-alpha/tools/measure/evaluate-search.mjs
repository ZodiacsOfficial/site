/**
 * The product evaluation declared in EVALUATION-PLAN.md.
 *
 *   node tools/measure/evaluate-search.mjs --pack /path/to/pack.zeph \
 *        [--out results.json] [--only A|B|C] [--case H3]
 *
 * Every rule this applies -- the reference scan, the matching tolerance,
 * the accuracy target, the usefulness threshold, the case list -- is fixed
 * in that document, which was committed before this file existed. Nothing
 * here may quietly disagree with it.
 *
 * Research tool. It is not in the published archive and not in the site
 * build; it reads a pack and writes a JSON file.
 */
import { openPackFile } from '../../src/node.mjs';
import { CORRECTED } from '../../src/core/reduce.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i].replace(/^--/, ''), process.argv[i + 1]);
const PACK = args.get('pack');
const OUT = args.get('out') ?? null;
const ONLY = args.get('only') ?? null;
const ONE = args.get('case') ?? null;
if (!PACK) throw new Error('--pack is required');

// ---------------------------------------------------------------- constants
const DAY_SEC = 86400;
const J2000_UTC_MS = Date.UTC(2000, 0, 1, 12, 0, 0);
const TT_MINUS_UTC_SEC = 69.184;
const DEG = Math.PI / 180;
const EPS0 = (84381.406 / 3600) * DEG;
const COS_E = Math.cos(EPS0);
const SIN_E = Math.sin(EPS0);

/** From EVALUATION-PLAN.md. Changing any of these invalidates the run. */
const REF_STEP_DAYS = 1 / 512;
const PHI = 0.3819660112501051;
const BISECT_TO_DAYS = 1e-9;
const MATCH_TOL_DAYS = 1 / 86400;
const UNRESOLVED_LIMIT = 0.25;
const EPSILON_DEG = 1 / 3600;

const ttOf = (iso) => (Date.parse(iso) - J2000_UTC_MS) / 86400000 + TT_MINUS_UTC_SEC / 86400;
const utcOf = (tt) => new Date(J2000_UTC_MS + (tt - TT_MINUS_UTC_SEC / 86400) * 86400000).toISOString();
const wrap180 = (d) => { let x = d % 360; if (x > 180) x -= 360; if (x <= -180) x += 360; return x; };

// ---------------------------------------------------------------- the cases
const CONTRACT_BODIES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const HOLDOUT_BASE = Date.UTC(1960, 0, 1);
const HOLDOUT = CONTRACT_BODIES.map((body, i) => ({
  id: `H${i + 1}`,
  body,
  targetDeg: (37 * i + 13) % 360,
  fromIso: new Date(HOLDOUT_BASE + i * 1500 * 86400000).toISOString().replace(/\.\d+Z$/, 'Z'),
  toIso: new Date(HOLDOUT_BASE + (i * 1500 + 500) * 86400000).toISOString().replace(/\.\d+Z$/, 'Z'),
}));

const REGRESSIONS = [
  { id: 'A1', body: 'Moon', targetDeg: 100, fromIso: '2019-01-01T00:00:00Z', toIso: '2020-01-01T00:00:00Z' },
  // A2 is the case the plan named: "Uranus, the original alpha contract
  // case on pack D", pinned as `D-Uranus2020` in
  // src/lib/engine/fixtures/transit-window-independent.json -- target
  // 32.6940395 degrees over 2019-01-01 .. 2020-12-31. The first version of
  // this harness ran Uranus 30 degrees over 2010..2020 instead, and the
  // write-up said the original was preserved. It was not. Both run now,
  // and the substitute is labelled as one.
  { id: 'A2', body: 'Uranus', targetDeg: 32.6940395, fromIso: '2019-01-01T00:00:00Z', toIso: '2020-12-31T00:00:00Z' },
  { id: 'A2b', body: 'Uranus', targetDeg: 30, fromIso: '2010-01-01T00:00:00Z', toIso: '2020-01-01T00:00:00Z' },
];

// ------------------------------------------------------------ the functions
/**
 * The two quantities, each its own function of TT days. They are NOT the
 * same curve and their roots are hours apart; each mode is scored only
 * against its own.
 */
function functions(rt) {
  const a = new Float64Array(6);
  const b = new Float64Array(6);
  return {
    'empirical-apparent': (tt) => rt.apparent(rt._body, tt, CORRECTED).lon,
    'validated-geometric': (tt) => {
      const et = tt * DAY_SEC;
      rt.ephemeris.state(rt._body, et, a);
      rt.ephemeris.state('Earth', et, b);
      const x = a[0] - b[0];
      const y = a[1] - b[1];
      const z = a[2] - b[2];
      const lon = Math.atan2(COS_E * y + SIN_E * z, x) / DEG;
      return (lon % 360 + 360) % 360;
    },
  };
}

/**
 * A dense scan of the SAME function the mode searches. Corroboration, not
 * proof: it cannot see a root pair closer than one step, and it cannot see
 * a tangency that does not change sign. Both limits are stated in the plan
 * and both are reported.
 */
function referenceRoots(f, target, fromTt, toTt) {
  const n = Math.ceil((toTt - fromTt) / REF_STEP_DAYS);
  const step = (toTt - fromTt) / n;
  const at = (t) => wrap180(f(t) - target);
  const roots = [];
  const boundary = [];
  let evaluations = 0;
  const ev = (t) => { evaluations += 1; return at(t); };

  // The plan says "offset by phi = 0.381966... of a step". The first
  // implementation wrote (i + PHI - 0.5), which is an offset of -0.118 of
  // a step, not +0.382 -- close enough to avoid rational roots but not
  // what was declared. This is the declared offset: the endpoints are
  // exact, and interior point i sits phi of a step past grid line i-1.
  // The tail gap that leaves is measured and reported rather than assumed
  // away.
  const grid = (i) => (i === 0 ? fromTt : i === n ? toTt : fromTt + (i - 1 + PHI) * step);
  let prevT = grid(0);
  let prev = ev(prevT);
  let widestGap = 0;

  for (let i = 1; i <= n; i += 1) {
    const t = grid(i);
    const v = ev(t);
    // A jump of more than half a turn is the antipode, not a crossing.
    if (prev !== 0 && v !== 0 && Math.sign(prev) !== Math.sign(v) && Math.abs(v - prev) < 180) {
      let lo = prevT; let hi = t; let flo = prev;
      while (hi - lo > BISECT_TO_DAYS) {
        const m = (lo + hi) / 2;
        const fm = ev(m);
        if (Math.sign(fm) === Math.sign(flo)) { lo = m; flo = fm; } else hi = m;
      }
      roots.push((lo + hi) / 2);
    }
    widestGap = Math.max(widestGap, t - prevT);
    prevT = t; prev = v;
  }
  // The plan: "roots within 1 second of an interval endpoint are recorded
  // as boundary roots and reported separately." The first implementation
  // tested `Math.abs(f) < 1e-12` at the two outer grid points -- an exact
  // zero test, not a proximity test -- and reported 0 in every row it ever
  // produced. This is the declared rule.
  for (const r of roots) {
    if (Math.abs(r - fromTt) <= MATCH_TOL_DAYS || Math.abs(r - toTt) <= MATCH_TOL_DAYS) boundary.push(r);
  }
  return { roots, boundary, evaluations, stepDays: step, widestGapDays: widestGap };
}

// -------------------------------------------------------------- the metrics
/**
 * Scoring, exactly as declared. A root is matched by an event within one
 * second whose bracket, widened by one bracket width, contains it.
 */
function score(events, reference) {
  const used = new Set();
  let missed = 0;
  let worstResidualSec = 0;
  let neededWidening = 0;
  for (const r of reference) {
    let hit = -1;
    for (let i = 0; i < events.length; i += 1) {
      if (used.has(i)) continue;
      const e = events[i];
      if (Math.abs(e.ttDays - r) > MATCH_TOL_DAYS) continue;
      const [lo, hi] = e.bracketTtDays ?? [e.ttDays, e.ttDays];
      const w = Math.max(hi - lo, 0);
      if (r < lo - w || r > hi + w) continue;
      hit = i;
      worstResidualSec = Math.max(worstResidualSec, Math.abs(e.ttDays - r) * 86400);
      // How many matched ONLY because the bracket was widened by one of
      // its own widths. If that clause is load-bearing, the reported
      // bracket is not the event's real uncertainty and saying so matters
      // more than the pass.
      if (r < lo || r > hi) neededWidening += 1;
      break;
    }
    if (hit < 0) missed += 1; else used.add(hit);
  }
  const widths = events.map((e) => (e.bracketTtDays ? (e.bracketTtDays[1] - e.bracketTtDays[0]) * 86400 : 0));
  return {
    missed,
    extra: events.length - used.size,
    found: events.length,
    reference: reference.length,
    worstResidualSec: Number(worstResidualSec.toExponential(3)),
    matchedOnlyByWidening: neededWidening,
    worstBracketSec: widths.length ? Number(Math.max(...widths).toExponential(3)) : null,
  };
}

/** Peak heap, sampled through the signal the search already polls. */
function probe(abortAfter = Infinity) {
  let polls = 0;
  let peak = process.memoryUsage().heapUsed;
  const base = peak;
  return {
    signal: {
      get aborted() {
        polls += 1;
        if (polls % 2000 === 0) peak = Math.max(peak, process.memoryUsage().heapUsed);
        return polls >= abortAfter;
      },
    },
    // Sampled every 2000 polls AND once at the end, because a run of 18
    // evaluations never reaches the first sample: every short run used to
    // report exactly 0.000 MiB, which is not a measurement. Even with the
    // final sample this is a heapUsed delta at two instants, not a peak,
    // and it moves with GC timing between runs.
    stats: () => {
      const end = process.memoryUsage().heapUsed;
      return {
        peakHeapDeltaMiB: Number(((Math.max(peak, end) - base) / 1048576).toFixed(3)),
        heapSamples: Math.floor(polls / 2000) + 1,
        polls,
      };
    },
  };
}

function runMode(rt, mode, spec, tuning = {}, abortAfter = Infinity) {
  const p = probe(abortAfter);
  const t0 = process.hrtime.bigint();
  let verdict = null;
  let thrown = null;
  try {
    verdict = mode === 'validated-geometric'
      ? rt.searchGeometric({ body: spec.body, targetDeg: spec.targetDeg, fromTtDays: spec.fromTt, toTtDays: spec.toTt, signal: p.signal, ...tuning })
      : rt.search({ kind: 'longitude', body: spec.body, targetDeg: spec.targetDeg, fromTtDays: spec.fromTt, toTtDays: spec.toTt, epsilonDeg: EPSILON_DEG, options: CORRECTED, signal: p.signal, ...tuning });
  } catch (error) {
    thrown = { code: error?.code ?? null, message: String(error?.message ?? error) };
  }
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  return { verdict, thrown, ms: Number(ms.toFixed(1)), ...p.stats() };
}

// ------------------------------------------------------------------- driver
const rt = await openPackFile(PACK);
const F = functions(rt);
const MODES = ['empirical-apparent', 'validated-geometric'];

function prepare(c) {
  return { ...c, fromTt: ttOf(c.fromIso), toTt: ttOf(c.toIso) };
}

/** One case, one mode: reference, run, score. */
function evaluateCase(c, mode) {
  rt._body = c.body;
  const ref = referenceRoots(F[mode], c.targetDeg, c.fromTt, c.toTt);
  const run = runMode(rt, mode, c);
  const v = run.verdict;
  const events = v?.events ?? [];
  const s = score(events, ref.roots);
  // The plan verbatim: "the run left at least one interval undecided, or
  // was refused, or finished with support 'none' while the reference found
  // events". The first implementation added `&& events.length === 0`,
  // which is not in the plan and removes the one clause aimed at the
  // empirical mode's own worst case.
  const unresolved = !v
    || v.execution.status !== 'finished'
    || (v.accounting.unresolved.length > 0)
    || (v.completeness.support === 'none' && ref.roots.length > 0);
  return {
    id: c.id, body: c.body, targetDeg: c.targetDeg, window: [c.fromIso, c.toIso], mode,
    reference: {
      roots: ref.roots.length, boundaryRoots: ref.boundary.length,
      evaluations: ref.evaluations, stepDays: ref.stepDays,
      widestGapDays: Number(ref.widestGapDays.toExponential(4)),
    },
    result: v ? {
      status: v.execution.status,
      support: v.completeness.support,
      established: v.completeness.established,
      exactTotal: v.eventCount.isExactTotal,
      conditionalTotal: v.eventCount.conditionalTotal ?? null,
      unresolvedIntervals: v.accounting.unresolved.length,
    } : null,
    thrown: run.thrown,
    metrics: {
      ...s, unresolved,
      evaluations: v?.execution.evaluations ?? null,
      ms: run.ms, peakHeapDeltaMiB: run.peakHeapDeltaMiB, heapSamples: run.heapSamples,
    },
    firstEventUtc: events.length ? utcOf(events[0].ttDays) : null,
    lastEventUtc: events.length ? utcOf(events[events.length - 1].ttDays) : null,
  };
}

/** Set comparison under the declared 1-second tolerance. */
function sameSet(a, b) {
  // Two empty sets are "the same" and prove nothing. Twenty per cent of
  // this harness's structural comparisons were empty-vs-empty -- the two
  // holdout cases whose body never reaches its target -- and the write-up
  // reported them as passes without saying so.
  if (a.length === 0 && b.length === 0) return { same: true, why: null, vacuous: true };
  if (a.length !== b.length) return { same: false, why: `${a.length} vs ${b.length}`, vacuous: false };
  const x = [...a].sort((u, v) => u - v);
  const y = [...b].sort((u, v) => u - v);
  for (let i = 0; i < x.length; i += 1) {
    if (Math.abs(x[i] - y[i]) > MATCH_TOL_DAYS) {
      return { same: false, why: `event ${i + 1} differs by ${((x[i] - y[i]) * 86400).toExponential(2)} s`, vacuous: false };
    }
  }
  return { same: true, why: null, vacuous: false };
}

/** C2's convention: a part owns [from, to), so a boundary root is the later part's. */
function concatPartitions(rt, mode, c, parts) {
  const times = [];
  let evaluations = 0;
  let ms = 0;
  for (let k = 0; k < parts; k += 1) {
    const from = c.fromTt + ((c.toTt - c.fromTt) * k) / parts;
    const to = c.fromTt + ((c.toTt - c.fromTt) * (k + 1)) / parts;
    const run = runMode(rt, mode, { ...c, fromTt: from, toTt: to });
    if (!run.verdict) return { times: null, thrown: run.thrown, evaluations, ms };
    evaluations += run.verdict.execution.evaluations;
    ms += run.ms;
    for (const e of run.verdict.events) {
      // [from, to): a root within a second of this part's end belongs to
      // the next part, which will report it.
      if (k < parts - 1 && to - e.ttDays <= MATCH_TOL_DAYS) continue;
      if (k > 0 && e.ttDays - from < -MATCH_TOL_DAYS) continue;
      times.push(e.ttDays);
    }
  }
  return { times, thrown: null, evaluations, ms };
}

function structural(c, mode) {
  rt._body = c.body;
  const whole = runMode(rt, mode, c);
  const base = (whole.verdict?.events ?? []).map((e) => e.ttDays);
  const out = { id: c.id, body: c.body, mode, baseEvents: base.length, checks: {} };
  if (!whole.verdict) { out.checks.C0 = { pass: false, why: `the whole-window run threw ${whole.thrown?.code}` }; return out; }

  for (const parts of [2, 3, 7]) {
    const got = concatPartitions(rt, mode, c, parts);
    const cmp = got.times === null
      ? { same: false, why: `a part threw ${got.thrown?.code}` }
      : sameSet(base, got.times);
    out.checks[`C1/${parts}`] = {
      ...cmp, pass: cmp.same, parts,
      evaluations: got.evaluations, ms: Number(got.ms.toFixed(1)),
    };
  }
  for (const [label, delta] of [['C3/+360', 360], ['C3/-360', -360], ['C4/+720', 720]]) {
    const run = runMode(rt, mode, { ...c, targetDeg: c.targetDeg + delta });
    out.checks[label] = run.verdict
      ? sameSet(base, run.verdict.events.map((e) => e.ttDays))
      : { same: false, why: `threw ${run.thrown?.code}` };
    out.checks[label].pass = out.checks[label].same;
  }
  {
    // C5: shift 37 days later; inside the overlap the events must agree.
    const shifted = { ...c, fromTt: c.fromTt + 37, toTt: c.toTt + 37 };
    const run = runMode(rt, mode, shifted);
    if (!run.verdict) out.checks['C5/shift'] = { pass: false, why: `threw ${run.thrown?.code}` };
    else {
      const inOverlap = (t) => t >= shifted.fromTt - MATCH_TOL_DAYS && t <= c.toTt + MATCH_TOL_DAYS;
      const got = sameSet(base.filter(inOverlap), run.verdict.events.map((e) => e.ttDays).filter(inOverlap));
      out.checks['C5/shift'] = { ...got, pass: got.same };
    }
  }
  for (const [label, tuning] of (mode === 'empirical-apparent'
    ? [['C6/97', { probeSamples: 97 }], ['C6/193', { probeSamples: 193 }], ['C6/385', { probeSamples: 385 }]]
    : [['C6/1e-3', { minWidthSec: 1e-3 }], ['C6/1e-4', { minWidthSec: 1e-4 }], ['C6/1e-5', { minWidthSec: 1e-5 }]])) {
    const run = runMode(rt, mode, c, tuning);
    out.checks[label] = run.verdict
      ? { ...sameSet(base, run.verdict.events.map((e) => e.ttDays)), evaluations: run.verdict.execution.evaluations, ms: run.ms }
      : { same: false, why: `threw ${run.thrown?.code}` };
    out.checks[label].pass = out.checks[label].same;
  }
  // C7 and C8 as declared, with the plan's literal 500 and 300.
  //
  // A third outcome exists and has to: the validated mode answers some of
  // these cases in under 200 evaluations, so a 500-evaluation budget is
  // never spent and an abort at poll 300 never fires. That is not the
  // solver failing the invariant, it is the case being unable to exercise
  // it. Reporting it as a pass would be worse. So: pass, fail, or
  // NOT EXERCISED, with the cost that made it so.
  //
  // C7b and C8b were ADDED AFTER SEEING THAT -- stated here rather than
  // quietly substituted. They scale the limit to the case's own measured
  // cost, so every case exercises the invariant. The declared C7 and C8
  // stay exactly as written and are reported beside them.
  const baselineEvaluations = whole.verdict.execution.evaluations;
  // The plan's C7 has three clauses and the third was not implemented:
  // "...and the events it did find are real". `truth` is the same dense
  // reference the case was scored against, so a budget-limited run's
  // events are checked against it rather than counted and ignored.
  rt._body = c.body;
  const truth = referenceRoots(F[mode], c.targetDeg, c.fromTt, c.toTt).roots;
  const eventsAreReal = (v) => (v?.events ?? []).every((e) => truth.some((r) => Math.abs(e.ttDays - r) <= MATCH_TOL_DAYS));

  const budgetCheck = (limit, label) => {
    const run = runMode(rt, mode, c, { maxEvaluations: limit });
    const v = run.verdict;
    const exercised = baselineEvaluations > limit;
    return {
      [label]: {
        pass: !exercised
          ? true
          : Boolean(v) && v.execution.status === 'budget-exhausted' && v.completeness.established === false
            && eventsAreReal(v),
        eventsAreReal: v ? eventsAreReal(v) : null,
        exercised,
        limit,
        baselineEvaluations,
        notExercised: exercised ? null : `the whole run costs ${baselineEvaluations} evaluations, under the ${limit} budget, so it cannot be exhausted`,
        status: v?.execution.status ?? null,
        thrown: run.thrown?.code ?? null,
        established: v?.completeness.established ?? null,
        events: v?.events.length ?? null,
      },
    };
  };
  const cancelCheck = (after, label) => {
    const run = runMode(rt, mode, c, {}, after);
    const v = run.verdict;
    const exercised = whole.polls > after;
    return {
      [label]: {
        pass: !exercised
          ? true
          : Boolean(v) && v.execution.status === 'cancelled' && v.completeness.established === false,
        exercised,
        abortAfterPolls: after,
        baselinePolls: whole.polls,
        notExercised: exercised ? null : `the whole run polls the signal ${whole.polls} times, under ${after}, so the abort never fires`,
        status: v?.execution.status ?? null,
        thrown: run.thrown?.code ?? null,
        established: v?.completeness.established ?? null,
        events: v?.events.length ?? null,
      },
    };
  };
  Object.assign(out.checks, budgetCheck(500, 'C7'));
  Object.assign(out.checks, budgetCheck(Math.max(1, Math.floor(baselineEvaluations / 2)), 'C7b'));
  Object.assign(out.checks, cancelCheck(300, 'C8'));
  Object.assign(out.checks, cancelCheck(Math.max(1, Math.floor(whole.polls / 2)), 'C8b'));
  {
    const again = runMode(rt, mode, c);
    const got = sameSet(base, (again.verdict?.events ?? []).map((e) => e.ttDays));
    out.checks.C9 = { ...got, pass: got.same && Boolean(again.verdict) };
  }
  {
    // Each case names the code it must be refused with. Accepting any
    // truthy `code` let `maxEvaluations: -1` pass on an `unknown-body`
    // refusal -- a check that cannot tell which rule fired.
    const bad = [];
    const got = {};
    const expect = (label, want, fn) => {
      try { fn(); bad.push(`${label}: answered`); got[label] = 'answered'; } catch (error) {
        got[label] = error?.code ?? 'no-code';
        if (error?.code !== want) bad.push(`${label}: ${error?.code ?? 'no code'}, wanted ${want}`);
      }
    };
    expect('unknown option', 'unsupported-option', () => runModeStrict(mode, c, { notAnOption: 1 }));
    expect('out-of-range value', 'unsupported-option', () => runModeStrict(mode, c, { maxEvaluations: -1 }));
    expect('reversed interval', 'unsupported-option', () => runModeStrict(mode, { ...c, fromTt: c.toTt, toTt: c.fromTt }));
    expect('unknown body', 'unknown-body', () => runModeStrict(mode, { ...c, body: 'Ceres' }));
    expect('outside coverage', 'out-of-coverage', () => runModeStrict(mode, { ...c, fromTt: -1e6, toTt: -1e6 + 10 }));
    out.checks.C10 = { pass: bad.length === 0, problems: bad, codes: got };
  }
  return out;
}

/** No catching: C10 wants the throw itself. */
function runModeStrict(mode, spec, tuning = {}) {
  return mode === 'validated-geometric'
    ? rt.searchGeometric({ body: spec.body, targetDeg: spec.targetDeg, fromTtDays: spec.fromTt, toTtDays: spec.toTt, ...tuning })
    : rt.search({ kind: 'longitude', body: spec.body, targetDeg: spec.targetDeg, fromTtDays: spec.fromTt, toTtDays: spec.toTt, epsilonDeg: EPSILON_DEG, options: CORRECTED, ...tuning });
}

const report = {
  plan: 'EVALUATION-PLAN.md',
  pack: { path: PACK, digest: rt.integrity.computedDigest, compiler: rt.header.compiler?.version ?? null },
  rules: { refStepDays: REF_STEP_DAYS, bisectToDays: BISECT_TO_DAYS, matchToleranceSec: 1, unresolvedLimit: UNRESOLVED_LIMIT, epsilonDeg: EPSILON_DEG },
  node: process.version,
  regressions: [],
  holdout: [],
  structural: [],
};

const wanted = (set) => !ONLY || ONLY === set;
const pick = (cs) => (ONE ? cs.filter((c) => c.id === ONE) : cs);

if (wanted('A')) {
  for (const c of pick(REGRESSIONS).map(prepare)) {
    for (const mode of MODES) {
      const r = evaluateCase(c, mode);
      report.regressions.push(r);
      console.log(`A ${r.id} ${r.body} ${mode}: ref ${r.reference.roots}, found ${r.metrics.found}, missed ${r.metrics.missed}, extra ${r.metrics.extra}, ${r.result?.support ?? r.thrown?.code}, ${r.metrics.ms} ms`);
    }
  }
}
if (wanted('B')) {
  for (const c of pick(HOLDOUT).map(prepare)) {
    for (const mode of MODES) {
      const r = evaluateCase(c, mode);
      report.holdout.push(r);
      console.log(`B ${r.id} ${r.body} ${mode}: ref ${r.reference.roots}, found ${r.metrics.found}, missed ${r.metrics.missed}, extra ${r.metrics.extra}, ${r.result?.support ?? r.thrown?.code}, ${r.metrics.ms} ms`);
    }
  }
}
if (wanted('C')) {
  for (const c of pick(HOLDOUT).map(prepare)) {
    for (const mode of MODES) {
      const r = structural(c, mode);
      report.structural.push(r);
      const failed = Object.entries(r.checks).filter(([, v]) => !v.pass).map(([k]) => k);
      console.log(`C ${r.id} ${r.body} ${mode}: ${failed.length === 0 ? 'all pass' : `FAIL ${failed.join(', ')}`}`);
    }
  }
}

// ------------------------------------------------- supplementary, added
//
// ADDED AFTER SEEING THE RESULT, and labelled as such. The declared
// reference bisects to 1e-9 day = 8.64e-5 s, which is the same order as
// the validated mode's own bracket (~8e-5 s): the truth source is no more
// precise than the thing it checks, so 15 of 53 reference roots matched
// only because the rule widens the bracket by one of its own widths. That
// says nothing about the mode and everything about the reference. This
// re-refines each matched root by pure bisection to 1e-14 day and asks
// again -- the declared scoring above is untouched.
if (report.holdout.length) {
  const FINE = 1e-14;
  report.supplementary = { what: 'the declared reference re-bisected to 1e-14 day, to see whether the bracket reliance is the reference or the mode', byMode: {} };
  for (const mode of MODES) {
    let inside = 0;
    let outside = 0;
    let worst = 0;
    for (const row of [...report.regressions, ...report.holdout].filter((r) => r.mode === mode)) {
      const c = prepare({ id: row.id, body: row.body, targetDeg: row.targetDeg, fromIso: row.window[0], toIso: row.window[1] });
      rt._body = c.body;
      const f = F[mode];
      const at = (t) => wrap180(f(t) - c.targetDeg);
      const run = runMode(rt, mode, c);
      for (const e of run.verdict?.events ?? []) {
        const [lo, hi] = e.bracketTtDays;
        // Widen once to find a sign change around the reported bracket,
        // then bisect hard.
        const w = Math.max(hi - lo, 1e-9);
        let a2 = lo - 8 * w;
        let b2 = hi + 8 * w;
        let fa = at(a2);
        if (Math.sign(fa) === Math.sign(at(b2))) continue;
        while (b2 - a2 > FINE) {
          const m = (a2 + b2) / 2;
          if (!(m > a2 && m < b2)) break;
          const fm = at(m);
          if (fm === 0) { a2 = m; b2 = m; break; }
          if (Math.sign(fm) === Math.sign(fa)) { a2 = m; fa = fm; } else b2 = m;
        }
        const r = (a2 + b2) / 2;
        worst = Math.max(worst, Math.abs(e.ttDays - r) * 86400);
        if (r >= lo && r <= hi) inside += 1; else outside += 1;
      }
    }
    report.supplementary.byMode[mode] = {
      rootsInsideTheReportedBracket: inside,
      rootsOutsideIt: outside,
      worstResidualSec: Number(worst.toExponential(3)),
      bisectedToDays: FINE,
    };
    console.log(`supplementary ${mode}: inside ${inside}, outside ${outside}, worst residual ${worst.toExponential(3)} s`);
  }
}

// Usefulness, as declared: the denominator includes refusals.
for (const mode of MODES) {
  const cases = [...report.regressions, ...report.holdout].filter((r) => r.mode === mode);
  if (!cases.length) continue;
  const unresolved = cases.filter((r) => r.metrics.unresolved).length;
  const structural = report.structural.filter((r) => r.mode === mode);
  let comparisons = 0;
  let vacuous = 0;
  for (const r of structural) {
    for (const v of Object.values(r.checks)) {
      if (typeof v.vacuous !== 'boolean') continue;
      comparisons += 1;
      if (v.vacuous) vacuous += 1;
    }
  }
  report[`summary:${mode}`] = {
    cases: cases.length,
    missed: cases.reduce((n, r) => n + r.metrics.missed, 0),
    extra: cases.reduce((n, r) => n + r.metrics.extra, 0),
    unresolved,
    unresolvedFraction: Number((unresolved / cases.length).toFixed(3)),
    usefulnessFailure: unresolved / cases.length > UNRESOLVED_LIMIT,
    // The accuracy figure. Missed and extra say whether the right events
    // were found; this says how close they landed, and it is the number
    // the 1-second matching gate hides.
    worstResidualSec: Math.max(...cases.map((r) => r.metrics.worstResidualSec ?? 0)),
    worstBracketSec: Math.max(...cases.map((r) => r.metrics.worstBracketSec ?? 0)),
    // How often the match needed the "widened by one bracket width"
    // clause. If this is not zero the reported bracket is not the event's
    // real uncertainty.
    matchedOnlyByWidening: cases.reduce((n, r) => n + (r.metrics.matchedOnlyByWidening ?? 0), 0),
    referenceRoots: cases.reduce((n, r) => n + r.reference.roots, 0),
    medianMs: [...cases.map((r) => r.metrics.ms)].sort((a, b) => a - b)[Math.floor(cases.length / 2)],
    totalEvaluations: cases.reduce((n, r) => n + (r.metrics.evaluations ?? 0), 0),
    peakHeapDeltaMiB: Math.max(...cases.map((r) => r.metrics.peakHeapDeltaMiB)),
    structuralComparisons: comparisons,
    vacuousComparisons: vacuous,
  };
  console.log(`\n${mode}:`, JSON.stringify(report[`summary:${mode}`]));
}

if (OUT) {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`\nwrote ${OUT}`);
}
