/**
 * Tier B helper. The independent reference for the aberrated-longitude
 * crossing.
 *
 * `_retarded-reference.mjs` with two additions and nothing else: the
 * observer's VELOCITY, read from the same public `Ephemeris.state` buffer
 * the position comes from, and `aberrate` applied to the light-time
 * vector. It still shares nothing with the solver under test but the pack
 * reader -- no interval arithmetic, no enclosures, no Chebyshev bounds, no
 * weighted-sum machinery, no subdivision.
 *
 * It DOES share `aberrate`. That is deliberate and stated: section 1 of
 * ABERRATED-PREREGISTRATION.md defines the quantity as `aberrate` applied
 * to the light-time-corrected vector, and `aberrate` is settled against
 * ERFA and closed forms in `test/tier-a/aberration.nodetest.mjs`. What
 * this file independently measures is the SEARCH -- where the roots are,
 * how many there are, and whether an enclosure lost one.
 *
 * Its own completeness is only as good as its scan step, and the step is
 * declared by the caller with every answer rather than assumed away. It is
 * a measuring stick, not a proof.
 */
import { aberrate } from '../../src/core/aberration.mjs';

const C = 299792.458;
const DEG = Math.PI / 180;
const EPS0 = (84381.406 / 3600) * DEG;
const CE = Math.cos(EPS0);
const SE = Math.sin(EPS0);

export function makeAberratedReference(eph) {
  const tBuf = new Float64Array(6);
  const oBuf = new Float64Array(6);

  /**
   * The light-time vector and, on the aberrated rung, the proper
   * direction. One function for both rungs of the ladder, so the only
   * difference between them is the flag.
   */
  const direction = (body, t, aberrated) => {
    eph.state('Earth', t, oBuf);
    const ox = oBuf[0];
    const oy = oBuf[1];
    const oz = oBuf[2];
    // The observer's velocity at RECEPTION time, from the same read.
    const v = [oBuf[3] / C, oBuf[4] / C, oBuf[5] / C];
    let x = 0;
    for (let i = 0; i < 200; i += 1) {
      eph.state(body, t - x, tBuf);
      const dx = tBuf[0] - ox;
      const dy = tBuf[1] - oy;
      const dz = tBuf[2] - oz;
      const next = Math.sqrt(dx * dx + dy * dy + dz * dz) / C;
      if (next === x) break;
      x = next;
    }
    eph.state(body, t - x, tBuf);
    const d = [tBuf[0] - ox, tBuf[1] - oy, tBuf[2] - oz];
    return { v: aberrated ? aberrate(d, v) : d, tau: x, observerOverC: v };
  };

  const lonDeg = (body, t, aberrated) => {
    const { v } = direction(body, t, aberrated);
    return ((Math.atan2(CE * v[1] + SE * v[2], v[0]) / DEG) % 360 + 360) % 360;
  };

  const f = (body, t, L, aberrated) => {
    const { v } = direction(body, t, aberrated);
    return Math.sin(L * DEG) * v[0] - Math.cos(L * DEG) * (CE * v[1] + SE * v[2]);
  };
  const g = (body, t, L, aberrated) => {
    const { v } = direction(body, t, aberrated);
    return Math.cos(L * DEG) * v[0] + Math.sin(L * DEG) * (CE * v[1] + SE * v[2]);
  };

  /**
   * Every crossing of longitude L in [a, b] with g > 0, by uniform scan
   * plus bisection. Two roots closer than one step can be missed, and the
   * step is returned so the caller can say so.
   */
  const crossings = (body, L, a, b, stepSec, aberrated) => {
    const roots = [];
    let prevT = a;
    let prevF = f(body, a, L, aberrated);
    const n = Math.ceil((b - a) / stepSec);
    let samples = 1;
    for (let i = 1; i <= n; i += 1) {
      const t = i === n ? b : a + i * stepSec;
      const cur = f(body, t, L, aberrated);
      samples += 1;
      if (prevF === 0) {
        if (g(body, prevT, L, aberrated) > 0) roots.push(prevT);
      } else if (Math.sign(cur) !== Math.sign(prevF) && cur !== 0) {
        let lo = prevT;
        let hi = t;
        let flo = prevF;
        for (let k = 0; k < 200; k += 1) {
          const m = (lo + hi) / 2;
          if (!(m > lo && m < hi)) break;
          const fm = f(body, m, L, aberrated);
          if (Math.sign(fm) === Math.sign(flo)) { lo = m; flo = fm; } else hi = m;
        }
        const r = (lo + hi) / 2;
        // The requested direction, not the antipode. On the antipode
        // series this rejects every root f has, which is the point of it.
        if (g(body, r, L, aberrated) > 0) roots.push(r);
      }
      prevT = t;
      prevF = cur;
    }
    return { roots, samples, stepSec };
  };

  return { direction, lonDeg, f, g, crossings };
}
