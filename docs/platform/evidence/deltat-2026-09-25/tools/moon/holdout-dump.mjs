/*
 * The engine's Moon at each holdout instant, with its UT and TT, on the
 * installed (vendored) engine as it ships: no ΔT is set here.
 *
 *   node tools/moon/holdout-dump.mjs holdout-1.4.json > holdout-dump.jsonl
 */
import { readFileSync } from 'node:fs';
import { ENGINE_VERSION } from '@zodiacs/engine';
import { bodyLongitude } from '@zodiacs/engine/internal';
import { MakeTime } from 'astronomy-engine';

const holdout = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const lines = [JSON.stringify({ engine: ENGINE_VERSION, id: holdout.id })];
for (const p of holdout.positions) {
  const date = new Date(p.utc);
  const moon = bodyLongitude('Moon', date); // installs the engine's ΔT before MakeTime reads it
  const time = MakeTime(date);
  lines.push(JSON.stringify({ utc: p.utc, ut: time.ut, tt: time.tt, moon }));
}
process.stdout.write(`${lines.join('\n')}\n`);
