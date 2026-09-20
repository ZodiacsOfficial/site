/**
 * Analytic test functions with KNOWN root topology.
 *
 * Every case here supplies closed-form interval arithmetic for f' (and where
 * useful f''), so the search's completeness claims on these cases are
 * theorems, not observations: boundKind is 'proven' throughout. That is the
 * point of the suite -- completeness behaviour has to be testable without any
 * astronomical data in the way.
 *
 * Each case declares `truth` independently of the search.
 */

const TWO = () => [2, 2];

/** f(t) = t^2 + c, exact derivative interval arithmetic. */
const quadratic = (c) => ({
  f: (t) => t * t + c,
  fPrime: (t) => 2 * t,
  derivativeEnclosure: (u, v) => [2 * u, 2 * v],
  secondDerivativeEnclosure: TWO,
});

/** f(t) = sin(t) - c on a sub-interval of [0, pi/2], where cos is decreasing. */
const sineMinus = (c) => ({
  f: (t) => Math.sin(t) - c,
  fPrime: (t) => Math.cos(t),
  derivativeEnclosure: (u, v) => [Math.cos(v), Math.cos(u)],
  secondDerivativeEnclosure: (u, v) => [-Math.sin(v), -Math.sin(u)],
});

/** f(t) = t - c. */
const linear = (c) => ({
  f: (t) => t - c,
  fPrime: () => 1,
  derivativeEnclosure: () => [1, 1],
  secondDerivativeEnclosure: () => [0, 0],
});

/**
 * f(t) = (t^2 - s^2) * (t - 4), a cubic with three simple roots: -s, +s, 4.
 * Only -s and +s are inside the test interval. Derivative enclosure by
 * monotone interval arithmetic on the expanded polynomial derivative
 * 3t^2 - 8t - s^2 + ... -- done term by term so the enclosure is valid, not
 * merely tight.
 */
const twinRootsCubic = (s) => {
  // f(t) = t^3 - 4t^2 - s^2 t + 4 s^2
  // f'(t) = 3t^2 - 8t - s^2 ;  f''(t) = 6t - 8
  const sq = (u, v) => (u >= 0 ? [u * u, v * v] : v <= 0 ? [v * v, u * u] : [0, Math.max(u * u, v * v)]);
  return {
    f: (t) => (t * t - s * s) * (t - 4),
    fPrime: (t) => 3 * t * t - 8 * t - s * s,
    derivativeEnclosure: (u, v) => {
      const [lo, hi] = sq(u, v);
      return [3 * lo - 8 * v - s * s, 3 * hi - 8 * u - s * s];
    },
    secondDerivativeEnclosure: (u, v) => [6 * u - 8, 6 * v - 8],
  };
};

export const ANALYTIC_CASES = [
  {
    id: 'A-transversal-crossing',
    what: 'One simple transversal crossing on a monotone branch.',
    ...sineMinus(0.5),
    a: 0, b: 1.4, epsilon: 0, minWidth: 1e-12, exactArithmetic: true,
    truth: { verdict: 'crossing', rootCount: 1, rootsAt: [Math.asin(0.5)] },
  },
  {
    id: 'B-exact-tangency',
    what: 'f(t) = t^2 touches the level at t=0 without crossing. One non-transversal root.',
    ...quadratic(0),
    a: -1, b: 1, epsilon: 0, minWidth: 1e-12, exactArithmetic: true,
    truth: { verdict: 'stationary-touch', rootCount: 1, rootsAt: [0] },
  },
  {
    id: 'C-near-tangency-no-crossing',
    what: 'f(t) = t^2 + 1e-9 misses the level by 1e-9. No roots, and that is certifiable at epsilon 0.',
    ...quadratic(1e-9),
    a: -1, b: 1, epsilon: 0, minWidth: 1e-12, exactArithmetic: true,
    truth: { verdict: 'no-crossing', rootCount: 0, rootsAt: [] },
  },
  {
    id: 'C2-near-tangency-under-coarse-epsilon',
    what: 'The same near miss, but the caller declares epsilon = 1e-8, which is larger than the 1e-9 miss. The count is genuinely undecidable and must be refused.',
    ...quadratic(1e-9),
    a: -1, b: 1, epsilon: 1e-8, minWidth: 1e-12, exactArithmetic: true,
    truth: { verdict: 'unresolved-interval', rootCount: null, possibleRootCounts: [0, 1, 2] },
  },
  {
    id: 'D-two-very-close-roots',
    what: 'Roots at -1e-6 and +1e-6; the dip between them is only 1e-12 deep.',
    ...quadratic(-1e-12),
    a: -1, b: 1, epsilon: 0, minWidth: 1e-15, exactArithmetic: true,
    truth: { verdict: 'multiple-crossings', rootCount: 2, rootsAt: [-1e-6, 1e-6] },
  },
  {
    id: 'D2-two-very-close-roots-under-coarse-epsilon',
    what: 'The same pair, with epsilon = 1e-11 exceeding the 1e-12 dip. The pair cannot be certified and must not be reported as found.',
    ...quadratic(-1e-12),
    a: -1, b: 1, epsilon: 1e-11, minWidth: 1e-15, exactArithmetic: true,
    truth: { verdict: 'unresolved-interval', rootCount: null, possibleRootCounts: [0, 1, 2] },
  },
  {
    id: 'E-root-at-left-boundary',
    what: 'sin(t) on [0,1]: a root exactly on the left endpoint.',
    ...sineMinus(0),
    a: 0, b: 1, epsilon: 0, minWidth: 1e-12, exactArithmetic: true,
    truth: { verdict: 'boundary-event', rootCount: 1, rootsAt: [0] },
  },
  {
    id: 'E2-root-at-right-boundary',
    what: 't - 1 on [0,1]: a root exactly on the right endpoint.',
    ...linear(1),
    a: 0, b: 1, epsilon: 0, minWidth: 1e-12, exactArithmetic: true,
    truth: { verdict: 'boundary-event', rootCount: 1, rootsAt: [1] },
  },
  {
    id: 'F-two-well-separated-roots',
    what: 'A cubic with two well-separated simple roots inside the interval and a deep minimum between them.',
    ...twinRootsCubic(0.5),
    a: -1, b: 1, epsilon: 0, minWidth: 1e-12, exactArithmetic: true,
    truth: { verdict: 'multiple-crossings', rootCount: 2, rootsAt: [-0.5, 0.5] },
  },
  {
    id: 'G-budget-refusal',
    what: 'The same hard tangency with an evaluation limit far too small. The search must refuse, not guess.',
    ...quadratic(0),
    a: -1, b: 1, epsilon: 0, minWidth: 1e-15, exactArithmetic: true, maxEvaluations: 20,
    truth: { verdict: 'unresolved-interval', outcome: 'refused', rootCount: null },
  },
  {
    id: 'H-unbounded-ambiguity-without-curvature',
    what: 'An epsilon-ambiguous turning point with NO second-derivative enclosure supplied: the search cannot even bound how many roots hide in the open cell, and says so with possibleRootCounts null.',
    ...quadratic(1e-9),
    secondDerivativeEnclosure: null,
    fPrime: null,
    a: -1, b: 1, epsilon: 1e-8, minWidth: 1e-12, exactArithmetic: true,
    truth: { verdict: 'unresolved-interval', rootCount: null, possibleRootCounts: null },
  },
];
