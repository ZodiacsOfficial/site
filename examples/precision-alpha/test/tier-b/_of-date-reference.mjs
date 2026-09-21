/**
 * Tier B helper. The independent reference for the of-date crossing.
 *
 * `_aberrated-reference.mjs` with one addition: the frame, built from the
 * RELEASED reducer's own pieces — `frames.mjs` `pfw06` and `nutation.mjs`
 * `nut00b` + `adjustToP03`, evaluated with the host's `Math.sin` and
 * `Math.cos`.
 *
 * That is what makes it a reference rather than a second copy. It is
 * independent of the thing under test in three ways at once:
 *
 * * different CODE PATH — the released chain, not `frame-of-date.mjs`;
 * * different ARITHMETIC — plain doubles, no intervals, no enclosures, no
 *   Chebyshev bounds, no subdivision;
 * * different EVALUATION — `Math.sin`/`Math.cos`, not the validated
 *   Cody-Waite reduction of `src/core/trig.mjs`.
 *
 * And it is the SAME MODEL, which §3 of `OF-DATE-PREREGISTRATION.md`
 * requires: IAU 2006 precession with frame bias, IAU 2000B nutation in
 * longitude adjusted to P03. A 2000A reference would differ from the
 * solver by a model rather than by a defect, and the difference would be
 * unattributable.
 *
 * Its own completeness is only as good as its scan step, and the step is
 * declared by the caller with every answer. A matching count corroborates;
 * it does not prove that nothing was missed between two samples.
 */
import { aberrate } from '../../src/core/aberration.mjs';
import { pfw06, DAS2R } from '../../src/core/frames.mjs';
import { nut00b, adjustToP03 } from '../../src/core/nutation.mjs';
import { tdbMinusTt } from '../../src/core/reduce.mjs';

const C = 299792.458;
const DEG = Math.PI / 180;
const DAY = 86400;
const CENTURY_SEC = 36525 * DAY;

/**
 * The ICRS-to-ecliptic-of-date rotation at a TDB instant, as plain numbers.
 *
 *     R = R3(-(psib + dpsi)) . R1(phib) . R3(gamb)
 *
 * No `R1(-epsa)` and no `deps`: the obliquity rotation of `eraFw2m` meets
 * its inverse in the ecliptic projection and cancels exactly. Writing it
 * out and then undoing it would be the same matrix with more rounding, so
 * the reference does what the algebra says rather than imitating the
 * solver's bookkeeping.
 */
export function ofDateMatrix(tdbSec) {
  // The declared time model, matching the solver: the TDB-TT series
  // evaluated at TDB rather than TT, which costs 6e-13 s.
  const ttSec = tdbSec - tdbMinusTt(2451545.0 + tdbSec / DAY);
  const t = ttSec / CENTURY_SEC;
  const a = pfw06(t);
  const n = adjustToP03(nut00b(t), t);
  const psi = a.psib + n.dpsi * DAS2R;

  const cg = Math.cos(a.gamb); const sg = Math.sin(a.gamb);
  const cp = Math.cos(a.phib); const sp = Math.sin(a.phib);
  const cs = Math.cos(psi); const ss = Math.sin(psi);

  // R3(gamb)
  const G = [[cg, sg, 0], [-sg, cg, 0], [0, 0, 1]];
  // R1(phib)
  const P = [[1, 0, 0], [0, cp, sp], [0, -sp, cp]];
  // R3(-psi)
  const S = [[cs, -ss, 0], [ss, cs, 0], [0, 0, 1]];
  const mul = (A, B) => [0, 1, 2].map((i) => [0, 1, 2].map((j) => A[i][0] * B[0][j] + A[i][1] * B[1][j] + A[i][2] * B[2][j]));
  return mul(S, mul(P, G));
}

export function makeOfDateReference(eph) {
  const tBuf = new Float64Array(6);
  const oBuf = new Float64Array(6);

  /** The light-time-corrected, aberrated, ROTATED direction at t. */
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
    const d = [tBuf[0] - ox, tBuf[1] - oy, tBuf[2] - oz];
    const u = aberrate(d, v);
    const M = ofDateMatrix(t);
    return {
      v: [0, 1, 2].map((i) => M[i][0] * u[0] + M[i][1] * u[1] + M[i][2] * u[2]),
      tau: x,
      observerOverC: v,
    };
  };

  /**
   * Ecliptic longitude of date, degrees. No obliquity factor: the frame
   * already did that rotation, and applying it twice is the mistake the
   * separation exists to prevent.
   */
  const lonDeg = (body, t) => {
    const { v } = direction(body, t);
    return ((Math.atan2(v[1], v[0]) / DEG) % 360 + 360) % 360;
  };

  const f = (body, t, L) => {
    const { v } = direction(body, t);
    return Math.sin(L * DEG) * v[0] - Math.cos(L * DEG) * v[1];
  };
  const g = (body, t, L) => {
    const { v } = direction(body, t);
    return Math.cos(L * DEG) * v[0] + Math.sin(L * DEG) * v[1];
  };

  /**
   * Every crossing of longitude L in [a, b] with g > 0, by uniform scan
   * then bisection. Two roots closer than one step can be missed, and the
   * step is returned so the caller can say so.
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
      if (prevF === 0) {
        if (g(body, prevT, L) > 0) roots.push(prevT);
      } else if (Math.sign(cur) !== Math.sign(prevF) && cur !== 0) {
        let lo = prevT; let hi = t; let flo = prevF;
        for (let k = 0; k < 200; k += 1) {
          const m = (lo + hi) / 2;
          if (!(m > lo && m < hi)) break;
          const fm = f(body, m, L);
          if (Math.sign(fm) === Math.sign(flo)) { lo = m; flo = fm; } else hi = m;
        }
        const r = (lo + hi) / 2;
        if (g(body, r, L) > 0) roots.push(r);
      }
      prevT = t; prevF = cur;
    }
    return { roots, samples, stepSec };
  };

  return { direction, lonDeg, f, g, crossings, ofDateMatrix };
}
