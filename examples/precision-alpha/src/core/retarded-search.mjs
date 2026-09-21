/**
 * validated-retarded-geometric: a fixed-longitude crossing of the
 * light-time-corrected direction to a body, in the fixed J2000 mean
 * ecliptic frame, with completeness established rather than assumed.
 *
 * This is NOT apparent-of-date astrology and must not be read as a more
 * accurate answer to the same question `empirical-apparent` answers. It
 * adds exactly one correction to `validated-geometric` -- Newtonian
 * reception light-time -- and still omits stellar aberration,
 * gravitational deflection, Shapiro delay, precession and nutation into
 * the frame of date, topocentric parallax and refraction. Those omissions
 * are on the result object, by name.
 *
 * The scalar that is searched is a projection, not an angle:
 *
 *     f(t) = sin(L) x - cos(L) (cos(e) y + sin(e) z)
 *     g(t) = cos(L) x + sin(L) (cos(e) y + sin(e) z)
 *
 * with (x, y, z) = d(t), the light-time-corrected geocentric vector. f
 * vanishes on the whole line through the target longitude and its
 * antipode; g > 0 picks the requested direction. No wrapped angle appears
 * anywhere, so no small-difference-at-sampled-endpoints assumption is
 * needed and the 96-turn aliasing failure has nothing to act on.
 *
 * Time in and out is TDB seconds past J2000, stated as such: SPK
 * coefficients are indexed by TDB, and folding an unbounded TT or UTC
 * conversion into a proof would make the proof about something else.
 *
 * Environment-neutral: no `node:` imports, no clock.
 */
import { fail, PrecisionError } from './errors.mjs';
import { BARYCENTRE_NOT_CENTRE } from './ephemeris.mjs';
import { buildResult, SUPPORT, EXTERNAL_UNCERTAINTY as OUTSIDE } from './result.mjs';
import { C_KM_S, targetWeights, observerWeights, stateEnclosure, solveTau } from './retarded.mjs';
import * as I from './interval.mjs';

const DAY = 86400;
const J2000_JD = 2451545.0;
const DEG = Math.PI / 180;
/** IAU 2006 mean obliquity at J2000, arcseconds. A constant, which is the point. */
const EPS0_ARCSEC = 84381.406;
const COS_E = Math.cos((EPS0_ARCSEC / 3600) * DEG);
const SIN_E = Math.sin((EPS0_ARCSEC / 3600) * DEG);

export const RETARDED_CONTRACT = Object.freeze({
  operation: 'geometric ecliptic longitude of one body CORRECTED FOR RECEPTION LIGHT-TIME, in the fixed J2000 mean ecliptic frame, reaching a given value',
  frame: 'j2000-mean-ecliptic',
  origin: 'geocentric',
  timeScale: 'TDB seconds past J2000, in and out. No TT or UTC conversion happens inside this operation.',
  lightTime: 'Newtonian reception: tau = |r_target(t - tau) - r_observer(t)| / c, with the OBSERVER at reception time t and the target at emission time t - tau. Solved as a verified contraction, not by iterating until two values agree.',
  c: C_KM_S,
  applied: Object.freeze(['reception light-time (Newtonian, one-way, target retarded, observer not)']),
  notApplied: Object.freeze([
    'stellar (annual) aberration: the observer\'s velocity does not enter the direction',
    'gravitational light deflection by the Sun',
    'Shapiro (relativistic) delay: the light-time here is the Newtonian straight-line one',
    'precession and nutation: the frame is J2000, not of date',
    'topocentric parallax and atmospheric refraction: the observer is the geocentre',
  ]),
  comparableTo: 'SPICE aberration correction "LT" (converged, so closer to "CN" than to a single iteration) in frame ECLIPJ2000, observer 399, with no stellar-aberration term. NOT comparable with "CN+S" or with an apparent place of date.',
  bodies: Object.freeze(['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']),
  barycentreNotCentre: BARYCENTRE_NOT_CENTRE,
});

export const RETARDED_DEFAULTS = Object.freeze({
  /** Subdivision floor, seconds of TDB. Below this a cell stays open. */
  minWidthSec: 1e-4,
  maxEvaluations: 4_000_000,
  maxCells: 400_000,
  /** How many times the candidate light-time interval may be widened before giving up on a cell. */
  maxTauWidenings: 6,
  /** First half-width of the candidate light-time interval, as a multiple of the solver's own error bound, plus a floor in seconds. */
  tauPadFactor: 64,
  tauPadFloorSec: 1e-6,
});

/**
 * Establish a light-time interval that holds for EVERY reception time in
 * the cell, and the enclosures that follow from it.
 *
 * Returns null when the conditions cannot be established, with the reason.
 */
function retardedCell(eph, targets, observer, lambdaDeg, t0, t1, spend, p) {
  const L = lambdaDeg * DEG;
  const wF = [Math.sin(L), -Math.cos(L) * COS_E, -Math.cos(L) * SIN_E];
  const wG = [Math.cos(L), Math.sin(L) * COS_E, Math.sin(L) * SIN_E];

  const O = stateEnclosure(eph, observer, t0, t1, spend);

  // A first light-time, solved at the cell's ends, to centre the candidate
  // interval. This is a STARTING POINT and nothing is proved from it.
  const mid = (t0 + t1) / 2;
  const oMid = [I.mid ? 0 : 0]; // placeholder removed below
  void oMid;
  const oPoint = stateEnclosure(eph, observer, mid, mid, spend).pos.map((x) => (x.lo + x.hi) / 2);
  const rough = solveTau(eph, targets, mid, oPoint, 0.5, spend);
  let pad = Math.max(p.tauPadFactor * Math.max(rough.errorSec, rough.lastStepSec), p.tauPadFloorSec);
  // The light-time also varies across the cell; allow for that up front.
  pad += ((t1 - t0) / 2) * 1e-3;

  for (let attempt = 0; attempt <= p.maxTauWidenings; attempt += 1) {
    const T = { lo: Math.max(0, rough.tau - pad), hi: rough.tau + pad };
    const emitLo = t0 - T.hi;
    const emitHi = t1 - T.lo;
    let R;
    try {
      R = stateEnclosure(eph, targets, emitLo, emitHi, spend);
    } catch (error) {
      if (error instanceof PrecisionError && error.code === 'out-of-coverage') {
        return { ok: false, why: `the emission window ${emitLo} .. ${emitHi} s TDB reaches outside the stored records` };
      }
      throw error;
    }

    // The contraction factor, from the pack's own differentiated series.
    // Not an assumed universal speed ceiling.
    const vMax = I.vMag(R.vel);
    const k = vMax / C_KM_S;
    if (!(k < 1)) {
      return { ok: false, why: `the target's speed bound over the emission window is ${vMax.toFixed(3)} km/s, which is not below c, so the light-time iteration is not a contraction here` };
    }

    const D = I.vSub(R.pos, O.pos);
    const dist = I.norm(D);
    if (!(dist.lo > 0)) {
      return { ok: false, why: 'the target and the observer cannot be shown to be separated over this cell, so the direction is undefined' };
    }
    const phi = { lo: dist.lo / C_KM_S, hi: dist.hi / C_KM_S };
    if (!I.contains(T, phi)) {
      pad = Math.max(pad * 4, (phi.hi - phi.lo) * 2 + Math.abs(phi.lo - T.lo) + Math.abs(phi.hi - T.hi));
      continue;
    }

    // Self-mapping holds on T and the map is a contraction, so for every
    // reception time in this cell there is exactly one light-time in T,
    // and d(t) lies in D.
    const u = [I.div(D[0], dist), I.div(D[1], dist), I.div(D[2], dist)];
    const vRel = I.vSub(R.vel, O.vel);
    const num = I.dot(u, vRel);
    const den = I.add(I.iv(C_KM_S), I.dot(u, R.vel));
    if (den.lo <= 0) return { ok: false, why: 'the light-time derivative denominator cannot be bounded away from zero' };
    const tauDot = I.div(num, den);

    const oneMinus = I.sub(I.iv(1), tauDot);
    const dDot = I.vSub(I.vMulI(R.vel, oneMinus), O.vel);

    // Second derivative, through the same implicit equation.
    const dDotMag = I.vMag(dDot);
    const uDotBound = (2 * dDotMag) / dist.lo;
    const uDot = [I.iv(-uDotBound, uDotBound), I.iv(-uDotBound, uDotBound), I.iv(-uDotBound, uDotBound)];
    const aRel = I.vSub(I.vMulI(R.acc, oneMinus), O.acc);
    const numDot = I.add(I.dot(uDot, vRel), I.dot(u, aRel));
    const denDot = I.add(I.dot(uDot, R.vel), I.dot(u, I.vMulI(R.acc, oneMinus)));
    const tauDotDot = I.div(I.sub(I.mul(numDot, den), I.mul(num, denDot)), I.mul(den, den));
    const dDotDot = I.vSub(
      I.vSub(I.vMulI(R.acc, I.mul(oneMinus, oneMinus)), I.vMulI(R.vel, tauDotDot)),
      O.acc,
    );

    const proj = (w, v) => I.add(I.add(I.scale(v[0], w[0]), I.scale(v[1], w[1])), I.scale(v[2], w[2]));
    return {
      ok: true,
      tauInterval: T,
      contraction: k,
      emission: [emitLo, emitHi],
      distanceKm: dist,
      f: proj(wF, D),
      g: proj(wG, D),
      fDot: proj(wF, dDot),
      fDotDot: proj(wF, dDotDot),
      gDot: proj(wG, dDot),
      M1: I.mag(proj(wF, dDot)),
      M2: I.mag(proj(wF, dDotDot)),
      gM1: I.mag(proj(wG, dDot)),
      widenings: attempt,
    };
  }
  return { ok: false, why: `the light-time interval could not be shown to map into itself after ${p.maxTauWidenings + 1} attempts` };
}

/**
 * @param {import('./ephemeris.mjs').Ephemeris} eph
 * @param {object} spec {body, targetDeg, fromTdbSec, toTdbSec, signal?, ...tuning}
 */
export function searchRetardedLongitude(eph, spec = {}) {
  const { body, targetDeg, fromTdbSec, toTdbSec, signal = null, ...tuning } = spec;
  for (const k of Object.keys(tuning)) {
    if (!(k in RETARDED_DEFAULTS)) fail('unsupported-option', `unknown retarded-search option ${k}`);
  }
  const p = { ...RETARDED_DEFAULTS, ...tuning };
  if (!RETARDED_CONTRACT.bodies.includes(body)) fail('unknown-body', `${body} is not in the retarded contract`);
  for (const [k, v] of [['targetDeg', targetDeg], ['fromTdbSec', fromTdbSec], ['toTdbSec', toTdbSec]]) {
    if (!Number.isFinite(v)) fail('unsupported-option', `${k} must be a finite number`);
  }
  if (!(toTdbSec > fromTdbSec)) fail('unsupported-option', 'toTdbSec must be after fromTdbSec');
  for (const [k, v] of Object.entries(p)) if (!Number.isFinite(v) || v <= 0) fail('unsupported-option', `${k} must be positive and finite`);

  const lambda = ((targetDeg % 360) + 360) % 360;
  const a = fromTdbSec;
  const b = toTdbSec;
  const targets = targetWeights(eph, body);
  const observer = observerWeights(eph);

  let evaluations = 0;
  const spend = () => {
    if (signal && signal.aborted) throw new PrecisionError('cancelled', 'the search was cancelled', { evaluations });
    evaluations += 1;
    if (evaluations > p.maxEvaluations) fail('budget-exhausted', `the evaluation budget of ${p.maxEvaluations} was spent`, { evaluations });
  };

  const events = [];
  const unresolved = [];
  let cells = 0;
  let status = 'finished';
  let reason = null;
  let worstContraction = 0;
  let widestTauSec = 0;
  let widestEmissionSec = 0;

  const at = (t) => retardedCell(eph, targets, observer, lambda, t, t, spend, p);

  try {
    const stack = [[a, b]];
    while (stack.length) {
      const [lo, hi] = stack.pop();
      cells += 1;
      if (cells > p.maxCells) fail('budget-exhausted', `the retarded search passed ${p.maxCells} cells`, { cells });
      const w = (hi - lo) / 2;
      const m = (lo + hi) / 2;

      const cell = retardedCell(eph, targets, observer, lambda, lo, hi, spend, p);
      if (!cell.ok) {
        unresolved.push({ fromTdbSec: lo, toTdbSec: hi, why: cell.why });
        continue;
      }
      worstContraction = Math.max(worstContraction, cell.contraction);
      widestTauSec = Math.max(widestTauSec, cell.tauInterval.hi - cell.tauInterval.lo);
      widestEmissionSec = Math.max(widestEmissionSec, cell.emission[1] - cell.emission[0]);

      // 1. Exclusion. The midpoint enclosure already carries every error.
      const fm = at(m);
      if (!fm.ok) { unresolved.push({ fromTdbSec: lo, toTdbSec: hi, why: fm.why }); continue; }
      if (I.mig(fm.f) > cell.M1 * w) continue;

      // 2. Monotone.
      if (I.mig(fm.fDot) > cell.M2 * w) {
        const flo = at(lo);
        const fhi = at(hi);
        if (!flo.ok || !fhi.ok) { unresolved.push({ fromTdbSec: lo, toTdbSec: hi, why: (flo.ok ? fhi : flo).why }); continue; }
        const sgn = (x) => (x.lo > 0 ? 1 : x.hi < 0 ? -1 : 0);
        const sLo = sgn(flo.f);
        const sHi = sgn(fhi.f);
        if (sLo === 0 || sHi === 0) {
          // The sign at an endpoint is inside the enclosure's own width, so
          // it is not known. Declining keeps the exact total honest.
          unresolved.push({ fromTdbSec: lo, toTdbSec: hi, why: 'an endpoint value could not be separated from zero, so its sign is not established' });
          continue;
        }
        if (sLo === sHi) continue;                       // monotone, no sign change, no root

        let a2 = lo; let b2 = hi; let sa = sLo;
        while (b2 - a2 > p.minWidthSec) {
          const mm = (a2 + b2) / 2;
          if (!(mm > a2 && mm < b2)) break;
          const fmm = at(mm);
          if (!fmm.ok) break;
          const s = sgn(fmm.f);
          if (s === 0) break;                            // narrowed into the noise; the bracket stands
          if (s === sa) { a2 = mm; sa = s; } else b2 = mm;
        }
        // The half-plane, with its own enclosure over the bracket.
        const br = retardedCell(eph, targets, observer, lambda, a2, b2, spend, p);
        if (!br.ok) { unresolved.push({ fromTdbSec: a2, toTdbSec: b2, why: br.why }); continue; }
        if (br.g.lo <= 0) {
          if (br.g.hi < 0) continue;                     // the antipode, not the requested direction
          unresolved.push({ fromTdbSec: a2, toTdbSec: b2, why: 'the half-plane projection could not be shown non-zero over this bracket, so the direction is not determined here' });
          continue;
        }
        const mm = (a2 + b2) / 2;
        events.push({
          tdbSec: mm,
          ttDaysIfTdbIsTt: mm / DAY,
          jdTdb: mm / DAY + J2000_JD,
          bracketTdbSec: [a2, b2],
          bracketWidthSec: b2 - a2,
          kind: 'transversal',
          direction: sHi > sLo ? 'increasing' : 'decreasing',
          lightTimeSec: cell.tauInterval,
          halfPlaneMarginKm: br.g.lo,
          distanceKm: [br.distanceKm.lo, br.distanceKm.hi],
        });
        continue;
      }

      // 3. Neither test closed it.
      if (hi - lo <= p.minWidthSec) {
        unresolved.push({ fromTdbSec: lo, toTdbSec: hi, why: 'neither the exclusion nor the monotone test closed this cell at the subdivision floor' });
        continue;
      }
      stack.push([m, hi], [lo, m]);
    }
  } catch (error) {
    if (error instanceof PrecisionError && (error.code === 'budget-exhausted' || error.code === 'cancelled')) {
      status = error.code;
      reason = error.message;
    } else throw error;
  }

  events.sort((x, y) => x.tdbSec - y.tdbSec);
  const accounted = status === 'finished' && unresolved.length === 0;

  return buildResult({
    mode: 'validated-retarded-geometric',
    request: {
      kind: 'retarded-geometric-longitude',
      body,
      targetDeg,
      normalisedTargetDeg: lambda,
      isSystemBarycentre: BARYCENTRE_NOT_CENTRE.includes(body),
      ...RETARDED_CONTRACT,
    },
    events,
    interval: {
      requestedTdbSec: [a, b],
      requestedTtDays: [a / DAY, b / DAY],
      requestedSpanDays: (b - a) / DAY,
      processedTdbSec: accounted ? [[a, b]] : [],
      processedSpanDays: accounted ? (b - a) / DAY : 0,
      processedFraction: accounted ? 1 : 0,
      cells,
      subdivisionFloorSec: p.minWidthSec,
      units: 'TDB seconds past J2000, in and out',
    },
    execution: {
      status,
      finished: status === 'finished',
      evaluations,
      maxEvaluations: p.maxEvaluations,
      cells,
      reason,
    },
    accounting: {
      allIntervalsAccountedFor: accounted,
      unresolved: unresolved.map((u) => ({
        fromTtDays: u.fromTdbSec / DAY,
        toTtDays: u.toTdbSec / DAY,
        fromTdbSec: u.fromTdbSec,
        toTdbSec: u.toTdbSec,
        why: u.why,
      })),
      note: accounted
        ? 'every cell left by the exclusion test or the monotone test, both from enclosures that follow from bounds true of the stored polynomial and a verified light-time contraction'
        : 'at least one cell could not be closed, or its light-time interval could not be established',
    },
    completeness: {
      established: accounted,
      support: accounted ? SUPPORT.proven : SUPPORT.none,
      statement: accounted
        ? 'Every crossing of the requested longitude by the light-time-corrected direction, for the function this pack defines, over the requested interval. The light-time is a verified contraction, not an iteration that stopped changing.'
        : 'Nothing about completeness was established.',
      conditionalOn: [],
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
      note: accounted
        ? 'exact for the retarded function this pack defines'
        : 'a lower bound: what was isolated, with at least one region undecided',
    },
    uncertainty: {
      numerical: {
        subdivisionFloorSec: p.minWidthSec,
        worstContractionFactor: worstContraction,
        widestLightTimeIntervalSec: widestTauSec,
        widestEmissionWindowSec: widestEmissionSec,
        note: 'The contraction factor is max|v_target|/c over the emission window, taken from sum|c_k| of the differentiated stored series. Below 1 it gives existence, uniqueness and an a-posteriori error bound by Banach.',
      },
      ...OUTSIDE,
    },
    diagnostics: {
      lightTime: {
        model: RETARDED_CONTRACT.lightTime,
        cKmPerSec: C_KM_S,
        worstContractionFactor: worstContraction,
      },
      notApplied: RETARDED_CONTRACT.notApplied,
    },
  });
}
