/*
 * Gzip bytes of the engine chunk's static closure in a built site, the way
 * scripts/report-bundles.mjs counts it (full.*.js and every chunk it imports
 * statically, each gzipped at level 9), plus where the model's knot table
 * and rc.7's Espenak–Meeus polynomial appear. Prints one JSON object.
 *
 *   node tools/bundle/engine-closure.mjs <site>/dist <label> [report-bundles output]
 *
 * With the third argument it also records each route's gzip size and budget
 * as report-bundles printed them.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { basename, resolve } from 'node:path';

const dir = resolve(process.argv[2], '_astro');
const files = readdirSync(dir).filter((f) => f.endsWith('.js'));
const src = (f) => readFileSync(resolve(dir, f), 'utf8');
const imports = (code) => {
  const out = new Set();
  for (const m of code.matchAll(/(?:^|[;\s}])import\s*(?:[\w*{}\s,$]+from\s*)?["']([^"']+)["']/g)) out.add(m[1]);
  for (const m of code.matchAll(/(?:^|[;\s}])export\s*(?:\*|\{[^}]*\})\s*from\s*["']([^"']+)["']/g)) out.add(m[1]);
  return [...out];
};
const full = files.filter((f) => /^full\.[^/]+\.js$/.test(f));
if (full.length !== 1) throw new Error(`expected one full.*.js, found ${full.length}`);
const seen = new Set();
const visit = (f) => {
  if (seen.has(f)) return;
  seen.add(f);
  for (const s of imports(src(f))) if (s.startsWith('./')) visit(basename(s));
};
visit(full[0]);
const chunks = [...seen].map((f) => ({ file: f, gzip: gzipSync(readFileSync(resolve(dir, f)), { level: 9 }).length }));
const has = (re) => files.filter((f) => re.test(src(f)));
const routes = {};
if (process.argv[4]) {
  for (const line of readFileSync(process.argv[4], 'utf8').split('\n')) {
    const m = line.match(/^  (\/\S*)\s+([\d.]+) KB \/\s+([\d.]+) KB/);
    if (m) routes[m[1]] = { kb: +m[2], budgetKb: +m[3] };
  }
}
process.stdout.write(`${JSON.stringify({
  label: process.argv[3] ?? null,
  engineClosureGzipBytes: chunks.reduce((sum, c) => sum + c.gzip, 0),
  chunks,
  filesWithKnotTable: has(/2482,48,47,50/),
  filesWithEspenakMeeus: has(/\.32217\*/),
  routes,
})}\n`);
