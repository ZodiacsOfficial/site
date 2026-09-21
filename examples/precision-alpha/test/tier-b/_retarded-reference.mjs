/**
 * Tier B helper. An independent reference for the retarded-longitude
 * crossing, written plainly.
 *
 * It shares NOTHING with the solver under test but the pack reader: no
 * interval arithmetic, no enclosures, no Chebyshev bounds, no weighted-sum
 * machinery from retarded.mjs. Positions come through the public
 * `Ephemeris.state`, the light-time is a bare fixed-point iteration, and
 * the roots come from a uniform scan plus bisection.
 *
 * Its completeness is only as good as its scan step, and that is stated
 * with every answer rather than assumed away. It is a measuring stick, not
 * a proof — the proof is the thing being measured.
 */
const C = 299792.458;
const DEG = Math.PI / 180;
const EPS0 = (84381.406 / 3600) * DEG;
const CE = Math.cos(EPS0);
const SE = Math.sin(EPS0);

export function makeReference(eph) {
  const tBuf = new Float64Array(6);
  const oBuf = new Float64Array(6);

  /** tau at reception time t: plain iteration to a fixed point. */
  const tau = (body, t) => {
    eph.state('Earth', t, oBuf);
    const ox = oBuf[0], oy = oBuf[1], oz = oBuf[2];
    let x = 0;
    for (let i = 0; i < 200; i += 1) {
      eph.state(body, t - x, tBuf);
      const dx = tBuf[0] - ox, dy = tBuf[1] - oy, dz = tBuf[2] - oz;
      x = Math.sqrt(dx * dx + dy * dy + dz * dz) / C;
    }
    return x;
  };

  /** The light-time-corrected geocentric vector at reception time t. */
  const d = (body, t) => {
    const x = tau(body, t);
    eph.state('Earth', t, oBuf);
    const ox = oBuf[0], oy = oBuf[1], oz = oBuf[2];
    eph.state(body, t - x, tBuf);
    return { v: [tBuf[0] - ox, tBuf[1] - oy, tBuf[2] - oz], tau: x };
  };

  /** Ecliptic longitude in degrees, from the same J2000 obliquity. */
  const lonDeg = (body, t) => {
    const { v } = d(body, t);
    const yE = CE * v[1] + SE * v[2];
    return ((Math.atan2(yE, v[0]) / DEG) % 360 + 360) % 360;
  };

  const f = (body, t, L) => {
    const { v } = d(body, t);
    return Math.sin(L * DEG) * v[0] - Math.cos(L * DEG) * (CE * v[1] + SE * v[2]);
  };
  const g = (body, t, L) => {
    const { v } = d(body, t);
    return Math.cos(L * DEG) * v[0] + Math.sin(L * DEG) * (CE * v[1] + SE * v[2]);
  };

  /**
   * Every crossing of longitude L in [a, b], by uniform scan plus bisection.
   * `stepSec` is the honesty limit: two roots closer than one step can be
   * missed, and the caller is told the step so it can say so.
   */
  const crossings = (body, L, a, b, stepSec) => {
    const roots = [];
    let prevT = a;
    let prevF = f(body, a, L);
    const n = Math.ceil((b - a) / stepSec);
    let samples = 1;
    for (let i = 1; i <= n; i += 1) {
      const t = i === n ? b : a + i * stepSec;
      const cur = f(body, t, L);
      samples += 1;
      if (prevF === 0) { if (g(body, prevT, L) > 0) roots.push(prevT); }
      else if (Math.sign(cur) !== Math.sign(prevF) && cur !== 0) {
        let lo = prevT, hi = t, flo = prevF;
        for (let k = 0; k < 200; k += 1) {
          const m = (lo + hi) / 2;
          if (!(m > lo && m < hi)) break;
          const fm = f(body, m, L);
          if (Math.sign(fm) === Math.sign(flo)) { lo = m; flo = fm; } else hi = m;
        }
        const r = (lo + hi) / 2;
        if (g(body, r, L) > 0) roots.push(r);       // the requested direction, not the antipode
      }
      prevT = t; prevF = cur;
    }
    return { roots, samples, stepSec };
  };

  return { tau, d, lonDeg, f, g, crossings };
}
