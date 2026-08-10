// Bundles the Zodiac Markets browser runtime to public/assets/registry-pro.js.
//
//   node scripts/build-registry-pro.mjs
//
// The bundle is deterministic and independent of either build flag. The page
// stamper alone decides whether the committed asset is requested.

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scriptOut = resolve(root, 'public/assets/registry-pro.js');
const scriptSource = resolve(root, 'src/pro/browser.mjs');

const { metafile } = await esbuild.build({
  entryPoints: [scriptSource],
  outfile: scriptOut,
  bundle: true,
  format: 'iife',
  target: ['es2020', 'safari15'],
  minify: true,
  charset: 'utf8',
  legalComments: 'none',
  metafile: true,
  define: { 'process.env.NODE_ENV': '"production"' },
  banner: {
    js: '/* Generated from src/pro/ by scripts/build-registry-pro.mjs — do not edit directly. */',
  },
});

const bytes = Object.values(metafile.outputs)[0]?.bytes ?? 0;
process.stdout.write(`registry-pro: wrote assets/registry-pro.js (${bytes} bytes)\n`);
