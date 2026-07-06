/*
 * Prints gzip sizes of the built JS chunks in dist/_astro against the
 * page budgets from docs/STRATEGY.md. Warn-only for now: the report is
 * the enforcement mechanism until budgets have soaked.
 *
 *   npm run build && node scripts/report-bundles.mjs
 */
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { gzipSync } from 'node:zlib';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dir = resolve(root, 'dist/_astro');

// Budgets (gzip). The homepage must stay under ~25KB total JS and must
// never pull astronomy-engine; the engine chunk itself may be ~45KB but
// only loads on calculator pages, on demand.
const WARN_CHUNK_KB = 60;

let entries;
try {
  entries = (await readdir(dir)).filter((f) => f.endsWith('.js'));
} catch {
  console.log('report-bundles: no dist/_astro directory (no JS emitted?)');
  process.exit(0);
}

const rows = [];
for (const f of entries) {
  const buf = await readFile(join(dir, f));
  const gz = gzipSync(buf, { level: 9 }).length;
  rows.push({ file: f, raw: buf.length, gz });
}
rows.sort((a, b) => b.gz - a.gz);

let warned = false;
console.log('chunk gzip sizes (dist/_astro):');
for (const { file, raw, gz } of rows) {
  const kb = (gz / 1024).toFixed(1);
  const flag = gz > WARN_CHUNK_KB * 1024 ? '  ⚠ over per-chunk warn threshold' : '';
  if (flag) warned = true;
  console.log(`  ${kb.padStart(7)} KB gz  (${(raw / 1024).toFixed(1)} KB raw)  ${file}${flag}`);
}
const total = rows.reduce((s, r) => s + r.gz, 0);
console.log(`  total: ${(total / 1024).toFixed(1)} KB gz across ${rows.length} chunks`);
if (warned) console.log('report-bundles: warnings above (non-fatal).');
