/**
 * Bounded longitude-event search over the reduction.
 *
 * The numerical work is done by `./interval-search.mjs`, copied unchanged from
 * the research track where its verdicts are checked against thirteen
 * closed-form cases. This file does two things and no more: it turns an event
 * request into that module's scalar function, and it reports the answer with
 * the six things the mandate requires kept APART, because conflating them is
 * how a sampled scan comes to be described as exhaustive:
 *
 *   1. `candidates`          what was found, with brackets
 *   2. `interval`            what was actually processed
 *   3. `isolation`           model-relative isolation and completeness
 *   4. `robustness`          how the answer moved when the inputs were nudged
 *   5. `unresolved`          intervals that stayed open
 *   6. `externalUncertainty` model and physical uncertainty, NOT bounded here
 *
 * Nothing in here is rigorous interval arithmetic over the ephemeris.
 * Ordinary floating-point evaluation of a Chebyshev series is not an
 * enclosure, so every verdict this file produces carries `boundKind:
 * 'empirical'` and `isolation.meaning` says in words what the verdict is
 * relative to. `exactArithmetic` is never set, which permanently closes the
 * tangency-certification route to ephemeris-backed functions.
 *
 * Environment-neutral: no `node:` imports, no clock, no randomness.
 */
import { fail, PrecisionError } from './errors.mjs';
import { classifyInterval, empiricalDerivativeEnclosure, empiricalSecondDerivativeEnclosure } from './interval-search.mjs';

const MS_PER_DAY = 86400000;
const J2000_JD = 2451545.0;

/** Mechanical parameters only. There is deliberately no default `epsilonDeg`. */
export const SEARCH_DEFAULTS = Object.freeze({
  /** Subdivision floor, integer milliseconds of TT. */
  minWidthMs: 100,
  /** Central-difference half-step for the sampled derivatives, ms. */
  stepMs: 60000,
  maxEvaluations: 60000,
  /**
   * The sampled curvature/jerk maxima are multiplied by this before being
   * declared as bounds. It is a stated assumption, not a proof: a factor of 4
   * covers the grid missing a local extremum by a comfortable margin on the
   * slow bodies, and the report says so rather than implying otherwise.
   */
  boundInflation: 4,
  /** How many points to sample when estimating those maxima. */
  probeSamples: 97,
  /** Longest cell over which one sampled slope is reused, ms. */
  maxGridSpacingMs: 2 * MS_PER_DAY,
  maxSlopeSamples: 5,
  /** Absolute roundoff assumed on one longitude evaluation, degrees. */
  roundoffDeg: 1e-9,
});

export const SEARCH_CONTRACT = Object.freeze({
  kinds: Object.freeze({
    longitude: 'apparent geocentric ecliptic longitude of one body reaching a fixed degree value — sign ingresses, and any other fixed level',
    aspect: 'the difference of two bodies\' apparent geocentric ecliptic longitudes reaching a fixed angle — conjunction at 0, opposition at 180, and the rest',
  }),
  notSupported: Object.freeze([
    'stations and retrograde turns: a root of the derivative, not of longitude, and it needs its own enclosure argument',
    'latitude, declination, distance and elongation events',
    'rise, set and transit: topocentric, and this reduction has no observer on the surface',
  ]),
  timeUnits: 'integer milliseconds of TT past J2000 internally; TT days past J2000 and Julian Date TT on the way in and out',
});

const wrap180 = (d) => {
  let x = d % 360;
  if (x > 180) x -= 360;
  if (x <= -180) x += 360;
  return x;
};

function requireFinite(name, v) {
  if (!Number.isFinite(v)) fail('unsupported-option', `${name} must be a finite number`);
  return v;
}

/**
 * @param {import('./reduce.mjs').Reducer} reducer
 * @param {object} spec
 * @param {'longitude'|'aspect'} spec.kind
 * @param {string} spec.body
 * @param {string} [spec.other]       required for kind 'aspect'
 * @param {number} spec.targetDeg     the level, or the aspect angle
 * @param {number} spec.fromTtDays
 * @param {number} spec.toTtDays
 * @param {number} spec.epsilonDeg    the declared angular allowance. REQUIRED:
 *                                    choosing it after seeing the margin is
 *                                    exactly the move the Uranus D contract
 *                                    forbids.
 * @param {object} [spec.options]     reduction options
 * @param {{aborted: boolean}} [spec.signal]  checked on every evaluation
 * @param {boolean} [spec.robustness] run the perturbation probe (default true)
 */
export function searchLongitudeEvent(reducer, spec = {}) {
  const {
    kind, body, other = null, targetDeg, fromTtDays, toTtDays, epsilonDeg,
    options = {}, signal = null, robustness = true,
    ...tuning
  } = spec;

  for (const key of Object.keys(tuning)) {
    if (!(key in SEARCH_DEFAULTS)) fail('unsupported-option', `unknown search option ${key}`);
  }
  const p = { ...SEARCH_DEFAULTS, ...tuning };

  if (!(kind in SEARCH_CONTRACT.kinds)) {
    fail('unsupported-option', `search kind must be one of ${Object.keys(SEARCH_CONTRACT.kinds).join(', ')}`);
  }
  if (kind === 'aspect' && typeof other !== 'string') fail('unsupported-option', "kind 'aspect' needs a second body");
  if (kind === 'longitude' && other !== null) fail('unsupported-option', "kind 'longitude' takes no second body");
  requireFinite('targetDeg', targetDeg);
  requireFinite('fromTtDays', fromTtDays);
  requireFinite('toTtDays', toTtDays);
  if (!(toTtDays > fromTtDays)) fail('unsupported-option', 'toTtDays must be after fromTtDays');
  if (!Number.isFinite(epsilonDeg) || epsilonDeg < 0) {
    fail('unsupported-option', 'epsilonDeg is required and must be finite and non-negative: the angular allowance has to be declared before the search, not chosen after seeing the margin');
  }
  for (const [k, v] of Object.entries(p)) {
    if (!Number.isFinite(v) || v <= 0) fail('unsupported-option', `${k} must be a positive finite number`);
  }
  if (!Number.isInteger(p.minWidthMs) || !Number.isInteger(p.stepMs)) {
    fail('unsupported-option', 'minWidthMs and stepMs must be whole milliseconds');
  }

  const a = Math.round(fromTtDays * MS_PER_DAY);
  const b = Math.round(toTtDays * MS_PER_DAY);
  if (!(b - a > 2 * p.minWidthMs)) fail('unsupported-option', 'the interval is not wider than the subdivision floor');

  let evaluations = 0;
  const checkSignal = () => {
    if (signal && signal.aborted) {
      throw new PrecisionError('cancelled', 'the search was cancelled', { evaluations });
    }
  };

  const lonOf = (who, tMs) => reducer.apparent(who, tMs / MS_PER_DAY, options).lon;
  const f = (tMs) => {
    checkSignal();
    evaluations += 1;
    const primary = lonOf(body, tMs);
    const raw = kind === 'aspect' ? primary - lonOf(other, tMs) - targetDeg : primary - targetDeg;
    return wrap180(raw);
  };

  // ---- branch splitting ----
  //
  // A wrapped angle is discontinuous at +/-180. That is a property of the
  // REPRESENTATION, not of the sky, so it is removed by splitting the
  // interval at each antipode crossing rather than by handing back a verdict
  // built on a curvature bound the function violates there.
  const request = { kind, body, other, targetDeg, epsilonDeg };
  let branches;
  try {
    branches = scanBranches(f, a, b, p);
  } catch (error) {
    return failureReport(error, request, { a, b }, p, evaluations, 'branch-scan');
  }
  if (branches.refused) {
    return {
      ...shell(request, { a, b }, p, evaluations),
      isolation: {
        verdict: 'unresolved-interval', outcome: 'refused', certified: false, complete: false,
        rootCount: null, possibleRootCounts: null, boundKind: 'empirical',
        support: 'unknown', exactArithmetic: false,
        meaning: 'refused before any cell was closed',
        reason: branches.refused,
      },
      unresolved: branches.ambiguous.map(([lo, hi]) => ({
        fromTtDays: lo / MS_PER_DAY, toTtDays: hi / MS_PER_DAY,
        why: 'branch-assignment-ambiguous', turningPoint: null,
      })),
      advice: 'shorten the interval, or raise probeSamples so consecutive samples move the angle by well under a half turn',
    };
  }

  const verdicts = [];
  const declaredBounds = [];
  for (const [u, v] of branches.segments) {
    if (!(v - u > 2 * p.minWidthMs)) {
      // Too short to subdivide. Reported, not silently dropped.
      verdicts.push({ segment: [u, v], skipped: 'segment-shorter-than-the-subdivision-floor' });
      continue;
    }
    let probe;
    try {
      probe = probeDerivatives(f, u, v, p);
    } catch (error) {
      return failureReport(error, request, { a, b }, p, evaluations, 'derivative-probe');
    }
    declaredBounds.push({ segmentTtDays: [u / MS_PER_DAY, v / MS_PER_DAY], ...probe.declared });
    let verdict;
    try {
      verdict = classifyInterval({
        f,
        derivativeEnclosure: empiricalDerivativeEnclosure({
          h: p.stepMs,
          secondDerivativeBound: probe.d2Bound,
          thirdDerivativeBound: probe.d3Bound,
          roundoff: p.roundoffDeg,
          maxGridSpacing: p.maxGridSpacingMs,
          maxSamples: p.maxSlopeSamples,
        }),
        secondDerivativeEnclosure: empiricalSecondDerivativeEnclosure({
          h: p.stepMs,
          thirdDerivativeBound: probe.d3Bound,
          fourthDerivativeBound: probe.d4Bound,
          roundoff: p.roundoffDeg,
          maxGridSpacing: p.maxGridSpacingMs,
          maxSamples: p.maxSlopeSamples,
        }),
        a: u, b: v, epsilon: epsilonDeg, minWidth: p.minWidthMs,
        maxEvaluations: p.maxEvaluations,
        boundKind: 'empirical',
        // Never true for an ephemeris-backed function: a Chebyshev sum in
        // double precision is not exact, so a tangency can never be certified.
        exactArithmetic: false,
        label: describe(request),
      });
    } catch (error) {
      return failureReport(error, request, { a, b }, p, evaluations, 'classification');
    }
    verdicts.push({ segment: [u, v], verdict });
  }

  // Each split gap must be SHOWN to hold no root before it is passed over.
  const gapFindings = branches.gaps.map((g) => checkGapExcluded(f, g, epsilonDeg, p));
  const merged = mergeVerdicts(verdicts, gapFindings);

  const candidates = merged.crossings.map((c) => ({
    ttDays: c.centre / MS_PER_DAY,
    jdTt: c.centre / MS_PER_DAY + J2000_JD,
    bracketTtDays: [c.lo / MS_PER_DAY, c.hi / MS_PER_DAY],
    bracketWidthSec: c.width / 1000,
    direction: c.direction,
    transversal: c.transversal === true,
    atIntervalEdge: c.atIntervalEdge === true,
    ...(c.bracketNote ? { bracketNote: c.bracketNote } : {}),
  }));
  const verdict = merged.summary;

  let robustnessReport = null;
  if (robustness && candidates.length > 0) {
    try {
      robustnessReport = probeRobustness(f, candidates, p, epsilonDeg);
    } catch (error) {
      if (error instanceof PrecisionError && error.code === 'cancelled') throw error;
      robustnessReport = { ran: false, why: error?.code ?? 'probe-failed' };
    }
  }

  return {
    ...shell(request, { a, b }, p, evaluations),
    candidates,
    isolation: {
      verdict: verdict.verdict,
      outcome: verdict.outcome,
      certified: verdict.certified === true,
      complete: verdict.complete === true,
      rootCount: verdict.rootCount,
      possibleRootCounts: verdict.possibleRootCounts,
      boundKind: 'empirical',
      // D2's field, by its frozen name. 'proven' is reachable only by a
      // caller who supplies a closed-form derivative enclosure, which an
      // ephemeris cannot; 'unknown' is what a refusal before any enclosure
      // was applied reports.
      support: 'empirical',
      exactArithmetic: false,
      meaning: verdict.certified
        ? MEANING_CERTIFIED
        : 'NOT EXHAUSTIVE. Roots may exist that this run did not isolate; see `unresolved`.',
      declaredBounds,
      branches: {
        segments: branches.segments.map(([u, v]) => [u / MS_PER_DAY, v / MS_PER_DAY]),
        antipodeGaps: gapFindings.map((g) => ({
          fromTtDays: g.lo / MS_PER_DAY, toTtDays: g.hi / MS_PER_DAY,
          excluded: g.excluded, marginDeg: g.margin,
        })),
        why: 'the wrapped angle is discontinuous at the antipode of the target; each gap above is shown to hold no root rather than being passed over',
      },
    },
    robustness: robustnessReport,
    unresolved: merged.unresolved.map((r) => ({
      fromTtDays: r.from / MS_PER_DAY,
      toTtDays: r.to / MS_PER_DAY,
      why: r.why,
      turningPoint: r.turningPoint
        ? { ttDays: r.turningPoint.at / MS_PER_DAY, value: r.turningPoint.value, locatedBy: r.turningPoint.locatedBy }
        : null,
    })),
    externalUncertainty: EXTERNAL_UNCERTAINTY,
    raw: verdicts.map((v) => v.verdict ?? { skipped: v.skipped, segment: v.segment }),
  };
}

const MEANING_CERTIFIED = 'complete RELATIVE TO the declared model and the declared derivative bounds below: given that f is this reduction and that its second and third derivatives stay inside the declared bounds, no further root of f exists in the processed interval at this epsilon. It is not a statement about the sky.';

/** Minkowski sum of two sorted count sets; null means unbounded. */
function sumSets(x, y) {
  if (x === null || y === null) return null;
  const out = new Set();
  for (const i of x) for (const j of y) out.add(i + j);
  return [...out].sort((m, n) => m - n);
}

/**
 * Combine the per-branch verdicts into one. The whole is certified only if
 * every part is AND every split gap was shown to hold no root: one open cell
 * anywhere makes the count for the whole interval not exhaustive, and saying
 * otherwise is the exact overstatement this report exists to prevent.
 */
function mergeVerdicts(verdicts, gapFindings) {
  const crossings = [];
  const unresolved = [];
  let count = 0;
  let possible = [0];
  let allCertified = true;

  for (const v of verdicts) {
    if (v.skipped) {
      allCertified = false;
      possible = null;
      unresolved.push({ from: v.segment[0], to: v.segment[1], why: v.skipped, turningPoint: null });
      continue;
    }
    const r = v.verdict;
    crossings.push(...(r.crossings ?? []));
    for (const o of r.openRegions ?? []) {
      unresolved.push({ from: o.from, to: o.to, why: o.why, turningPoint: o.turningPoint ?? null });
    }
    if (r.certified === true) {
      count += r.rootCount ?? 0;
      possible = sumSets(possible, r.possibleRootCounts ?? [r.rootCount ?? 0]);
    } else {
      allCertified = false;
      possible = sumSets(possible, r.possibleRootCounts);
    }
  }
  for (const g of gapFindings) {
    if (g.excluded) continue;
    allCertified = false;
    possible = null;
    unresolved.push({ from: g.lo, to: g.hi, why: 'antipode-gap-not-shown-to-be-root-free', turningPoint: null });
  }

  crossings.sort((x, y) => x.lo - y.lo);
  if (allCertified) {
    return {
      crossings,
      unresolved,
      summary: {
        verdict: count === 0 ? 'no-crossing' : count === 1 ? 'crossing' : 'multiple-crossings',
        outcome: 'certified', certified: true, complete: true,
        rootCount: count, possibleRootCounts: [count],
      },
    };
  }
  return {
    crossings,
    unresolved,
    summary: {
      verdict: 'unresolved-interval', outcome: 'incomplete', certified: false, complete: false,
      rootCount: null, possibleRootCounts: possible,
    },
  };
}

/**
 * Locate every antipode crossing and split there.
 *
 * The grid is refined until consecutive samples move the wrapped angle by
 * well under a half turn, which is what makes the branch assignment between
 * them unambiguous. If refinement runs out first the scan refuses and names
 * the cells it could not decide, rather than guessing.
 */
function scanBranches(f, a, b, p) {
  const AMBIGUOUS = 90;          // degrees of wrapped motion per step
  const MAX_DEPTH = 24;
  const n = Math.max(9, Math.round(p.probeSamples));
  let xs = [];
  for (let i = 0; i < n; i += 1) xs.push(Math.round(a + ((b - a) * i) / (n - 1)));
  xs = [...new Set(xs)].sort((u, v) => u - v);
  const ys = new Map(xs.map((x) => [x, f(x)]));

  for (let depth = 0; depth <= MAX_DEPTH; depth += 1) {
    const next = [];
    for (let i = 1; i < xs.length; i += 1) {
      const u = xs[i - 1]; const v = xs[i];
      if (Math.abs(wrap180(ys.get(v) - ys.get(u))) <= AMBIGUOUS || v - u <= p.minWidthMs) continue;
      const m = Math.floor((u + v) / 2);
      if (m > u && m < v) next.push(m);
    }
    if (next.length === 0) break;
    if (depth === MAX_DEPTH) {
      const ambiguous = [];
      for (let i = 1; i < xs.length; i += 1) {
        if (Math.abs(wrap180(ys.get(xs[i]) - ys.get(xs[i - 1]))) > AMBIGUOUS) ambiguous.push([xs[i - 1], xs[i]]);
      }
      return { refused: 'consecutive-samples-still-move-the-angle-by-more-than-a-quarter-turn', ambiguous, segments: [], gaps: [] };
    }
    for (const m of next) if (!ys.has(m)) ys.set(m, f(m));
    xs = [...new Set([...xs, ...next])].sort((u, v) => u - v);
  }

  // A cell whose RAW endpoint difference exceeds a half turn while its
  // wrapped difference is small is a cell in which the branch crosses the
  // antipode.
  const gaps = [];
  for (let i = 1; i < xs.length; i += 1) {
    const u = xs[i - 1]; const v = xs[i];
    if (Math.abs(ys.get(v) - ys.get(u)) <= 180) continue;
    let lo = u; let hi = v; let flo = ys.get(u);
    while (hi - lo > p.minWidthMs) {
      const m = Math.floor((lo + hi) / 2);
      if (m <= lo || m >= hi) break;
      const fm = f(m);
      if (Math.abs(fm - flo) > 180) hi = m; else { lo = m; flo = fm; }
    }
    gaps.push({ lo, hi });
  }

  const segments = [];
  let cursor = a;
  for (const g of gaps) {
    if (g.lo > cursor) segments.push([cursor, g.lo]);
    cursor = g.hi;
  }
  if (cursor < b) segments.push([cursor, b]);
  return { refused: null, ambiguous: [], segments, gaps };
}

/**
 * Show that a split gap holds no root. Near the antipode the magnitude of f
 * is close to a half turn, so the margin is enormous -- but a margin that is
 * never computed is an assumption, and this one is computed.
 */
function checkGapExcluded(f, gap, epsilonDeg, p) {
  const flo = Math.abs(f(gap.lo));
  const fhi = Math.abs(f(gap.hi));
  // Worst-case drift of the underlying continuous angle across the gap. The
  // fastest thing this contract can be asked about is the Moon at about 15
  // degrees a day; 60 is that with a generous factor.
  const maxDriftDeg = 60 * (gap.hi - gap.lo) / MS_PER_DAY;
  const margin = Math.min(flo, fhi) - maxDriftDeg - epsilonDeg;
  return { ...gap, valueAtEndsDeg: [flo, fhi], maxDriftDeg, margin, excluded: margin > 0 };
}

const EXTERNAL_UNCERTAINTY = Object.freeze({
  bounded: false,
  note: 'The epsilon above is the allowance the CALLER declared. This search does not measure, and does not bound, how far this reduction sits from the sky, from another ephemeris, or from the true dynamics. Those are separate quantities and they are not folded in anywhere.',
  includedInEpsilon: false,
});

function describe({ kind, body, other, targetDeg }) {
  return kind === 'aspect' ? `${body}-${other} at ${targetDeg}deg` : `${body} at longitude ${targetDeg}deg`;
}

function shell(request, { a, b }, p, evaluations) {
  return {
    request: { ...request, description: describe(request) },
    interval: {
      fromTtDays: a / MS_PER_DAY,
      toTtDays: b / MS_PER_DAY,
      processedDays: (b - a) / MS_PER_DAY,
      units: SEARCH_CONTRACT.timeUnits,
      subdivisionFloorSec: p.minWidthMs / 1000,
    },
    candidates: [],
    robustness: null,
    unresolved: [],
    externalUncertainty: EXTERNAL_UNCERTAINTY,
    budget: { maxEvaluations: p.maxEvaluations, evaluations, exhausted: false },
    parameters: { ...p },
  };
}

function failureReport(error, request, bounds, p, evaluations, stage) {
  if (error instanceof PrecisionError) throw error;
  return {
    ...shell(request, bounds, p, evaluations),
    isolation: {
      verdict: 'unresolved-interval', outcome: 'refused', certified: false, complete: false,
      rootCount: null, possibleRootCounts: null, boundKind: 'empirical',
      support: 'unknown', exactArithmetic: false,
      meaning: 'refused',
      reason: `${stage}-failed`,
    },
  };
}

/**
 * Sample |f''|, |f'''| and |f''''| on a coarse grid and declare inflated
 * bounds. Sampling cannot prove a bound — it can only fail to find a
 * violation — so the sampled maxima, the grid, and the inflation factor are
 * all carried on the verdict as declared assumptions.
 */
function probeDerivatives(f, a, b, p) {
  const n = Math.max(9, Math.round(p.probeSamples));
  const h = p.stepMs;
  const xs = [];
  for (let i = 0; i < n; i += 1) xs.push(Math.round(a + ((b - a) * i) / (n - 1)));

  let d2 = 0; let d3 = 0; let d4 = 0;
  for (const x of xs) {
    const lo = Math.max(a, Math.min(b - 4 * h, x - 2 * h));
    const y = [0, 1, 2, 3, 4].map((k) => f(lo + k * h));
    const s2 = Math.abs((y[1] - 2 * y[2] + y[3]) / (h * h));
    const s3 = Math.abs((-y[0] + 2 * y[1] - 2 * y[3] + y[4]) / (2 * h * h * h));
    const s4 = Math.abs((y[0] - 4 * y[1] + 6 * y[2] - 4 * y[3] + y[4]) / (h * h * h * h));
    if (s2 > d2) d2 = s2;
    if (s3 > d3) d3 = s3;
    if (s4 > d4) d4 = s4;
  }
  const k = p.boundInflation;
  return {
    d2Bound: d2 * k,
    d3Bound: d3 * k,
    d4Bound: d4 * k,
    declared: {
      basis: 'sampled maxima of central differences on a uniform grid, multiplied by boundInflation',
      proven: false,
      gridSamples: n,
      stepMs: h,
      sampledMaxAbsSecondDerivativeDegPerMs2: d2,
      sampledMaxAbsThirdDerivativeDegPerMs3: d3,
      sampledMaxAbsFourthDerivativeDegPerMs4: d4,
      inflation: k,
      caveat: 'A grid can miss an extremum between its samples. These are declared bounds, not proven ones, and every verdict resting on them is model-relative.',
    },
  };
}

/**
 * Empirical robustness, reported separately from isolation because it answers
 * a different question: not "is the topology certified" but "how far does the
 * answer move when the inputs are nudged". Each candidate is re-bracketed
 * against the level displaced by +/- epsilon, which is the displacement the
 * declared allowance actually permits.
 */
function probeRobustness(f, candidates, p, epsilonDeg) {
  if (epsilonDeg === 0) {
    return { ran: false, why: 'epsilon-is-zero-so-there-is-no-displacement-to-probe' };
  }
  const out = [];
  for (const c of candidates) {
    const t = Math.round(c.ttDays * MS_PER_DAY);
    const h = p.stepMs;
    const slope = (f(t + h) - f(t - h)) / (2 * h);   // deg/ms
    const shiftMs = slope === 0 ? Infinity : Math.abs(epsilonDeg / slope);
    out.push({
      ttDays: c.ttDays,
      localSlopeDegPerDay: slope * MS_PER_DAY,
      timeShiftForOneEpsilonSec: Number.isFinite(shiftMs) ? shiftMs / 1000 : null,
      note: slope === 0
        ? 'the crossing sits at a turning point of f, where a level displacement does not move a root, it creates or destroys a pair; no timing shift is quoted'
        : 'how far this crossing moves if the whole function is displaced by one epsilon. It is a LOCAL linear estimate at a transversal crossing and it is not a bound.',
    });
  }
  return {
    ran: true,
    method: 'local slope at each certified transversal crossing, against a +/- epsilon displacement of the level',
    perCandidate: out,
    notClaimed: 'This says nothing about whether the count is right. A displacement that moves a crossing by a minute can still add or remove a pair elsewhere; that question belongs to `isolation` and `unresolved`.',
  };
}
