/**
 * IAU 2000A and IAU 2000B nutation, implemented from the PUBLISHED series.
 *
 * Provenance of the coefficients: parsed by `tools/parse-erfa-tables.py` out
 * of ERFA (liberfa) `src/nut00a.c` and `src/nut00b.c`, BSD-3-Clause, itself
 * derived with permission from IAU SOFA.  The series is MHB2000 (Mathews,
 * Herring & Buffett 2002) for 2000A and McCarthy & Luzum (2003) for the 77-term
 * 2000B truncation.  Nothing here is derived from Swiss Ephemeris code, data
 * or output; Swiss appears in this laboratory only as a measuring instrument.
 *
 * Term counts, checked at load: 2000B = 77 luni-solar; 2000A = 678 luni-solar
 * + 687 planetary = 1365.
 *
 * Angles in, Julian centuries of TT since J2000.0.  Angles out, ARCSECONDS.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SERIES = JSON.parse(readFileSync(fileURLToPath(new URL('./nutation-series.json', import.meta.url)), 'utf8'));

export const SERIES_PROVENANCE = SERIES.provenance;

const TURNAS = 1296000.0;               // arcseconds in a full circle
const DAS2R = Math.PI / (180 * 3600);   // arcseconds -> radians
const D2PI = 2 * Math.PI;
/** table units are 0.1 microarcsecond */
const U2A = 1e-7;

const XB = SERIES.nut00b_luniSolar.rows;
const XLS = SERIES.nut00a_luniSolar.rows;
const XPL = SERIES.nut00a_planetary.rows;

if (XB.length !== 77) throw new Error(`IAU2000B must have 77 terms, got ${XB.length}`);
if (XLS.length !== 678) throw new Error(`IAU2000A luni-solar must have 678 terms, got ${XLS.length}`);
if (XPL.length !== 687) throw new Error(`IAU2000A planetary must have 687 terms, got ${XPL.length}`);

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

/** IAU 2000A nutation, arcseconds. 678 luni-solar + 687 planetary terms. */
export function nut00a(t) {
  // Luni-solar: IERS 2003 / MHB2000 arguments, with the higher-order terms.
  const el = arcsecArg(485868.249036 + t * (1717915923.2178 + t * (31.8792 + t * (0.051635 + t * -0.00024470))));
  const elp = arcsecArg(1287104.79305 + t * (129596581.0481 + t * (-0.5532 + t * (0.000136 + t * -0.00001149))));
  const f = arcsecArg(335779.526232 + t * (1739527262.8478 + t * (-12.7512 + t * (-0.001037 + t * 0.00000417))));
  const d = arcsecArg(1072260.70369 + t * (1602961601.2090 + t * (-6.3706 + t * (0.006593 + t * -0.00003169))));
  const om = arcsecArg(450160.398036 + t * (-6962890.5431 + t * (7.4722 + t * (0.007702 + t * -0.00005939))));

  let dp = 0;
  let de = 0;
  for (let i = XLS.length - 1; i >= 0; i -= 1) {
    const r = XLS[i];
    const arg = fmod(r[0] * el + r[1] * elp + r[2] * f + r[3] * d + r[4] * om, D2PI);
    const s = Math.sin(arg);
    const c = Math.cos(arg);
    dp += (r[5] + r[6] * t) * s + r[7] * c;
    de += (r[8] + r[9] * t) * c + r[10] * s;
  }
  const dpsils = dp * U2A;
  const depsls = de * U2A;

  // Planetary: MHB2000 uses its own slightly different Delaunay arguments here.
  const al = fmod(2.35555598 + 8328.6914269554 * t, D2PI);
  const af = fmod(1.627905234 + 8433.466158131 * t, D2PI);
  const ad = fmod(5.198466741 + 7771.3771468121 * t, D2PI);
  const aom = fmod(2.18243920 - 33.757045 * t, D2PI);
  const apa = (0.024381750 + 0.00000538691 * t) * t;
  const alme = fmod(4.402608842 + 2608.7903141574 * t, D2PI);
  const alve = fmod(3.176146697 + 1021.3285546211 * t, D2PI);
  const alea = fmod(1.753470314 + 628.3075849991 * t, D2PI);
  const alma = fmod(6.203480913 + 334.0612426700 * t, D2PI);
  const alju = fmod(0.599546497 + 52.9690962641 * t, D2PI);
  const alsa = fmod(0.874016757 + 21.3299104960 * t, D2PI);
  const alur = fmod(5.481293872 + 7.4781598567 * t, D2PI);
  const alne = fmod(5.321159000 + 3.8127774000 * t, D2PI);

  dp = 0;
  de = 0;
  for (let i = XPL.length - 1; i >= 0; i -= 1) {
    const r = XPL[i];
    const arg = fmod(
      r[0] * al + r[1] * af + r[2] * ad + r[3] * aom + r[4] * alme + r[5] * alve
      + r[6] * alea + r[7] * alma + r[8] * alju + r[9] * alsa + r[10] * alur
      + r[11] * alne + r[12] * apa,
      D2PI,
    );
    const s = Math.sin(arg);
    const c = Math.cos(arg);
    dp += r[13] * s + r[14] * c;
    de += r[16] * c + r[15] * s;
  }
  return { dpsi: dpsils + dp * U2A, deps: depsls + de * U2A };
}

/**
 * The FIVE-term series astronomy-engine 2.1.19 actually ships as `iau2000b`,
 * reimplemented here so the truncation can be measured against the real 77-term
 * model without monkey-patching the library.  Read out of
 * node_modules/astronomy-engine/esm/astronomy.js, function iau2000b.
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
  return { dpsi: -0.000135 + dp * 1.0e-7, deps: +0.000388 + de * 1.0e-7 };
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
