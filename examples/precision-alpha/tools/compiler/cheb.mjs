/**
 * Chebyshev fitting and evaluation, shared by the compiler and the runtime.
 *
 * Everything works in position/state VECTORS (km, km/s) in the kernel's own
 * J2000 equatorial frame. No angle is ever fitted, so there is no wrapped-angle
 * artifact to reason about; angles are formed only at the very end of the
 * reduction, from vectors.
 */

/** Chebyshev-Gauss nodes on [-1,1], descending, as the DCT-II convention wants. */
export function chebNodes(m) {
  const x = new Float64Array(m);
  for (let j = 0; j < m; j += 1) x[j] = Math.cos((Math.PI * (j + 0.5)) / m);
  return x;
}

/**
 * Coefficients of the degree-(m-1) Chebyshev interpolant through f at the m
 * Chebyshev-Gauss nodes. `f` is sampled as f[j] for node j.
 * Convention matches SPK type 2: p(tau) = sum_k c_k T_k(tau), c_0 NOT halved.
 */
export function chebFit(fvals, m) {
  const c = new Float64Array(m);
  for (let k = 0; k < m; k += 1) {
    let s = 0;
    for (let j = 0; j < m; j += 1) s += fvals[j] * Math.cos((Math.PI * k * (j + 0.5)) / m);
    c[k] = (2 / m) * s;
  }
  c[0] *= 0.5;
  return c;
}

/** Clenshaw evaluation of sum_k c_k T_k(tau) over c[off..off+n-1]. */
export function clenshaw(c, off, n, tau) {
  let b1 = 0; let b2 = 0;
  const t2 = 2 * tau;
  for (let k = n - 1; k >= 1; k -= 1) {
    const b0 = t2 * b1 - b2 + c[off + k];
    b2 = b1; b1 = b0;
  }
  return tau * b1 - b2 + c[off];
}

/** Clenshaw for value and d/dtau together. */
export function clenshawD(c, off, n, tau, out) {
  let b1 = 0; let b2 = 0; let d1 = 0; let d2 = 0;
  const t2 = 2 * tau;
  for (let k = n - 1; k >= 1; k -= 1) {
    const b0 = t2 * b1 - b2 + c[off + k];
    const d0 = t2 * d1 - d2 + 2 * b1;
    b2 = b1; b1 = b0; d2 = d1; d1 = d0;
  }
  out[0] = tau * b1 - b2 + c[off];
  out[1] = b1 + tau * d1 - d2;
  return out;
}
