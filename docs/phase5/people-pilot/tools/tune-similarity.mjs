/**
 * Deterministic similarity repair. Recomposes one member of every pair
 * above the working ceiling with a bumped seed round, until the maximum
 * pairwise similarity sits at or below TARGET. Pilot pages are never
 * reseeded — their copy is released and frozen.
 *
 *   node docs/phase5/people-pilot/tools/tune-similarity.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const PILOT = join(HERE, '..');
const TARGET = 0.295;
const PILOT_20 = new Set(JSON.parse(await readFile(join(PILOT, 'manifest.json'), 'utf8'))
  .people.map((person) => person.slug));

let reseeds = {};
try { reseeds = JSON.parse(await readFile(join(PILOT, 'reseeds.json'), 'utf8')); } catch {}

for (let round = 1; round <= 10; round += 1) {
  const depth = JSON.parse(await readFile(join(PILOT, 'depth-report.json'), 'utf8'));
  const offending = depth.topPairs.filter((pair) => pair.similarity > TARGET);
  console.log(`round ${round}: max ${depth.highestSimilarity.similarity} (${depth.highestSimilarity.pair.join(' <> ')}); ${offending.length} pairs above ${TARGET}`);
  if (offending.length === 0) break;
  let bumped = 0;
  const bumpedNow = new Set();
  for (const pair of offending) {
    const choice = !PILOT_20.has(pair.b) ? pair.b : !PILOT_20.has(pair.a) ? pair.a : null;
    if (!choice || bumpedNow.has(choice)) continue;
    reseeds[choice] = (reseeds[choice] ?? 0) + 1;
    bumpedNow.add(choice);
    bumped += 1;
  }
  if (bumped === 0) { console.log('nothing reseedable'); break; }
  await writeFile(join(PILOT, 'reseeds.json'), `${JSON.stringify(reseeds, null, 1)}\n`);
  execFileSync('node', [join(HERE, 'compose-copy.mjs')], {
    env: { ...process.env, FREEZE_EXISTING: '1' }, stdio: 'ignore',
  });
}
const final = JSON.parse(await readFile(join(PILOT, 'depth-report.json'), 'utf8'));
console.log(`final max: ${final.highestSimilarity.similarity} (${final.highestSimilarity.pair.join(' <> ')})`);
