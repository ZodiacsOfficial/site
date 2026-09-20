/**
 * IAU 2000B nutation from the PUBLISHED series, plus the two comparators the
 * measurement harness needs.  Environment-neutral: no `node:` imports, no
 * filesystem, no `Buffer`.  The 77-term table lives in
 * `./nutation-series-2000b.mjs` as source, so this module loads identically in
 * a browser, a worker and Node.
 *
 * Provenance of the coefficients: see `PROVENANCE` in the series module —
 * ERFA (liberfa) `src/nut00b.c`, BSD-3-Clause, derived with permission from
 * IAU SOFA; the series itself is McCarthy & Luzum (2003), the 77-term
 * truncation of MHB2000 (Mathews, Herring & Buffett 2002).  Nothing here is
 * derived from Swiss Ephemeris code, data or output.
 *
 * IAU 2000A is deliberately NOT carried into the alpha runtime.  Measured on
 * this corpus it moves the apparent longitude by at most 0.0025" (max over
 * 1800-2100, dpsi difference times cos(epsA)), which is
 * below the 0.0107" agreement floor the four-configuration measurement
 * reports, and it costs 17x the table.  The research copy at
 * docs/platform/evidence/precision-2026-09-20/numerics/src/nutation.mjs keeps
 * 2000A for that comparison; it is not part of this contract.
 *
 * Angles in: Julian centuries of TT since J2000.0.  Angles out: ARCSECONDS.
 */
import { NUT00B_LUNISOLAR, PROVENANCE } from './nutation-series-2000b.mjs';

export const SERIES_PROVENANCE = PROVENANCE;

const TURNAS = 1296000.0;               // arcseconds in a full circle
const DAS2R = Math.PI / (180 * 3600);   // arcseconds -> radians
const D2PI = 2 * Math.PI;
/** table units are 0.1 microarcsecond */
const U2A = 1e-7;

const XB = NUT00B_LUNISOLAR;

if (XB.length !== 77) throw new Error(`IAU2000B must have 77 terms, got ${XB.length}`);

/** Planetary-bias offsets of the 2000B model, arcsec (Luzum 2001 "rigorous" values). */
const DPPLAN_B = -0.000135;
const DEPLAN_B = +0.000388;

const fmod = (x, y) => x % y;
const arcsecArg = (a) => fmod(a, TURNAS) * DAS2R;

/**
 * IAU 2000B nutation, arcseconds.
 * Delaunay arguments: linear (Simon et al. 1994), exactly as the published
 * 2000B model specifies — the higher-order terms belong to 2000A.
 */
export function nut00b(t) {
  const el = arcsecArg(485868.249036 + 1717915923.2178 * t);
  const elp = arcsecArg(1287104.79305 + 129596581.0481 * t);
  const f = arcsecArg(335779.526232 + 1739527262.8478 * t);
  const d = arcsecArg(1072260.70369 + 1602961601.2090 * t);
  const om = arcsecArg(450160.398036 - 6962890.5431 * t);

  let dp = 0;
  let de = 0;
  // Smallest terms first, as the published algorithm prescribes, so the
  // summation does not lose the small amplitudes to rounding.
  for (let i = XB.length - 1; i >= 0; i -= 1) {
    const r = XB[i];
    const arg = fmod(r[0] * el + r[1] * elp + r[2] * f + r[3] * d + r[4] * om, D2PI);
    const s = Math.sin(arg);
    const c = Math.cos(arg);
    dp += (r[5] + r[6] * t) * s + r[7] * c;
    de += (r[8] + r[9] * t) * c + r[10] * s;
  }
  return { dpsi: dp * U2A + DPPLAN_B, deps: de * U2A + DEPLAN_B };
}

/**
 * The FIVE-term series astronomy-engine 2.1.19 actually ships as `iau2000b`,
 * reimplemented here so the truncation can be MEASURED against the real
 * 77-term model without monkey-patching the library.  Read out of
 * node_modules/astronomy-engine/esm/astronomy.js, function iau2000b.
 *
 * This is a measurement comparator, not part of the runtime's supported
 * contract: the alpha's reduction always uses `nut00b`.
 */
export function nutAstronomyEngine(t) {
  const m = (x) => fmod(x, TURNAS) * DAS2R;
  const elp = m(1287104.79305 + t * 129596581.0481);
  const f = m(335779.526232 + t * 1739527262.8478);
  const d = m(1072260.70369 + t * 1602961601.2090);
  const om = m(450160.398036 - t * 6962890.5431);
  let sarg = Math.sin(om);
  let carg = Math.cos(om);
  let dp = (-172064161.0 - 174666.0 * t) * sarg + 33386.0 * carg;
  let de = (92052331.0 + 9086.0 * t) * carg + 15377.0 * sarg;
  let arg = 2.0 * (f - d + om);
  sarg = Math.sin(arg); carg = Math.cos(arg);
  dp += (-13170906.0 - 1675.0 * t) * sarg - 13696.0 * carg;
  de += (5730336.0 - 3015.0 * t) * carg - 4587.0 * sarg;
  arg = 2.0 * (f + om);
  sarg = Math.sin(arg); carg = Math.cos(arg);
  dp += (-2276413.0 - 234.0 * t) * sarg + 2796.0 * carg;
  de += (978459.0 - 485.0 * t) * carg + 1374.0 * sarg;
  arg = 2.0 * om;
  sarg = Math.sin(arg); carg = Math.cos(arg);
  dp += (2074554.0 + 207.0 * t) * sarg - 698.0 * carg;
  de += (-897492.0 + 470.0 * t) * carg - 291.0 * sarg;
  sarg = Math.sin(elp); carg = Math.cos(elp);
  dp += (1475877.0 - 3633.0 * t) * sarg + 11817.0 * carg;
  de += (73871.0 - 184.0 * t) * carg - 1924.0 * sarg;
  return { dpsi: DPPLAN_B + dp * U2A, deps: DEPLAN_B + de * U2A };
}

/** IAU 2006 (P03) mean obliquity of the ecliptic, arcseconds. */
export function meanObliquityArcsec(t) {
  return ((((-0.0000000434 * t - 0.000000576) * t + 0.00200340) * t - 0.0001831) * t - 46.836769) * t + 84381.406;
}

/**
 * The P03 adjustment that makes an IAU 2000 nutation consistent with IAU 2006
 * precession (Wallace & Capitaine 2006, Eqs. 5).  Relative, and tiny:
 * ~8 microarcsec on dpsi.  Applied so the model is the one it claims to be.
 */
export function adjustToP03(nut, t) {
  const fj2 = -2.7774e-6 * t;
  return {
    dpsi: nut.dpsi + nut.dpsi * (0.4697e-6 + fj2),
    deps: nut.deps + nut.deps * fj2,
  };
}
