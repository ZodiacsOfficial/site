/**
 * Resource cost, one target per process so cold start and peak RSS mean
 * something.
 *
 *   node perf.mjs prototype            the uncompressed DE440s prototype
 *   node perf.mjs core                 the shipped astronomy-engine core
 *   node perf.mjs packs/D.zeph         a compiled pack
 *
 * Ten bodies per iteration, matching the prototype's own harness so the
 * numbers are comparable to the 0.324 ms p50 already on record. Data
 * acquisition is excluded from every timed kernel and reported separately.
 */
import { performance } from 'node:perf_hooks';
import { statSync } from 'node:fs';
import * as A from 'astronomy-engine';

const target = process.argv[2];
const KERNEL = process.env.KERNEL ?? '/tmp/claude-0/swisslab/de440s.bsp';
const BODIES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const WHEN = new Date('1988-03-21T06:45:00Z');
const REPS = Number(process.env.REPS ?? 400);

const stats = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const q = (p) => { const i = (s.length - 1) * p; const lo = Math.floor(i); const hi = Math.ceil(i);
    return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (i - lo); };
  return { n: s.length, min: s[0], p50: q(0.5), p95: q(0.95), p99: q(0.99), max: s[s.length - 1] };
};
const mib = (b) => +(b / 1048576).toFixed(2);

let makeBackend; let dataBytes; let label;
if (target === 'prototype') {
  const { DeBackend } = await import('/home/user/site/docs/platform/evidence/swiss-benchmark/prototype/apparent.mjs');
  makeBackend = () => { const de = new DeBackend(KERNEL); return (b, d = WHEN) => de.apparentEclipticLongitude(b, d); };
  dataBytes = statSync(KERNEL).size; label = 'prototype (raw DE440s, readSync per evaluation)';
} else if (target === 'core') {
  const CORE = Object.fromEntries(BODIES.map((b) => [b, A.Body[b]]));
  makeBackend = () => (b, d = WHEN) => A.Ecliptic(A.GeoVector(CORE[b], d, true)).elon;
  dataBytes = 0; label = 'shipped astronomy-engine core';
} else {
  const { openPack } = await import('./runtime.mjs');
  const resident = process.env.RESIDENT !== '0';
  makeBackend = async () => { const back = await openPack(target, { resident }); return (b, d = WHEN) => back.apparentEclipticLongitude(b, d); };
  dataBytes = statSync(target).size; label = `pack ${target} (resident=${resident})`;
}

// --- cold: construct the backend and do one full chart, from scratch ---
const cold = [];
for (let i = 0; i < 5; i += 1) {
  const t0 = performance.now();
  const f = await makeBackend();
  for (const b of BODIES) f(b);
  cold.push(performance.now() - t0);
}

// --- warm: one already-open backend, ten bodies per iteration ---
const f = await makeBackend();
for (let i = 0; i < 40; i += 1) for (const b of BODIES) f(b);
const warm = [];
for (let i = 0; i < REPS; i += 1) {
  const t0 = performance.now();
  for (const b of BODIES) f(b);
  warm.push(performance.now() - t0);
}

// --- a spread of instants, so the record memo is not flattered by one date ---
const spread = [];
const dates = [];
for (let i = 0; i < 200; i += 1) dates.push(new Date(Date.UTC(1860 + ((i * 7) % 280), (i * 5) % 12, 1 + ((i * 3) % 27))));
{
  const call = await makeBackend();
  for (let i = 0; i < 20; i += 1) for (const b of BODIES) call(b, dates[i]);
  for (const d of dates) {
    const t0 = performance.now();
    for (const b of BODIES) call(b, d);
    spread.push(performance.now() - t0);
  }
}


const ru = process.resourceUsage();
const mem = process.memoryUsage();
process.stdout.write(`${JSON.stringify({
  target, label,
  note: 'ten bodies per iteration; data acquisition excluded from every timed kernel',
  node: process.version,
  dataMiB: mib(dataBytes),
  coldStartMsTenBodies: stats(cold),
  firstColdRunMs: cold[0],
  warmMsTenBodies: stats(warm),
  warmMsTenBodiesSpreadOfDates: stats(spread),
  peakRssMiB: mib(ru.maxRSS * 1024),
  rssAtEndMiB: mib(mem.rss),
  heapUsedMiB: mib(mem.heapUsed),
}, null, 1)}\n`);
