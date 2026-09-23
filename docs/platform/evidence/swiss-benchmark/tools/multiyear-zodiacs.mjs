/**
 * The Zodiacs side of the multi-year distribution: every ten days from
 * 1800-01-01 to 2199-12-31 at 12:00 UTC, the span the site computes, one line
 * per instant with the engine's longitude and latitude for its twelve bodies
 * and the engine's own UT and TT (days from J2000), which multiyear_swiss.py
 * uses to compare at the same UT and at the same TT. Noon, because Swiss's
 * planetary file starts at 1800-01-01 00:00 TT and the Sun's light-time
 * reaches back before it at midnight.
 *
 *   node docs/platform/evidence/swiss-benchmark/tools/multiyear-zodiacs.mjs > multiyear-zodiacs.jsonl
 *
 * It reads the installed @zodiacs/engine, the vendored rc.6 the site runs,
 * writes nothing into the repository and makes no network request.
 */
import { ENGINE_VERSION } from '@zodiacs/engine';
import { computeBodies } from '@zodiacs/engine/internal';
import { MakeTime } from 'astronomy-engine';

const DAY = 86_400_000;
const start = Date.UTC(1800, 0, 1, 12);
const end = Date.UTC(2200, 0, 1);
const lines = [JSON.stringify({ engine: ENGINE_VERSION, node: process.version, cadenceDays: 10, from: '1800-01-01', to: '2199-12-31' })];
for (let t = start; t < end; t += 10 * DAY) {
  const date = new Date(t);
  const time = MakeTime(date);
  const bodies = Object.fromEntries(computeBodies(date).map((b) => [b.body, [b.lon, b.lat]]));
  lines.push(JSON.stringify({ utc: date.toISOString(), ut: time.ut, tt: time.tt, bodies }));
}
process.stdout.write(`${lines.join('\n')}\n`);
