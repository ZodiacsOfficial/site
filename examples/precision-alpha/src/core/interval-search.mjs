/**
 * A bounded, typed-verdict event search.
 *
 * Copied UNCHANGED from the research track at
 * docs/platform/evidence/precision-2026-09-20/search/lib/interval-search.mjs,
 * where it is exercised by 13 closed-form analytic cases whose expected
 * verdicts are known in advance. It is already environment-neutral: no
 * `node:` imports, no clock, no randomness. `test/interval-search.test.mjs`
 * re-runs those same cases here so the copy cannot drift from the original.
 *
 * The question this answers is NOT "where are the roots of f on [a,b]" but
 * "what is the root TOPOLOGY of a function known only to within +/- epsilon,
 * and can that topology be certified at all?". Those are different questions,
 * and only the second one can be answered honestly when the function comes
 * from a physical model that disagrees with other models of the same thing.
 *
 * METHOD
 *
 * The interval is decomposed by adaptive subdivision into cells, each of which
 * is closed by one of two RIGOROUS tests (rigorous given the declared
 * derivative enclosure), or else reaches a declared floor width and stays open:
 *
 *   exclusion   The value enclosure over the cell misses [-epsilon, +epsilon]
 *               entirely. The cell holds no root at this epsilon and cannot
 *               change the sign, whatever happens inside it. Turning points
 *               inside an excluded cell are irrelevant to the count.
 *   monotone    The derivative enclosure over the cell excludes zero. The cell
 *               holds at most one root, and which is settled by its two end
 *               values.
 *   floor       Neither test closed the cell before minWidth. The cell is
 *               OPEN: the search reports it and refuses to certify a count.
 *
 * Root counting then walks the cells. Between cells the sign is carried by the
 * junction values, and every junction adjacent to a closed cell is itself
 * further than epsilon from the level, so no crossing can hide on a boundary.
 *
 * A dense scan cannot do this. A dense scan can only say "no sign change was
 * seen between the samples I took"; the exclusion and monotone tests say
 * "no sign change EXISTS in this cell, given the declared derivative bound".
 * That is the whole difference, and it is why a derivative enclosure is
 * required rather than optional.
 *
 * PROVENANCE, carried on every verdict and never inferred:
 *
 *   boundKind 'proven'    the derivative enclosure is closed-form interval
 *                         arithmetic: the completeness claim is a theorem.
 *             'empirical' the enclosure holds only if the declared curvature
 *                         bound holds. Sampling establishes sampled behaviour.
 *   exactArithmetic       the caller declares f and f' are evaluated exactly.
 *                         Only under this declaration may a TANGENCY be
 *                         certified, because a tangency is a measure-zero
 *                         event that no finite sampling of an inexact function
 *                         can distinguish from a 1e-33-deep crossing or a
 *                         1e-33-high near miss. This route is closed to
 *                         ephemeris-backed functions, permanently.
 *
 * Nothing here divides a position uncertainty by a velocity. See
 * `stationaryTimeEnvelope` for why, and for what replaces it.
 */

/** The typed verdicts. `no-crossing` is an addition to the five requested
 *  names: the empty case is a real, certifiable outcome, and reporting it as
 *  `unresolved-interval` would be a false negative. */
export const VERDICTS = Object.freeze([
  'crossing',
  'no-crossing',
  'stationary-touch',
  'multiple-crossings',
  'boundary-event',
  'unresolved-interval',
]);

/** Orthogonal to the verdict: how much the verdict is worth. */
export const OUTCOMES = Object.freeze(['certified', 'incomplete', 'refused']);

class BudgetExhausted extends Error {
  constructor(used, stage) { super(`evaluation budget exhausted after ${used} evaluations during ${stage}`); this.used = used; this.stage = stage; }
}

const intersect = (p, q) => [Math.max(p[0], q[0]), Math.min(p[1], q[1])];

/**
 * @param {object} spec
 * @param {(t:number)=>number} spec.f  level-relative value; a root is f(t)=0
 * @param {(t:number)=>number} [spec.fPrime]  exact derivative, when available
 * @param {(u:number,v:number,ctx:object)=>[number,number]} spec.derivativeEnclosure
 * @param {(u:number,v:number,ctx:object)=>[number,number]} [spec.secondDerivativeEnclosure]
 *        when supplied and it excludes zero over an open floor cell, that cell
 *        is certified to hold at most one turning point, which bounds the
 *        ambiguity to {n-2, n-1, n} instead of leaving it unbounded.
 * @param {number} spec.a
 * @param {number} spec.b
 * @param {number} spec.epsilon   one-sided uncertainty on f, in f's units
 * @param {number} spec.minWidth  subdivision floor, in t's units
 * @param {number} [spec.maxEvaluations]
 * @param {'proven'|'empirical'} [spec.boundKind]
 * @param {boolean} [spec.exactArithmetic]
 */
export function classifyInterval(spec) {
  const {
    f, fPrime = null, derivativeEnclosure, secondDerivativeEnclosure = null,
    a, b, epsilon, minWidth,
    maxEvaluations = 50000,
    boundKind = 'empirical',
    exactArithmetic = false,
    label = '',
  } = spec;

  const refuse = (why, extra = {}) => ({
    label, verdict: 'unresolved-interval', outcome: 'refused', reason: why,
    complete: false, certified: false, boundKind, epsilon, exactArithmetic,
    rootCount: null, possibleRootCounts: null, interval: [a, b],
    evaluations: 0, crossings: null, openRegions: [], undecidedRegions: [], turningPoints: [],
    partialUncertifiedFindings: null, assumptions: [], notes: [], ...extra,
  });
  if (typeof f !== 'function' || typeof derivativeEnclosure !== 'function') return refuse('f-and-derivativeEnclosure-required');
  if (!Number.isFinite(a) || !Number.isFinite(b) || !(a < b)) return refuse('interval-must-be-finite-and-ordered');
  if (!Number.isFinite(epsilon) || epsilon < 0) return refuse('epsilon-must-be-finite-and-non-negative');
  if (!Number.isFinite(minWidth) || minWidth <= 0) return refuse('minWidth-must-be-positive');
  if (!Number.isFinite(maxEvaluations) || maxEvaluations < 16) return refuse('maxEvaluations-too-small-to-attempt');

  let used = 0;
  let stage = 'setup';
  const spend = () => { used += 1; if (used > maxEvaluations) throw new BudgetExhausted(used, stage); };
  const valueCache = new Map();
  const value = (t) => {
    if (valueCache.has(t)) return valueCache.get(t);
    spend();
    const y = f(t);
    if (!Number.isFinite(y)) throw new RangeError(`f returned a non-finite value at t=${t}`);
    valueCache.set(t, y);
    return y;
  };
  const slopeCache = new Map();
  const slope = fPrime ? (t) => {
    if (slopeCache.has(t)) return slopeCache.get(t);
    spend();
    const d = fPrime(t);
    if (!Number.isFinite(d)) throw new RangeError(`fPrime returned a non-finite value at t=${t}`);
    slopeCache.set(t, d);
    return d;
  } : null;
  const ctx = { value, slope };
  const enclose = (u, v) => {
    const d = derivativeEnclosure(u, v, ctx);
    if (!Array.isArray(d) || d.length !== 2 || !Number.isFinite(d[0]) || !Number.isFinite(d[1]) || d[0] > d[1]) {
      throw new RangeError('derivativeEnclosure must return a finite ordered pair');
    }
    return d;
  };

  /** Mean-value enclosure of f over [u,v] from both ends and the slope range. */
  const valueEnclosure = (u, v, d) => {
    const w = v - u, fu = value(u), fv = value(v);
    const fromLeft = [fu + Math.min(0, d[0] * w), fu + Math.max(0, d[1] * w)];
    const fromRight = [fv - Math.max(0, d[1] * w), fv - Math.min(0, d[0] * w)];
    return intersect(fromLeft, fromRight);
  };

  const cells = [];
  try {
    stage = 'cell-decomposition';
    const stack = [[a, b, 0]];
    while (stack.length) {
      const [u, v, depth] = stack.pop();
      const d = enclose(u, v);
      const V = valueEnclosure(u, v, d);
      if (V[0] > epsilon || V[1] < -epsilon) {
        cells.push({ u, v, status: 'excluded', d, valueEnclosure: V, sign: V[0] > epsilon ? 1 : -1, depth });
        continue;
      }
      if (d[0] > 0 || d[1] < 0) {
        cells.push({ u, v, status: 'monotone', d, valueEnclosure: V, direction: d[0] > 0 ? 1 : -1, depth });
        continue;
      }
      const mid = midpoint(u, v, minWidth);
      if (v - u <= minWidth || !(mid > u && mid < v)) {
        cells.push({ u, v, status: 'floor', d, valueEnclosure: V, depth });
        continue;
      }
      stack.push([mid, v, depth + 1], [u, mid, depth + 1]);
    }
  } catch (error) {
    if (!(error instanceof BudgetExhausted)) throw error;
    return budgetRefusal({ label, boundKind, epsilon, exactArithmetic, a, b, minWidth, maxEvaluations, used, stage: error.stage, closed: cells.length });
  }
  cells.sort((x, y) => x.u - y.u);

  // Merge runs that behave identically, so a root can never land on an
  // artificial junction created by the subdivision itself.
  const runs = [];
  for (const cell of cells) {
    const prior = runs[runs.length - 1];
    const same = prior && prior.status === cell.status
      && (cell.status === 'monotone' ? prior.direction === cell.direction
        : cell.status === 'excluded' ? prior.sign === cell.sign : true);
    if (same) { prior.v = cell.v; prior.d = [Math.min(prior.d[0], cell.d[0]), Math.max(prior.d[1], cell.d[1])]; prior.parts += 1; }
    else runs.push({ ...cell, parts: 1 });
  }

  let junctionValues;
  let turningPoints = [];
  try {
    stage = 'junction-evaluation';
    junctionValues = [a, ...runs.map((r) => r.v)].map((t) => ({ t, value: value(t) }));
    stage = 'open-cell-characterisation';
    turningPoints = runs.filter((r) => r.status === 'floor').map((r) => characteriseOpenCell(r, { value, slope, enclose, secondDerivativeEnclosure, ctx, minWidth, epsilon }));
  } catch (error) {
    if (!(error instanceof BudgetExhausted)) throw error;
    return budgetRefusal({ label, boundKind, epsilon, exactArithmetic, a, b, minWidth, maxEvaluations, used, stage: error.stage, closed: cells.length });
  }

  const junctionAt = new Map(junctionValues.map((j) => [j.t, j.value]));
  const sideOf = (x) => (x > epsilon ? 1 : x < -epsilon ? -1 : 0);

  // ---- walk the runs ----
  const crossings = [];
  const openRuns = [];
  let certifiedCount = 0;

  for (const run of runs) {
    const fu = junctionAt.get(run.u), fv = junctionAt.get(run.v);
    if (run.status === 'excluded') continue;
    if (run.status === 'monotone') {
      const su = sideOf(fu), sv = sideOf(fv);
      if (su === 0 || sv === 0) {
        // An endpoint of the WHOLE interval may legitimately sit on the level;
        // that is a boundary event, handled below, not an interior failure.
        const atOuterEdge = (su === 0 && run.u === a) || (sv === 0 && run.v === b);
        const inner = su === 0 ? sv : su;
        if (atOuterEdge && inner !== 0) {
          // One end sits within epsilon of the level and the other is
          // certified clear of it: the run is monotone, so exactly one root,
          // and it is at or beyond the interval edge. The bracket is the
          // epsilon set inside the run, NOT the edge instant -- reporting a
          // zero-width bracket here would claim the root is exactly on the
          // boundary, which is precisely what is not known.
          const at = su === 0 ? run.u : run.v;
          const level = inner * epsilon;
          let far = at;
          try {
            stage = 'edge-root-bracketing';
            const other = su === 0 ? run.v : run.u;
            const fOther = su === 0 ? fv : fu;
            const fAt = su === 0 ? fu : fv;
            if (epsilon > 0 && (fAt - level) * (fOther - level) < 0) {
              let lo = Math.min(at, other), hi = Math.max(at, other), flo = value(lo) - level;
              for (let i = 0; i < 200 && hi - lo > minWidth; i += 1) {
                const m = midpoint(lo, hi, minWidth);
                if (!(m > lo && m < hi)) break;
                const fm = value(m) - level;
                if (fm === 0) { lo = m; hi = m; break; }
                if ((fm < 0) === (flo < 0)) { lo = m; flo = fm; } else hi = m;
              }
              far = Math.round((lo + hi) / 2);
            }
          } catch (error) {
            if (!(error instanceof BudgetExhausted)) throw error;
            return budgetRefusal({ label, boundKind, epsilon, exactArithmetic, a, b, minWidth, maxEvaluations, used, stage: error.stage, closed: cells.length });
          }
          crossings.push({
            lo: Math.min(at, far), hi: Math.max(at, far), width: Math.abs(far - at),
            centre: at, direction: run.direction > 0 ? 'rising' : 'falling',
            transversal: true, atIntervalEdge: true, edgeValue: su === 0 ? fu : fv,
            bracketClippedByIntervalEdge: true,
            bracketNote: 'The root lies within epsilon of this interval endpoint. The bracket shown is the part of the epsilon set that falls inside the interval; the root may lie on either side of the endpoint, and which side is not certified.',
          });
          certifiedCount += 1;
          continue;
        }
        openRuns.push({ from: run.u, to: run.v, why: 'monotone-run-end-within-epsilon', turningPoint: null });
        continue;
      }
      if (su === sv) continue;
      let bracket;
      try { stage = 'root-bracketing'; bracket = bracketRoot(value, run.u, run.v, epsilon, minWidth, fu, fv); }
      catch (error) {
        if (!(error instanceof BudgetExhausted)) throw error;
        return budgetRefusal({ label, boundKind, epsilon, exactArithmetic, a, b, minWidth, maxEvaluations, used, stage: error.stage, closed: cells.length });
      }
      crossings.push({ ...bracket, direction: run.direction > 0 ? 'rising' : 'falling', transversal: true, atIntervalEdge: false });
      certifiedCount += 1;
      continue;
    }
    openRuns.push({
      from: run.u, to: run.v,
      why: 'value-enclosure-straddles-epsilon-at-the-subdivision-floor',
      turningPoint: turningPoints.find((x) => x.from === run.u && x.to === run.v) ?? null,
    });
  }

  // Adjacent open runs are ONE open region. Counting each separately would
  // inflate the ambiguity: a single undecided turning point normally leaves a
  // monotone run open on either side of it.
  const openCells = [];
  for (const run of openRuns.sort((x, y) => x.from - y.from)) {
    const prior = openCells[openCells.length - 1];
    if (prior && prior.to === run.from) {
      prior.to = run.to;
      prior.why = `${prior.why}+${run.why}`;
      prior.turningPoint = prior.turningPoint ?? run.turningPoint;
    } else openCells.push({ ...run });
  }

  // Bound each open region's root count. A region whose second-derivative
  // enclosure excludes zero holds at most one turning point, hence at most two
  // roots; its end signs then fix the parity, which sometimes pins the count
  // exactly even though the location stays uncertain.
  const assumptions = [];
  let unbounded = false;
  for (const region of openCells) {
    const sLeft = sideOf(junctionAt.get(region.from) ?? value(region.from));
    const sRight = sideOf(junctionAt.get(region.to) ?? value(region.to));
    region.endSides = [sLeft, sRight];
    let atMostOneTurn = false;
    if (secondDerivativeEnclosure) {
      try {
        stage = 'open-region-curvature';
        const dd = secondDerivativeEnclosure(region.from, region.to, ctx);
        if (Array.isArray(dd) && (dd[0] > 0 || dd[1] < 0)) { atMostOneTurn = true; region.curvatureSign = dd[0] > 0 ? 1 : -1; }
      } catch (error) {
        if (!(error instanceof BudgetExhausted)) throw error;
        return budgetRefusal({ label, boundKind, epsilon, exactArithmetic, a, b, minWidth, maxEvaluations, used, stage: error.stage, closed: cells.length });
      }
    }
    region.atMostOneTurningPoint = atMostOneTurn;
    if (!atMostOneTurn) {
      region.possibleRootCounts = null;
      unbounded = true;
      continue;
    }
    assumptions.push('open region holds at most one turning point (certified by the second-derivative enclosure over the whole region)');
    // One turning point inside a region whose outer junctions are both
    // certified forces those junctions onto the SAME side of the level, so the
    // only possibilities are: the extremum stays clear (0 roots), touches
    // (1 root), or dips through (2 roots). There is no parity shortcut to a
    // single certified count here, and pretending otherwise would be the
    // dishonest move.
    region.possibleRootCounts = [0, 1, 2];
  }
  const undecided = openCells;
  crossings.sort((x, y) => x.lo - y.lo);

  const edgeCrossings = crossings.filter((x) => x.atIntervalEdge);
  const startOnLevel = sideOf(junctionAt.get(a)) === 0;
  const endOnLevel = sideOf(junctionAt.get(runs[runs.length - 1].v)) === 0;
  const resolved = undecided.length === 0;

  let verdict, outcome, rootCount, possibleRootCounts, reason;
  const notes = [];

  if (!resolved) {
    verdict = 'unresolved-interval';
    outcome = 'incomplete';
    rootCount = null;
    possibleRootCounts = undecided.some((x) => x.possibleRootCounts === null) ? null
      : undecided.reduce((acc, x) => sumSets(acc, x.possibleRootCounts), [certifiedCount]);
    reason = undecided.some((c) => c.why.includes('value-enclosure'))
      ? 'turning-region-within-epsilon-of-level'
      : 'run-boundary-within-epsilon-of-level';
    notes.push(
      `${undecided.length} region(s) could not be closed at epsilon=${epsilon}.`,
      unbounded
        ? 'The number of roots inside the open regions is not bounded above by this search: no second-derivative enclosure was supplied or it does not exclude zero there.'
        : 'The root COUNT is not decidable at this epsilon.',
      'The certified roots below are NOT an exhaustive list and must not be published as one.',
    );
  } else if (startOnLevel || endOnLevel || edgeCrossings.length) {
    verdict = 'boundary-event';
    outcome = 'certified';
    rootCount = certifiedCount;
    possibleRootCounts = [rootCount];
    reason = 'root-on-an-interval-endpoint';
    notes.push('A root sits on an endpoint of the query interval. Half-open ownership between adjacent intervals is the caller\'s decision, not the search\'s: reporting it once in each closed view and deduplicating by identity is the only consistent choice.');
  } else if (certifiedCount >= 2) {
    verdict = 'multiple-crossings'; outcome = 'certified'; rootCount = certifiedCount; possibleRootCounts = [rootCount];
    reason = 'multiple-certified-transversal-roots';
  } else if (certifiedCount === 1) {
    verdict = 'crossing'; outcome = 'certified'; rootCount = 1; possibleRootCounts = [1];
    reason = 'single-certified-transversal-root';
  } else {
    verdict = 'no-crossing'; outcome = 'certified'; rootCount = 0; possibleRootCounts = [0];
    reason = 'every-cell-certified-clear-of-the-level';
  }

  // A tangency is only ever reachable under a declared exact arithmetic.
  if (!resolved && exactArithmetic && undecided.length === 1 && certifiedCount === 0) {
    const tp = undecided[0].turningPoint;
    if (tp && tp.value === 0 && tp.curvatureSign !== 0 && tp.curvatureSign !== null && epsilon === 0) {
      verdict = 'stationary-touch'; outcome = 'certified'; rootCount = 1; possibleRootCounts = [1];
      reason = 'tangency-certified-under-declared-exact-arithmetic';
      notes.length = 0;
      notes.push(
        'The turning point value is exactly zero in the caller\'s declared exact arithmetic and the curvature has one certified sign over the cell, so the function touches the level once without crossing.',
        'This route requires exactArithmetic and epsilon === 0. It is unavailable to any ephemeris-backed function and must stay that way.',
      );
      crossings.push({ lo: tp.t, hi: tp.t, width: 0, centre: tp.t, direction: tp.curvatureSign > 0 ? 'touch-from-above' : 'touch-from-below', transversal: false, atIntervalEdge: false });
      undecided.length = 0;
    }
  }

  if (boundKind === 'empirical' && outcome === 'certified') {
    notes.push('Completeness is conditional on the declared derivative enclosure, which is empirical here: it holds if the declared curvature bound holds. That is not a theorem about the underlying function.');
  }

  return {
    label, verdict, outcome, reason,
    complete: verdict !== 'unresolved-interval', certified: outcome === 'certified',
    boundKind, epsilon, exactArithmetic,
    rootCount, possibleRootCounts,
    interval: [a, b], minWidth, maxEvaluations, evaluations: used,
    cells: cells.length, runs: runs.length,
    cellStatusCounts: countBy(cells.map((c) => c.status)),
    crossings: outcome === 'certified' ? crossings : null,
    partialUncertifiedFindings: outcome === 'certified' ? null : {
      warning: 'NOT EXHAUSTIVE. These roots were certified while other cells stayed open; the true count is in possibleRootCounts, which is null when even that is unbounded.',
      certifiedTransversalRoots: crossings,
    },
    openRegions: openCells,
    undecidedRegions: undecided,
    turningPoints,
    endpointValues: { a: junctionAt.get(a), b: junctionAt.get(runs[runs.length - 1].v) },
    assumptions: [...new Set(assumptions)],
    notes,
  };
}

function budgetRefusal({ label, boundKind, epsilon, exactArithmetic, a, b, minWidth, maxEvaluations, used, stage, closed }) {
  return {
    label, verdict: 'unresolved-interval', outcome: 'refused',
    reason: `evaluation-budget-exhausted:${stage}`,
    complete: false, certified: false, boundKind, epsilon, exactArithmetic,
    rootCount: null, possibleRootCounts: null,
    interval: [a, b], minWidth, maxEvaluations, evaluations: used,
    crossings: null,
    partialUncertifiedFindings: { warning: 'NOT EXHAUSTIVE. The search stopped at its declared evaluation limit and covered only part of the interval.', cellsClosed: closed },
    openRegions: [], undecidedRegions: [], turningPoints: [], assumptions: [],
    notes: [`Refused to certify: the declared evaluation limit of ${maxEvaluations} was reached during ${stage}.`],
  };
}

const countBy = (xs) => xs.reduce((acc, x) => ({ ...acc, [x]: (acc[x] ?? 0) + 1 }), {});
/** Minkowski sum of two sets of possible counts. */
const sumSets = (p, q) => [...new Set(p.flatMap((x) => q.map((y) => x + y)))].sort((x, y) => x - y);

/** Integer-safe midpoint when the clock is integral (millisecond transports). */
function midpoint(u, v, minWidth) {
  if (minWidth >= 1 && Number.isInteger(u) && Number.isInteger(v)) return Math.floor((u + v) / 2);
  return u + (v - u) / 2;
}

/**
 * Describe an open (floor) cell: where its turning point is, what value it
 * reaches, and how far that value can stray given the cell width. This is
 * reporting, not certification: an open cell stays open.
 */
function characteriseOpenCell(run, { value, slope, enclose, secondDerivativeEnclosure, ctx, minWidth }) {
  let u = run.u, v = run.v;
  let locatedBy = 'cell-midpoint';
  if (slope) {
    let du = slope(u), dv = slope(v);
    if (du === 0) v = u;
    else if (dv === 0) u = v;
    else if (du * dv < 0) {
      for (let i = 0; i < 200; i += 1) {
        if (!(v - u > 0)) break;
        const m = midpoint(u, v, Number.isInteger(u) && Number.isInteger(v) && minWidth >= 1 ? 1 : 0);
        if (!(m > u && m < v)) break;
        const dm = slope(m);
        if (dm === 0) { u = m; v = m; break; }
        if ((dm < 0) === (du < 0)) { u = m; du = dm; } else { v = m; dv = dm; }
      }
      locatedBy = 'derivative-bisection';
    } else locatedBy = 'derivative-has-no-sign-change-in-cell';
  }
  const t = u === v ? u : midpoint(u, v, Number.isInteger(u) && Number.isInteger(v) && minWidth >= 1 ? 1 : 0);
  const fv = value(t);
  const d = enclose(run.u, run.v);
  const dMax = Math.max(Math.abs(d[0]), Math.abs(d[1]));
  // Rigorous: anywhere in the cell, f is within dMax * cellWidth of f(t).
  const valueSlack = dMax * (run.v - run.u);
  let curvatureSign = null, certifiedSingleTurningPoint = false;
  if (secondDerivativeEnclosure) {
    const dd = secondDerivativeEnclosure(run.u, run.v, ctx);
    if (Array.isArray(dd) && dd[0] > 0) { curvatureSign = 1; certifiedSingleTurningPoint = true; }
    else if (Array.isArray(dd) && dd[1] < 0) { curvatureSign = -1; certifiedSingleTurningPoint = true; }
  }
  return {
    from: run.u, to: run.v, width: run.v - run.u,
    t, value: fv, valueSlack, locatedBy,
    kind: d[0] < 0 && d[1] > 0 ? (value(run.u) > fv ? 'minimum' : 'maximum') : 'unknown',
    curvatureSign, certifiedSingleTurningPoint,
    singleTurningPointAssumed: !certifiedSingleTurningPoint && locatedBy === 'derivative-bisection',
    extremeValueEnclosure: [fv - valueSlack, fv + valueSlack],
  };
}

/**
 * Bracket the root of a run already certified monotone with a sign change.
 * Returns the EPSILON BRACKET -- the set of instants at which the value is
 * within epsilon of the level -- because that, not a point estimate, is the
 * honest location of a root of a function known to +/- epsilon.
 */
function bracketRoot(value, from, to, epsilon, minWidth, fFrom, fTo) {
  const rising = fTo > fFrom;
  const solve = (level) => {
    let lo = from, hi = to, flo = fFrom - level, fhi = fTo - level;
    if (flo === 0) return from;
    if (fhi === 0) return to;
    if (flo * fhi > 0) return null;
    for (let i = 0; i < 200 && hi - lo > minWidth; i += 1) {
      const m = midpoint(lo, hi, minWidth);
      if (!(m > lo && m < hi)) break;
      const fm = value(m) - level;
      if (fm === 0) return m;
      if ((fm < 0) === (flo < 0)) { lo = m; flo = fm; } else { hi = m; fhi = fm; }
    }
    return rising ? hi : lo;
  };
  const centre = solve(0);
  const found = [solve(rising ? -epsilon : epsilon), centre, solve(rising ? epsilon : -epsilon)].filter((x) => x !== null);
  const lo = Math.min(...found), hi = Math.max(...found);
  return { lo, hi, width: hi - lo, centre };
}

/**
 * The correct treatment of a turning point, kept here so that the wrong one is
 * visibly absent from the codebase.
 *
 *   WRONG   dt = epsilon / |f'(t*)|
 *           At a turning point f'(t*) -> 0, so this diverges. Applied to a
 *           planetary station it yields a "timing uncertainty" longer than the
 *           event it describes, and the shape is wrong anyway: near t* the
 *           function is quadratic, not linear.
 *
 *   RIGHT   {t : |f(t) - f(t*)| <= epsilon} around a turning point has
 *           half-width sqrt(2*epsilon/|f''(t*)|). Solve it as a LEVEL SET on
 *           the real function; use the quadratic only as a sanity scale.
 */
export function stationaryTimeEnvelope(secondDerivative, epsilon) {
  if (!Number.isFinite(secondDerivative) || secondDerivative === 0) {
    return { halfWidthQuadratic: Infinity, naiveVelocityDivision: Infinity, note: 'A vanishing second derivative means the quadratic scale does not apply either; solve the level set directly.' };
  }
  return {
    halfWidthQuadratic: Math.sqrt(2 * epsilon / Math.abs(secondDerivative)),
    note: "Quadratic half-width sqrt(2*epsilon/|f''|). Never epsilon/|f'|.",
  };
}

/**
 * An EMPIRICAL derivative enclosure for a sampled function.
 *
 * The two sampled end slopes, widened by three separately named terms:
 *
 *   secondDerivativeBound*(v-u)/2   how far f' can stray from its sampled ends
 *   thirdDerivativeBound*h*h/6      central-difference truncation, which is
 *                                   f'''*h^2/6 -- the THIRD derivative, not
 *                                   the curvature
 *   roundoff/h                      cancellation in the central difference
 *
 * The enclosure is valid only if those declared bounds hold. They are
 * measured, never proven, so every verdict built on this carries boundKind
 * 'empirical'. Each term is passed in separately so that no one of them can be
 * quietly reused for a job it does not do.
 */
export function empiricalDerivativeEnclosure({ h, secondDerivativeBound, thirdDerivativeBound = 0, roundoff = 0, maxGridSpacing = Infinity, maxSamples = 2 }) {
  const cache = new Map();
  return (u, v, ctx) => {
    const d = (t) => {
      if (cache.has(t)) return cache.get(t);
      const s = (ctx.value(t + h) - ctx.value(t - h)) / (2 * h);
      cache.set(t, s);
      return s;
    };
    // Sampling f' at several points inside the cell shrinks the stray term
    // from secondDerivativeBound*(v-u)/2 to secondDerivativeBound*step/2,
    // which is what lets a wide cell be closed at all.
    const intervals = Math.max(1, Math.min(Math.max(1, maxSamples - 1), Math.ceil((v - u) / maxGridSpacing)));
    const step = (v - u) / intervals;
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i <= intervals; i += 1) {
      const s = d(i === intervals ? v : u + i * step);
      lo = Math.min(lo, s); hi = Math.max(hi, s);
    }
    const pad = secondDerivativeBound * step / 2 + thirdDerivativeBound * h * h / 6 + roundoff / h;
    return [lo - pad, hi + pad];
  };
}

/** Matching empirical enclosure for f'' via a second central difference. */
export function empiricalSecondDerivativeEnclosure({ h, thirdDerivativeBound = 0, fourthDerivativeBound = 0, roundoff = 0, maxGridSpacing = Infinity, maxSamples = 2 }) {
  const cache = new Map();
  return (u, v, ctx) => {
    const dd = (t) => {
      if (cache.has(t)) return cache.get(t);
      const s = (ctx.value(t + h) - 2 * ctx.value(t) + ctx.value(t - h)) / (h * h);
      cache.set(t, s);
      return s;
    };
    const intervals = Math.max(1, Math.min(Math.max(1, maxSamples - 1), Math.ceil((v - u) / maxGridSpacing)));
    const step = (v - u) / intervals;
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i <= intervals; i += 1) {
      const s = dd(i === intervals ? v : u + i * step);
      lo = Math.min(lo, s); hi = Math.max(hi, s);
    }
    const pad = thirdDerivativeBound * step / 2 + fourthDerivativeBound * h * h / 12 + 4 * roundoff / (h * h);
    return [lo - pad, hi + pad];
  };
}
