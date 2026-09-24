// Build a normalized findings ledger from results/*.json (+ optional verdicts.json).
// Usage: node ledger.mjs [resultsDir] [verdictsJson] > ledger.md
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2] ?? new URL('./results/', import.meta.url).pathname;
const verdictsPath = process.argv[3];
const rank = { blocking: 0, major: 1, minor: 2, note: 3 };

const areas = readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')));
let verdicts = new Map();
if (verdictsPath && existsSync(verdictsPath)) {
  const v = JSON.parse(readFileSync(verdictsPath, 'utf8'));
  for (const set of v.verdictSets ?? []) {
    for (const x of set.verdicts ?? []) verdicts.set(x.id, { ...x, lens: 1 });
    for (const x of set.secondLens ?? []) {
      const prev = verdicts.get(x.id);
      verdicts.set(x.id, prev ? { ...prev, second: x } : { ...x, lens: 2 });
    }
  }
}

const all = [];
for (const a of areas) for (const f of a.findings) all.push({ area: a.area, ...f });
const effective = (f) => {
  const v = verdicts.get(f.id);
  if (!v) return { sev: f.severity, status: 'unverified' };
  if (v.verdict === 'refuted') return { sev: null, status: 'refuted' };
  const sev = v.correctedSeverity ?? f.severity;
  return { sev, status: v.verdict + (v.second ? `/${v.second.verdict}` : '') };
};
all.sort((x, y) => {
  const ex = effective(x), ey = effective(y);
  return (ex.sev === null ? 9 : rank[ex.sev]) - (ey.sev === null ? 9 : rank[ey.sev]) || x.area.localeCompare(y.area);
});

const counts = { blocking: 0, major: 0, minor: 0, note: 0, refuted: 0 };
for (const f of all) { const e = effective(f); if (e.sev === null) counts.refuted++; else counts[e.sev]++; }

console.log(`# Findings ledger — ${areas.length} areas, ${all.length} findings (blocking ${counts.blocking}, major ${counts.major}, minor ${counts.minor}, note ${counts.note}, refuted ${counts.refuted})\n`);
for (const f of all) {
  const e = effective(f);
  const v = verdicts.get(f.id);
  console.log(`## ${f.id} — ${f.title}`);
  console.log(`- severity: ${f.severity}${e.sev && e.sev !== f.severity ? ` → ${e.sev}` : ''} · status: ${e.status} · effort: ${f.effortDays} d`);
  if (v?.correctedClaim) console.log(`- corrected claim: ${v.correctedClaim}`);
  console.log(`- claim: ${f.claim}`);
  console.log(`- evidence: ${f.evidence}`);
  console.log(`- impact: ${f.impact}`);
  console.log(`- fix: ${f.fix}`);
  if (v?.evidence) console.log(`- verifier: ${v.evidence}`);
  if (v?.second?.evidence) console.log(`- second lens: ${v.second.evidence}`);
  console.log('');
}
console.log('\n# Swiss gap (all areas)\n');
for (const a of areas) for (const g of a.swissGap) console.log(`- [${a.area}] ${g.capability}: Swiss — ${g.swiss} · Zodiacs — ${g.zodiacs} · exceed — ${g.exceedPath}`);
console.log('\n# Measurements (all areas)\n');
for (const a of areas) for (const m of a.measurements) console.log(`- [${a.area}] ${m.name}: ${m.result}${m.artifactPath ? ` (${m.artifactPath})` : ''}`);
console.log('\n# Not examined (all areas)\n');
for (const a of areas) console.log(`- [${a.area}] ${(a.notExamined ?? []).join(' | ')}`);
