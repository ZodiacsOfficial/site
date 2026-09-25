/*
 * For information beside rule 1b's extra vectors (grid A at ±63, ±65, ±66): do the midheaven and
 * the eight intermediate Placidus cusps also stay inside 5"? Against Swiss, and against "ERFA
 * cusps" (the engine's placidusCusps on ERFA's RAMC and true obliquity, s19/erfa-inputs.json).
 *
 * Reads $WORK/s13/engine-grids.json, swiss-grids.json and $WORK/s19/erfa-inputs.json; prints
 * statistics.
 *
 *   node tools/s13/extra_vectors_cusps.mjs > $WORK/s13/extra-vectors-cusps.json
 */
import { readFileSync } from 'node:fs';
import { ENGINE, WORK } from '../lib/paths.mjs';

const O = WORK;
const math = await import(`${ENGINE}/dist/internal-math.js`);
const eng = JSON.parse(readFileSync(`${O}/s13/engine-grids.json`, 'utf8')).A;
const sw = JSON.parse(readFileSync(`${O}/s13/swiss-grids.json`, 'utf8')).A;
const er = JSON.parse(readFileSync(`${O}/s19/erfa-inputs.json`, 'utf8')).A;
const arcsec = (a, b) => Math.abs(((((a - b) % 360) + 540) % 360) - 180) * 3600;
const INTER = [1, 2, 4, 5, 7, 8, 10, 11];
const T0 = 2396758.5;
const T1 = 2469807.5;
let n = 0;
let cuspSw5 = 0;
let cuspSw5Inside = 0;
let cuspErfa5 = 0;
let mcSw5 = 0;
let maxCuspErfa = 0;
let maxCuspSwInside = 0;
let maxCuspSwOutside = 0;
let maxMcSw = 0;
eng.forEach((e, i) => {
  if (![63, 65, 66].includes(Math.abs(e.lat))) return;
  n += 1;
  const s = sw[i];
  const [utc, lat, , ramc, eps] = er[i];
  if (utc !== e.utc || lat !== e.lat) throw new Error('row');
  const input = { gastHours: ramc / 15, latitude: lat, longitude: 0, obliquity: eps };
  const erfaCusps = math.placidusCusps(input, math.computeAngles(input));
  const dSw = Math.max(...INTER.map((k) => arcsec(e.cusps[k], s.cusps[k])));
  const dErfa = Math.max(...INTER.map((k) => arcsec(e.cusps[k], erfaCusps[k])));
  const inside = s.jd_ut > T0 && s.jd_ut < T1;
  const dMc = arcsec(e.mc, s.ascmc[1]);
  if (dSw > 5) { cuspSw5 += 1; if (inside) cuspSw5Inside += 1; }
  if (dErfa > 5) cuspErfa5 += 1;
  if (dMc > 5) mcSw5 += 1;
  maxCuspErfa = Math.max(maxCuspErfa, dErfa);
  maxMcSw = Math.max(maxMcSw, dMc);
  if (inside) maxCuspSwInside = Math.max(maxCuspSwInside, dSw);
  else maxCuspSwOutside = Math.max(maxCuspSwOutside, dSw);
});
console.log(JSON.stringify({
  n,
  intermediateCusps: {
    over5VsSwiss: cuspSw5, over5VsSwissInsideWindow: cuspSw5Inside, over5VsErfaCusps: cuspErfa5,
    maxVsSwissInsideWindow: +maxCuspSwInside.toFixed(3), maxVsSwissOutsideWindow: +maxCuspSwOutside.toFixed(3),
    maxVsErfaCusps: +maxCuspErfa.toFixed(3),
  },
  mc: { over5VsSwiss: mcSw5, maxVsSwiss: +maxMcSw.toFixed(3) },
}, null, 1));
