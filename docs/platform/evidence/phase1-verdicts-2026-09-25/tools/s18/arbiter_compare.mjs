// Step 1.8, arbiter check: rc.7's Moon speed and Swiss's, each against the DE440s/ERFA
// longitude rate (moon-arbiter.json), in arcseconds per day, at the same samples.
//   engine - arbGeo        the shipped chart speed against the kernel (both geometric)
//   swissDefault - arbLt   Swiss's apparent speed against the kernel with light-time
//   swissTruepos - arbGeo  Swiss's geometric speed against the kernel
//   engine - swissDefault  the rule's residual, for reference
// Reads $WORK/s18/moon-engine.json, moon-swiss.json and moon-arbiter.json; writes
// $WORK/s18/arbiter-results.json (statistics, and the differences at the worst sample) and
// prints it.
//   node tools/s18/arbiter_compare.mjs
import fs from 'node:fs';
import { outDir } from '../lib/paths.mjs';

const OUT = outDir('s18');
const eng = JSON.parse(fs.readFileSync(OUT + 'moon-engine.json', 'utf8'));
const sw = JSON.parse(fs.readFileSync(OUT + 'moon-swiss.json', 'utf8'));
const arb = JSON.parse(fs.readFileSync(OUT + 'moon-arbiter.json', 'utf8'));
const AS = 3600;
const res = { kernel: arb.kernel, pyerfa: arb.pyerfa, jplephem: arb.jplephem, sets: {} };
for (const set of ['swissApsides', 'a3']) {
  const keys = { engineVsKernel: [], swissApparentVsKernelLt: [], swissTrueposVsKernel: [], engineVsSwiss: [] };
  let worst = null;
  eng.samples.forEach((s, i) => {
    if (s.set !== set || !sw.rows[i] || !arb.rows[i]) return;
    const e = s.engineSpeed, a = arb.rows[i], w = sw.rows[i];
    const row = {
      engineVsKernel: (e - a.arbGeo) * AS,
      swissApparentVsKernelLt: (w.speedTT - a.arbLt) * AS,
      swissTrueposVsKernel: (a.swissTruepos - a.arbGeo) * AS,
      engineVsSwiss: (e - w.speedTT) * AS
    };
    for (const k of Object.keys(keys)) keys[k].push(row[k]);
    if (!worst || Math.abs(row.engineVsSwiss) > Math.abs(worst.engineVsSwiss)) worst = { utc: s.utc, group: s.group, offsetHours: s.offsetHours, ...Object.fromEntries(Object.entries(row).map(([k, v]) => [k, +v.toFixed(4)])) };
  });
  const st = (v) => { const a = v.map(Math.abs).sort((x, y) => x - y); return { n: a.length, p50: +a[a.length >> 1].toFixed(4), p95: +a[Math.floor(0.95 * a.length)].toFixed(4), max: +a.at(-1).toFixed(4), over1: a.filter((x) => x > 1).length, over1_5: a.filter((x) => x > 1.5).length }; };
  res.sets[set] = { ...Object.fromEntries(Object.entries(keys).map(([k, v]) => [k, st(v)])), atWorstEngineVsSwiss: worst };
}
fs.writeFileSync(OUT + 'arbiter-results.json', JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
