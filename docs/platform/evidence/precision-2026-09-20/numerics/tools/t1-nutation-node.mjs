/**
 * Emits, for a grid of TT instants, the nutation each model gives.
 *
 *   node t1-nutation-node.mjs > raw/t1-node.json
 *
 * The grid is in TT Julian Date so that NOTHING in this comparison depends on
 * Delta-T: both sides are asked the same question about the same instant on
 * the same time scale.  What is left is the nutation model and nothing else.
 */
import * as A from 'astronomy-engine';
import { nut00a, nut00b, nutAstronomyEngine, meanObliquityArcsec, adjustToP03, SERIES_PROVENANCE } from '../src/nutation.mjs';

/** 1850-01-01 .. 2150-01-01, stepped by a period that is coprime with the
 *  18.6-year nutation cycle and the 1-year and 27.55-day cycles, so the sample
 *  does not alias onto one phase of the series. */
const JD_START = 2396759.5;      // 1850-01-01 TT
const JD_END = 2469808.5;        // 2150-01-01 TT
const STEP = 37.211;             // days
const grid = [];
for (let jd = JD_START; jd <= JD_END; jd += STEP) grid.push(Number(jd.toFixed(6)));

const rows = grid.map((jdTt) => {
  const ttDays = jdTt - 2451545.0;
  const t = ttDays / 36525;
  const time = A.MakeTime(0);
  time.tt = ttDays;
  time.ut = ttDays;            // unused by e_tilt; set for determinism
  const tilt = A.e_tilt(time);
  const a = adjustToP03(nut00a(t), t);
  const b = adjustToP03(nut00b(t), t);
  const araw = nut00a(t);
  const braw = nut00b(t);
  const ae = nutAstronomyEngine(t);
  return {
    jdTt,
    t,
    ae: { dpsi: tilt.dpsi, deps: tilt.deps, mobl: tilt.mobl, tobl: tilt.tobl },
    aeReimpl: { dpsi: ae.dpsi, deps: ae.deps },
    n2000a: { dpsi: araw.dpsi, deps: araw.deps },
    n2000b: { dpsi: braw.dpsi, deps: braw.deps },
    n2000aP03: { dpsi: a.dpsi, deps: a.deps },
    n2000bP03: { dpsi: b.dpsi, deps: b.deps },
    moblArcsec: meanObliquityArcsec(t),
  };
});

process.stdout.write(`${JSON.stringify({
  what: 'nutation in longitude and obliquity from four models on one TT grid',
  astronomyEngine: '2.1.19',
  seriesProvenance: SERIES_PROVENANCE,
  grid: { jdStartTt: JD_START, jdEndTt: JD_END, stepDays: STEP, n: rows.length },
  rows,
})}\n`);
