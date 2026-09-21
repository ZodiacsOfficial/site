/**
 * What the nutation fix would buy the SHIPPED core.
 *
 * Replacing the nutation series shifts every apparent ecliptic longitude at a
 * given instant by exactly the change in nutation-in-longitude: the mean and
 * true ecliptic of date are the SAME PLANE, so only the origin moves.  The
 * differential sweep confirms this empirically -- the astronomy-engine-vs-
 * IAU2000B difference is 0.250267" for all ten bodies alike, identical to
 * 1e-6 arcsec.  So the counterfactual can be formed exactly, by adding
 * (dpsi_2000B - dpsi_astronomyEngine) to the core's own dumped longitudes.
 *
 * The same correction is applied to the prototype's cell-D dump as a CONTROL:
 * it must reproduce the independently computed sweep variant.
 *
 *   node t2-core-counterfactual.mjs <outdir>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import * as A from 'astronomy-engine';
import { nut00b, nutAstronomyEngine, adjustToP03 } from '../src/nutation.mjs';

const OUT = process.argv[2];
const CMP = '/home/user/site/docs/platform/evidence/swiss-benchmark/tools/compare.mjs';
const SWISS = '/tmp/claude-0/swisslab/swiss-measure.json';
const swiss = JSON.parse(readFileSync(SWISS, 'utf8'));
const dtById = new Map(swiss.cases.map((c) => [c.id, c.delta_t_seconds]));

const shift = (ttDays) => {
  const t = ttDays / 36525;
  return adjustToP03(nut00b(t), t).dpsi - nutAstronomyEngine(t).dpsi;   // arcsec
};

const patch = (srcPath, timeMode, label) => {
  const d = JSON.parse(readFileSync(srcPath, 'utf8'));
  for (const c of d.cases) {
    const ut = new Date(c.utc).getTime() / 86400000 - 10957.5;
    const ttDays = timeMode === 'matched'
      ? ut + dtById.get(c.id) / 86400
      : A.MakeTime(new Date(c.utc)).tt;
    const ds = shift(ttDays) / 3600;
    for (const b of Object.keys(c.bodies)) {
      if (c.bodies[b] && typeof c.bodies[b].lon === 'number') {
        c.bodies[b].lon = (c.bodies[b].lon + ds + 360) % 360;
      }
    }
  }
  d.patched = `nutation replaced: astronomy-engine 5-term -> published IAU2000B (${label})`;
  const p = `${OUT}/${label}.json`;
  writeFileSync(p, JSON.stringify(d));
  return p;
};

/** The 2x2 is reported on the 160 rows all four cells have in common: the
 *  16 corpus cases that lie inside the de440s coverage window.  Restricting
 *  the core cells the same way is what makes the cells comparable at all. */
const COMMON = new Set(JSON.parse(readFileSync('raw/common-cases.json', 'utf8')));
const restrict = (srcPath, label) => {
  const d = JSON.parse(readFileSync(srcPath, 'utf8'));
  d.cases = d.cases.filter((c) => COMMON.has(c.id));
  const p = `${OUT}/${label}-common.json`;
  writeFileSync(p, JSON.stringify(d));
  return p;
};

const measure = (dumpPath) => {
  const rep = JSON.parse(execFileSync('node', [CMP, dumpPath, SWISS], { maxBuffer: 1 << 28 }).toString());
  const worst = rep.rows.reduce((m, r) => (Math.abs(r.dLonArcsec) > Math.abs(m.dLonArcsec) ? r : m), rep.rows[0]);
  return { n: rep.overall.n, max: rep.overall.maxAbsArcsec, p50: rep.overall.p50ArcsecAbs,
           p95: rep.overall.p95ArcsecAbs, worst: { id: worst.id, body: worst.body, d: worst.dLonArcsec } };
};

const LAB = '/home/user/precision/lab/raw';
const cases = [
  ['A core, engine time', `${LAB}/cellA-core-own.json`, 'own', 'cellA-core-own'],
  ['B core, matched time', `${LAB}/cellB-core-pinned.json`, 'matched', 'cellB-core-pinned'],
  ['C prototype, engine time', `${LAB}/cellC-proto-own.json`, 'own', 'cellC-proto-own'],
  ['D prototype, matched time', `${LAB}/cellD-proto-pinned.json`, 'matched', 'cellD-proto-pinned'],
];
const table = {};
for (const [name, src, mode, label] of cases) {
  const before = measure(restrict(src, label));
  const after = measure(restrict(patch(src, mode, `${label}-nut2000b`), `${label}-nut2000b`));
  table[name] = { before, after };
}
writeFileSync(`${OUT}/t2-core-counterfactual.json`, JSON.stringify({
  what: 'effect of replacing the astronomy-engine nutation with published IAU2000B, on each 2x2 cell',
  method: 'exact common-mode longitude shift; validated against the independently computed sweep variant',
  comparator: CMP, table,
}, null, 1));
const pad = (s, n) => String(s).padEnd(n);
console.log(pad('cell', 28), pad('n', 5), pad('max" before', 13), pad('max" after', 13), pad('p50 before', 12), pad('p50 after', 12), pad('p95 before', 12), 'p95 after');
for (const [k, v] of Object.entries(table)) {
  console.log(pad(k, 28), pad(v.before.n, 5), pad(v.before.max.toFixed(6), 13), pad(v.after.max.toFixed(6), 13),
    pad(v.before.p50.toFixed(6), 12), pad(v.after.p50.toFixed(6), 12), pad(v.before.p95.toFixed(6), 12), v.after.p95.toFixed(6));
}
