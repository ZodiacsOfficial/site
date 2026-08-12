/*
 * Bundle the lazy assistant dialog to a stable public entrypoint. Placidus
 * recomputation stays in a split child chunk, so opening the dialog does not
 * fetch the ephemeris unless a saved Placidus chart actually needs houses.
 *
 * The package build wiring is owned by the integration slice.
 *
 *   node scripts/build-assistant-ui.mjs
 */
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFile, stat } from 'node:fs/promises';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outdir = resolve(repo, 'dist/assets');
const entry = resolve(outdir, 'assistant-ui.js');
const stylesheet = resolve(outdir, 'assistant-ui.css');
const publicSupabaseBuildConfig = {
  'import.meta.env.PUBLIC_SUPABASE_URL': JSON.stringify(process.env.PUBLIC_SUPABASE_URL ?? ''),
  'import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? ''),
  'import.meta.env.PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(process.env.PUBLIC_SUPABASE_ANON_KEY ?? ''),
};

await build({
  entryPoints: { 'assistant-ui': resolve(repo, 'src/lib/assistant/open-assistant.ts') },
  bundle: true,
  minify: true,
  format: 'esm',
  target: 'es2020',
  splitting: true,
  outdir,
  entryNames: '[name]',
  chunkNames: 'assistant-chunks/[name]-[hash]',
  // The standalone bundle is built outside Vite, so replace only the exact
  // public browser configuration consumed by src/lib/supabase/client.ts.
  // Server/service-role values must never be introduced here.
  define: publicSupabaseBuildConfig,
});

const [{ size: scriptSize }, { size: styleSize }, script] = await Promise.all([
  stat(entry),
  stat(stylesheet),
  readFile(entry, 'utf8'),
]);
if (script.includes('import.meta.env')) {
  throw new Error('assistant-ui: unresolved import.meta.env would break the lazy browser bundle');
}
console.log(
  `assistant-ui: dist/assets/assistant-ui.js · ${(scriptSize / 1024).toFixed(1)} KB` +
  ` · dist/assets/assistant-ui.css · ${(styleSize / 1024).toFixed(1)} KB`,
);
