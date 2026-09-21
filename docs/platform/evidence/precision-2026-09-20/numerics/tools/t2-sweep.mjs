/**
 * Sweeps the reduction's modelling switches over the pinned 16-case corpus
 * and re-measures each variant against the Swiss reference with the SAME
 * comparator the rest of the laboratory uses.
 *
 *   node t2-sweep.mjs <kernel> <swiss-measure.json> <outdir>
 *
 * Delta-T is taken from the reference run per case, so the clock is held
 * fixed and what moves is the model under test and nothing else.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { Backend, PROTOTYPE, DEFAULTS } from '../src/apparent2.mjs';
import { MEASURE, BODIES } from '/home/user/site/docs/platform/evidence/swiss-benchmark/tools/corpus.mjs';

const [kernel, swissPath, outDir] = process.argv.slice(2);
const swiss = JSON.parse(readFileSync(swissPath, 'utf8'));
if (!swiss.is_full_swiss_configuration) throw new Error('Swiss reference fell back; refusing');
const byId = new Map(swiss.cases.map((c) => [c.id, c]));
const de = new Backend(kernel);
const DAY = 86400;

const VARIANTS = {
  'P0 prototype as shipped': { ...PROTOTYPE },
  'P1 + IAU2000B nutation': { ...PROTOTYPE, nutation: '2000b' },
  'P1a + IAU2000A nutation': { ...PROTOTYPE, nutation: '2000a' },
  'P2 + frame bias only': { ...PROTOTYPE, bias: true },
  'P3 + 2000B + frame bias': { ...PROTOTYPE, nutation: '2000b', bias: true },
  'P4 + 2000B + bias + TDB': { ...PROTOTYPE, nutation: '2000b', bias: true, timescale: 'tdb' },
  'P5 + 2000B + bias + TDB + deflection': { ...PROTOTYPE, nutation: '2000b', bias: true, timescale: 'tdb', deflection: 'sun' },
  'P6 + full aberration too': { ...PROTOTYPE, nutation: '2000b', bias: true, timescale: 'tdb', deflection: 'sun', aberration: 'full' },
  'P7 + analytic observer velocity': { ...PROTOTYPE, nutation: '2000b', bias: true, timescale: 'tdb', deflection: 'sun', aberration: 'full', observerVelocity: 'analytic' },
  'P8 best, light-time to 1e-11': { ...DEFAULTS },
  'P8a best with IAU2000A': { ...DEFAULTS, nutation: '2000a' },
  // single-effect ablations from the best model, to size each effect alone
  'A-nutation back to AE': { ...DEFAULTS, nutation: 'ae' },
  'A-bias off': { ...DEFAULTS, bias: false },
  'A-TDB off (TT as TDB)': { ...DEFAULTS, timescale: 'tt' },
  'A-deflection off': { ...DEFAULTS, deflection: 'none' },
  'A-aberration first order': { ...DEFAULTS, aberration: 'first' },
  'A-aberration off': { ...DEFAULTS, aberration: 'none' },
  'A-observer velocity h=60s': { ...DEFAULTS, observerVelocity: 'central60' },
  'A-observer velocity h=600s': { ...DEFAULTS, observerVelocity: 'central600' },
  'A-light-time 1 iteration': { ...DEFAULTS, lightTimeIters: 1 },
  'A-light-time 2 iterations': { ...DEFAULTS, lightTimeIters: 2 },
};

const dump = (opts) => {
  const out = { engine: 'de440s-numerics', deltaTMatched: true, options: opts, set: 'measure', cases: [] };
  for (const kase of MEASURE) {
    const rec = { id: kase.id, stratum: kase.stratum, utc: kase.utc, bodies: {} };
    const dt = byId.get(kase.id)?.delta_t_seconds;
    const ut = new Date(kase.utc).getTime() / 86400000 - 10957.5;
    const ttDays = ut + dt / DAY;
    for (const b of BODIES) {
      try {
        const r = de.apparent(b, ttDays, opts);
        rec.bodies[b] = { lon: r.lon, lat: r.lat, speed: 0, lightTimeIters: r.lightTimeIters, lightTimeConverged: r.lightTimeConverged };
      } catch (error) {
        rec.bodies[b] = null;
        rec.outOfRange = /outside segment coverage/.test(String(error.message)) || rec.outOfRange;
      }
    }
    out.cases.push(rec);
  }
  return out;
};

const results = {};
for (const [name, opts] of Object.entries(VARIANTS)) {
  const slug = name.replace(/[^A-Za-z0-9]+/g, '-').toLowerCase();
  const d = dump(opts);
  writeFileSync(`${outDir}/sweep-${slug}.json`, JSON.stringify(d));
  results[name] = { slug, options: opts };
}
writeFileSync(`${outDir}/sweep-index.json`, JSON.stringify(results, null, 1));
process.stderr.write(`wrote ${Object.keys(results).length} variants\n`);
