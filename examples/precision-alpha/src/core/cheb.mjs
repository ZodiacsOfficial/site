/**
 * Chebyshev-series arithmetic, and the bounds that make a completeness
 * claim possible at all.
 *
 * The point of this file is `absSum`. For p(tau) = sum_k c_k T_k(tau) and
 * tau in [-1, 1], every |T_k| <= 1, so
 *
 *     max |p| <= sum_k |c_k|
 *
 * That is TRUE OF THE POLYNOMIAL, by construction. It is not a maximum
 * observed on a grid multiplied by a safety factor, and nothing about it
 * can be wrong because a sample landed badly. Applied to the coefficients
 * of p' and p'', it gives Lipschitz constants that close cells rigorously:
 *
 *     |p(x) - p(m)| <= max|p'| * |x - m|
 *
 * so if |p(m)| exceeds max|p'| times the half-width, the cell holds no
 * root. That single inequality is the difference between this mode and the
 * empirical one.
 *
 * Environment-neutral: no `node:` imports, no clock.
 */

/** Clenshaw. Same recurrence the evaluator uses, so the two agree. */
export function evalCheb(c, n, tau, offset = 0) {
  let b1 = 0;
  let b2 = 0;
  for (let k = n - 1; k >= 1; k -= 1) {
    const t = b1;
    b1 = 2 * tau * b1 - b2 + c[offset + k];
    b2 = t;
  }
  return tau * b1 - b2 + c[offset];
}

/**
 * Coefficients of dp/dtau, in the same basis.
 *
 * d_{n-1} = 0; d_{n-2} = 2(n-1) c_{n-1}; d_{k-1} = d_{k+1} + 2k c_k for
 * k = n-2..1; then halve d_0. The standard recurrence, and it is exact in
 * the sense that matters here: every operation is a sum of products of
 * stored values, so the only error is rounding, which is accounted for
 * separately.
 */
export function derivative(c, n, offset = 0) {
  const d = new Float64Array(Math.max(1, n));
  if (n < 2) return d;
  d[n - 1] = 0;
  if (n >= 2) d[n - 2] = 2 * (n - 1) * c[offset + n - 1];
  for (let k = n - 2; k >= 1; k -= 1) {
    d[k - 1] = (k + 1 < n ? d[k + 1] : 0) + 2 * k * c[offset + k];
  }
  d[0] /= 2;
  return d;
}

/** sum |c_k| — a true bound on |p| over [-1, 1]. */
export function absSum(c, n, offset = 0) {
  let s = 0;
  for (let k = 0; k < n; k += 1) s += Math.abs(c[offset + k]);
  return s;
}

/**
 * A conservative allowance for the rounding in one Clenshaw evaluation.
 *
 * This used to be `8 * n * u * sum|c_k|`, described as "of order n*u*
 * sum|c_k|, the factor of 8 is slack". It is not slack: it is short of the
 * worst case for roughly n > 4.
 *
 * The forward error of Clenshaw is sum_k eps_k T_k(tau), where eps_k is the
 * rounding injected at step k and is of order u * |b_k| with b_k the
 * partial sum. And b_k = sum_{j>=k} c_j U_{j-k}(tau), with |U_m(1)| = m+1,
 * so max|b_k| grows with n rather than staying at sum|c_k|. Measured, all
 * c_k = 1 at tau = 1 - 1e-12: max|b_k| / sum|c_k| is 3.50 at n = 8, 9.50 at
 * n = 20, 15.50 at n = 32, 31.50 at n = 64 -- exactly (n-1)/2. A few
 * roundings per step over n steps gives 4*n*u*max|b| = 2*n*(n-1)*u*sum|c|,
 * which at n = 20 is 760 u*sum|c| against the 160 u*sum|c| that was
 * declared.
 *
 * So: quadratic in n, with a factor of two over that derivation. Typical
 * errors are far below the worst case, but this is the only thing standing
 * between the exclusion test and a root just outside a cell, and the
 * completeness claim is stated as a theorem.
 */
export const UNIT_ROUNDOFF = Number.EPSILON / 2;
export function clenshawRoundoff(n, sumAbs) {
  const m = Math.max(1, n);
  return 4 * m * m * UNIT_ROUNDOFF * sumAbs;
}

/**
 * Everything one record of one component contributes: the series, its two
 * derivatives' true bounds, and the rounding allowance.
 */
export function seriesBounds(c, n, offset, radiusSec) {
  const d1 = derivative(c, n, offset);
  const d2 = derivative(d1, n, 0);
  const sum0 = absSum(c, n, offset);
  const sum1 = absSum(d1, n, 0);
  return {
    n,
    maxAbs: sum0,
    // d/dt = (d/dtau) / radius
    maxAbsFirst: sum1 / radiusSec,
    maxAbsSecond: absSum(d2, n, 0) / (radiusSec * radiusSec),
    roundoff: clenshawRoundoff(n, sum0),
    // The allowance on a SLOPE evaluation, in the slope's own units. The
    // monotone test used to borrow `roundoff` -- a position allowance in
    // km -- and compare it against a slope in km/s. Accidentally
    // conservative for day-length records, and inverted for short ones:
    // with the 1-second records LIMITS permits and 512 coefficients,
    // sum|d1|/radius runs about 2000x sum|c|, so the allowance used was
    // 2000x too small and a wrong monotone verdict could close a cell
    // holding two roots.
    roundoffFirst: clenshawRoundoff(n, sum1) / radiusSec,
    d1,
  };
}
