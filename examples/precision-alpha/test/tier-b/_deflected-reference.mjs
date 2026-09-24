/**
 * Tier B helper. The independent reference for the DEFLECTED of-date
 * crossing.
 *
 * `_of-date-reference.mjs` with one step inserted between light-time and
 * aberration: `eraLd` with `bm = 1`, at finite source distance, `e` and
 * `em` at reception and `q` at emission — the profile's model, written
 * here in plain doubles.
 *
 * Independent of the thing under test in three ways at once, which is what
 * makes it a reference rather than a second copy:
 *
 * * different CODE PATH — this file, not `deflection.mjs`;
 * * different ARITHMETIC — plain doubles, no intervals, no enclosures, no
 *   Chebyshev bounds, no subdivision;
 * * different DOMAIN — no elongation floor and no limiter gate. It answers
 *   everywhere the formula is defined, which is what lets the harness ask
 *   where the roots are inside a span the solver excluded.
 *
 * And the SAME MODEL, which section 3 of `DEFLECTION-EVALUATION.md`
 * requires: a reference differing by a model would make every disagreement
 * unattributable.
 *
 * ## Why the frame is imported and the deflection is not
 *
 * `ofDateMatrix` comes from the of-date reference unchanged. That rung is
 * already validated against a published matrix for its mean part and
 * against the released reducer for the rest, and writing a third copy here
 * would add a place for it to drift without adding independence: the frame
 * is not what this rung introduces. The deflection IS, so it is written
 * out.
 *
 * ## The limiter, and why there isn't one
 *
 * `eraLd` clamps `q.(q+e)` from below because the formula diverges on the
 * axis. This does not clamp, and instead refuses a separation below 1e-12
 * outright. Inside the supported domain `q.(q+e)` is about 3.8e-3 and the
 * question never arises; outside it, a reference that silently switched to
 * a clamped convention would be answering a different question from the
 * one the harness asked. `limited` is returned so a caller can see it
 * never fired.
 *
 * Its own completeness is only as good as its scan step, which the caller
 * declares with every answer. A matching count corroborates; it does not
 * prove nothing was missed between two samples.
 */
import { aberrate } from '../../src/core/aberration.mjs';
import { ofDateMatrix } from './_of-date-reference.mjs';

const C = 299792.458;
const DEG = Math.PI / 180;
const AU_KM = 1.495978707e8;
/** Schwarzschild radius of the Sun over the au, radians. ERFA_SRS. */
const SRS = 1.97412574336e-8;
/** Below this, `q.(q+e)` is refused rather than clamped. See the header. */
const MIN_QDQPE = 1e-12;

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
// `sqrt` of the sum of squares, never `Math.hypot`: the same rule the core
// holds to, for the same reason. The reference is compared against the
// solver bit by bit in places and an engine-dependent norm would put noise
// into that comparison.
const norm = (v) => Math.sqrt(dot(v, v));
const unit = (v) => { const n = norm(v); return [v[0] / n, v[1] / n, v[2] / n]; };

/**
 * `eraLd` with `bm = 1`, unclamped.
 *
 * @param {number[]} p     observer -> source, any length
 * @param {number[]} eVec  Sun -> observer at reception, km
 * @param {number[]} qVec  Sun -> source at emission, km
 */
export function deflectPlain(p, eVec, qVec) {
  const en = norm(eVec);
  const e = [eVec[0] / en, eVec[1] / en, eVec[2] / en];
  const q = unit(qVec);
  const emAu = en / AU_KM;
  const qdqpe = dot(q, [q[0] + e[0], q[1] + e[1], q[2] + e[2]]);
  if (!(qdqpe > MIN_QDQPE)) {
    return { p1: null, qdqpe, limited: true, why: `q.(q+e) is ${qdqpe}, at or below the ${MIN_QDQPE} this reference refuses rather than clamps` };
  }
  const w = SRS / emAu / qdqpe;
  const peq = cross(p, cross(e, q));
  return {
    p1: [p[0] + w * peq[0], p[1] + w * peq[1], p[2] + w * peq[2]],
    qdqpe,
    limited: false,
    deflectionArcsec: (Math.atan((w * norm(peq)) / norm(p)) * 180 * 3600) / Math.PI,
  };
}

export function makeDeflectedReference(eph) {
  const tBuf = new Float64Array(6);
  const oBuf = new Float64Array(6);
  const sBuf = new Float64Array(6);

  /** Light-time corrected, DEFLECTED, aberrated, rotated direction at t. */
  const direction = (body, t) => {
    eph.state('Earth', t, oBuf);
    const ox = oBuf[0]; const oy = oBuf[1]; const oz = oBuf[2];
    const v = [oBuf[3] / C, oBuf[4] / C, oBuf[5] / C];
    let x = 0;
    for (let i = 0; i < 200; i += 1) {
      eph.state(body, t - x, tBuf);
      const dx = tBuf[0] - ox; const dy = tBuf[1] - oy; const dz = tBuf[2] - oz;
      const next = Math.sqrt(dx * dx + dy * dy + dz * dz) / C;
      if (next === x) break;
      x = next;
    }
    eph.state(body, t - x, tBuf);
    const targetAtEmission = [tBuf[0], tBuf[1], tBuf[2]];
    const d = sub(targetAtEmission, [ox, oy, oz]);

    let p = d;
    let deflection = null;
    // The Sun does not deflect its own light, and the profile says so.
    // Matching the solver here is not a convenience: a reference that
    // deflected the Sun would disagree with it by a model.
    if (body !== 'Sun') {
      eph.state('Sun', t, sBuf);
      const eVec = sub([ox, oy, oz], [sBuf[0], sBuf[1], sBuf[2]]);
      eph.state('Sun', t - x, sBuf);
      const qVec = sub(targetAtEmission, [sBuf[0], sBuf[1], sBuf[2]]);
      deflection = deflectPlain(d, eVec, qVec);
      if (deflection.p1 === null) {
        return { v: null, tau: x, observerOverC: v, deflection, why: deflection.why };
      }
      p = deflection.p1;
      // The elongation, for the harness to classify a root's geometry
      // independently of the solver's own domain verdict.
      const toSun = [-eVec[0], -eVec[1], -eVec[2]];
      deflection.elongationDeg = (Math.atan2(norm(cross(toSun, d)), dot(toSun, d)) * 180) / Math.PI;
    }

    const u = aberrate(p, v);
    const M = ofDateMatrix(t);
    return {
      v: [0, 1, 2].map((i) => M[i][0] * u[0] + M[i][1] * u[1] + M[i][2] * u[2]),
      tau: x,
      observerOverC: v,
      deflection,
    };
  };

  const lonDeg = (body, t) => {
    const { v } = direction(body, t);
    if (v === null) return null;
    return ((Math.atan2(v[1], v[0]) / DEG) % 360 + 360) % 360;
  };
  const elongationDeg = (body, t) => direction(body, t).deflection?.elongationDeg ?? null;

  const f = (body, t, L) => {
    const { v } = direction(body, t);
    if (v === null) return null;
    return Math.sin(L * DEG) * v[0] - Math.cos(L * DEG) * v[1];
  };
  const g = (body, t, L) => {
    const { v } = direction(body, t);
    if (v === null) return null;
    return Math.cos(L * DEG) * v[0] + Math.sin(L * DEG) * v[1];
  };

  /**
   * Every crossing of longitude L in [a, b] with g > 0, by uniform scan
   * then bisection. Two roots closer than one step can be missed, and the
   * step is returned so the caller can say so.
   *
   * A sample the reference refuses (the axis, which the solver's domain
   * excludes long before) breaks the sign chain rather than being skipped:
   * it is counted and reported, because a scan that stepped over its own
   * refusals would claim coverage it does not have.
   */
  const crossings = (body, L, a, b, stepSec) => {
    const roots = [];
    let refusals = 0;
    let prevT = a;
    let prevF = f(body, a, L);
    const n = Math.ceil((b - a) / stepSec);
    let samples = 1;
    for (let i = 1; i <= n; i += 1) {
      const t = i === n ? b : a + i * stepSec;
      const cur = f(body, t, L);
      samples += 1;
      if (cur === null || prevF === null) {
        refusals += 1;
        prevT = t; prevF = cur;
        continue;
      }
      if (prevF === 0) {
        if (g(body, prevT, L) > 0) roots.push(prevT);
      } else if (Math.sign(cur) !== Math.sign(prevF) && cur !== 0) {
        let lo = prevT; let hi = t; let flo = prevF;
        for (let k = 0; k < 200; k += 1) {
          const m = (lo + hi) / 2;
          if (!(m > lo && m < hi)) break;
          const fm = f(body, m, L);
          if (fm === null) break;
          if (Math.sign(fm) === Math.sign(flo)) { lo = m; flo = fm; } else hi = m;
        }
        const r = (lo + hi) / 2;
        if (g(body, r, L) > 0) roots.push(r);
      }
      prevT = t; prevF = cur;
    }
    return { roots, samples, stepSec, refusals };
  };

  /**
   * The light-time corrected vector with NO deflection, for a caller that
   * needs to compare the two on the same footing. The holdout's T12 needs
   * it: the released reducer measures its deflection as the separation
   * between apparent-with and apparent-without, and both of those are
   * aberrated, so the comparison has to aberrate both of these too.
   */
  const undeflectedNatural = (body, t) => {
    eph.state('Earth', t, oBuf);
    const ox = oBuf[0]; const oy = oBuf[1]; const oz = oBuf[2];
    let x = 0;
    for (let i = 0; i < 200; i += 1) {
      eph.state(body, t - x, tBuf);
      const dx = tBuf[0] - ox; const dy = tBuf[1] - oy; const dz = tBuf[2] - oz;
      const next = Math.sqrt(dx * dx + dy * dy + dz * dz) / C;
      if (next === x) break;
      x = next;
    }
    eph.state(body, t - x, tBuf);
    return [tBuf[0] - ox, tBuf[1] - oy, tBuf[2] - oz];
  };

  return { direction, lonDeg, elongationDeg, f, g, crossings, deflectPlain, undeflectedNatural };
}
