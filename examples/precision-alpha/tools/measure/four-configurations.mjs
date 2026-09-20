/**
 * The four-configuration measurement (§4 of the alpha mandate).
 *
 *   node tools/measure/four-configurations.mjs \
 *     --pack <pack.zeph> --kernel <de440s.bsp> --ephe <swiss-ephe-dir> \
 *     [--out <dir>] [--gridStepDays 37.211]
 *
 * TIER B: it needs a local kernel, a local pack and a local Swiss ephemeris
 * directory. None of the three is defaulted to a path from an earlier
 * session, and a missing one is a loud failure, never a green run with
 * fewer cells.
 *
 * The four configurations differ in exactly two things and nothing else:
 *
 *            backend                         reduction
 *   A        uncompressed DE440s kernel      the earlier prototype's
 *   B        uncompressed DE440s kernel      corrected
 *   C        compact pack                    the earlier prototype's
 *   D        compact pack                    corrected
 *
 * They run through ONE reduction module over two backends, so a difference
 * between cells is the thing being varied and not a second implementation.
 *
 * A note on labels: the earlier numerics track also used "cell A..D" for a
 * different 2x2 (prototype vs core engine, own clock vs pinned clock). These
 * are NOT those cells. Everything below says "configuration".
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { openPackFile } from '../../src/node.mjs';
import { Reducer, CORRECTED, PROTOTYPE } from '../../src/core/reduce.mjs';
import { SpkBackend } from '../spk-backend.mjs';
import { MEASURE, BODIES } from '../../../../docs/platform/evidence/swiss-benchmark/tools/corpus.mjs';

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i].replace(/^--/, ''), process.argv[i + 1]);
const need = (k) => {
  const v = args.get(k);
  if (!v) { console.error(`--${k} is required; this measurement needs real local data and will not guess where it is.`); process.exit(2); }
  if (!existsSync(v)) { console.error(`--${k}: nothing at that path.`); process.exit(2); }
  return v;
};
const PACK = need('pack');
const KERNEL = need('kernel');
const EPHE = need('ephe');
const OUT = args.get('out') ?? new URL('../../../../docs/platform/evidence/precision-2026-09-20/raw/four-configurations', import.meta.url).pathname;
const GRID_STEP_DAYS = Number(args.get('gridStepDays') ?? 37.211);
const PY = args.get('python') ?? 'python3';

const DAY = 86400;
const MS_PER_DAY = 86400000;
const J2000_UT_DAYS = 10957.5;                 // JS epoch days -> days past J2000
/** Light-time lookback plus the derivative step, inset from both ends. */
const INSET_SEC = 8 * 3600;
/** Bodies the kernel gives as a planetary-SYSTEM barycentre, not a centre. */
const BARYCENTRES = new Set(['Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']);
const CENTRES = BODIES.filter((b) => !BARYCENTRES.has(b));

mkdirSync(OUT, { recursive: true });

// ---------------------------------------------------------------- backends
const runtime = await openPackFile(PACK);
const packReducer = new Reducer(runtime.ephemeris);
const spk = new SpkBackend(KERNEL);
const spkReducer = new Reducer(spk);

const coverage = {
  pack: { startEtSecTdb: runtime.coverage.startEtSecTdb, stopEtSecTdb: runtime.coverage.stopEtSecTdb },
  kernel: { startEtSecTdb: spk.coverage.startEtSecTdb, stopEtSecTdb: spk.coverage.stopEtSecTdb },
};
coverage.effective = {
  startEtSecTdb: Math.max(coverage.pack.startEtSecTdb, coverage.kernel.startEtSecTdb) + INSET_SEC,
  stopEtSecTdb: Math.min(coverage.pack.stopEtSecTdb, coverage.kernel.stopEtSecTdb) - INSET_SEC,
  insetSec: INSET_SEC,
  insetWhy: 'light-time lookback reads the target earlier than the epoch, and the central-difference observer velocity reads either side',
};
const isoOfEt = (et) => new Date(Date.UTC(2000, 0, 1, 12) + et * 1000).toISOString();
coverage.effective.startApproxUtc = isoOfEt(coverage.effective.startEtSecTdb);
coverage.effective.stopApproxUtc = isoOfEt(coverage.effective.stopEtSecTdb);

// ---------------------------------------------------------------- instants
const gridInstants = [];
{
  const stepSec = GRID_STEP_DAYS * DAY;
  let i = 0;
  for (let et = coverage.effective.startEtSecTdb; et <= coverage.effective.stopEtSecTdb; et += stepSec) {
    gridInstants.push({ id: `grid-${String(i).padStart(5, '0')}`, utc: isoOfEt(et).replace(/\.\d+Z$/, 'Z') });
    i += 1;
  }
}

const sets = {
  corpus: {
    what: 'the pinned corpus the earlier measurement used, so these figures sit alongside the recorded ones',
    source: 'docs/platform/evidence/swiss-benchmark/tools/corpus.mjs (MEASURE)',
    cases: MEASURE.map((c) => ({ id: c.id, stratum: c.stratum, utc: c.utc })),
  },
  grid: {
    what: 'a uniform sweep of the whole effective coverage, to see whether the corpus figure survives a broader test',
    stepDays: GRID_STEP_DAYS,
    stepWhy: 'not a divisor of the 18.6-year nutation period or of a year, so the sample does not sit on one phase',
    cases: gridInstants,
  },
};

// ------------------------------------------------------------------- swiss
function swissFor(setName) {
  const inPath = join(OUT, `instants-${setName}.json`);
  writeFileSync(inPath, `${JSON.stringify({ set: setName, cases: sets[setName].cases })}\n`);
  const script = new URL('./swiss.py', import.meta.url).pathname;
  let stdout;
  try {
    stdout = execFileSync(PY, [script, inPath, EPHE], { maxBuffer: 1 << 28, encoding: 'utf8' });
  } catch (error) {
    console.error(`the Swiss instrument failed for set ${setName}: ${error.message}`);
    console.error('this measurement has no verdict without it, and does not report one.');
    process.exit(3);
  }
  const swiss = JSON.parse(stdout);
  if (!swiss.isFullSwissConfiguration) {
    console.error(`Swiss fell back to ${swiss.backendsObserved.join(', ')} for set ${setName}; refusing to report a comparison against a fallback.`);
    process.exit(3);
  }
  writeFileSync(join(OUT, `swiss-${setName}.json`), `${JSON.stringify(swiss)}\n`);
  return swiss;
}

// ------------------------------------------------------------------- stats
const wrapDeg = (d) => { let x = d % 360; if (x > 180) x -= 360; if (x <= -180) x += 360; return x; };
const arcsec = (a, b) => Math.abs(wrapDeg(a - b)) * 3600;
/**
 * Percentiles by nearest-rank on the sorted sample (index floor(q*n)). The
 * earlier track's percentiles were computed elsewhere and may use a
 * different convention, so p50 and p95 can differ from the recorded ones in
 * the last digits while the MAXIMA -- which have no convention -- match
 * exactly. That is the check to read.
 */
function stats(values) {
  if (values.length === 0) return { n: 0, max: null, p50: null, p95: null, mean: null };
  const s = [...values].sort((x, y) => x - y);
  const at = (q) => s[Math.min(s.length - 1, Math.floor(q * s.length))];
  return {
    n: s.length,
    max: s[s.length - 1],
    p50: at(0.5),
    p95: at(0.95),
    mean: s.reduce((a, b) => a + b, 0) / s.length,
  };
}

// ------------------------------------------------------------------- run
const CONFIGS = {
  A: { backend: 'uncompressed DE440s kernel', reduction: 'prototype', reducer: spkReducer, options: PROTOTYPE },
  B: { backend: 'uncompressed DE440s kernel', reduction: 'corrected', reducer: spkReducer, options: CORRECTED },
  C: { backend: 'compact pack', reduction: 'prototype', reducer: packReducer, options: PROTOTYPE },
  D: { backend: 'compact pack', reduction: 'corrected', reducer: packReducer, options: CORRECTED },
};

function measureSet(setName) {
  const swiss = swissFor(setName);
  const rows = [];
  const skipped = [];
  for (const kase of swiss.cases) {
    const utDays = new Date(kase.utc).getTime() / MS_PER_DAY - J2000_UT_DAYS;
    // The SAME clock on both sides: Swiss's own Delta-T for this instant, so
    // nothing in the comparison is a clock difference.
    const ttDays = utDays + kase.deltaTSeconds / DAY;
    const et = ttDays * DAY;
    if (et < coverage.effective.startEtSecTdb || et > coverage.effective.stopEtSecTdb) {
      skipped.push({ id: kase.id, utc: kase.utc, why: 'outside the effective coverage of the pack and kernel together, with the inset' });
      continue;
    }
    for (const body of BODIES) {
      const ref = kase.bodies[body];
      if (!ref || ref.error) { skipped.push({ id: kase.id, body, why: `swiss: ${ref?.error ?? 'missing'}` }); continue; }
      const got = {};
      for (const [name, cfg] of Object.entries(CONFIGS)) got[name] = cfg.reducer.apparent(body, ttDays, cfg.options).lon;
      rows.push({
        id: kase.id, utc: kase.utc, ttDays, body,
        isSystemBarycentre: BARYCENTRES.has(body),
        swiss: ref.lon,
        ...got,
      });
    }
  }
  return { swiss: { binding: swiss.swisseph_binding, backends: swiss.backendsObserved }, rows, skipped };
}

function summarise(rows, pick) {
  const use = rows.filter(pick);
  const vsSwiss = {};
  for (const k of ['A', 'B', 'C', 'D']) vsSwiss[k] = stats(use.map((r) => arcsec(r[k], r.swiss)));
  const between = {
    'compression alone, prototype reduction (A vs C)': stats(use.map((r) => arcsec(r.A, r.C))),
    'compression alone, corrected reduction (B vs D)': stats(use.map((r) => arcsec(r.B, r.D))),
    'reduction alone, kernel backend (A vs B)': stats(use.map((r) => arcsec(r.A, r.B))),
    'reduction alone, pack backend (C vs D)': stats(use.map((r) => arcsec(r.C, r.D))),
    'both changes together (A vs D)': stats(use.map((r) => arcsec(r.A, r.D))),
  };
  // Composition, signed: does changing both do what changing each alone did?
  // Signed, because two effects that cancel must not look like agreement.
  const residual = use.map((r) => {
    const dCompression = wrapDeg(r.C - r.A);
    const dReduction = wrapDeg(r.B - r.A);
    const dBoth = wrapDeg(r.D - r.A);
    return Math.abs(dBoth - (dCompression + dReduction)) * 3600;
  });
  return {
    n: use.length,
    vsSwissArcsec: vsSwiss,
    betweenConfigurationsArcsec: between,
    compositionResidualArcsec: {
      ...stats(residual),
      what: '| (D-A) - ((C-A) + (B-A)) | in arcsec, signed differences inside. Small means the two changes act independently and their separate sizes may be added; large would mean they interact and neither separate headline describes the pair.',
    },
  };
}

// ------------------------------------------------- the derivative, separately
function derivativeCheck() {
  const out = { what: 'backend state derivative, pack against the uncompressed kernel, sampled on the grid', perBody: {} };
  const a = new Float64Array(6);
  const b = new Float64Array(6);
  const step = Math.max(1, Math.floor(gridInstants.length / 300));
  for (const body of ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Earth']) {
    const pos = [];
    const vel = [];
    for (let i = 0; i < gridInstants.length; i += step) {
      const et = new Date(gridInstants[i].utc).getTime() / 1000 - Date.UTC(2000, 0, 1, 12) / 1000;
      runtime.ephemeris.state(body, et, a);
      spk.state(body, et, b);
      pos.push(Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2));
      vel.push(Math.sqrt((a[3] - b[3]) ** 2 + (a[4] - b[4]) ** 2 + (a[5] - b[5]) ** 2));
    }
    out.perBody[body] = { positionKm: stats(pos), velocityKmPerSec: stats(vel) };
  }
  return out;
}

// -------------------------------------------- the barycentric Moon question
/**
 * The 0.2 km target was declared on the barycentric Moon before any of the
 * compression work, and the compiler track recorded it as MISSED: sampled
 * 0.165 km, but PROVEN 0.449 km, and the target is on the bound. Sampling
 * more points cannot overturn that, so this function re-measures the
 * sampled figure as a corroboration and reports the recorded proven bound
 * alongside it rather than quietly reporting only the number that passes.
 */
function barycentricMoon() {
  const a = new Float64Array(6);
  const b = new Float64Array(6);
  const step = Math.max(1, Math.floor(gridInstants.length / 600));
  const moon = [];
  const earth = [];
  for (let i = 0; i < gridInstants.length; i += step) {
    const et = new Date(gridInstants[i].utc).getTime() / 1000 - Date.UTC(2000, 0, 1, 12) / 1000;
    for (const [body, into] of [['Moon', moon], ['Earth', earth]]) {
      runtime.ephemeris.state(body, et, a);
      spk.state(body, et, b);
      into.push(Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2));
    }
  }
  const sampled = stats(moon);
  return {
    target: '0.2 km on the barycentric Moon position, declared in PREREGISTRATION.md T6 before the compression work',
    recorded: {
      sampledKm: 0.165,
      provenKm: 0.449,
      source: 'docs/platform/evidence/precision-2026-09-20/compiler/RESULTS.md, candidate D',
      verdict: 'MISSED. The target is on the bound, and the proven bound is 0.449 km.',
    },
    remeasuredSampledBarycentricMoonKm: sampled,
    remeasuredSampledBarycentricEarthKm: stats(earth),
    corroboratesRecordedSample: sampled.max !== null && Math.abs(sampled.max - 0.165) < 0.01,
    verdict: 'NOT MET. This run samples 600 instants and reaches a similar figure to the recorded sample, which corroborates the sample and says nothing about the bound: no amount of sampling establishes a bound. Barycentric position is therefore NOT in the alpha\'s contract. The geocentric path, which is what the contract does expose, is a different quantity and is inside the target (recorded: 0.00946 km sampled, 0.0224 km proven).',
    correlationWarning: 'Earth and Moon are both derived from the same two stored bodies, EMB and Moon, through the pack\'s EMRAT, so their errors are CORRELATED. The geocentric figure is small because the EMB term cancels against the observer, not because two independent errors happened to be small, and no geocentric bound here is built by adding them as if independent.',
  };
}

// ---------------------------------------------------------------- assemble
const report = {
  what: 'four configurations, measured on identical instants, bodies, clock and conventions',
  when: new Date().toISOString(),
  node: process.version,
  labels: {
    A: CONFIGS.A, B: CONFIGS.B, C: CONFIGS.C, D: CONFIGS.D,
    note: 'these are this mandate\'s labels. The earlier numerics track used cell A..D for a different 2x2 and those figures are not these.',
  },
  inputs: {
    pack: { path: PACK, digest: runtime.integrity.computedDigest, selfConsistent: runtime.integrity.selfConsistent, authenticity: runtime.integrity.authenticity, candidate: runtime.header.candidate ?? null },
    kernel: { path: KERNEL, declaredInput: runtime.header.input ?? null },
    swissEphe: EPHE,
  },
  coverage,
  clock: 'Swiss\'s own Delta-T at each instant is used to turn UTC into TT, and that same TT is given to all four configurations. Nothing in any comparison below is a clock difference.',
  conventions: 'apparent geocentric ecliptic longitude of date, tropical, on both sides',
  caveat: 'Swiss Ephemeris and DE440s both descend from JPL development ephemerides. Agreement between them is CONSISTENCY, not accuracy, and nothing here is evidence of superior physical astronomy.',
  sets: {},
  derivative: null,
  barycentricMoon: null,
};

for (const setName of ['corpus', 'grid']) {
  process.stderr.write(`measuring ${setName} (${sets[setName].cases.length} instants) ...\n`);
  const m = measureSet(setName);
  report.sets[setName] = {
    what: sets[setName].what,
    ...(sets[setName].source ? { source: sets[setName].source } : {}),
    ...(sets[setName].stepDays ? { stepDays: sets[setName].stepDays, stepWhy: sets[setName].stepWhy } : {}),
    instantsOffered: sets[setName].cases.length,
    swiss: m.swiss,
    skipped: m.skipped,
    allBodies: summarise(m.rows, () => true),
    bodyCentresOnly: {
      bodies: CENTRES,
      why: 'Swiss returns the planet centre; this pack and this kernel give a planetary-SYSTEM barycentre for Mars outward. Comparing those against Swiss measures that difference, not the reduction, so the headline is the four bodies where both sides mean the same point.',
      ...summarise(m.rows, (r) => !r.isSystemBarycentre),
    },
    systemBarycentresOnly: {
      bodies: [...BARYCENTRES],
      why: 'reported separately and never folded into the headline: the offset here is centre-versus-barycentre, which is a definition difference and not an error of this reduction.',
      ...summarise(m.rows, (r) => r.isSystemBarycentre),
    },
  };
  writeFileSync(join(OUT, `rows-${setName}.json`), `${JSON.stringify(m.rows)}\n`);
}

process.stderr.write('measuring the derivative ...\n');
report.derivative = derivativeCheck();
report.barycentricMoon = barycentricMoon();

writeFileSync(join(OUT, 'report.json'), `${JSON.stringify(report, null, 1)}\n`);
runtime.dispose();

// ---------------------------------------------------------------- console
const f = (x) => (x === null ? '—' : x.toExponential(4));
for (const [setName, s] of Object.entries(report.sets)) {
  console.log(`\n=== ${setName} — ${s.bodyCentresOnly.n} body-epochs on true centres, ${s.allBodies.n} on all ten ===`);
  console.log('vs Swiss, arcsec (true centres only)   max        p50        p95');
  for (const k of ['A', 'B', 'C', 'D']) {
    const v = s.bodyCentresOnly.vsSwissArcsec[k];
    console.log(`  ${k} ${CONFIGS[k].backend.padEnd(28)} ${CONFIGS[k].reduction.padEnd(10)} ${f(v.max)} ${f(v.p50)} ${f(v.p95)}`);
  }
  console.log('between configurations, arcsec (all ten bodies)');
  for (const [k, v] of Object.entries(s.allBodies.betweenConfigurationsArcsec)) {
    console.log(`  ${k.padEnd(48)} max ${f(v.max)}  p50 ${f(v.p50)}`);
  }
  const c = s.allBodies.compositionResidualArcsec;
  console.log(`  composition residual                             max ${f(c.max)}  p50 ${f(c.p50)}`);
  if (s.skipped.length) console.log(`  skipped: ${s.skipped.length} (${[...new Set(s.skipped.map((x) => x.why))].join('; ')})`);
}
console.log('\nbackend derivative, pack vs kernel');
for (const [b, v] of Object.entries(report.derivative.perBody)) {
  console.log(`  ${b.padEnd(9)} position max ${f(v.positionKm.max)} km   velocity max ${f(v.velocityKmPerSec.max)} km/s`);
}
console.log(`\nbarycentric Moon, pack vs kernel: sampled max ${f(report.barycentricMoon.remeasuredSampledBarycentricMoonKm.max)} km`);
console.log(`  recorded: sampled ${report.barycentricMoon.recorded.sampledKm} km, PROVEN ${report.barycentricMoon.recorded.provenKm} km against a 0.2 km target -> ${report.barycentricMoon.recorded.verdict}`);
console.log(`wrote ${join(OUT, 'report.json')}`);
