/*
 * Vite config for running s13/engine_grids.mjs with vite-node against the site: the root stays
 * the site root (so src/lib/engine/full.ts resolves exactly as the site resolves it), file
 * serving is also allowed for this tools folder, WORK, and node_modules where it really lives
 * (it may be a symlink), and Vite's cache goes to WORK rather than the site's node_modules.
 * SITE_ROOT and WORK as in lib/paths.mjs.
 *
 *   cd $SITE_ROOT && npx vite-node --config <tools>/vite.config.mjs <tools>/s13/engine_grids.mjs
 */
import { realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const tools = dirname(fileURLToPath(import.meta.url));
const siteRoot = resolve(process.env.SITE_ROOT || resolve(tools, '../../../../..'));
const work = resolve(process.env.WORK || join(tmpdir(), 'phase1-verdicts-2026-09-25'));
const modules = realpathSync(join(siteRoot, 'node_modules'));

export default {
  root: siteRoot,
  cacheDir: join(work, 'vite-cache'),
  server: { fs: { allow: [siteRoot, modules, tools, work] } },
};
