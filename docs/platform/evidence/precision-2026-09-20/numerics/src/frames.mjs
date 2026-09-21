/**
 * Frame bias, IAU 2006 precession and IAU 2000A/B nutation as explicit
 * matrices, so each one can be switched on and off and its effect MEASURED
 * rather than asserted.
 *
 * Conventions follow the published IAU recipe (Wallace & Capitaine 2006;
 * IERS Conventions 2010, chapter 5) as expressed by ERFA's eraPfw06 / eraFw2m
 * / eraBi00.  The coefficient values are published constants, not fitted.
 *
 * Rotation convention, matching ERFA exactly:
 *   R1(a) = [[1,0,0],[0, cos a, sin a],[0,-sin a, cos a]]
 *   R3(a) = [[cos a, sin a, 0],[-sin a, cos a, 0],[0,0,1]]
 * and eraRz(a, r) means r := R3(a) * r.
 */
import { nut00a, nut00b, nutAstronomyEngine, meanObliquityArcsec, adjustToP03 } from './nutation.mjs';

const DAS2R = Math.PI / (180 * 3600);

export const mul = (a, b) => {
  const o = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i += 1) for (let j = 0; j < 3; j += 1) {
    o[i][j] = a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j];
  }
  return o;
};
export const apply = (m, v) => [
  m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
  m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
  m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
];
export const transpose = (m) => [[m[0][0], m[1][0], m[2][0]], [m[0][1], m[1][1], m[2][1]], [m[0][2], m[1][2], m[2][2]]];

const R1 = (a) => { const s = Math.sin(a); const c = Math.cos(a); return [[1, 0, 0], [0, c, s], [0, -s, c]]; };
const R2 = (a) => { const s = Math.sin(a); const c = Math.cos(a); return [[c, 0, -s], [0, 1, 0], [s, 0, c]]; };
const R3 = (a) => { const s = Math.sin(a); const c = Math.cos(a); return [[c, s, 0], [-s, c, 0], [0, 0, 1]]; };

/** Fukushima-Williams precession angles, IAU 2006 (bias included). Radians. */
export function pfw06(t) {
  const gamb = (-0.052928 + (10.556378 + (0.4932044 + (-0.00031238 + (-0.000002788 + 0.0000000260 * t) * t) * t) * t) * t) * DAS2R;
  const phib = (84381.412819 + (-46.811016 + (0.0511268 + (0.00053289 + (-0.000000440 + -0.0000000176 * t) * t) * t) * t) * t) * DAS2R;
  const psib = (-0.041775 + (5038.481484 + (1.5584175 + (-0.00018522 + (-0.000026452 + -0.0000000148 * t) * t) * t) * t) * t) * DAS2R;
  const epsa = meanObliquityArcsec(t) * DAS2R;
  return { gamb, phib, psib, epsa };
}

/** eraFw2m: R1(-eps) R3(-psi) R1(phib) R3(gamb). */
export function fw2m(gamb, phib, psi, eps) {
  return mul(R1(-eps), mul(R3(-psi), mul(R1(phib), R3(gamb))));
}

/**
 * IAU 2000 frame bias: ICRS/GCRS -> mean equator and equinox of J2000
 * (the dynamical frame VSOP87-based theories use).  Published values
 * (IERS Conventions): dpsi_bias = -0.041775", deps_bias = -0.0068192",
 * dRA0 = -0.0146".  eps0 = 84381.448" as in the published construction.
 */
const DPBIAS = -0.041775 * DAS2R;
const DEBIAS = -0.0068192 * DAS2R;
const DRA0 = -0.0146 * DAS2R;
const EPS0 = 84381.448 * DAS2R;
export const BIAS = mul(R1(-DEBIAS), mul(R2(DPBIAS * Math.sin(EPS0)), R3(DRA0)));
export const BIAS_INV = transpose(BIAS);

export const NUTATIONS = {
  /** the five-term series astronomy-engine 2.1.19 actually ships */
  ae: (t) => nutAstronomyEngine(t),
  /** published IAU 2000B, 77 luni-solar terms + planetary bias offsets */
  '2000b': (t) => adjustToP03(nut00b(t), t),
  /** published IAU 2000A, 678 luni-solar + 687 planetary terms */
  '2000a': (t) => adjustToP03(nut00a(t), t),
  /** no nutation at all, for isolating its size */
  none: () => ({ dpsi: 0, deps: 0 }),
};

/**
 * Matrix taking a vector to the TRUE equator and equinox of date.
 *
 * `bias: true`  — input is ICRF/GCRS (what a DE kernel gives).
 * `bias: false` — input is the dynamical mean equinox of J2000 (what a
 *                 VSOP87-based library such as astronomy-engine gives), so the
 *                 bias step is removed from the chain.
 */
export function npbMatrix(t, { nutation = '2000b', bias = true } = {}) {
  const nut = NUTATIONS[nutation](t);
  const { gamb, phib, psib, epsa } = pfw06(t);
  const npb = fw2m(gamb, phib, psib + nut.dpsi * DAS2R, epsa + nut.deps * DAS2R);
  return {
    matrix: bias ? npb : mul(npb, BIAS_INV),
    epsTrue: epsa + nut.deps * DAS2R,
    dpsiArcsec: nut.dpsi,
    depsArcsec: nut.deps,
  };
}

/** True equatorial of date -> ecliptic of date (rotate by the true obliquity). */
export function equToEcl(v, epsTrue) {
  const c = Math.cos(epsTrue);
  const s = Math.sin(epsTrue);
  return [v[0], v[1] * c + v[2] * s, -v[1] * s + v[2] * c];
}

export function eclipticLonLatDeg(v) {
  let lon = (Math.atan2(v[1], v[0]) * 180) / Math.PI;
  if (lon < 0) lon += 360;
  const lat = (Math.atan2(v[2], Math.hypot(v[0], v[1])) * 180) / Math.PI;
  return { lon, lat };
}
