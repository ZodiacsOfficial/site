/*
 * The fresh holdout for step 1.4, by PREREGISTRATION.md's rule ("Fresh
 * holdouts"): mulberry32 seeded with the first 32 bits of
 * SHA-256("zodiacs-holdout/1.4"). Draw order, fixed here before the draw:
 *   1. positions: 200 times (utc uniform in whole milliseconds over
 *      [1800-01-01T00:00Z, 2200-01-01T00:00Z), then latitude uniform in
 *      [−66.5, 66.5], then longitude uniform in [−180, 180));
 *   2. events: 50 events without replacement, uniform over the events
 *      catalog's events dated 2026-01-01T00:00Z to 2036-01-01T00:00Z, sorted
 *      by instant then id (index = floor(r · remaining));
 *   3. time: 500 pairs of a city-index zone and a local wall minute. Not
 *      used by step 1.4 (it has no time-zone part); drawn last so that its
 *      absence cannot change parts 1 and 2, and not generated here.
 * Generate only after step 1.4's code commit, and open once:
 *
 *   npx vite-node --script docs/platform/evidence/deltat-2026-09-25/tools/holdout.ts [id] > holdout-1.4.json
 *
 * The output records the id, the seed, the site commit (git rev-parse HEAD)
 * and the SHA-256 of the positions and events it lists.
 */
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { eventsCatalog } from '../../../../../src/lib/events/catalog';

const id = process.argv[2] ?? 'zodiacs-holdout/1.4';
const seed = createHash('sha256').update(id).digest().readUInt32BE(0);
function mulberry32(start: number) {
  let a = start >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const r = mulberry32(seed);
const FROM = Date.UTC(1800, 0, 1);
const TO = Date.UTC(2200, 0, 1);
const positions = Array.from({ length: 200 }, () => {
  const utc = new Date(FROM + Math.floor(r() * (TO - FROM))).toISOString();
  const latitude = -66.5 + 133 * r();
  const longitude = -180 + 360 * r();
  return { utc, latitude, longitude };
});
const lo = Date.UTC(2026, 0, 1);
const hi = Date.UTC(2036, 0, 1);
const pool = eventsCatalog()
  .events.map((event) => event.facts)
  .filter((facts) => Date.parse(facts.at) >= lo && Date.parse(facts.at) < hi)
  .sort((a, b) => Date.parse(a.at) - Date.parse(b.at) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
const poolSize = pool.length;
const events = [];
for (let k = 0; k < 50 && pool.length; k++) {
  const [facts] = pool.splice(Math.floor(r() * pool.length), 1);
  events.push({ id: facts!.id, family: facts!.family, at: facts!.at });
}
const digest = (x: unknown) => createHash('sha256').update(JSON.stringify(x)).digest('hex');
let commit = null;
try {
  commit = execSync('git rev-parse HEAD', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
} catch {}
process.stdout.write(`${JSON.stringify({ id, seed, commit, catalogEventsInRange: poolSize, positionsSha256: digest(positions), eventsSha256: digest(events), positions, events }, null, 1)}\n`);
