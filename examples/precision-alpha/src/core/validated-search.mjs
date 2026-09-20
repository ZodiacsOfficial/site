/**
 * The validated mode: one narrow operation whose completeness is PROVEN.
 *
 * ## What it is, and what it deliberately is not
 *
 * It finds the instants at which a body's **geometric** ecliptic longitude,
 * in the **fixed J2000 mean ecliptic frame**, equals a given value. That is
 * not the same quantity as the apparent longitude the empirical mode
 * searches, and the two are never presented as if they were:
 *
 *   - no light-time. The position is where the body IS, not where it is seen.
 *   - no aberration, no gravitational deflection.
 *   - no precession and no nutation: the frame is J2000, not of date.
 *
 * Those omissions are what make the claim possible. With them, the searched
 * quantity is an explicit POLYNOMIAL of time inside each record of the
 * pack, and a polynomial can be reasoned about exactly.
 *
 * ## Why the completeness claim holds
 *
 * Write the target direction as lambda. The event is
 *
 *     f(t) = sin(lambda) * X(t) - cos(lambda) * Y(t) = 0
 *
 * with the half-plane condition
 *
 *     g(t) = cos(lambda) * X(t) + sin(lambda) * Y(t) > 0
 *
 * which is what separates lambda from lambda + 180. X and Y are fixed
 * linear combinations of the stored components (the equator-to-ecliptic
 * rotation at J2000 is a CONSTANT matrix, which is the whole reason the
 * frame is fixed), so f and g are fixed linear combinations of Chebyshev
 * series, and so are their derivatives.
 *
 * For a Chebyshev series on [-1, 1], every |T_k| <= 1, so `sum |c_k|` is a
 * true bound on the series. Applied to the coefficients of f' and f'' it
 * gives Lipschitz constants M1 and M2 that are true of the function, not
 * measured on a grid. Then on any cell of half-width w around its midpoint
 * m:
 *
 *     |f(m)| > M1 * w + rho   =>   no root in the cell
 *     |f'(m)| > M2 * w + rho' =>   f' has one sign, so at most one root,
 *                                  and the end values settle it
 *
 * Subdividing until every cell is closed by one of those two accounts for
 * the whole interval. Nothing here is sampled, so nothing here can be
 * defeated by an angle that turns a whole number of times between samples
 * — the failure that the empirical mode can only declare an assumption
 * against.
 *
 * ## What is still not established
 *
 * Three things, quantified separately on every result and never folded in:
 *
 *   1. **Rounding.** `rho` is a stated allowance for Clenshaw evaluation,
 *      8 * n * u * sum|c|. The argument is exact in real arithmetic and
 *      exact-to-rho in floating point.
 *   2. **The pack is not the kernel.** Completeness is established for the
 *      function THIS PACK DEFINES. How far that sits from the kernel it was
 *      compiled from is a property of the pack, not of this search, and a
 *      pack's own declared bound is not evidence here.
 *   3. **Geometric is not apparent.** The gap to an apparent place is
 *      dominated by light-time and is minutes of time, not milliseconds.
 *      It is reported so nobody reads one for the other.
 *
 * Environment-neutral: no `node:` imports, no clock.
 */
import { fail, PrecisionError } from './errors.mjs';
import { evalCheb, seriesBounds } from './cheb.mjs';
import { PACK_NAME, BARYCENTRE_NOT_CENTRE } from './ephemeris.mjs';
import { buildResult, SUPPORT, EXTERNAL_UNCERTAINTY as OUTSIDE } from './result.mjs';

const DAY = 86400;
const MS_PER_DAY = 86400000;
const J2000_JD = 2451545.0;
const DEG = Math.PI / 180;
/** IAU 2006 mean obliquity at J2000, arcseconds. A constant, which is the point. */
const EPS0_ARCSEC = 84381.406;
const COS_E = Math.cos((EPS0_ARCSEC / 3600) * DEG);
const SIN_E = Math.sin((EPS0_ARCSEC / 3600) * DEG);

export const GEOMETRIC_CONTRACT = Object.freeze({
  operation: 'geometric ecliptic longitude of one body, in the fixed J2000 mean ecliptic frame, reaching a given value',
  frame: 'j2000-mean-ecliptic',
  geometric: true,
  origin: 'geocentric',
  notApplied: Object.freeze([
    'light-time: the position is where the body is, not where it is seen from Earth',
    'annual aberration',
    'gravitational deflection by the Sun',
    'precession and nutation: the frame is J2000, not of date',
  ]),
  whyThoseAreOmitted: 'each of them makes the searched quantity something other than a polynomial in time, and the completeness proof is a statement about a polynomial',
  bodies: Object.freeze(['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']),
  barycentreNotCentre: BARYCENTRE_NOT_CENTRE,
});

export const VALIDATED_DEFAULTS = Object.freeze({
  /** Subdivision floor, seconds of TT. Below this a cell stays open. */
  minWidthSec: 1e-4,
  maxEvaluations: 2_000_000,
  maxCells: 400_000,
});

/**
 * Which stored series contribute to the geocentric vector of `body`, and
 * with what weight. Weights are merged, which matters: the geocentric Moon
 * collapses to a single series with weight 1 + 1/EMRAT, because the
 * Earth-Moon barycentre term cancels exactly. A looser bookkeeping would
 * carry the EMB series and its bound for nothing.
 */
function contributions(eph, body) {
  const add = (map, name, w) => map.set(name, (map.get(name) ?? 0) + w);
  const m = new Map();
  const target = (name, w) => {
    const b = eph.bodies.get(name);
    if (!b) fail('unknown-body', `this pack does not contain ${name}`);
    add(m, name, w);
    if (b.frame === 'sun') add(m, 'sun', w);
  };
  if (body === 'Sun') target('sun', 1);
  else if (body === 'Moon') { target('emb', 1); target('moon', 1); }
  else {
    const key = PACK_NAME[body];
    if (!key) fail('unknown-body', `${body} is not in the validated contract`);
    target(key, 1);
  }
  // minus the Earth: Earth = EMB - (1/EMRAT) * Moon
  if (eph.k === undefined) fail('bad-header', 'pack carries no EMRAT, so a geocentric vector cannot be formed');
  add(m, 'emb', -1);
  add(m, 'moon', eph.k);
  for (const [k, v] of [...m]) if (v === 0) m.delete(k);
  return m;
}

/** Piece boundaries: every record edge of every contributing series. */
function pieceEdges(eph, names, a, b) {
  const edges = new Set([a, b]);
  for (const name of names) {
    const s = eph.bodies.get(name);
    const first = Math.floor((a - s.initEt) / s.intervalSec);
    const last = Math.floor((b - s.initEt) / s.intervalSec);
    for (let i = Math.max(0, first); i <= Math.min(s.nrec - 1, last + 1); i += 1) {
      const e = s.initEt + i * s.intervalSec;
      if (e > a && e < b) edges.add(e);
    }
  }
  return [...edges].sort((x, y) => x - y);
}

/**
 * f, g and their true bounds over one piece, where every contributing
 * series sits inside a single record and the whole thing is one polynomial.
 */
function piecePolynomial(eph, weights, lambdaDeg, et) {
  const L = lambdaDeg * DEG;
  const sinL = Math.sin(L);
  const cosL = Math.cos(L);
  // f = sinL*x - cosL*(cosE*y + sinE*z);  g = cosL*x + sinL*(cosE*y + sinE*z)
  const fw = [sinL, -cosL * COS_E, -cosL * SIN_E];
  const gw = [cosL, sinL * COS_E, sinL * SIN_E];

  const parts = [];
  let f1 = 0; let f2 = 0; let fr = 0; let frd = 0;
  let g1 = 0; let g2 = 0; let gr = 0;
  for (const [name, w] of weights) {
    const s = eph.seriesAt(name, et);
    const per = [];
    for (let comp = 0; comp < 3; comp += 1) {
      const bnd = seriesBounds(s.coefficients, s.ncoef, comp * s.ncoef, s.radius);
      per.push(bnd);
      f1 += Math.abs(w * fw[comp]) * bnd.maxAbsFirst;
      f2 += Math.abs(w * fw[comp]) * bnd.maxAbsSecond;
      fr += Math.abs(w * fw[comp]) * bnd.roundoff;
      // The SLOPE's own rounding allowance, in the slope's units. The
      // monotone test compares a slope, so it needs this and not `fr`.
      frd += Math.abs(w * fw[comp]) * bnd.roundoffFirst;
      g1 += Math.abs(w * gw[comp]) * bnd.maxAbsFirst;
      g2 += Math.abs(w * gw[comp]) * bnd.maxAbsSecond;
      gr += Math.abs(w * gw[comp]) * bnd.roundoff;
    }
    parts.push({ name, w, s, per });
  }

  const value = (t) => {
    let f = 0;
    let g = 0;
    for (const { w, s } of parts) {
      const tau = (t - s.mid) / s.radius;
      for (let comp = 0; comp < 3; comp += 1) {
        const v = evalCheb(s.coefficients, s.ncoef, tau, comp * s.ncoef);
        f += w * fw[comp] * v;
        g += w * gw[comp] * v;
      }
    }
    return { f, g };
  };
  const slope = (t) => {
    let df = 0;
    for (const { w, s, per } of parts) {
      const tau = (t - s.mid) / s.radius;
      for (let comp = 0; comp < 3; comp += 1) {
        df += (w * fw[comp] * evalCheb(per[comp].d1, s.ncoef, tau, 0)) / s.radius;
      }
    }
    return df;
  };
  return {
    value, slope,
    boundsF: { first: f1, second: f2, roundoff: fr, roundoffSlope: frd },
    boundsG: { first: g1, second: g2, roundoff: gr },
    recordStop: Math.min(...parts.map((x) => x.s.recordStopEt)),
  };
}

/**
 * Search one piece rigorously.
 *
 * Every cell leaves by one of four doors: excluded (no root, proven),
 * monotone (at most one root, proven, and the end values settle it), an
 * exact zero at an endpoint (the root IS the endpoint), or open -- at the
 * subdivision floor, or because an endpoint value was inside the rounding
 * allowance and its sign could not be trusted. A single open cell anywhere
 * is why the whole run would not establish completeness.
 */
/**
 * `ownsRightEdge` decides who reports a root that sits exactly on a
 * boundary.
 *
 * Cells and pieces are closed intervals, so an instant where f is exactly
 * zero is the right endpoint of one and the left endpoint of the next, and
 * before this both of them reported it. Measured: a single root at t = 3 d,
 * on a record boundary, with target 0 degrees -- the one angle whose sine
 * is exactly zero, and the most ordinary query there is, an Aries ingress
 * -- came back as `found: 2`, `isExactTotal: true`, `established: true`.
 * An exact total that is wrong is the exact failure this mode exists to
 * rule out.
 *
 * The convention, the same one the partition test already states: a cell
 * owns `[lo, hi)`. A root at `hi` belongs to the next cell, which sees it
 * as its own `flo === 0`. The only exception is the right edge of the
 * whole searched interval, where there is no next cell -- hence the flag.
 */
function searchPiece(poly, u, v, spend, p, ownsRightEdge) {
  const { first: M1, second: M2, roundoff: RHO, roundoffSlope: RHO1 } = poly.boundsF;
  const roots = [];
  const open = [];
  const stack = [[u, v]];
  let cells = 0;
  while (stack.length) {
    const [lo, hi] = stack.pop();
    cells += 1;
    if (cells > p.maxCells) fail('budget-exhausted', `the validated search passed ${p.maxCells} cells`);
    const w = (hi - lo) / 2;
    const m = (lo + hi) / 2;
    spend();
    const fm = poly.value(m).f;

    // 1. Exclusion, from a true Lipschitz bound on f.
    if (Math.abs(fm) > M1 * w + RHO) continue;

    // 2. Monotone, from a true Lipschitz bound on f'.
    spend();
    const dm = poly.slope(m);
    // RHO1, not RHO: this compares a slope, and the position allowance is
    // in different units. It was accidentally conservative for day-length
    // records and inverted for short ones.
    const slopeFloor = Math.abs(dm) - M2 * w - RHO1;
    if (slopeFloor > 0) {
      spend(); spend();
      const flo = poly.value(lo).f;
      const fhi = poly.value(hi).f;
      // f is monotone across this cell, so a zero at an endpoint is the
      // only root in it either way; the question is only who reports it.
      if (flo === 0) { roots.push({ lo, hi: lo, kind: 'endpoint' }); continue; }
      if (fhi === 0) {
        if (ownsRightEdge && hi === v) roots.push({ lo: hi, hi, kind: 'endpoint' });
        continue;
      }
      if ((flo < 0) === (fhi < 0)) {
        // No sign change, and f' has one sign, so no root -- PROVIDED the
        // two signs are trustworthy. An endpoint value smaller than the
        // evaluation's own rounding allowance has a sign that is noise,
        // and this comparison used to carry no allowance at all while the
        // exclusion and half-plane tests both carry theirs.
        //
        // Open, not "no root". A root landing exactly on a cell boundary
        // is then reported by the neighbour that sees a real sign change,
        // and this cell says it could not rule out a second one -- which
        // is true, and costs the run its exact total.
        //
        // An ownership rule could decide these cases instead of declining
        // them, and a first attempt at one made the outcome depend on the
        // SIGN of a 1e-8 residual: the open cell landed left or right of
        // the root according to a quantity that is itself noise. A proof
        // whose conclusion turns on noise is not a proof. Declining is
        // uniform, and on real data it costs nothing -- ten of ten holdout
        // cases and a ten-year Aries-ingress search still come back proven
        // with no unresolved cell, because a root within 1e-8 s of a
        // record boundary does not happen to eight-day records.
        if (Math.abs(flo) <= RHO || Math.abs(fhi) <= RHO) { open.push([lo, hi]); continue; }
        continue;
      }
      // Exactly one root, bracketed. Bisect to the floor; the bracket is
      // real, not a tolerance: f is monotone across it.
      let a2 = lo; let b2 = hi; let fa = flo;
      while (b2 - a2 > p.minWidthSec) {
        const mid = (a2 + b2) / 2;
        if (!(mid > a2 && mid < b2)) break;
        spend();
        const fmid = poly.value(mid).f;
        if (fmid === 0) { a2 = mid; b2 = mid; break; }
        // Below the rounding allowance the midpoint's SIGN is noise, so
        // bisection cannot go on -- following it could narrow to a bracket
        // the root is not in. But the position is not unknown: |f'| is at
        // least `slopeFloor` across this cell, so every point with
        // |f| <= RHO lies within RHO/slopeFloor of the root. That is the
        // honest bracket, and it is far tighter than stopping here would
        // give: on the linear fixture, 2.3e-8 s rather than half a record.
        if (Math.abs(fmid) <= RHO) {
          const reach = RHO / slopeFloor;
          a2 = Math.max(a2, mid - reach);
          b2 = Math.min(b2, mid + reach);
          break;
        }
        if ((fmid < 0) === (fa < 0)) { a2 = mid; fa = fmid; } else b2 = mid;
      }
      roots.push({ lo: a2, hi: b2, kind: 'transversal', rising: (fhi - flo) > 0 });
      continue;
    }

    // 3. Neither test closed it: subdivide, or give up on this cell.
    if (hi - lo <= p.minWidthSec) { open.push([lo, hi]); continue; }
    stack.push([m, hi], [lo, m]);
  }
  return { roots, open, cells };
}

/**
 * @param {import('./ephemeris.mjs').Ephemeris} eph
 * @param {object} spec {body, targetDeg, fromTtDays, toTtDays, signal?, ...tuning}
 */
export function searchGeometricLongitude(eph, spec = {}) {
  const { body, targetDeg, fromTtDays, toTtDays, signal = null, ...tuning } = spec;
  for (const k of Object.keys(tuning)) {
    if (!(k in VALIDATED_DEFAULTS)) fail('unsupported-option', `unknown validated-search option ${k}`);
  }
  const p = { ...VALIDATED_DEFAULTS, ...tuning };
  if (!GEOMETRIC_CONTRACT.bodies.includes(body)) fail('unknown-body', `${body} is not in the validated contract`);
  for (const [k, v] of [['targetDeg', targetDeg], ['fromTtDays', fromTtDays], ['toTtDays', toTtDays]]) {
    if (!Number.isFinite(v)) fail('unsupported-option', `${k} must be a finite number`);
  }
  if (!(toTtDays > fromTtDays)) fail('unsupported-option', 'toTtDays must be after fromTtDays');
  for (const [k, v] of Object.entries(p)) if (!Number.isFinite(v) || v <= 0) fail('unsupported-option', `${k} must be positive and finite`);

  // The target is taken modulo a turn, so 137, 497 and -223 are one request.
  const lambda = ((targetDeg % 360) + 360) % 360;
  const a = fromTtDays * DAY;
  const b = toTtDays * DAY;
  if (!eph.covers(a) || !eph.covers(b)) {
    fail('out-of-coverage', 'the requested interval is outside the pack\'s coverage');
  }

  let evaluations = 0;
  const spend = () => {
    if (signal && signal.aborted) throw new PrecisionError('cancelled', 'the search was cancelled', { evaluations });
    evaluations += 1;
    if (evaluations > p.maxEvaluations) fail('budget-exhausted', `the evaluation budget of ${p.maxEvaluations} was spent`);
  };

  const weights = contributions(eph, body);

  // The proof is `sum|c_k|` over a Chebyshev series, and that bounds the
  // series only for |tau| <= 1 -- inside the record. A pack may legally
  // declare coverage that overhangs its own records by up to a second at
  // each end (container.mjs's `cov.start + 1` tolerance), `seriesAt`
  // CLAMPS the record index rather than refusing, and `pieceEdges` never
  // emits the end of the last record, so the final piece used to run past
  // the data with a bound that was not a bound there.
  //
  // Measured on a hostile pack with one-second records: the last record's
  // series reached 1.76e22 at tau = 3 against a declared bound of 3.68e18,
  // false by a factor of 4770, the cell was "excluded", and the result
  // said `found: 0, isExactTotal: true, processedFraction: 1` over an
  // interval in which the evaluated function changes sign.
  //
  // So the searched interval must lie inside the records of every
  // contributing series. Not clamped -- refused. A completeness claim
  // cannot be given over data that does not exist.
  let recordStart = -Infinity;
  let recordStop = Infinity;
  for (const name of weights.keys()) {
    const sb = eph.bodies.get(name);
    if (!sb) fail('unknown-body', `this pack does not contain ${name}`);
    recordStart = Math.max(recordStart, sb.initEt);
    recordStop = Math.min(recordStop, sb.initEt + sb.nrec * sb.intervalSec);
  }
  if (a < recordStart || b > recordStop) {
    fail('out-of-coverage',
      `the validated search needs the interval to lie inside the stored records of every contributing series. `
      + `Requested ${a} .. ${b} s TDB; the records cover ${recordStart} .. ${recordStop}. `
      + 'A pack may declare coverage wider than its records; outside them the Chebyshev bound this proof rests on is not a bound.',
      { requestedEtSec: [a, b], recordSpanEtSec: [recordStart, recordStop] });
  }

  const edges = pieceEdges(eph, [...weights.keys()], a, b);

  const events = [];
  const unresolved = [];
  const degenerate = [];
  let cells = 0;
  let worstFirst = 0;
  let worstSecond = 0;
  let worstRoundoff = 0;
  let status = 'finished';
  let reason = null;

  try {
    for (let i = 1; i < edges.length; i += 1) {
      const u = edges[i - 1];
      const v = edges[i];
      if (!(v > u)) continue;
      const poly = piecePolynomial(eph, weights, lambda, (u + v) / 2);
      worstFirst = Math.max(worstFirst, poly.boundsF.first);
      worstSecond = Math.max(worstSecond, poly.boundsF.second);
      worstRoundoff = Math.max(worstRoundoff, poly.boundsF.roundoff);
      const got = searchPiece(poly, u, v, spend, p, i === edges.length - 1);
      cells += got.cells;
      for (const [lo, hi] of got.open) unresolved.push({ fromTtDays: lo / DAY, toTtDays: hi / DAY, why: 'neither the exclusion nor the monotone test closed this cell at the subdivision floor' });
      for (const r of got.roots) {
        // The half-plane condition, checked with its OWN true bound so the
        // opposite direction is excluded rather than assumed away.
        const m = (r.lo + r.hi) / 2;
        const w = Math.max((r.hi - r.lo) / 2, 0);
        spend();
        const { g } = poly.value(m);
        const gFloor = Math.abs(g) - poly.boundsG.first * w - poly.boundsG.roundoff;
        if (gFloor <= 0) {
          degenerate.push({
            ttDays: m / DAY,
            why: 'the half-plane projection could not be shown non-zero over this bracket, so the direction is not determined here',
            g,
            allowance: poly.boundsG.first * w + poly.boundsG.roundoff,
          });
          continue;
        }
        if (g < 0) continue;                       // the antipode, not the target
        events.push({
          ttDays: m / DAY,
          jdTt: m / DAY + J2000_JD,
          bracketTtDays: [r.lo / DAY, r.hi / DAY],
          bracketWidthSec: r.hi - r.lo,
          kind: r.kind,
          direction: r.rising === undefined ? null : (r.rising ? 'increasing' : 'decreasing'),
          halfPlaneMarginKm: gFloor,
        });
      }
    }
  } catch (error) {
    // Both are execution states the contract names, and both keep the
    // events already isolated: a cancelled run that threw away what it had
    // found would be answering a question nobody asked.
    if (error instanceof PrecisionError && (error.code === 'budget-exhausted' || error.code === 'cancelled')) {
      status = error.code;
      reason = error.message;
    } else throw error;
  }

  events.sort((x, y) => x.ttDays - y.ttDays);
  const accounted = status === 'finished' && unresolved.length === 0 && degenerate.length === 0;

  return buildResult({
    mode: 'validated-geometric',
    request: {
      kind: 'geometric-longitude',
      body,
      targetDeg,
      normalisedTargetDeg: lambda,
      isSystemBarycentre: BARYCENTRE_NOT_CENTRE.includes(body),
      ...GEOMETRIC_CONTRACT,
    },
    events,
    interval: {
      requestedTtDays: [a / DAY, b / DAY],
      requestedSpanDays: (b - a) / DAY,
      processedTtDays: accounted ? [[a / DAY, b / DAY]] : [],
      processedSpanDays: accounted ? (b - a) / DAY : 0,
      processedFraction: accounted ? 1 : 0,
      pieces: edges.length - 1,
      piecesAre: 'the common refinement of every contributing series\' record boundaries, inside which the searched quantity is one polynomial',
      subdivisionFloorSec: p.minWidthSec,
      units: 'TT days past J2000 in and out; TT seconds internally',
    },
    execution: { status, finished: status === 'finished', evaluations, maxEvaluations: p.maxEvaluations, cells, reason },
    accounting: {
      allIntervalsAccountedFor: accounted,
      unresolved: [...unresolved, ...degenerate.map((d) => ({ fromTtDays: d.ttDays, toTtDays: d.ttDays, why: d.why }))],
      note: accounted
        ? 'every cell left by the exclusion test or the monotone test, both of which follow from bounds that are true of the polynomial'
        : 'at least one cell reached the subdivision floor undecided, or a direction could not be determined',
    },
    completeness: {
      established: accounted,
      support: accounted ? SUPPORT.proven : SUPPORT.none,
      statement: accounted
        ? 'Complete for the function this pack defines: no further instant in the interval has this body at this geometric J2000 ecliptic longitude, to within the stated rounding allowance. This is a theorem about a polynomial, not a statement about the sky — see uncertainty.'
        : 'Not established. Some cell was not decided.',
      conditionalOn: [],
      basis: 'sum |c_k| bounds every Chebyshev series by construction, so max|f\'| and max|f\'\'| are true Lipschitz constants and the exclusion and monotone tests are valid, not sampled',
    },
    assumptions: [],
    eventCount: {
      found: events.length,
      isExactTotal: accounted,
      lowerBound: events.length,
      upperBound: accounted ? events.length : null,
      support: accounted ? SUPPORT.proven : SUPPORT.none,
      conditionalTotal: null,
      conditionalPossibleTotals: null,
    },
    uncertainty: {
      numerical: {
        roundingAllowanceKm: worstRoundoff,
        roundingBasis: '8 * n * u * sum|c_k| per Clenshaw evaluation, summed over the contributing series with their weights',
        maxAbsFirstDerivativeKmPerSec: worstFirst,
        maxAbsSecondDerivativeKmPerSec2: worstSecond,
        derivativeBoundsAre: 'true of the polynomial: sum of |coefficients| of the differentiated series. Not sampled, not inflated',
        bracketWidthsSec: events.map((e) => e.bracketWidthSec),
        subdivisionFloorSec: p.minWidthSec,
      },
      packVersusKernel: {
        bounded: false,
        what: 'how far the polynomial this pack stores sits from the kernel it was compiled from',
        note: 'NOT established here, and a pack\'s own declared bound is not evidence. Completeness above is for the function the pack defines',
      },
      geometricVersusApparent: {
        bounded: false,
        what: 'the difference between this geometric J2000 longitude and an apparent longitude of date',
        note: 'dominated by light-time, which is minutes for the outer planets, plus aberration, deflection, precession and nutation. These are different quantities and one must not be read for the other',
      },
      ...OUTSIDE,
    },
    diagnostics: {
      contributingSeries: [...weights].map(([name, w]) => ({ name, weight: w })),
      degenerate,
      cells,
    },
  });
}
