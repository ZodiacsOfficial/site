/*
 * Independent re-count of rule 1b's grid numbers in JavaScript (compare13.py is the primary):
 * the rc.7 ASC/MC from engine-grids.json against Swiss (swiss-grids.json) and the committed ERFA
 * arbiter, with the audit's quantile convention, and the extra-vector counts under the rule as
 * written (5" vs Swiss) and under A1 (8" at 66; ERFA outside Swiss's 1850-01-01..2050-01-01 window).
 *
 * Reads $WORK/s13/engine-grids.json and swiss-grids.json and the committed arbiter; prints
 * statistics.
 *
 *   node tools/s13/crosscheck_js.mjs > $WORK/s13/crosscheck-js.json
 */
import { readFileSync } from 'node:fs';
import { SITE_ROOT, WORK } from '../lib/paths.mjs';

const O = WORK;
const eng = JSON.parse(readFileSync(`${O}/s13/engine-grids.json`, 'utf8')).A;
const sw = JSON.parse(readFileSync(`${O}/s13/swiss-grids.json`, 'utf8')).A;
const arb = JSON.parse(readFileSync(`${SITE_ROOT}/docs/platform/evidence/engine-beyond-swiss/corpora/angle-grid-erfa.json`, 'utf8')).A;
const arcsec = (a, b) => Math.abs(((((a - b) % 360) + 540) % 360) - 180) * 3600;
const stats = (values) => {
  const v = [...values].sort((a, b) => a - b);
  const q = (p) => v[Math.min(v.length - 1, Math.floor(p * (v.length - 1)))];
  return { n: v.length, p50: +q(0.5).toFixed(4), p95: +q(0.95).toFixed(4), max: +v[v.length - 1].toFixed(4) };
};
const T0 = 2396758.5; // 1850-01-01 0h UT
const T1 = 2469807.5; // 2050-01-01 0h UT
const rows = eng.map((e, i) => {
  const s = sw[i];
  if (s.utc !== e.utc || s.lat !== e.lat) throw new Error('row');
  return {
    lat: e.lat, inside: s.jd_ut > T0 && s.jd_ut < T1,
    sw: arcsec(e.asc, s.ascmc[0]), erfa: arcsec(e.asc, arb[i][0]),
    mcSw: arcsec(e.mc, s.ascmc[1]), mcErfa: arcsec(e.mc, arb[i][1]),
  };
});
const extra = rows.filter((r) => [63, 65, 66].includes(Math.abs(r.lat)));
console.log(JSON.stringify({
  ascVsSwiss: stats(rows.map((r) => r.sw)),
  mcVsSwiss: stats(rows.map((r) => r.mcSw)),
  ascVsErfa: stats(rows.map((r) => r.erfa)),
  ascVsErfaLat45: stats(rows.filter((r) => Math.abs(r.lat) <= 45).map((r) => r.erfa)),
  mcVsErfa: stats(rows.map((r) => r.mcErfa)),
  extraVectors: {
    n: extra.length,
    exceed5VsSwiss: extra.filter((r) => r.sw > 5).length,
    exceedA1: extra.filter((r) => (r.inside ? r.sw : r.erfa) > (Math.abs(r.lat) === 66 ? 8 : 5)).length,
  },
}, null, 1));
