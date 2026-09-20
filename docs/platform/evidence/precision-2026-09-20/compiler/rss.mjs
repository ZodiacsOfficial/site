/**
 * Peak resident set for ONE backend doing real work, one target per process.
 *
 * perf.mjs builds seven backends (five cold runs, one warm, one spread), so its
 * peak RSS counts seven copies of whatever a backend holds. That is the wrong
 * denominator for "what does a caller pay to keep this open", so this measures
 * a single backend and nothing else.
 */
import { statSync } from 'node:fs';
import * as A from 'astronomy-engine';

const target = process.argv[2];
const KERNEL = process.env.KERNEL ?? '/tmp/claude-0/swisslab/de440s.bsp';
const BODIES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const dates = [];
for (let i = 0; i < 300; i += 1) dates.push(new Date(Date.UTC(1860 + ((i * 7) % 280), (i * 5) % 12, 1 + ((i * 3) % 27))));

let call; let dataBytes = 0;
if (target === 'prototype') {
  const { DeBackend } = await import('/home/user/site/docs/platform/evidence/swiss-benchmark/prototype/apparent.mjs');
  const de = new DeBackend(KERNEL);
  call = (b, d) => de.apparentEclipticLongitude(b, d);
  dataBytes = statSync(KERNEL).size;
} else if (target === 'core') {
  call = (b, d) => A.Ecliptic(A.GeoVector(A.Body[b], d, true)).elon;
} else {
  const { openPack } = await import('./runtime.mjs');
  const back = await openPack(target, { resident: process.env.RESIDENT !== '0' });
  call = (b, d) => back.apparentEclipticLongitude(b, d);
  dataBytes = statSync(target).size;
}
let sink = 0;
for (let r = 0; r < 20; r += 1) for (const d of dates) for (const b of BODIES) sink += call(b, d);
const ru = process.resourceUsage();
const m = process.memoryUsage();
process.stdout.write(`${JSON.stringify({
  target,
  charts: 20 * dates.length,
  dataMiB: +(dataBytes / 1048576).toFixed(2),
  peakRssMiB: +((ru.maxRSS * 1024) / 1048576).toFixed(2),
  rssMiB: +(m.rss / 1048576).toFixed(2),
  heapUsedMiB: +(m.heapUsed / 1048576).toFixed(2),
  externalMiB: +(m.external / 1048576).toFixed(2),
  checksum: sink.toFixed(6),
}, null, 1)}\n`);
