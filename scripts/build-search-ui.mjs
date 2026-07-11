/*
 * Bundles the site-search dialog (src/lib/search/open-search.ts + score.ts)
 * to dist/assets/search-ui.js — a STABLE, unhashed URL.
 *
 * Why not an Astro-bundled import: the nav's loader script must stay
 * import-free so Astro can inline it into every page. The moment it gains a
 * module-graph edge, the whole nav script externalizes and lands ~1.5 KB of
 * JS on every page — including the sign pages, whose budget is a deliberate
 * zero. So the dialog compiles here, after `astro build` (see the build
 * script in package.json), and the inline loader dynamic-imports the plain
 * URL at runtime.
 *
 *   node scripts/build-search-ui.mjs
 */
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { stat } from 'node:fs/promises';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outfile = resolve(repo, 'dist/assets/search-ui.js');

await build({
  entryPoints: [resolve(repo, 'src/lib/search/open-search.ts')],
  bundle: true,
  minify: true,
  format: 'esm',
  target: 'es2020',
  outfile,
});

const { size } = await stat(outfile);
console.log(`search-ui: dist/assets/search-ui.js · ${(size / 1024).toFixed(1)} KB`);
