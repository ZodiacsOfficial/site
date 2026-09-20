#!/usr/bin/env node
/**
 * The expanded verification corpus, generated deterministically.
 *
 * Three disjoint sets, per PREREGISTRATION.md:
 *   DEV          tunable; fit against it as often as useful
 *   ADVERSARIAL  built to break things; read while diagnosing, never fitted
 *   HOLDOUT      opened once, at the end
 *
 * Determinism matters more than cleverness here: the same seed must give the
 * same instants on any machine, so a later reader can regenerate the set and
 * check that the committed results belong to it. The generator therefore uses
 * its own small PRNG rather than Math.random, and every derived epoch is a
 * function of integers only.
 *
 *   node make-corpus.mjs            # writes corpus-expanded.json
 *   node make-corpus.mjs --summary  # prints the shape without writing
 */
import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

/** mulberry32 — small, fast, and identical everywhere. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEED = 0x20260920;

/** The kernel's real segment interval, not the rounded label. */
export const COVERAGE = {
  startUtc: '1849-12-26T00:00:00Z',
  stopUtc: '2150-01-22T00:00:00Z',
  note: 'de440s.bsp segment bounds, TDB, identical for all 14 segments',
};
const COV_START = Date.parse(COVERAGE.startUtc);
const COV_STOP = Date.parse(COVERAGE.stopUtc);

/**
 * Record boundaries per body. A Chebyshev record covers [init + k*intlen,
 * init + (k+1)*intlen); the interpolation switches records there, so the
 * samples that matter are exactly on a boundary and one second either side.
 * `intlen` in days, from the kernel directories, keyed by the body the
 * prototype routes through that segment.
 */
const INTERVAL_DAYS = {
  Moon: 4, Mercury: 8, Venus: 16, Sun: 16, Earth: 4,
  Mars: 32, Jupiter: 32, Saturn: 32, Uranus: 32, Neptune: 32, Pluto: 32,
};
/** J2000 TDB epoch of the first record boundary, common to every segment. */
const SEG_INIT_MS = Date.UTC(1849, 11, 26, 0, 0, 0);

export const BODIES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

/** Round, public, non-personal places. No real birth data anywhere in here. */
const PLACES = {
  london: [51.5074, -0.1278], newYork: [40.7128, -74.006], sydney: [-33.8688, 151.2093],
  nairobi: [-1.2921, 36.8219], quito: [-0.1807, -78.4678], longyearbyen: [78.2232, 15.6267],
  reykjavik: [64.1466, -21.9426], santiago: [-33.4489, -70.6693],
};
const PLACE_KEYS = Object.keys(PLACES);

const iso = (ms) => new Date(Math.round(ms / 1000) * 1000).toISOString().replace('.000', '');

function make(id, kind, ms, place, extra = {}) {
  const [latitude, longitude] = PLACES[place];
  return { id, kind, utc: iso(ms), latitude, longitude, place, ...extra };
}

/** Uniform-in-time samples across the whole coverage, seasons included. */
function spread(prefix, kind, count, seed) {
  const r = rng(seed);
  const out = [];
  for (let i = 0; i < count; i += 1) {
    // Stratify by equal slices so the set cannot clump, then jitter inside.
    const lo = COV_START + ((COV_STOP - COV_START) * i) / count;
    const hi = COV_START + ((COV_STOP - COV_START) * (i + 1)) / count;
    const ms = lo + r() * (hi - lo);
    out.push(make(`${prefix}-${String(i + 1).padStart(3, '0')}`, kind, ms, PLACE_KEYS[Math.floor(r() * PLACE_KEYS.length)]));
  }
  return out;
}

/**
 * Exactly on a record boundary, and one second either side of it.
 *
 * `fracs` differ per set on purpose. The first draft used the same three
 * fractions everywhere and only varied the place by seed, which put identical
 * instants in dev and adversarial — the disjointness check at the bottom of
 * this file caught it. Boundaries are a function of the kernel's cadence, not
 * of a random draw, so they have to be separated deliberately.
 */
function boundaries(prefix, seed, fracs) {
  const r = rng(seed);
  const out = [];
  let n = 0;
  for (const [body, days] of Object.entries(INTERVAL_DAYS)) {
    if (body === 'Earth') continue; // same cadence as the Moon
    const span = days * 86400000;
    for (const frac of fracs) {
      const k = Math.floor(((COV_STOP - COV_START) * frac) / span);
      const edge = SEG_INIT_MS + k * span;
      for (const [suffix, offset] of [['at', 0], ['before', -1000], ['after', 1000]]) {
        n += 1;
        out.push(make(`${prefix}-${String(n).padStart(3, '0')}`, 'segment-boundary', edge + offset,
          PLACE_KEYS[Math.floor(r() * PLACE_KEYS.length)], { forBody: body, boundary: suffix, intervalDays: days }));
      }
    }
  }
  return out;
}

/** The first and last usable instants, and instants deliberately outside. */
function edges(prefix) {
  const margin = 7 * 3600 * 1000; // light-time lookback for Pluto, plus the 60 s velocity step
  return [
    make(`${prefix}-001`, 'coverage-edge', COV_START + margin, 'london', { expect: 'supported', note: 'first instant inside the light-time margin' }),
    make(`${prefix}-002`, 'coverage-edge', COV_STOP - margin, 'london', { expect: 'supported', note: 'last instant inside the light-time margin' }),
    make(`${prefix}-003`, 'coverage-edge', COV_START + 1000, 'london', { expect: 'refuse', note: 'inside the segment but not enough lookback for light-time' }),
    make(`${prefix}-004`, 'coverage-edge', COV_STOP - 1000, 'london', { expect: 'refuse', note: 'same at the far end' }),
    make(`${prefix}-005`, 'coverage-edge', COV_START - 86400000, 'london', { expect: 'refuse', note: 'one day before coverage' }),
    make(`${prefix}-006`, 'coverage-edge', COV_STOP + 86400000, 'london', { expect: 'refuse', note: 'one day after coverage' }),
    make(`${prefix}-007`, 'coverage-edge', Date.UTC(1500, 0, 1), 'london', { expect: 'refuse', note: 'far outside; the shipped core answers here, the backend must not pretend to' }),
    make(`${prefix}-008`, 'coverage-edge', Date.UTC(3500, 0, 1), 'london', { expect: 'refuse', note: 'far outside the other way' }),
  ];
}

/**
 * Geometry that breaks naive code: conjunction and opposition, the 0/360 seam,
 * and stations where longitude velocity passes through zero.
 *
 * These instants are found at generation time by the caller (they need an
 * ephemeris), so the generator emits the SEARCH SPEC and the resolver fills in
 * the instant. Keeping the spec deterministic and the resolution explicit means
 * a later regeneration cannot silently drift onto different events.
 */
function geometrySpecs(prefix) {
  const out = [];
  let n = 0;
  const add = (spec) => { n += 1; out.push({ id: `${prefix}-${String(n).padStart(3, '0')}`, kind: 'geometry-spec', ...spec }); };
  for (const body of ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']) {
    add({ event: 'conjunction-with-sun', body, searchFromUtc: '2019-01-01T00:00:00Z', note: 'deflection and light-time are largest here' });
    // Mercury and Venus never reach opposition — they are inferior planets, so
    // asking for 180 degrees of elongation is asking for something that does
    // not happen. The first draft asked anyway and the resolver obligingly
    // returned a conjunction. Their stressing geometry is greatest elongation.
    if (body === 'Mercury' || body === 'Venus') {
      add({ event: 'greatest-elongation', body, searchFromUtc: '2019-01-01T00:00:00Z', note: 'the furthest an inferior planet gets from the Sun' });
    } else {
      add({ event: 'opposition-to-sun', body, searchFromUtc: '2019-01-01T00:00:00Z', note: 'closest approach, fastest apparent motion' });
    }
  }
  for (const body of ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']) {
    add({ event: 'station', body, searchFromUtc: '2019-01-01T00:00:00Z', note: 'longitude velocity through zero; the case that breaks timing-from-velocity' });
  }
  for (const body of BODIES) {
    add({ event: 'zero-longitude-crossing', body, searchFromUtc: '2019-01-01T00:00:00Z', note: '0/360 seam' });
  }
  return out;
}

/** Inputs the backend must refuse rather than answer. */
function refusals(prefix) {
  const base = Date.UTC(2020, 5, 15, 12);
  return [
    { id: `${prefix}-001`, kind: 'refusal', utc: iso(base), option: 'sidereal', expect: 'refuse', note: 'no ayanamsha is implemented' },
    { id: `${prefix}-002`, kind: 'refusal', utc: iso(base), option: 'topocentric', expect: 'refuse', note: 'no parallax is implemented' },
    { id: `${prefix}-003`, kind: 'refusal', utc: iso(base), option: 'j2000-frame', expect: 'refuse', note: 'only true ecliptic of date is produced' },
    { id: `${prefix}-004`, kind: 'refusal', utc: iso(base), option: 'body:Chiron', expect: 'refuse', note: 'not in the kernel' },
    { id: `${prefix}-005`, kind: 'refusal', utc: 'not-a-date', option: null, expect: 'refuse', note: 'malformed instant' },
    { id: `${prefix}-006`, kind: 'refusal', utc: iso(base), option: 'pack:truncated', expect: 'refuse', note: 'pack cut short mid-record' },
    { id: `${prefix}-007`, kind: 'refusal', utc: iso(base), option: 'pack:corrupt-header', expect: 'refuse', note: 'header magic damaged' },
    { id: `${prefix}-008`, kind: 'refusal', utc: iso(base), option: 'pack:corrupt-coefficients', expect: 'refuse', note: 'body bytes flipped, checksum must catch it' },
    { id: `${prefix}-009`, kind: 'refusal', utc: iso(base), option: 'pack:wrong-coverage', expect: 'refuse', note: 'pack does not cover the requested instant' },
    { id: `${prefix}-010`, kind: 'refusal', utc: iso(base), option: 'pack:missing-body', expect: 'refuse', note: 'pack omits a requested body' },
  ];
}

const corpus = {
  what: 'expanded verification corpus for the precision backend',
  seed: SEED,
  generator: 'make-corpus.mjs',
  coverage: COVERAGE,
  bodies: BODIES,
  note: 'Synthetic instants and round public coordinates. No real birth data.',
  sets: {
    dev: [
      ...spread('dev-spread', 'spread', 120, SEED ^ 0x01),
      ...boundaries('dev-bound', SEED ^ 0x02, [0.17, 0.53, 0.86]),
      ...geometrySpecs('dev-geom'),
    ],
    adversarial: [
      ...boundaries('adv-bound', SEED ^ 0x11, [0.09, 0.41, 0.72]),
      ...edges('adv-edge'),
      ...refusals('adv-refuse'),
      ...spread('adv-spread', 'spread', 40, SEED ^ 0x12),
      ...geometrySpecs('adv-geom'),
    ],
    holdout: [
      ...spread('hold-spread', 'spread', 80, SEED ^ 0x21),
      ...boundaries('hold-bound', SEED ^ 0x22, [0.28, 0.64, 0.95]),
      ...geometrySpecs('hold-geom'),
    ],
  },
};

// Disjointness is a property the protocol depends on, so it is checked rather
// than assumed: no instant may appear in two sets.
const seen = new Map();
for (const [set, cases] of Object.entries(corpus.sets)) {
  for (const c of cases) {
    if (!c.utc) continue;
    const k = `${c.utc}|${c.kind}|${c.forBody ?? ''}`;
    if (seen.has(k) && seen.get(k) !== set) {
      throw new Error(`corpus overlap between ${seen.get(k)} and ${set} at ${k}`);
    }
    seen.set(k, set);
  }
}

corpus.counts = Object.fromEntries(Object.entries(corpus.sets).map(([k, v]) => [k, v.length]));
corpus.rowCounts = Object.fromEntries(
  Object.entries(corpus.sets).map(([k, v]) => [k, v.filter((c) => c.kind !== 'geometry-spec' && c.kind !== 'refusal').length * BODIES.length]),
);

if (process.argv.includes('--summary')) {
  console.log(JSON.stringify({ counts: corpus.counts, rowCounts: corpus.rowCounts, coverage: corpus.coverage }, null, 1));
} else {
  const body = `${JSON.stringify(corpus, null, 1)}\n`;
  writeFileSync(new URL('../corpus-expanded.json', import.meta.url), body);
  console.log(`corpus-expanded.json  sha256 ${createHash('sha256').update(body).digest('hex')}`);
  console.log(JSON.stringify(corpus.counts), JSON.stringify(corpus.rowCounts));
}
