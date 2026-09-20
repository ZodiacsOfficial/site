/**
 * Resource cost, separated rather than rolled into one number.
 *
 * Cold start (open the kernel + first evaluation) is reported apart from warm
 * per-chart latency, because they are different costs to a caller. Data
 * ACQUISITION is excluded from the timed kernels and reported separately as a
 * transfer cost — timing a warm local result against another system's first
 * download would be a meaningless comparison.
 */
import { performance } from 'node:perf_hooks';
import { statSync } from 'node:fs';
import * as A from 'astronomy-engine';
import { DeBackend } from './apparent.mjs';

const KERNEL = process.argv[2];
const BODIES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const WHEN = new Date('1988-03-21T06:45:00Z');

const stats = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return { n: s.length, min: s[0], p50: s[Math.floor(s.length / 2)], p95: s[Math.floor(0.95 * (s.length - 1))], max: s[s.length - 1] };
};
const mib = (b) => +(b / 1048576).toFixed(2);

// --- cold start: constructing the reader and doing one full chart ---
const coldRuns = [];
for (let i = 0; i < 5; i += 1) {
  const t0 = performance.now();
  const de = new DeBackend(KERNEL);
  for (const b of BODIES) de.apparentEclipticLongitude(b, WHEN);
  coldRuns.push(performance.now() - t0);
}

// --- warm: ten bodies, repeated, on one already-open backend ---
const de = new DeBackend(KERNEL);
for (let i = 0; i < 20; i += 1) for (const b of BODIES) de.apparentEclipticLongitude(b, WHEN);   // warm the caches
const warm = [];
for (let i = 0; i < 200; i += 1) {
  const t0 = performance.now();
  for (const b of BODIES) de.apparentEclipticLongitude(b, WHEN);
  warm.push(performance.now() - t0);
}

// --- baseline: the production core doing the same ten bodies ---
const CORE = { Sun: A.Body.Sun, Moon: A.Body.Moon, Mercury: A.Body.Mercury, Venus: A.Body.Venus,
  Mars: A.Body.Mars, Jupiter: A.Body.Jupiter, Saturn: A.Body.Saturn, Uranus: A.Body.Uranus,
  Neptune: A.Body.Neptune, Pluto: A.Body.Pluto };
for (let i = 0; i < 20; i += 1) for (const b of BODIES) A.EclipticGeoMoon ? A.Ecliptic(A.GeoVector(CORE[b], WHEN, true)) : 0;
const core = [];
for (let i = 0; i < 200; i += 1) {
  const t0 = performance.now();
  for (const b of BODIES) A.Ecliptic(A.GeoVector(CORE[b], WHEN, true));
  core.push(performance.now() - t0);
}

const mem = process.memoryUsage();
console.log(JSON.stringify({
  note: 'Times are for TEN bodies per iteration. Data acquisition is excluded from every timed kernel and reported as transferMiB.',
  host: { node: process.version, cpus: (await import('node:os')).cpus().length },
  transferMiB: mib(statSync(KERNEL).size),
  coldStartMsTenBodies: stats(coldRuns),
  warmMsTenBodies_prototype: stats(warm),
  warmMsTenBodies_currentCore: stats(core),
  heapUsedMiB_afterPrototype: mib(mem.heapUsed),
  rssMiB: mib(mem.rss),
}, null, 1));
