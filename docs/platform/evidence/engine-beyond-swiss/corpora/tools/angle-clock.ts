/*
 * Prints the engine's own clock for grids A and L of angle-grid-inputs.json,
 * for angle-arbiter.py: each instant as UT and TT days from J2000, the way
 * astronomy-engine's MakeTime reads the UTC string (UT taken as UTC, TT from
 * its ΔT model). The arbiter uses the same two numbers, so its comparison
 * with the engine measures the angle model and not the clock. Run from the
 * repository root:
 *
 *   npx vite-node --script docs/platform/evidence/engine-beyond-swiss/corpora/tools/angle-clock.ts > angle-clock.json
 */
import { readFileSync } from 'node:fs';
import { MakeTime } from 'astronomy-engine';

const corpus = JSON.parse(readFileSync(new URL('../angle-grid-inputs.json', import.meta.url), 'utf8'));
const clock = (rows: [string, number, number, string][]) => rows.map(([utc]) => {
  const time = MakeTime(new Date(utc));
  return [time.ut, time.tt];
});
process.stdout.write(`${JSON.stringify({ A: clock(corpus.A), L: clock(corpus.L) })}\n`);
