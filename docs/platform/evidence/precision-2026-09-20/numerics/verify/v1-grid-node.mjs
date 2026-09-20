// Same as tools/t1-nutation-node.mjs but with the CORRECT JD for 2150-01-01.
import * as A from 'astronomy-engine';
import { nut00a, nut00b, nutAstronomyEngine, meanObliquityArcsec, adjustToP03 } from '../src/nutation.mjs';
const JD_START = 2396759.5;      // 1850-01-01 TT
const JD_END = 2506331.5;        // 2150-01-01 TT  (the published tool used 2469808.5 = 2050-01-01)
const STEP = 37.211;
const grid = [];
for (let jd = JD_START; jd <= JD_END; jd += STEP) grid.push(Number(jd.toFixed(6)));
const rows = grid.map((jdTt) => {
  const ttDays = jdTt - 2451545.0;
  const t = ttDays / 36525;
  const time = A.MakeTime(0);
  time.tt = ttDays; time.ut = ttDays;
  const tilt = A.e_tilt(time);
  return { jdTt, t,
    ae: { dpsi: tilt.dpsi, deps: tilt.deps, mobl: tilt.mobl, tobl: tilt.tobl },
    aeReimpl: nutAstronomyEngine(t),
    n2000a: nut00a(t), n2000b: nut00b(t),
    n2000aP03: adjustToP03(nut00a(t), t), n2000bP03: adjustToP03(nut00b(t), t),
    moblArcsec: meanObliquityArcsec(t) };
});
process.stdout.write(JSON.stringify({ grid: { jdStartTt: JD_START, jdEndTt: JD_END, stepDays: STEP, n: rows.length }, rows }) + '\n');
