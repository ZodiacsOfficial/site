/**
 * Runs perf.mjs and rss.mjs once per process, three processes per target, and
 * reports the median of the three. A single process is noisy enough that a
 * 2x difference can be scheduling; the medians are what RESULTS.md quotes.
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const here = (f) => new URL(`./${f}`, import.meta.url).pathname;
const TARGETS = [
  ['core', 'core', {}],
  ['prototype', 'prototype', {}],
  ['A resident', 'packs/A.zeph', {}],
  ['A low-memory', 'packs/A.zeph', { RESIDENT: '0' }],
  ['B resident', 'packs/B.zeph', {}],
  ['B low-memory', 'packs/B.zeph', { RESIDENT: '0' }],
  ['C resident', 'packs/C.zeph', {}],
  ['D resident', 'packs/D.zeph', {}],
  ['D low-memory', 'packs/D.zeph', { RESIDENT: '0' }],
];
const med = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const out = { reps: 3, note: 'median of three processes; ten bodies per iteration; data acquisition excluded', targets: {} };
for (const [label, t, env] of TARGETS) {
  const runs = [];
  const rsss = [];
  for (let i = 0; i < 3; i += 1) {
    runs.push(JSON.parse(execFileSync(process.execPath, [here('perf.mjs'), t], { env: { ...process.env, ...env }, encoding: 'utf8' })));
    rsss.push(JSON.parse(execFileSync(process.execPath, [here('rss.mjs'), t], { env: { ...process.env, ...env }, encoding: 'utf8' })).peakRssMiB);
  }
  out.targets[label] = {
    dataMiB: runs[0].dataMiB,
    warmP50Ms: med(runs.map((r) => r.warmMsTenBodies.p50)),
    warmP95Ms: med(runs.map((r) => r.warmMsTenBodies.p95)),
    warmP99Ms: med(runs.map((r) => r.warmMsTenBodies.p99)),
    spreadP50Ms: med(runs.map((r) => r.warmMsTenBodiesSpreadOfDates.p50)),
    spreadP95Ms: med(runs.map((r) => r.warmMsTenBodiesSpreadOfDates.p95)),
    coldP50Ms: med(runs.map((r) => r.coldStartMsTenBodies.p50)),
    firstColdMs: med(runs.map((r) => r.firstColdRunMs)),
    peakRssMiB: med(rsss),
    peakRssRuns: rsss,
  };
  process.stderr.write(`${label} done\n`);
}
writeFileSync(new URL('./raw/perf-summary.json', import.meta.url), JSON.stringify(out, null, 1));
const f = (x) => x.toFixed(4).padStart(9);
console.log('target'.padEnd(14), 'data'.padStart(7), 'warmp50'.padStart(9), 'warmp95'.padStart(9), 'warmp99'.padStart(9), 'spreadp50'.padStart(9), 'coldp50'.padStart(9), 'peakRSS'.padStart(8));
for (const [k, v] of Object.entries(out.targets)) {
  console.log(k.padEnd(14), String(v.dataMiB).padStart(7), f(v.warmP50Ms), f(v.warmP95Ms), f(v.warmP99Ms), f(v.spreadP50Ms), f(v.coldP50Ms), String(v.peakRssMiB).padStart(8));
}
