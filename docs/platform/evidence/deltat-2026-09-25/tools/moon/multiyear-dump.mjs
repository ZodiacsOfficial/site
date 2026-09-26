/*
 * The multi-year fixture's instants (every ten days, 1800-01-01 to 2199-12-31,
 * 12:00 UTC; ../../../swiss-benchmark/tools/multiyear-zodiacs.mjs) on the
 * installed engine, with astronomy-engine's ΔT set to a zodiacs-deltat/1
 * module first ("em" leaves rc.7's Espenak–Meeus in place, which reproduces
 * the committed dump, sha256 4552e19f…). With the engine at rc.8 or later the
 * engine installs its own model on every call, so the module named here must
 * be the one it ships. One JSON line per instant: UTC, the engine's UT and TT
 * (days from J2000) and each body's longitude and latitude. Nothing is written
 * into the repository and nothing is fetched.
 *
 *   node --experimental-strip-types tools/moon/multiyear-dump.mjs [module|em] > dump.jsonl
 */
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { ENGINE_VERSION } from '@zodiacs/engine';
import { computeBodies } from '@zodiacs/engine/internal';
import { MakeTime, SetDeltaTFunction } from 'astronomy-engine';

const which = process.argv[2] ?? new URL('../deltat-reference.ts', import.meta.url).pathname;
let label = ENGINE_VERSION;
if (which !== 'em') {
  const D = await import(pathToFileURL(resolve(which)).href);
  SetDeltaTFunction(D.deltaT);
  label += `+${D.DELTA_T_MODEL}@${D.DELTA_T_TABLE.digest}`;
}
const DAY = 86_400_000;
const start = Date.UTC(1800, 0, 1, 12);
const end = Date.UTC(2200, 0, 1);
const lines = [JSON.stringify({ engine: which === 'em' ? ENGINE_VERSION : label, node: process.version, cadenceDays: 10, from: '1800-01-01', to: '2199-12-31' })];
for (let t = start; t < end; t += 10 * DAY) {
  const date = new Date(t);
  const time = MakeTime(date);
  const bodies = Object.fromEntries(computeBodies(date).map((b) => [b.body, [b.lon, b.lat]]));
  lines.push(JSON.stringify({ utc: date.toISOString(), ut: time.ut, tt: time.tt, bodies }));
}
process.stdout.write(`${lines.join('\n')}\n`);
