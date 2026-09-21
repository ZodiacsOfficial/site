/** Runs the shared comparator over every sweep variant and tabulates. */
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const CMP = '/home/user/site/docs/platform/evidence/swiss-benchmark/tools/compare.mjs';
const idx = JSON.parse(readFileSync('raw/sweep/sweep-index.json', 'utf8'));
const swiss = '/tmp/claude-0/swisslab/swiss-measure.json';
const table = [];
const perBody = {};
for (const [name, { slug, options }] of Object.entries(idx)) {
  const out = execFileSync('node', [CMP, `raw/sweep/sweep-${slug}.json`, swiss], { maxBuffer: 1 << 28 }).toString();
  const rep = JSON.parse(out);
  writeFileSync(`raw/sweep/report-${slug}.json`, out);
  const o = rep.overall;
  // compare.mjs's own worstCase seeds its reduce with -1, so it reports null
  // whenever the maximum is under one arcsecond.  Recompute it here.
  const worst = rep.rows.reduce((m, r) => (Math.abs(r.dLonArcsec) > Math.abs(m.dLonArcsec) ? r : m), rep.rows[0]);
  table.push({ name, options, n: o.n, max: o.maxAbsArcsec, p50: o.p50ArcsecAbs, p95: o.p95ArcsecAbs,
               worst: { id: worst.id, body: worst.body, dLonArcsec: worst.dLonArcsec } });
  perBody[name] = Object.fromEntries(Object.entries(rep.byBody).map(([b, s]) => [b, { n: s.n, max: s.maxAbsArcsec, p50: s.p50ArcsecAbs }]));
}
writeFileSync('raw/t2-sweep-summary.json', JSON.stringify({ comparator: CMP, table, perBody }, null, 1));
const pad = (s, n) => String(s).padEnd(n);
console.log(pad('variant', 40), pad('n', 5), pad('max"', 10), pad('p50"', 10), pad('p95"', 10), 'worst');
for (const r of table) {
  console.log(pad(r.name, 40), pad(r.n, 5), pad(r.max.toFixed(6), 10), pad(r.p50.toFixed(6), 10), pad(r.p95.toFixed(6), 10), `${r.worst.body}@${r.worst.id} ${r.worst.dLonArcsec.toFixed(5)}`);
}
