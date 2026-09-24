// Merge verify/verdicts-*.json into verify/verdicts.json {verdictSets:[{area, verdicts, unverified, notes, secondLens}]}
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
const dir = new URL('./verify/', import.meta.url).pathname;
const files = readdirSync(dir).filter((f) => /^verdicts-.*\.json$/.test(f) && f !== 'verdicts.json');
const sets = new Map();
for (const f of files) {
  const v = JSON.parse(readFileSync(dir + f, 'utf8'));
  const second = f.endsWith('-second.json');
  const cur = sets.get(v.area) ?? { area: v.area, verdicts: [], unverified: [], notes: '', secondLens: [] };
  if (second) cur.secondLens = v.verdicts; else { cur.verdicts = v.verdicts; cur.unverified = v.unverified ?? []; cur.notes = v.notes ?? ''; }
  sets.set(v.area, cur);
}
const out = { verdictSets: [...sets.values()] };
writeFileSync(dir + 'verdicts.json', JSON.stringify(out, null, 2));
const tally = {};
for (const s of out.verdictSets) for (const x of s.verdicts) tally[x.verdict] = (tally[x.verdict] ?? 0) + 1;
console.log(`${out.verdictSets.length} areas`, JSON.stringify(tally));
