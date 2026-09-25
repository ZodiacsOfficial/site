// Step 1.8, supplementary (not the shipped path): A3's second claim, that the state-vector
// route rule 1g's change column names ("Moon speed from GeoMoonState velocity") leaves the
// same excess over Swiss as the shipped derivative of the reported longitude. The Moon's
// ecliptic-of-date longitude rate from astronomy-engine 2.1.19's GeoMoonState velocity,
// rotated EQJ -> ECT, with and without the rotation's own rate (the planners' candidate.mjs
// moonStateSpeed), at the same samples as moon-engine.json, against Swiss at the same TT.
// Reads $WORK/s18/moon-engine.json and moon-swiss.json and the installed astronomy-engine;
// writes $WORK/s18/state-route.json (statistics) and prints it.
//   node tools/s18/state_route.mjs
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { SITE_ROOT, outDir } from '../lib/paths.mjs';

const OUT = outDir('s18');
const require = createRequire(`${SITE_ROOT}/package.json`);
const A = require('astronomy-engine');
const DAY = 86_400_000;

function moonStateSpeed(date, withFrameRate) {
  const t = A.MakeTime(date);
  const st = A.GeoMoonState(t);
  const R = A.Rotation_EQJ_ECT(t).rot;
  const rot = (M, v) => [0, 1, 2].map((i) => M[0][i] * v[0] + M[1][i] * v[1] + M[2][i] * v[2]);
  const r = rot(R, [st.x, st.y, st.z]);
  const v = rot(R, [st.vx, st.vy, st.vz]);
  if (withFrameRate) {
    const h = 0.01;
    const Rp = A.Rotation_EQJ_ECT(A.MakeTime(new Date(date.getTime() + h * DAY))).rot;
    const Rm = A.Rotation_EQJ_ECT(A.MakeTime(new Date(date.getTime() - h * DAY))).rot;
    const dR = [0, 1, 2].map((i) => [0, 1, 2].map((j) => (Rp[i][j] - Rm[i][j]) / (2 * h)));
    const extra = rot(dR, [st.x, st.y, st.z]);
    for (let k = 0; k < 3; k += 1) v[k] += extra[k];
  }
  return ((r[0] * v[1] - r[1] * v[0]) / (r[0] * r[0] + r[1] * r[1])) * (180 / Math.PI);
}

const eng = JSON.parse(fs.readFileSync(OUT + 'moon-engine.json', 'utf8'));
const sw = JSON.parse(fs.readFileSync(OUT + 'moon-swiss.json', 'utf8'));
const out = {};
for (const set of ['swissApsides', 'a3']) {
  const acc = { withFrameRate: [], noFrameRate: [], shipped: [] };
  eng.samples.forEach((s, i) => {
    if (s.set !== set || !sw.rows[i]) return;
    const date = new Date(s.utc);
    acc.withFrameRate.push(Math.abs(moonStateSpeed(date, true) - sw.rows[i].speedTT) * 3600);
    acc.noFrameRate.push(Math.abs(moonStateSpeed(date, false) - sw.rows[i].speedTT) * 3600);
    acc.shipped.push(Math.abs(s.engineSpeed - sw.rows[i].speedTT) * 3600);
  });
  out[set] = Object.fromEntries(Object.entries(acc).map(([k, v]) => [k, { n: v.length, max: +Math.max(...v).toFixed(4), over1: v.filter((x) => x > 1).length, over1_5: v.filter((x) => x > 1.5).length }]));
}
fs.writeFileSync(OUT + 'state-route.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
