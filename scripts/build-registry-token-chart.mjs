// Bundles the selected-token 24-hour data/model lane as a lazy ESM asset.
// It deliberately includes only src/registry/selected-token-chart.mjs and the
// shared GeckoTerminal client — never the Exchange terminal or trade runtime.

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import * as esbuild from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const source = resolve(root, 'src/registry/selected-token-chart.mjs');
const output = resolve(root, 'public/assets/registry-token-chart.js');

const { metafile } = await esbuild.build({
  entryPoints: [source],
  outfile: output,
  bundle: true,
  format: 'esm',
  target: ['es2020', 'safari15'],
  minify: true,
  charset: 'utf8',
  legalComments: 'none',
  metafile: true,
  define: { 'process.env.NODE_ENV': '"production"' },
  banner: {
    js: '/* Generated from src/registry/selected-token-chart.mjs — do not edit directly. */',
  },
});

const inputs = Object.keys(metafile.inputs);
const unexpected = inputs.filter((path) => (
  !path.endsWith('src/registry/selected-token-chart.mjs')
  && !path.endsWith('src/exchange/gecko.mjs')
));
if (unexpected.length) {
  throw new Error(`Registry token chart pulled unexpected modules: ${unexpected.join(', ')}`);
}

const bytes = Object.values(metafile.outputs)[0]?.bytes ?? 0;
process.stdout.write(`registry-token-chart: wrote assets/registry-token-chart.js (${bytes} bytes)\n`);

