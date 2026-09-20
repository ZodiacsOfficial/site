/**
 * Build the two bundles the page loads.
 *
 * `precision-runtime.mjs` bundles the alpha core for the browser. The build
 * then ASSERTS that nothing environment-specific survived into it: a `node:`
 * import, a `require`, a `Buffer` or a filesystem shim in the output would
 * mean the core had stopped being environment-neutral, and the demonstration
 * would be running something other than what the tests test.
 */
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';

const here = new URL('.', import.meta.url).pathname;

await build({
  entryPoints: [`${here}precision-runtime.src.mjs`],
  outfile: `${here}precision-runtime.mjs`,
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  legalComments: 'inline',
  banner: { js: '// Built from precision-runtime.src.mjs by build.mjs. Do not edit.' },
});

await build({
  entryPoints: [`${here}worker.src.mjs`],
  outfile: `${here}worker.mjs`,
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  external: ['./precision-runtime.mjs'],
});

const bundle = readFileSync(`${here}precision-runtime.mjs`, 'utf8');
const code = bundle.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const bad = [
  ['a node: import', /from\s*["']node:/],
  ['require(', /\brequire\s*\(/],
  ['Buffer', /\bBuffer\b/],
  ['process.', /\bprocess\s*\./],
  ['__dirname', /\b__dirname\b/],
];
const found = bad.filter(([, re]) => re.test(code)).map(([what]) => what);
if (found.length) {
  console.error(`precision-runtime.mjs is not browser-clean: ${found.join(', ')}`);
  process.exit(1);
}
console.log(`precision-runtime.mjs ${bundle.length} bytes, browser-clean`);
console.log(`worker.mjs ${readFileSync(`${here}worker.mjs`, 'utf8').length} bytes`);
