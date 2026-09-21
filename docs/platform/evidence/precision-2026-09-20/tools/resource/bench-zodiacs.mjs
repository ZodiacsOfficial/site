#!/usr/bin/env node
/**
 * One timing block for the Zodiacs side. Emits JSON on stdout.
 *
 * Mirrors bench_swiss.py phase for phase so the two are comparable: cold
 * initialisation, a per-call binding floor, warm 10-body charts at shuffled
 * instants, and the same work batched. Loading the DE pack is acquisition and
 * is timed as cold init, never as calculation.
 *
 *   node bench-zodiacs.mjs <core|prototype> <kernel|-> <round> <reps>
 */
import * as A from 'astronomy-engine';

const MODE = process.argv[2];
const KERNEL = process.argv[3];
const ROUND = Number(process.argv[4]);
const REPS = Number(process.argv[5]);
const BODIES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

const rssMiB = () => process.memoryUsage().rss / 1048576;
const out = { system: MODE, runtime: `node ${process.version}`, round: ROUND, rssStartMiB: rssMiB() };

let measure;
let measureOneBody;
let t0 = performance.now();
if (MODE === 'prototype') {
  const { DeBackend } = await import('../../../swiss-benchmark/prototype/apparent.mjs');
  const de = new DeBackend(KERNEL);
  // Force the first read of every segment the workload touches.
  for (const b of BODIES) de.apparentEclipticLongitude(b, new Date('2020-06-15T12:00:00Z'));
  measure = (d) => { for (const b of BODIES) de.apparentEclipticLongitude(b, d); };
  measureOneBody = (d) => de.apparentEclipticLongitude('Mars', d);
} else if (MODE === 'core-lonly') {
  // The core doing EXACTLY what the prototype does and nothing more: ten
  // apparent geocentric longitudes in the true ecliptic of date, no latitude,
  // no speed, no sign, no nodes. This is the only mode in which the two are
  // comparable, and it exists because the previous study's perf tool compared
  // the prototype against `Ecliptic(GeoVector(...))` — the J2000 ecliptic,
  // with no speed, at one repeated instant — and called the result the
  // production core.
  const B = { Sun: A.Body.Sun, Moon: A.Body.Moon, Mercury: A.Body.Mercury, Venus: A.Body.Venus,
    Mars: A.Body.Mars, Jupiter: A.Body.Jupiter, Saturn: A.Body.Saturn,
    Uranus: A.Body.Uranus, Neptune: A.Body.Neptune, Pluto: A.Body.Pluto };
  const lonOf = (b, d) => {
    const t = A.MakeTime(d);
    const e = A.RotateVector(A.Rotation_EQJ_ECT(t), A.GeoVector(B[b], t, true));
    const x = (Math.atan2(e.y, e.x) * 180) / Math.PI;
    return x < 0 ? x + 360 : x;
  };
  lonOf('Mars', new Date('2020-06-15T12:00:00Z'));
  measure = (d) => { for (const b of BODIES) lonOf(b, d); };
  measureOneBody = (d) => lonOf('Mars', d);
} else {
  // `positions`, not `natalChart`. The Swiss side computes ten body positions
  // and nothing else; natalChart also derives angles, twelve house cusps and
  // every aspect pair, so timing it against ten swe_calc calls would be
  // measuring a different program. `positions` returns twelve entries — the
  // ten bodies plus both lunar nodes — so this side still does slightly more
  // work, which is recorded rather than corrected for.
  const { positions } = await import('@zodiacs/engine');
  positions(new Date('2020-06-15T12:00:00Z'));
  measure = (d) => { positions(d); };
}
out.coldInitMs = performance.now() - t0;
out.rssAfterLoadMiB = rssMiB();
out.workloadNote = {
  core: 'positions(): 12 entries (10 bodies + 2 nodes), lon+lat+speed+sign; speed by 0.25-day central difference so each body costs 3 evaluations',
  'core-lonly': '10 bodies, apparent longitude in the true ecliptic of date only — matched to the prototype',
  prototype: '10 bodies, apparent longitude only',
}[MODE];

// Per-call floor, like for like: one body's apparent position, which is the
// cheapest real ephemeris call either side can make. An earlier draft timed
// MakeTime here against swe.julday, which compared two unrelated things.
// The instant must VARY on both sides. Swiss caches per (jd, body), so a
// repeated instant times a cache hit; the Zodiacs side has no such cache but
// is held to the same protocol so the two remain comparable.
const base = Date.parse('2020-06-15T12:00:00Z');
const floorDates = Array.from({ length: Math.max(REPS, 2000) },
  (_, i) => new Date(base + i * 0.37 * 86400000));
const floorOnce = MODE === 'prototype'
  ? (d) => measureOneBody(d)
  : (measureOneBody ?? ((d) => A.GeoVector(A.Body.Mars, d, true)));
for (let i = 0; i < 2000; i += 1) floorOnce(floorDates[i]);   // JIT
t0 = performance.now();
for (let i = 0; i < REPS; i += 1) floorOnce(floorDates[i]);
out.bindingFloorUs = ((performance.now() - t0) / REPS) * 1000;

// Same PRNG shape as the Python side so the instants are comparably spread.
let seed = (0xc0ffee ^ ROUND) >>> 0;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const instants = Array.from({ length: REPS }, () => new Date(Date.UTC(
  1900 + Math.floor(rnd() * 250), Math.floor(rnd() * 12), 1 + Math.floor(rnd() * 27), Math.floor(rnd() * 24))));

// V8 compiles on the hot path, so the first hundred iterations of anything
// measure the compiler rather than the code. An earlier draft did not warm up
// and reported a p95 of 10.9 ms against a p50 of 1.1 ms — that spread was JIT,
// not the ephemeris. The warmup instants are drawn from the same generator and
// then discarded.
for (let i = 0; i < 300; i += 1) measure(new Date(Date.UTC(1950 + (i % 200), i % 12, 1 + (i % 27))));

const warm = [];
for (const d of instants) { const s = performance.now(); measure(d); warm.push(performance.now() - s); }
warm.sort((a, b) => a - b);
out.warm10BodiesMs = { p50: warm[Math.floor(warm.length / 2)], p95: warm[Math.floor(warm.length * 0.95)],
  min: warm[0], max: warm[warm.length - 1], n: warm.length };

t0 = performance.now();
for (const d of instants) measure(d);
out.batchTotalMs = performance.now() - t0;
out.batchPerChartMs = out.batchTotalMs / instants.length;
out.rssPeakMiB = rssMiB();
process.stdout.write(`${JSON.stringify(out)}\n`);
