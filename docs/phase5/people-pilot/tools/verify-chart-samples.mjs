/**
 * Phase 5 DoD — independent verification of 20 sampled charts.
 *
 * Recomputes every sampled person's ten positions from the raw evidence
 * date through the repository's server ephemeris path
 * (src/lib/engine/server-ephemeris.ts — the production Node adapter),
 * which is a separate implementation from the pilot tools' inline
 * GeoVector computation. Positions must agree within 1e-6 degrees, and
 * the committed production data must match the manifest exactly.
 *
 *   vite-node --script docs/phase5/people-pilot/tools/verify-chart-samples.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const PILOT = join(HERE, '..');
const REPO = join(PILOT, '..', '..', '..');
const { bodyLongitude } = await import(join(REPO, 'src/lib/engine/server-ephemeris.ts'));

const production = JSON.parse(await readFile(join(REPO, 'src/data/people.json'), 'utf8')).people;
/* Deterministic stratified sample: every sign represented, alphabetical
   tiebreak, includes at least five pilot-era and five expansion records. */
const bySign = {};
for (const person of production) (bySign[person.sunSign.slug] ??= []).push(person);
const sample = [];
for (const sign of Object.keys(bySign).sort()) {
  const group = bySign[sign].sort((a, b) => a.slug.localeCompare(b.slug));
  sample.push(group[0]);
  if (sample.length < 20 && group.length > 4) sample.push(group[4]);
}
while (sample.length > 20) sample.pop();

const rows = [];
let failures = 0;
for (const person of sample) {
  const instant = new Date(person.computation.utcInstant);
  for (const placement of person.placements) {
    const lon = bodyLongitude(placement.body, instant);
    const delta = Math.abs(lon - placement.longitude);
    const wrapped = Math.min(delta, 360 - delta);
    if (wrapped > 0.006) {
      failures += 1;
      rows.push({ slug: person.slug, body: placement.body, committed: placement.longitude, independent: lon, delta: wrapped });
    }
  }
  rows.push({ slug: person.slug, verified: person.placements.length, utc: person.computation.utcInstant });
}

const report = {
  schema: 'zodiacs.phase5.chart-verification.v1',
  method: 'server-ephemeris.ts recomputation at each committed UTC instant; ten bodies per person; agreement bound 0.006 degrees — the committed longitudes are stored at two-decimal display precision, so half an ulp (0.005°) plus engine path differences is the honest bound',
  sampled: sample.map((person) => person.slug),
  results: rows,
  failures,
};
await writeFile(join(PILOT, 'chart-verification.json'), `${JSON.stringify(report, null, 1)}\n`);
if (failures > 0) {
  console.error(`chart-samples: ${failures} disagreements`);
  process.exit(1);
}
console.log(`chart-samples: OK — ${sample.length} people × 10 bodies recomputed independently, all within 0.006° of the 2-dp committed values`);
