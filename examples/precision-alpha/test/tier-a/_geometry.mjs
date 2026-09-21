/**
 * Synthetic geometries for the aberrated suite, and the independent
 * references it is checked against.
 *
 * ## Why this is a second copy
 *
 * `retarded-search.nodetest.mjs` has its own `fit`, `packOf` and
 * `tauExact`. They are not shared with this file on purpose. The light-time
 * suite is a released result with a published holdout behind it, and an
 * edit made here for the aberrated mode must not be able to move what that
 * suite measures. The duplication is thirty lines and it buys the two
 * suites independence.
 *
 * ## What the references do and do not establish
 *
 * `rootsExact` samples on a grid and bisects each sign change. That is the
 * very method this package exists to replace, and its own completeness is
 * NOT established -- a root pair finer than the sample spacing is invisible
 * to it. It is used the one way it is sound: to say where a root IS, so the
 * solver's bracket can be checked against something it did not compute.
 * Where a case needs a count rather than a location, the count comes from
 * the geometry in closed form and is asserted at the call site.
 *
 * The references share `aberrate` with the operation under test. That is
 * deliberate: §1 of ABERRATED-PREREGISTRATION.md DEFINES the quantity as
 * `aberrate` applied to the light-time-corrected vector, and `aberrate`
 * itself is settled against ERFA and closed forms in
 * `aberration.nodetest.mjs`. What these references independently establish
 * is the SEARCH -- where the roots are, how many there are, and whether the
 * enclosures lost one -- not the transformation.
 */
import { buildPack } from './_pack.mjs';
import { parseContainerBytes } from '../../src/core/container.mjs';
import { memorySource } from '../../src/core/source.mjs';
import { Ephemeris } from '../../src/core/ephemeris.mjs';
import { aberrate } from '../../src/core/aberration.mjs';
import { C_KM_S } from '../../src/core/retarded.mjs';

export const DAY = 86400;
export const EMRAT = 81.30056822149722;
export const EPS0 = ((84381.406 / 3600) * Math.PI) / 180;
export const CE = Math.cos(EPS0);
export const SE = Math.sin(EPS0);

/** Chebyshev coefficients of g on [lo, hi], by discrete cosine fit. */
export function fit(g, lo, hi, n) {
  const m = 4 * n;
  const xs = [];
  const ys = [];
  for (let j = 0; j < m; j += 1) {
    const tau = Math.cos((Math.PI * (j + 0.5)) / m);
    xs.push(tau);
    ys.push(g(lo + ((tau + 1) / 2) * (hi - lo)));
  }
  const c = new Array(n).fill(0);
  for (let k = 0; k < n; k += 1) {
    let s = 0;
    for (let j = 0; j < m; j += 1) s += ys[j] * Math.cos(k * Math.acos(xs[j]));
    c[k] = ((k === 0 ? 1 : 2) / m) * s;
  }
  return c;
}

/**
 * A pack whose `marsBary` series IS the target path and whose `emb` series
 * IS the observer path, with `moon` zero so Earth = emb exactly.
 */
export function packOf(targetFn, observerFn, opts = {}) {
  const { ncoef = 20, nrec = 80, intervalSec = DAY, initEt = -40 * DAY, targetRecords = null } = opts;
  const zeros = () => new Array(ncoef).fill(0);
  const series = (fn) => (r) => {
    const lo = initEt + r * intervalSec;
    const hi = lo + intervalSec;
    return [0, 1, 2].flatMap((comp) => fit((t) => fn(t)[comp], lo, hi, ncoef));
  };
  const bytes = buildPack({
    bodies: [
      { name: 'sun', frame: 'native', ncoef, nrec, initEt, intervalSec, coeffs: () => [...zeros(), ...zeros(), ...zeros()] },
      { name: 'emb', frame: 'ssb', ncoef, nrec, initEt, intervalSec, coeffs: series(observerFn) },
      { name: 'moon', frame: 'ssb', ncoef, nrec, initEt, intervalSec, coeffs: () => [...zeros(), ...zeros(), ...zeros()] },
      { name: 'marsBary', frame: 'ssb', ncoef, nrec: targetRecords ?? nrec, initEt, intervalSec, coeffs: series(targetFn) },
    ],
    derived: { earth399: { emrat: EMRAT, from: 'moon' } },
  });
  return new Ephemeris(memorySource(bytes), parseContainerBytes(bytes));
}

// ------------------------------------------------------------- vector help
export const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const norm3 = (v) => Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
/** A point at ECLIPTIC longitude `lam` and radius `R`, in the stored equatorial frame. */
export const atEclipticLongitude = (lam, R) => [R * Math.cos(lam), R * Math.sin(lam) * CE, R * Math.sin(lam) * SE];

export const wF = (Ldeg) => {
  const L = (Ldeg * Math.PI) / 180;
  return [Math.sin(L), -Math.cos(L) * CE, -Math.cos(L) * SE];
};
export const wG = (Ldeg) => {
  const L = (Ldeg * Math.PI) / 180;
  return [Math.cos(L), Math.sin(L) * CE, Math.sin(L) * SE];
};
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// --------------------------------------------------------- the reference
/**
 * The reception fixed point, by plain iteration. Owes the solver nothing.
 *
 * Runs to a FIXED POINT rather than a fixed count: the map contracts at
 * |v_target|/c, so the step falls by four orders a time on these geometries
 * and the iteration settles in well under ten. A fixed count large enough
 * to be safe on every geometry made the reference the slowest thing in the
 * suite, for no extra accuracy at all.
 */
export function tauExact(target, observer, t, maxIterations = 200) {
  let x = 0;
  const o = observer(t);
  for (let i = 0; i < maxIterations; i += 1) {
    const next = norm3(sub3(target(t - x), o)) / C_KM_S;
    if (next === x) return x;
    x = next;
  }
  return x;
}

/** The light-time-corrected geocentric vector, and the aberrated direction. */
export function dExact(geom, t) {
  return sub3(geom.target(t - tauExact(geom.target, geom.observer, t)), geom.observer(t));
}
export function uExact(geom, t) {
  const v = geom.observerVel(t).map((q) => q / C_KM_S);
  return aberrate(dExact(geom, t), v);
}

/**
 * The two projections, on either rung of the ladder. `aberrated` picks
 * which: false is `validated-retarded-geometric`'s quantity, true is
 * `validated-retarded-aberrated`'s.
 */
export const fExact = (geom, t, Ldeg, aberrated) => dot3(wF(Ldeg), aberrated ? uExact(geom, t) : dExact(geom, t));
export const gExact = (geom, t, Ldeg, aberrated) => dot3(wG(Ldeg), aberrated ? uExact(geom, t) : dExact(geom, t));

/** Geocentric ecliptic longitude in degrees, on either rung. */
export function lonExact(geom, t, aberrated) {
  const d = aberrated ? uExact(geom, t) : dExact(geom, t);
  return ((((Math.atan2(CE * d[1] + SE * d[2], d[0]) * 180) / Math.PI) % 360) + 360) % 360;
}

/**
 * Every root of f in [a, b] with g > 0, by sampling then bisection.
 *
 * See the header: this locates roots, it does not count them completely.
 * `samples` is stated at each call site so a case that needs a fine grid
 * says so rather than inheriting one.
 */
export function rootsExact(geom, Ldeg, a, b, { samples = 20000, aberrated = true } = {}) {
  const f = (t) => fExact(geom, t, Ldeg, aberrated);
  const out = [];
  let pt = a;
  let pv = f(a);
  for (let i = 1; i <= samples; i += 1) {
    const t = a + ((b - a) * i) / samples;
    const cv = f(t);
    if (pv !== 0 && cv !== 0 && Math.sign(cv) !== Math.sign(pv)) {
      let lo = pt;
      let hi = t;
      let flo = pv;
      for (let k = 0; k < 200; k += 1) {
        const m = (lo + hi) / 2;
        if (!(m > lo && m < hi)) break;
        const fm = f(m);
        if (Math.sign(fm) === Math.sign(flo)) { lo = m; flo = fm; } else hi = m;
      }
      const r = (lo + hi) / 2;
      if (gExact(geom, r, Ldeg, aberrated) > 0) out.push(r);
    }
    pt = t;
    pv = cv;
  }
  return out;
}

// ----------------------------------------------------------- geometries
/** An observer that does not move: the reduction case, where v = 0 exactly. */
export const AT_REST = {
  observer: () => [0, 0, 0],
  observerVel: () => [0, 0, 0],
};

/** A circular path in the ecliptic plane, with its analytic velocity. */
export function circle(radiusKm, periodSec, phase = 0) {
  const W = (2 * Math.PI) / periodSec;
  return {
    radiusKm,
    periodSec,
    W,
    at: (t) => atEclipticLongitude(W * t + phase, radiusKm),
    vel: (t) => {
      const s = radiusKm * W;
      const a = W * t + phase;
      return [-s * Math.sin(a), s * Math.cos(a) * CE, s * Math.cos(a) * SE];
    },
  };
}

/** Earth-like observer, Mars-like target: the geometry most cases use. */
export function heliocentricPair(opts = {}) {
  const {
    // Both phases default to a quarter turn so the geocentric longitude
    // sits near 90 degrees rather than near the 0/360 wrap. Nothing in the
    // operation wraps -- that is the point of searching a projection -- but
    // the REFERENCE reports a longitude in degrees, and a case whose truth
    // straddles the wrap is a case about the reference's bookkeeping.
    observerPhase = Math.PI / 2,
    targetPhase = Math.PI / 2,
    targetRadiusKm = 2.2794e8,
    targetPeriodDays = 686.98,
  } = opts;
  const obs = circle(1.495978707e8, 365.25 * DAY, observerPhase);
  const tgt = circle(targetRadiusKm, targetPeriodDays * DAY, targetPhase);
  return {
    target: tgt.at,
    observer: obs.at,
    observerVel: obs.vel,
    observerSpeedKmS: obs.radiusKm * obs.W,
    obs,
    tgt,
  };
}

/**
 * A close companion riding with the observer: a Moon-like body on a small
 * circle about an Earth-like one.
 *
 * The geocentric direction sweeps a full turn every `periodDays`, so a
 * window of a few periods crosses every longitude several times. That is
 * what the multiple-crossings family needs, and it needs it from a
 * geometry where aberration is undiminished: the transformation depends on
 * the OBSERVER's velocity alone, so a target 400,000 km away is aberrated
 * by the same twenty-odd arcseconds as one at 2 au, while its light-time is
 * a second and a third rather than eleven minutes.
 */
export function companionPair({ offsetKm = 4.0e5, offsetPeriodDays = 27.32, observerPhase = Math.PI / 2 } = {}) {
  const obs = circle(1.495978707e8, 365.25 * DAY, observerPhase);
  const off = circle(offsetKm, offsetPeriodDays * DAY, 0);
  return {
    target: (t) => {
      const a = obs.at(t);
      const b = off.at(t);
      return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
    },
    observer: obs.at,
    observerVel: obs.vel,
    observerSpeedKmS: obs.radiusKm * obs.W,
    obs,
    off,
  };
}

/**
 * A straight-line observer at a chosen fraction of c, with a stationary
 * target. For the domain family: `beta` at or above 1 must be refused, and
 * `beta` far above anything physical but still below 1 must still work.
 */
export function straightObserver(beta, directionDeg = 0) {
  const dir = atEclipticLongitude((directionDeg * Math.PI) / 180, 1);
  const speed = beta * C_KM_S;
  return {
    observer: (t) => [speed * t * dir[0], speed * t * dir[1], speed * t * dir[2]],
    observerVel: () => [speed * dir[0], speed * dir[1], speed * dir[2]],
    observerSpeedKmS: speed,
  };
}
