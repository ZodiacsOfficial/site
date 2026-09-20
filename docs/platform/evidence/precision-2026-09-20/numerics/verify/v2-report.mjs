import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const CMP = '/home/user/site/docs/platform/evidence/swiss-benchmark/tools/compare.mjs';
const idx = JSON.parse(readFileSync('verify/sweep/sweep-index.json', 'utf8'));
const swiss = '/tmp/claude-0/swisslab/swiss-measure.json';
const table = [];
for (const [name, { slug, options }] of Object.entries(idx)) {
  const out = execFileSync('node', [CMP, `verify/sweep/sweep-${slug}.json`, swiss], { maxBuffer: 1 << 28 }).toString();
  const rep = JSON.parse(out);
  const o = rep.overall;
  const worst = rep.rows.reduce((m, r) => (Math.abs(r.dLonArcsec) > Math.abs(m.dLonArcsec) ? r : m), rep.rows[0]);
  // also latitude stats, which the published report never tabulates
  const absLat = rep.rows.map(r=>Math.abs(r.dLatArcsec)).sort((a,b)=>a-b);
  table.push({ name, n: o.n, max: o.maxAbsArcsec, p50: o.p50ArcsecAbs, p95: o.p95ArcsecAbs,
    worst: `${worst.body}@${worst.id} ${worst.dLonArcsec}`,
    nConverged: rep.rows.length,
    latMax: absLat[absLat.length-1] });
}
writeFileSync('verify/v2-sweep-summary.json', JSON.stringify(table, null, 1));
for (const r of table) console.log(r.name.padEnd(40), String(r.n).padEnd(4), r.max.toFixed(9).padEnd(13), r.p50.toFixed(9).padEnd(13), r.p95.toFixed(9).padEnd(13), r.worst);
