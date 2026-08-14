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
import { loadEnv } from 'vite';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { copyFile, stat } from 'node:fs/promises';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outdir = resolve(repo, 'dist/assets');
const entry = resolve(outdir, 'assistant-ui.js');
const stylesheet = resolve(outdir, 'assistant-ui.css');
const avatarSource = resolve(repo, 'public/assets/guide-avatar.webp');
const avatar = resolve(outdir, 'guide-avatar.webp');
const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development';
const fileEnv = loadEnv(mode, repo, 'PUBLIC_');
const publicEnv = (name) => process.env[name] ?? fileEnv[name] ?? '';

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
  // This stable bundle is built outside Astro/Vite's normal client graph.
  // Inline publishable Supabase configuration explicitly so Guide can fence
  // account A→B transitions; no server credential is exposed here.
  define: {
    'import.meta.env.PUBLIC_SUPABASE_URL': JSON.stringify(publicEnv('PUBLIC_SUPABASE_URL')),
    'import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(
      publicEnv('PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
    ),
    'import.meta.env.PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(publicEnv('PUBLIC_SUPABASE_ANON_KEY')),
  },
});

await copyFile(avatarSource, avatar);

const [{ size: scriptSize }, { size: styleSize }, { size: avatarSize }] = await Promise.all([
  stat(entry),
  stat(stylesheet),
  stat(avatar),
]);
if (avatarSize > 20_000) throw new Error(`Guide avatar is too large: ${avatarSize} bytes`);
console.log(
  `assistant-ui: dist/assets/assistant-ui.js · ${(scriptSize / 1024).toFixed(1)} KB` +
  ` · dist/assets/assistant-ui.css · ${(styleSize / 1024).toFixed(1)} KB` +
  ` · dist/assets/guide-avatar.webp · ${(avatarSize / 1024).toFixed(1)} KB`,
);
