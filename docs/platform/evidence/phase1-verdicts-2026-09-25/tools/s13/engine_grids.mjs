/*
 * Grids A and L of angle-grid-inputs.json through the SHIPPED chart path: the site's
 * src/lib/engine/full.ts computeChart (adaptChart over @zodiacs/engine/internal computeChart,
 * the vendored 0.1.1-rc.7), house system Placidus, time known. Also records, per case, the
 * engine clock and the two inputs its angles are built from (astronomy-engine SiderealTime and
 * e_tilt), and cross-checks the site path against the package's computeChart called directly.
 *
 * No Swiss input. Run with vite-node from the site root and this folder's Vite config (root
 * SITE_ROOT, so full.ts and its TS imports resolve as the site resolves them):
 *   cd $SITE_ROOT && npx vite-node --config <tools>/vite.config.mjs <tools>/s13/engine_grids.mjs > $WORK/s13/engine-grids.log
 * (--config, not --script: --script makes vite-node ignore --config.) Writes
 * $WORK/s13/engine-grids.json, which records the corpus's absolute path. Reads the repository;
 * writes nothing into it.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { SITE_ROOT, WORK, outDir } from '../lib/paths.mjs';

const TREE = SITE_ROOT;
const O = WORK;
outDir('s13');
const corpusPath = `${TREE}/docs/platform/evidence/engine-beyond-swiss/corpora/angle-grid-inputs.json`;
const corpusBytes = readFileSync(corpusPath);
const corpus = JSON.parse(corpusBytes.toString('utf8'));

const site = await import(`${TREE}/src/lib/engine/full.ts`);
const pkg = await import(`${TREE}/node_modules/@zodiacs/engine/dist/internal.js`);
const math = await import(`${TREE}/node_modules/@zodiacs/engine/dist/internal-math.js`);
const ae = await import(`${TREE}/node_modules/astronomy-engine/esm/astronomy.js`);
if (math.ENGINE_VERSION !== '0.1.1-rc.7') throw new Error(`engine ${math.ENGINE_VERSION}`);

let packageMismatches = 0;
const run = (rows) => rows.map(([utc, latitude, longitude, hsys], index) => {
  const input = { utc: new Date(utc), latitude, longitude, houseSystem: 'placidus', timeKnown: true };
  const chart = site.computeChart(input);
  if (chart.engineVersion !== '0.1.1-rc.7') throw new Error(`chart engineVersion ${chart.engineVersion}`);
  const direct = pkg.computeChart({ ...input, utc: new Date(utc) });
  const same = direct.angles.asc === chart.angles.asc && direct.angles.mc === chart.angles.mc
    && direct.houses.system === chart.houses.system
    && direct.houses.cusps.every((c, i) => c === chart.houses.cusps[i])
    && direct.flags.join() === chart.flags.join();
  if (!same) packageMismatches += 1;
  const time = ae.MakeTime(new Date(utc));
  const tilt = ae.e_tilt(time);
  return {
    i: index, utc, lat: latitude, lon: longitude, hsys,
    asc: chart.angles.asc, mc: chart.angles.mc,
    system: chart.houses.system, cusps: chart.houses.cusps, flags: chart.flags,
    ut: time.ut, tt: time.tt, gastHours: ae.SiderealTime(time),
    dpsi: tilt.dpsi, deps: tilt.deps, ee: tilt.ee, mobl: tilt.mobl, tobl: tilt.tobl,
  };
});

const A = run(corpus.A);
const L = run(corpus.L);
const out = {
  what: 'grids A and L through the site computeChart (src/lib/engine/full.ts) on @zodiacs/engine 0.1.1-rc.7, Placidus, timeKnown',
  corpus: { path: corpusPath, sha256: createHash('sha256').update(corpusBytes).digest('hex') },
  engineVersion: math.ENGINE_VERSION,
  node: process.version,
  units: 'asc, mc, cusps, mobl, tobl in degrees; gastHours in hours; dpsi, deps in arcseconds; ee in seconds of time; ut, tt in days from J2000',
  packageMismatches,
  A, L,
};
writeFileSync(`${O}/s13/engine-grids.json`, JSON.stringify(out));
console.log(JSON.stringify({
  A: A.length, L: L.length, packageMismatches,
  AFallbacks: A.filter((r) => r.flags.includes('polar-fallback')).length,
  LFallbacks: L.filter((r) => r.flags.includes('polar-fallback')).length,
  corpusSha256: out.corpus.sha256,
}));
