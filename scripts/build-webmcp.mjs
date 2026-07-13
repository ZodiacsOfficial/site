/*
 * Bundles the draft WebMCP registration module to a stable URL. Base.astro
 * feature-detects the browser API before importing it, so this file remains
 * outside every initial Astro module closure.
 */
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outfile = resolve(repo, 'dist/assets/webmcp-register.js');
const MAX_GZIP_BYTES = 8 * 1024;

await build({
  entryPoints: [resolve(repo, 'src/lib/webmcp/register.ts')],
  bundle: true,
  minify: true,
  format: 'esm',
  target: 'es2020',
  outfile,
});

const bytes = await readFile(outfile);
const gzipBytes = gzipSync(bytes, { level: 9 }).byteLength;
if (gzipBytes >= MAX_GZIP_BYTES) {
  throw new Error(`webmcp-register.js is ${(gzipBytes / 1024).toFixed(1)} KB gzip; limit is under 8 KB`);
}
console.log(
  `webmcp: dist/assets/webmcp-register.js · ${(bytes.byteLength / 1024).toFixed(1)} KB raw`
  + ` · ${(gzipBytes / 1024).toFixed(1)} KB gzip`,
);
