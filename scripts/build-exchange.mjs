// Bundles the Exchange terminal's browser runtime to public/assets/exchange.js.
//
//   node scripts/build-exchange.mjs
//
// Nothing about the flag lives here: the bundle is identical whether the
// terminal is switched on or off, and only the stamped page changes. It ships
// committed and is re-run by the CI drift job, so the output in git is always
// the output of the source beside it.
//
// Source: src/exchange/browser.mjs → terminal / chart / tape / gecko / stats /
// depth / pools / styles / analytics (plus the shared trade ultra client for the ladder).
// Nothing is baked in — every mint arrives from the live registry answer, so
// the Registry keeps one answer to what a sign's mint is.

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import * as esbuild from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const SCRIPT_OUT = resolve(root, 'public/assets/exchange.js');
const SCRIPT_SRC = resolve(root, 'src/exchange/browser.mjs');

const { metafile } = await esbuild.build({
  entryPoints: [SCRIPT_SRC],
  outfile: SCRIPT_OUT,
  bundle: true,
  format: 'iife',
  target: ['es2020', 'safari15'],
  minify: true,
  charset: 'utf8',
  legalComments: 'none',
  metafile: true,
  define: { 'process.env.NODE_ENV': '"production"' },
  banner: {
    js: '/* Generated from src/exchange/ by scripts/build-exchange.mjs — do not edit directly. */',
  },
});

const bytes = Object.values(metafile.outputs)[0]?.bytes ?? 0;
process.stdout.write(`exchange: wrote assets/exchange.js (${bytes} bytes)\n`);
