/*
 * For information beside rules 1b and 1h: the engine's end-to-end Placidus cusps (site
 * computeChart) against Swiss and against "ERFA cusps" (the engine's own placidusCusps run on
 * ERFA's RAMC and true obliquity, s19/erfa-inputs.json), by epoch, for grid A and ladder L; and
 * Swiss's cusps against the same ERFA cusps. Separates the engine's five-term nutation from
 * Swiss's long-term sidereal time (1800 and 2200 lie outside 1850-2050).
 *
 * Reads $WORK/s13/engine-grids.json, swiss-grids.json and $WORK/s19/erfa-inputs.json; prints
 * statistics (maxima by epoch).
 *
 *   node tools/s19/endtoend.mjs > $WORK/s19/endtoend.json
 */
import { readFileSync } from 'node:fs';
import { ENGINE, WORK } from '../lib/paths.mjs';

const O = WORK;
const math = await import(`${ENGINE}/dist/internal-math.js`);
const eng = JSON.parse(readFileSync(`${O}/s13/engine-grids.json`, 'utf8'));
const sw = JSON.parse(readFileSync(`${O}/s13/swiss-grids.json`, 'utf8'));
const er = JSON.parse(readFileSync(`${O}/s19/erfa-inputs.json`, 'utf8'));
const arcsec = (a, b) => Math.abs(((((a - b) % 360) + 540) % 360) - 180) * 3600;
const INTER = [1, 2, 4, 5, 7, 8, 10, 11];
const r3 = (x) => +x.toFixed(3);

const report = {};
for (const grid of ['A', 'L']) {
  const byYear = {};
  let erfaRefusedWhereEngineComputes = 0;
  eng[grid].forEach((e, i) => {
    const s = sw[grid][i];
    const [utc, lat, lon, ramc, eps] = er[grid][i];
    if (utc !== e.utc || lat !== e.lat) throw new Error('mismatch');
    if (s.status !== 0 || e.system !== 'placidus') return;
    const input = { gastHours: ramc / 15, latitude: lat, longitude: 0, obliquity: eps };
    const angles = math.computeAngles(input);
    const cusps = math.placidusCusps(input, angles);
    if (!cusps) { erfaRefusedWhereEngineComputes += 1; return; }
    const y = utc.slice(0, 4);
    const b = (byYear[y] ??= { n: 0, engSwiss_asc: 0, engSwiss_inter: 0, engErfa_asc: 0, engErfa_inter: 0, swissErfa_asc: 0, swissErfa_inter: 0 });
    b.n += 1;
    b.engSwiss_asc = Math.max(b.engSwiss_asc, arcsec(e.cusps[0], s.cusps[0]));
    b.engErfa_asc = Math.max(b.engErfa_asc, arcsec(e.cusps[0], cusps[0]));
    b.swissErfa_asc = Math.max(b.swissErfa_asc, arcsec(s.cusps[0], cusps[0]));
    for (const k of INTER) {
      b.engSwiss_inter = Math.max(b.engSwiss_inter, arcsec(e.cusps[k], s.cusps[k]));
      b.engErfa_inter = Math.max(b.engErfa_inter, arcsec(e.cusps[k], cusps[k]));
      b.swissErfa_inter = Math.max(b.swissErfa_inter, arcsec(s.cusps[k], cusps[k]));
    }
  });
  for (const b of Object.values(byYear)) for (const k of Object.keys(b)) if (k !== 'n') b[k] = r3(b[k]);
  const all = Object.values(byYear);
  report[grid] = {
    erfaRefusedWhereEngineComputes,
    overall: Object.fromEntries(['engSwiss_asc', 'engSwiss_inter', 'engErfa_asc', 'engErfa_inter', 'swissErfa_asc', 'swissErfa_inter']
      .map((k) => [k, Math.max(...all.map((b) => b[k]))])),
    byYear,
  };
}
console.log(JSON.stringify({
  what: 'max |difference| in arcsec: ASC (cusp 1) and the eight intermediate Placidus cusps; ERFA = engine placidusCusps on ERFA inputs',
  ...report,
}, null, 1));
