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
import { buildResult, SUPPORT, sampledBoundAssumption, EXTERNAL_UNCERTAINTY as OUTSIDE } from './result.mjs';

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
  /**
   * The largest angular rate the caller declares the searched quantity can
   * reach, degrees per day.
   *
   * This is not decoration. Every step of this method unwraps a difference
   * of a wrapped angle, and that is valid only while the angle moves less
   * than a half turn across the step. NO amount of sampling can detect a
   * violation: an angle that turns a whole number of times between every
   * pair of samples reads exactly like one that does not move, and a finer
   * grid that happens to alias the same way agrees with it. The assumption
   * has to be declared and then checked against the step, which is what
   * happens below.
   *
   * 20 is the default because the fastest thing this contract covers is the
   * Moon, at about 15 degrees a day, and an aspect between the Moon and a
   * fast inner planet adds a little. A caller searching something faster
   * must say so, and a caller who declares a rate the quantity exceeds gets
   * a refusal rather than a wrong answer.
   */
  maxRateDegPerDay: 20,
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

  // The declared rate must be slow enough that one central-difference step
  // cannot span half a turn, or unwrapping the difference is invalid and
  // every slope below is meaningless.
  const stepDays = p.stepMs / MS_PER_DAY;
  if (p.maxRateDegPerDay * stepDays >= 180) {
    fail('unsupported-option',
      `a declared rate of ${p.maxRateDegPerDay} deg/day over a ${p.stepMs} ms step can turn ${(p.maxRateDegPerDay * stepDays).toFixed(1)} degrees, so unwrapping a difference across it is not valid. Lower stepMs below ${Math.floor((180 / p.maxRateDegPerDay) * MS_PER_DAY)} ms, or declare a slower rate.`);
  }

  const a = Math.round(fromTtDays * MS_PER_DAY);
  const b = Math.round(toTtDays * MS_PER_DAY);
  if (!(b - a > 2 * p.minWidthMs)) fail('unsupported-option', 'the interval is not wider than the subdivision floor');

  // One evaluation of f is one instant, whether that costs one reduction or
  // two: the budget is a bound on the work the CALLER asked for, and it
  // covers everything -- the branch scan, the derivative probes and the
  // classification alike. Passing only the classifier a budget would let a
  // search cost several times what was allowed and still report a number
  // inside it, which is how a bound becomes decoration.
  let evaluations = 0;
  let exhausted = false;
  const checkSignal = () => {
    if (signal && signal.aborted) {
      throw new PrecisionError('cancelled', 'the search was cancelled', { evaluations });
    }
  };

  const lonOf = (who, tMs) => reducer.apparent(who, tMs / MS_PER_DAY, options).lon;
  const f = (tMs) => {
    checkSignal();
    evaluations += 1;
    if (evaluations > p.maxEvaluations) {
      exhausted = true;
      throw new PrecisionError('budget-exhausted', `the evaluation budget of ${p.maxEvaluations} was spent`, { evaluations });
    }
    const primary = lonOf(body, tMs);
    const raw = kind === 'aspect' ? primary - lonOf(other, tMs) - targetDeg : primary - targetDeg;
    return wrap180(raw);
  };
  /** What is left for the classifier, so its own accounting cannot overrun. */
  const remaining = () => p.maxEvaluations - evaluations;

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
    return emptyResult({
      request: requestOf(request, options), bounds: { a, b }, p, evaluations,
      status: 'refused', reason: branches.refused,
      unresolved: branches.ambiguous.map(([lo, hi]) => ({
        fromTtDays: lo / MS_PER_DAY, toTtDays: hi / MS_PER_DAY,
        why: 'the angle moves too far between adjacent samples for a branch to be assigned', turningPoint: null,
      })),
      diagnostics: { aliasing: branches.aliasing ?? null },
      advice: 'shorten the interval, or raise probeSamples, so the angle moves well under a quarter turn between samples',
    });
  }

  const verdicts = [];
  const declaredBounds = [];
  for (const [u, v] of branches.segments) {
    if (!(v - u > 2 * p.minWidthMs)) {
      // Too short to subdivide. Reported, not silently dropped.
      verdicts.push({ segment: [u, v], skipped: 'segment-shorter-than-the-subdivision-floor' });
      continue;
    }
    // The branch scan already learned how finely this function has to be
    // looked at. Handing the classifier a coarser grid than that throws the
    // knowledge away: an oscillation the scan resolved at 385 points was
    // then re-sampled at 97 and came back as one undecided region.
    const q = {
      ...p,
      probeSamples: Math.min(4001, Math.max(p.probeSamples, Math.ceil((v - u) / branches.finestSpacingMs) + 1)),
      maxGridSpacingMs: Math.max(1, Math.min(p.maxGridSpacingMs, branches.finestSpacingMs)),
    };
    let probe;
    try {
      probe = probeDerivatives(f, u, v, q);
    } catch (error) {
      return failureReport(error, request, { a, b }, p, evaluations, 'derivative-probe');
    }
    declaredBounds.push({ segmentTtDays: [u / MS_PER_DAY, v / MS_PER_DAY], ...probe.declared });
    let verdict;
    try {
      verdict = classifyInterval({
        f,
        derivativeEnclosure: wrappedDerivativeEnclosure({
          h: q.stepMs,
          secondDerivativeBound: probe.d2Bound,
          thirdDerivativeBound: probe.d3Bound,
          roundoff: q.roundoffDeg,
          maxGridSpacing: q.maxGridSpacingMs,
          maxSamples: q.maxSlopeSamples,
        }),
        secondDerivativeEnclosure: wrappedSecondDerivativeEnclosure({
          h: q.stepMs,
          thirdDerivativeBound: probe.d3Bound,
          fourthDerivativeBound: probe.d4Bound,
          roundoff: q.roundoffDeg,
          maxGridSpacing: q.maxGridSpacingMs,
          maxSamples: q.maxSlopeSamples,
        }),
        a: u, b: v, epsilon: epsilonDeg, minWidth: p.minWidthMs,
        maxEvaluations: Math.max(16, remaining()),
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
  // This costs evaluations too, so it is inside the budget and inside the
  // same refusal path as everything else.
  let gapFindings;
  try {
    gapFindings = branches.gaps.map((g) => checkGapExcluded(f, g, epsilonDeg, p));
  } catch (error) {
    return failureReport(error, request, { a, b }, p, evaluations, 'gap-exclusion');
  }
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

  // ---- the v2 result ----
  //
  // Note what is NOT here: a `certified` flag. The bounds this run used are
  // sampled maxima multiplied by a factor, so the strongest honest thing it
  // can say is that completeness holds IF those estimates hold, and
  // `completeness.established` stays false. `result.mjs` enforces that; it
  // is not a convention this file could quietly drop.
  const closedEverything = merged.summary.allClosed && merged.unresolved.length === 0;
  const aliasing = branches.aliasing ?? { detected: false };
  const conditional = closedEverything && !aliasing.detected;

  const assumptions = [
    sampledBoundAssumption(
      'sampled-derivative-bounds',
      'the second, third and fourth derivatives of the wrapped angle stay inside bounds measured on a finite grid and multiplied by a safety factor',
      'maxima of central differences at the probe points, times boundInflation',
      declaredBounds.map((d) => ({
        segmentTtDays: d.segmentTtDays,
        sampledMaxAbsSecondDerivativeDegPerMs2: d.sampledMaxAbsSecondDerivativeDegPerMs2,
        inflation: d.inflation,
      })),
    ),
    sampledBoundAssumption(
      'branch-assignment-from-samples',
      'between adjacent samples the angle moved less than the sampled slopes imply it could have, so each sample pair belongs to the branch the scan assigned it',
      'the refinement drove the implied travel per cell under a quarter turn, from slopes that are themselves sampled',
      { worstImpliedTravelDeg: aliasing.worstImpliedTravelDeg ?? null, gridPoints: aliasing.gridPoints ?? null },
    ),
    {
      id: 'declared-rate-ceiling',
      what: `the searched angle never exceeds ${p.maxRateDegPerDay} degrees a day, so one ${p.stepMs} ms step cannot span half a turn and unwrapping a difference across it recovers the true slope`,
      status: 'unverified',
      basis: `declared by the caller, not measured. The sampled maximum was ${(branches.aliasing?.sampledMaxRateDegPerDay ?? 0).toFixed(4)} deg/day, and a rate above the declared ceiling is refused -- but sampling CANNOT detect an angle that turns a whole number of times between every pair of samples, which is why this stays an assumption`,
      value: { declaredMaxRateDegPerDay: p.maxRateDegPerDay, stepMs: p.stepMs, halfTurnAtThisStepDegPerDay: (180 * MS_PER_DAY) / p.stepMs },
      wouldBeSettledBy: 'a rate bound taken from the pack\'s own polynomial derivative, which is true of the stored function by construction. The validated geometric mode does exactly that',
    },
  ];

  return buildResult({
    mode: 'empirical-apparent',
    request: requestOf(request, options),
    events: candidates,
    interval: intervalOf({ a, b }, branches.segments, p),
    execution: {
      status: 'finished', finished: true,
      evaluations, maxEvaluations: p.maxEvaluations, exhausted, reason: null,
    },
    accounting: {
      allIntervalsAccountedFor: conditional,
      unresolved: merged.unresolved.map((r) => ({
        fromTtDays: r.from / MS_PER_DAY,
        toTtDays: r.to / MS_PER_DAY,
        why: r.why,
        turningPoint: r.turningPoint
          ? { ttDays: r.turningPoint.at / MS_PER_DAY, value: r.turningPoint.value, locatedBy: r.turningPoint.locatedBy }
          : null,
      })),
      note: conditional
        ? 'every cell was closed by the exclusion or monotone test, under the assumptions listed. That is an accounting of the interval, not a proof about the sky.'
        : 'some part of the interval was not decided; see `unresolved` and `diagnostics.aliasing`.',
    },
    completeness: {
      established: false,
      support: conditional ? SUPPORT.conditional : SUPPORT.none,
      statement: conditional
        ? 'IF the listed assumptions hold, no further event of this kind exists in the processed interval at this allowance. They are sampled estimates, so this is not established and must not be consumed as though it were.'
        : 'Nothing about completeness was established. Events beyond those listed may exist in the processed interval.',
      conditionalOn: conditional ? assumptions.map((x) => x.id) : [],
    },
    assumptions,
    eventCount: {
      found: candidates.length,
      isExactTotal: false,
      lowerBound: candidates.length,
      upperBound: conditional ? candidates.length : null,
      support: conditional ? SUPPORT.conditional : SUPPORT.none,
      conditionalTotal: conditional ? merged.summary.count : null,
      conditionalPossibleTotals: merged.summary.possible,
      note: 'found is what was isolated. There is no exact total here: an exact total would require established completeness, which a sampled bound cannot give.',
    },
    uncertainty: {
      numerical: {
        bracketWidthsSec: candidates.map((c) => c.bracketWidthSec),
        subdivisionFloorSec: p.minWidthMs / 1000,
        assumedRoundoffDeg: p.roundoffDeg,
        note: 'each event is a bracket, not an instant. The bracket is the set where the function is within the declared allowance of the level.',
      },
      ...OUTSIDE,
    },
    diagnostics: {
      aliasing,
      declaredBounds,
      robustness: robustnessReport,
      branches: {
        segments: branches.segments.map(([u, v]) => [u / MS_PER_DAY, v / MS_PER_DAY]),
        antipodeGaps: gapFindings.map((g) => ({
          fromTtDays: g.lo / MS_PER_DAY, toTtDays: g.hi / MS_PER_DAY,
          excluded: g.excluded, marginDeg: g.margin,
        })),
        why: 'the wrapped angle is discontinuous at the antipode of the target; each gap above is checked to hold no event rather than being passed over',
      },
      perSegment: verdicts.map((v) => (v.verdict
        ? { segmentTtDays: [v.segment[0] / MS_PER_DAY, v.segment[1] / MS_PER_DAY], verdict: v.verdict.verdict, outcome: v.verdict.outcome, count: v.verdict.rootCount }
        : { segmentTtDays: [v.segment[0] / MS_PER_DAY, v.segment[1] / MS_PER_DAY], skipped: v.skipped })),
    },
  });
}

/** The request, echoed with its frame and conventions spelled out. */
function requestOf(request, options) {
  return {
    ...request,
    description: describe(request),
    frame: 'apparent geocentric ecliptic longitude of date, tropical',
    geometric: false,
    options,
  };
}

function intervalOf({ a, b }, segments, p) {
  const decided = (segments ?? []).reduce((n, [u, v]) => n + (v - u), 0);
  return {
    requestedTtDays: [a / MS_PER_DAY, b / MS_PER_DAY],
    requestedSpanDays: (b - a) / MS_PER_DAY,
    processedTtDays: (segments ?? []).map(([u, v]) => [u / MS_PER_DAY, v / MS_PER_DAY]),
    processedSpanDays: decided / MS_PER_DAY,
    processedFraction: b > a ? decided / (b - a) : 0,
    subdivisionFloorSec: p.minWidthMs / 1000,
    units: SEARCH_CONTRACT.timeUnits,
  };
}

/**
 * A result that established nothing: a refusal, a spent budget, a failed
 * stage. It still carries whatever was found, because throwing away
 * candidates on the way to saying "not proved" helps nobody.
 */
function emptyResult({ request, bounds, p, evaluations, status, reason, unresolved = [], events = [], diagnostics = {}, advice = null }) {
  return buildResult({
    mode: 'empirical-apparent',
    request,
    events,
    interval: intervalOf(bounds, [], p),
    execution: {
      status, finished: status === 'finished',
      evaluations, maxEvaluations: p.maxEvaluations,
      exhausted: status === 'budget-exhausted', reason,
    },
    accounting: { allIntervalsAccountedFor: false, unresolved, note: 'nothing below was decided' },
    completeness: {
      established: false, support: SUPPORT.none,
      statement: 'Nothing about completeness was established.',
      conditionalOn: [],
    },
    assumptions: [],
    eventCount: {
      found: events.length, isExactTotal: false, lowerBound: events.length, upperBound: null,
      support: SUPPORT.none, conditionalTotal: null, conditionalPossibleTotals: null,
      note: 'nothing was established about the total; what is listed is what was isolated before the run stopped',
    },
    uncertainty: { numerical: { subdivisionFloorSec: p.minWidthMs / 1000 }, ...OUTSIDE },
    diagnostics: { ...diagnostics, ...(advice ? { advice } : {}) },
  });
}


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
  // `allClosed` says every cell was closed by one of the two tests. It is an
  // accounting fact about the decomposition, NOT a certification: the tests
  // are only as good as the enclosure they were given, and this one is
  // sampled. The caller turns it into a CONDITIONAL claim and nothing more.
  return {
    crossings,
    unresolved,
    summary: {
      allClosed: allCertified,
      count: allCertified ? count : null,
      possible: allCertified ? [count] : possible,
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
  const AMBIGUOUS = 90;          // degrees the angle may move between samples
  const MAX_DEPTH = 40;
  const n = Math.max(9, Math.round(p.probeSamples));
  let xs = [];
  for (let i = 0; i < n; i += 1) xs.push(Math.round(a + ((b - a) * i) / (n - 1)));
  xs = [...new Set(xs)].sort((u, v) => u - v);
  const ys = new Map(xs.map((x) => [x, f(x)]));

  /**
   * Local slope, deg/ms, from a short central difference of the WRAPPED
   * angle. The difference is itself unwrapped, which is valid as long as the
   * angle moves less than a half turn in 2h -- at the default h of 60 s that
   * is 259,200 deg/day, far beyond anything in this contract, and the
   * assumption is carried on the result rather than left implicit.
   */
  const h = p.stepMs;
  const slopes = new Map();
  const slopeAt = (x) => {
    if (slopes.has(x)) return slopes.get(x);
    const lo = Math.max(a, x - h);
    const hi = Math.min(b, x + h);
    const d = hi > lo ? wrap180(f(hi) - f(lo)) / (hi - lo) : 0;
    slopes.set(x, d);
    return d;
  };
  /**
   * How far the angle must have travelled between two samples, from the
   * slope at each end. THIS is the test that matters, and its absence was
   * the defect: two samples reading the same wrapped value say nothing on
   * their own, because an angle that turned a whole number of times reads
   * exactly the same at both. The slope says it turned.
   */
  const impliedTravel = (u, v) => Math.max(Math.abs(slopeAt(u)), Math.abs(slopeAt(v))) * (v - u);
  /**
   * How far the midpoint departs from the straight line between the two
   * endpoints, unwrapped. Endpoints that agree say nothing about what
   * happened between them; an oscillation sampled at its own period reads
   * as a flat line until the midpoint is looked at.
   */
  const CHORD = 10;
  const chordDeviation = (u, v) => {
    const m = Math.floor((u + v) / 2);
    if (m <= u || m >= v) return 0;
    if (!ys.has(m)) ys.set(m, f(m));
    const half = wrap180(ys.get(v) - ys.get(u)) / 2;
    return Math.abs(wrap180(ys.get(m) - ys.get(u) - half));
  };
  const needsRefining = (u, v) => (
    v - u > p.minWidthMs
    && (Math.abs(wrap180(ys.get(v) - ys.get(u))) > AMBIGUOUS
      || impliedTravel(u, v) > AMBIGUOUS
      || chordDeviation(u, v) > CHORD)
  );

  for (let depth = 0; depth <= MAX_DEPTH; depth += 1) {
    const next = [];
    for (let i = 1; i < xs.length; i += 1) {
      const u = xs[i - 1]; const v = xs[i];
      if (!needsRefining(u, v)) continue;
      const m = Math.floor((u + v) / 2);
      if (m > u && m < v) next.push(m);
    }
    if (next.length === 0) break;
    if (depth === MAX_DEPTH) {
      const ambiguous = [];
      for (let i = 1; i < xs.length; i += 1) {
        if (needsRefining(xs[i - 1], xs[i])) ambiguous.push([xs[i - 1], xs[i]]);
      }
      return {
        refused: 'the angle still moves more than a quarter turn between adjacent samples at the subdivision limit',
        ambiguous, segments: [], gaps: [], aliasing: { detected: true, cells: ambiguous.length },
      };
    }
    for (const m of next) if (!ys.has(m)) ys.set(m, f(m));
    xs = [...new Set([...xs, ...next])].sort((u, v) => u - v);
  }

  // A rate above what the caller declared means either the declaration is
  // wrong or the quantity is outside this contract. Either way the unwrap
  // that every slope here depends on is unsafe, so this refuses.
  let worstRate = 0;
  for (const x of xs) worstRate = Math.max(worstRate, Math.abs(slopeAt(x)) * MS_PER_DAY);
  if (worstRate > p.maxRateDegPerDay) {
    return {
      refused: `the sampled rate reaches ${worstRate.toFixed(3)} deg/day, past the declared maximum of ${p.maxRateDegPerDay}`,
      ambiguous: [[a, b]], segments: [], gaps: [],
      aliasing: { detected: true, cells: 0, worstImpliedTravelDeg: null, gridPoints: xs.length, observedRateDegPerDay: worstRate, isABound: false },
    };
  }

  // Whatever the refinement achieved, record what the final grid can support.
  let worstTravel = 0;
  const aliased = [];
  for (let i = 1; i < xs.length; i += 1) {
    const t = impliedTravel(xs[i - 1], xs[i]);
    if (t > worstTravel) worstTravel = t;
    if (t > 180) aliased.push([xs[i - 1], xs[i]]);
  }
  let finest = Infinity;
  for (let i = 1; i < xs.length; i += 1) finest = Math.min(finest, xs[i] - xs[i - 1]);
  const aliasing = {
    detected: aliased.length > 0,
    cells: aliased.length,
    worstImpliedTravelDeg: worstTravel,
    sampledMaxRateDegPerDay: worstRate,
    declaredMaxRateDegPerDay: p.maxRateDegPerDay,
    gridPoints: xs.length,
    what: 'the largest angular travel the sampled slopes imply between two adjacent grid points. Above a half turn the wrapped samples cannot be assigned to a branch at all; above a quarter turn the assignment is refined until it is not.',
    isABound: false,
  };

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
  return { refused: null, ambiguous: [], segments, gaps, aliasing, finestSpacingMs: Number.isFinite(finest) ? finest : (b - a) };
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

function failureReport(error, request, bounds, p, evaluations, stage) {
  // Cancellation is the caller's own doing and propagates. A spent budget
  // is an answer -- a refusal -- not an exception.
  // Anything that is not a spent budget is a bug in this package, and a bug
  // must not be laundered into a tidy "refused" result: the caller would
  // read a contract-shaped object where there was an internal failure.
  const budget = error instanceof PrecisionError && error.code === 'budget-exhausted';
  if (!budget) throw error;
  return emptyResult({
    request, bounds, p, evaluations,
    status: budget ? 'budget-exhausted' : 'refused',
    reason: budget ? 'the evaluation budget was spent' : `${stage}-failed`,
    diagnostics: { stage },
  });
}

/**
 * Derivative enclosures for a WRAPPED angle.
 *
 * The generic `empiricalDerivativeEnclosure` takes a plain central
 * difference, `(f(t+h) - f(t-h)) / 2h`. On a wrapped angle that is wrong
 * wherever the step straddles the antipode: the numerator reads about a
 * full turn the wrong way, and the slope comes out with the wrong SIGN and
 * a magnitude some five orders too large.
 *
 * Measured, on one aliased segment: the true slope was +360 deg/day and the
 * generic enclosure returned a tight band at -258,840 deg/day, because with
 * a one-day cell and a two-day grid spacing it sampled exactly the two
 * endpoints and both straddled the antipode. The mean-value enclosure built
 * from that band then EXCLUDED the level over a cell containing a root, and
 * the cell was certified to hold none. That is how 96 real crossings became
 * a certified zero.
 *
 * Two changes, both necessary:
 *   1. the difference is unwrapped (`wrap180` of the numerator), which is
 *      valid while the angle moves less than a half turn in one step;
 *   2. the sample points are clamped inside the cell, and there are always
 *      several of them, so a cell is never characterised by two endpoint
 *      samples that happen to agree.
 */
function wrappedSlopeSampler(h, minSamples, maxGridSpacing, maxSamples) {
  const cache = new Map();
  return (u, v, ctx) => {
    const intervals = Math.max(
      minSamples - 1,
      Math.min(Math.max(1, maxSamples - 1), Math.ceil((v - u) / maxGridSpacing)),
    );
    const step = (v - u) / intervals;
    const out = [];
    for (let i = 0; i <= intervals; i += 1) {
      const t = i === intervals ? v : u + i * step;
      const key = `${u}:${v}:${i}`;
      if (cache.has(key)) { out.push(cache.get(key)); continue; }
      // Clamp the difference inside the cell so it never reaches past a
      // segment boundary into the next branch.
      const lo = Math.max(u, t - h);
      const hi = Math.min(v, t + h);
      const d = hi > lo ? wrap180(ctx.value(hi) - ctx.value(lo)) / (hi - lo) : 0;
      cache.set(key, d);
      out.push(d);
    }
    return { slopes: out, step };
  };
}

function wrappedDerivativeEnclosure({ h, secondDerivativeBound, thirdDerivativeBound, roundoff, maxGridSpacing, maxSamples, minSamples = 5 }) {
  const sample = wrappedSlopeSampler(h, minSamples, maxGridSpacing, maxSamples);
  return (u, v, ctx) => {
    const { slopes, step } = sample(u, v, ctx);
    const lo = Math.min(...slopes);
    const hi = Math.max(...slopes);
    const pad = secondDerivativeBound * step / 2 + thirdDerivativeBound * h * h / 6 + roundoff / h;
    return [lo - pad, hi + pad];
  };
}

function wrappedSecondDerivativeEnclosure({ h, thirdDerivativeBound, fourthDerivativeBound, roundoff, maxGridSpacing, maxSamples, minSamples = 5 }) {
  const sample = wrappedSlopeSampler(h, minSamples, maxGridSpacing, maxSamples);
  return (u, v, ctx) => {
    const { slopes, step } = sample(u, v, ctx);
    if (slopes.length < 2) return [-Infinity, Infinity];
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = 1; i < slopes.length; i += 1) {
      const dd = (slopes[i] - slopes[i - 1]) / step;
      if (dd < lo) lo = dd;
      if (dd > hi) hi = dd;
    }
    const pad = thirdDerivativeBound * step / 2 + fourthDerivativeBound * h * h / 12 + 4 * roundoff / (h * h);
    return [lo - pad, hi + pad];
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
    // Differences of a wrapped angle, taken relative to the middle sample
    // and unwrapped, so a step across the antipode does not read as a
    // 360-degree jump in the curvature estimate.
    const raw = [0, 1, 2, 3, 4].map((k) => f(lo + k * h));
    const y = raw.map((z) => wrap180(z - raw[2]));
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
