/*
 * The §5 corpus (docs/platform/evidence/swiss-benchmark/tools/corpus.mjs):
 * the engine's Moon at each MEASURE and HOLDOUT instant with its UT and TT,
 * ΔT set as in multiyear-dump.mjs.
 *
 *   node --experimental-strip-types tools/moon/corpus-dump.mjs <site root> [module|em] > corpus.jsonl
 */
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { bodyLongitude } from '@zodiacs/engine/internal';
import { ENGINE_VERSION } from '@zodiacs/engine';
import { MakeTime, SetDeltaTFunction } from 'astronomy-engine';

const root = resolve(process.argv[2]);
const which = process.argv[3] ?? new URL('../deltat-reference.ts', import.meta.url).pathname;
const { MEASURE, HOLDOUT } = await import(pathToFileURL(`${root}/docs/platform/evidence/swiss-benchmark/tools/corpus.mjs`).href);
let label = ENGINE_VERSION;
if (which !== 'em') {
  const D = await import(pathToFileURL(resolve(which)).href);
  SetDeltaTFunction(D.deltaT);
  label += `+${D.DELTA_T_MODEL}@${D.DELTA_T_TABLE.digest}`;
}
const lines = [JSON.stringify({ engine: label })];
for (const c of [...MEASURE.map((x) => ({ ...x, set: 'measure' })), ...HOLDOUT.map((x) => ({ ...x, set: 'holdout' }))]) {
  const date = new Date(c.utc);
  const time = MakeTime(date);
  lines.push(JSON.stringify({ id: c.id, set: c.set, utc: c.utc, ut: time.ut, tt: time.tt, moon: bodyLongitude('Moon', date) }));
}
process.stdout.write(`${lines.join('\n')}\n`);
