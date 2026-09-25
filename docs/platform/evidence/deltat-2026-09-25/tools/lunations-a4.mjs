/*
 * A4 projection (rule 1d, re-run after step 1.4): the site's own lunation
 * search (scripts/lunation-search.mjs) over 2026–2030, once on rc.7's ΔT and
 * once with a zodiacs-deltat/1 module installed, each instant put against the
 * Swiss instant the committed deltas imply (swiss = published − deltaSeconds,
 * docs/platform/evidence/events-vs-swiss-2026-09-23/deltas.json). No Swiss
 * call is made. The rc.7 search must reproduce every published instant to
 * 1 ms, which checks the harness. Prints statistics only.
 *
 *   node --experimental-strip-types tools/lunations-a4.mjs <site root> [module] > outputs/lunations-a4.json
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { SetDeltaTFunction, DeltaT_EspenakMeeus } from 'astronomy-engine';

const root = resolve(process.argv[2]);
const modulePath = process.argv[3] ?? new URL('./deltat-reference.ts', import.meta.url).pathname;
const { searchLunations } = await import(pathToFileURL(`${root}/scripts/lunation-search.mjs`).href);
const deltas = JSON.parse(readFileSync(`${root}/docs/platform/evidence/events-vs-swiss-2026-09-23/deltas.json`, 'utf8'));
const D = await import(pathToFileURL(resolve(modulePath)).href);
const lun = deltas.deltas.filter((d) => d.family === 'lunation');
const run = (fn) => {
  SetDeltaTFunction(fn);
  const from = new Date('2026-01-01T00:00:00Z'), to = new Date('2031-01-01T00:00:00Z');
  return [...searchLunations(from, to, 0), ...searchLunations(from, to, 180)].sort((a, b) => a - b);
};
const old = run(DeltaT_EspenakMeeus);
const neu = run(D.deltaT);
const near = (arr, t) => arr.reduce((b, x) => (Math.abs(x - t) < Math.abs(b - t) ? x : b));
const stat = (xs) => {
  const a = xs.map(Math.abs).sort((p, q) => p - q);
  return { within2s: a.filter((x) => x <= 2).length, within5s: a.filter((x) => x <= 5).length, maxAbs: +a.at(-1).toFixed(2),
           mean: +(xs.reduce((s, x) => s + x, 0) / xs.length).toFixed(2), min: +Math.min(...xs).toFixed(2), max: +Math.max(...xs).toFixed(2) };
};
const vsSwissOld = [], vsSwissNew = [], shift = [];
let reproduced = 0, worstId = '', worst = 0, worstMinuteChanges = 0;
for (const d of lun) {
  const pub = Date.parse(d.published), swiss = pub - d.deltaSeconds * 1000;
  const o = near(old, pub), w = near(neu, pub);
  if (Math.abs(o - pub) <= 1) reproduced += 1;
  vsSwissOld.push((o - swiss) / 1000);
  vsSwissNew.push((w - swiss) / 1000);
  shift.push((w - o) / 1000);
  if (Math.abs((w - swiss) / 1000) > worst) { worst = Math.abs((w - swiss) / 1000); worstId = d.id; }
  if (Math.floor(w / 60000) !== Math.floor(o / 60000)) worstMinuteChanges += 1;
}
process.stdout.write(`${JSON.stringify({
  rule: 'A4: all 124 committed lunations within 2 s of Swiss (rule 1d, first part)',
  lunations: lun.length, rc7SearchReproducesPublished: reproduced,
  model: { module: modulePath.split('/').pop(), table: D.DELTA_T_TABLE.digest },
  rc7VsSwiss: stat(vsSwissOld), modelVsSwiss: { ...stat(vsSwissNew), worstEvent: worstId },
  shiftModelMinusRc7Seconds: stat(shift), displayedUtcMinuteChanges: worstMinuteChanges,
}, null, 1)}\n`);
