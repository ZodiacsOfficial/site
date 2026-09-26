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
 * It reads the installed @zodiacs/engine, the vendored version the site runs,
 * writes nothing into the repository and makes no network request.
 *
 * Since engine 0.1.1-rc.8 the engine's clock is its own observed ΔT
 * (@zodiacs/engine/deltat), which it installs in astronomy-engine before each
 * of its calls. MakeTime runs before the engine here, so the clock is
 * installed first; the TT written is then the engine's own.
 */
import { ENGINE_VERSION } from '@zodiacs/engine';
import { deltaT } from '@zodiacs/engine/deltat';
import { computeBodies } from '@zodiacs/engine/internal';
import { MakeTime, SetDeltaTFunction } from 'astronomy-engine';

SetDeltaTFunction(deltaT);

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
