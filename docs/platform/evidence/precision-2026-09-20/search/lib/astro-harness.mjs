/**
 * Wires a longitude backend into the bounded search.
 *
 * The search needs a derivative ENCLOSURE, not a derivative sample, and an
 * enclosure needs bounds on the next derivatives. Those bounds are measured
 * here on a declared grid and inflated by a declared safety factor. Measuring
 * them does not prove them: every verdict built on this harness therefore
 * carries boundKind 'empirical'. That label is the whole point -- a dense
 * scan's silence is not a bound, and calling a measured maximum a bound
 * without saying so is exactly the move this track is meant to avoid.
 */
import { circular, DAY_MS } from './backends.mjs';
import { empiricalDerivativeEnclosure, empiricalSecondDerivativeEnclosure } from './interval-search.mjs';

/** Double-precision resolution of a longitude near 32 degrees, in degrees. */
export const LONGITUDE_ULP = Number.EPSILON * 64;

/**
 * Measure |f''|, |f'''| and |f''''| on a uniform grid over [a,b] and return
 * inflated bounds. The inflation factor and the grid are both declared in the
 * returned record so a reader can see exactly what was and was not measured.
 */
export function measureDerivativeBounds({ f, a, b, samples = 400, h, safetyFactor = 10 }) {
  const step = (b - a) / samples;
  let maxD2 = 0, maxD3 = 0, maxD4 = 0;
  for (let i = 0; i <= samples; i += 1) {
    const t = Math.round(a + i * step);
    const tm2 = t - 2 * h, tm1 = t - h, tp1 = t + h, tp2 = t + 2 * h;
    const [ym2, ym1, y0, yp1, yp2] = [tm2, tm1, t, tp1, tp2].map(f);
    maxD2 = Math.max(maxD2, Math.abs((yp1 - 2 * y0 + ym1) / (h * h)));
    maxD3 = Math.max(maxD3, Math.abs((yp2 - 2 * yp1 + 2 * ym1 - ym2) / (2 * h * h * h)));
    maxD4 = Math.max(maxD4, Math.abs((yp2 - 4 * yp1 + 6 * y0 - 4 * ym1 + ym2) / (h * h * h * h)));
  }
  return {
    grid: { samples, stepMs: step, hMs: h },
    safetyFactor,
    measured: { maxAbsSecondDerivative: maxD2, maxAbsThirdDerivative: maxD3, maxAbsFourthDerivative: maxD4 },
    measuredPerDay: {
      secondDegPerDay2: maxD2 * DAY_MS * DAY_MS,
      thirdDegPerDay3: maxD3 * DAY_MS ** 3,
      fourthDegPerDay4: maxD4 * DAY_MS ** 4,
    },
    bounds: {
      secondDerivativeBound: maxD2 * safetyFactor,
      thirdDerivativeBound: maxD3 * safetyFactor,
      fourthDerivativeBound: maxD4 * safetyFactor,
    },
    provenance: 'measured on the declared grid, then multiplied by the declared safety factor. NOT a proven bound on the underlying function.',
  };
}

/**
 * Build everything `classifyInterval` needs for "longitude of `body` crosses
 * `targetDegrees`" on [aMs, bMs].
 *
 * @param {object} spec
 * @param {(body:string, ms:number)=>number} spec.lon
 * @param {string} spec.body
 * @param {number} spec.targetDegrees
 * @param {number} spec.aMs
 * @param {number} spec.bMs
 * @param {number} [spec.hMs] central-difference half-step
 * @param {number} [spec.safetyFactor]
 */
export function buildLevelProblem({
  lon, body, targetDegrees, aMs, bMs,
  hMs = 600_000, safetyFactor = 10, samples = 400,
  slopeGridSpacingMs = 86_400_000, slopeGridMaxSamples = 5,
  curvatureGridSpacingMs = 86_400_000, curvatureGridMaxSamples = 64,
}) {
  let calls = 0;
  const cache = new Map();
  const f = (ms) => {
    const t = Math.round(ms);
    if (cache.has(t)) return cache.get(t);
    calls += 1;
    const y = circular(lon(body, t), targetDegrees);
    cache.set(t, y);
    return y;
  };
  const bounds = measureDerivativeBounds({ f, a: aMs, b: bMs, samples, h: hMs, safetyFactor });
  const derivativeEnclosure = empiricalDerivativeEnclosure({
    h: hMs,
    secondDerivativeBound: bounds.bounds.secondDerivativeBound,
    thirdDerivativeBound: bounds.bounds.thirdDerivativeBound,
    roundoff: LONGITUDE_ULP,
    maxGridSpacing: slopeGridSpacingMs,
    maxSamples: slopeGridMaxSamples,
  });
  const secondDerivativeEnclosure = empiricalSecondDerivativeEnclosure({
    h: hMs,
    thirdDerivativeBound: bounds.bounds.thirdDerivativeBound,
    fourthDerivativeBound: bounds.bounds.fourthDerivativeBound,
    roundoff: LONGITUDE_ULP,
    maxGridSpacing: curvatureGridSpacingMs,
    maxSamples: curvatureGridMaxSamples,
  });
  return {
    f, derivativeEnclosure, secondDerivativeEnclosure, bounds,
    backendCalls: () => calls,
    a: aMs, b: bMs,
    settings: { hMs, safetyFactor, samples, slopeGridSpacingMs, slopeGridMaxSamples, curvatureGridSpacingMs, curvatureGridMaxSamples },
  };
}

/**
 * Locate a turning point of the longitude by bisection on a central-difference
 * derivative, and report the extreme value with an explicit bound on how much
 * the reported value can be wrong because the located instant is not exact.
 *
 * The second-order term is the point: at a turning point the value error from
 * a timing error dt is |f''|*dt^2/2, NOT |f'|*dt. A millisecond of timing slop
 * at a Uranus station is worth about 1e-20 degrees.
 */
export function locateTurningPoint({ f, fromMs, toMs, hMs = 600_000, secondDerivativeBound }) {
  const d = (t) => (f(t + hMs) - f(t - hMs)) / (2 * hMs);
  let lo = Math.round(fromMs), hi = Math.round(toMs);
  let dlo = d(lo), dhi = d(hi);
  if (dlo * dhi >= 0) return { found: false, why: 'no derivative sign change in the requested span', dlo, dhi };
  let iterations = 0;
  while (hi - lo > 1 && iterations < 80) {
    const mid = Math.floor((lo + hi) / 2);
    if (mid <= lo || mid >= hi) break;
    const dm = d(mid);
    if (dm === 0) { lo = mid; hi = mid; break; }
    if ((dm < 0) === (dlo < 0)) { lo = mid; dlo = dm; } else { hi = mid; dhi = dm; }
    iterations += 1;
  }
  const t = Math.round((lo + hi) / 2);
  const residualMs = hi - lo;
  return {
    found: true, tMs: t, value: f(t),
    residualMs,
    kind: d(t - 10 * DAY_MS) < 0 ? 'minimum' : 'maximum',
    valueErrorFromTiming: secondDerivativeBound * residualMs * residualMs / 2,
    valueErrorNote: "second order: |f''|*dt^2/2 at a turning point, never |f'|*dt",
    iterations,
  };
}
