// Bundles the trade panel's browser runtime to public/assets/trade.js.
//
//   node scripts/build-trade.mjs
//
// Nothing about the flag lives here: the bundle is identical whether the panel
// is switched on or off, and only the pages that reference it change. It ships
// committed and is re-run by the CI drift job, so the output in git is always
// the output of the source beside it.
//
// Source: src/trade/browser.mjs → ultra / panel / view / wallet / styles.
// Nothing is baked in — the sign, its mint, and its hue all arrive from the
// page, so the Registry keeps one answer to what a sign's mint is.

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import * as esbuild from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const SCRIPT_OUT = resolve(root, 'public/assets/trade.js');
const SCRIPT_SRC = resolve(root, 'src/trade/browser.mjs');

const { metafile } = await esbuild.build({
  entryPoints: [SCRIPT_SRC],
  outfile: SCRIPT_OUT,
  bundle: true,
  format: 'iife',
  target: ['es2020', 'safari15'],
  minify: true,
  legalComments: 'none',
  metafile: true,
  define: { 'process.env.NODE_ENV': '"production"' },
  banner: {
    js: '/* Generated from src/trade/ by scripts/build-trade.mjs — do not edit directly. */',
  },
});

const bytes = Object.values(metafile.outputs)[0]?.bytes ?? 0;
process.stdout.write(`trade: wrote assets/trade.js (${bytes} bytes)\n`);
