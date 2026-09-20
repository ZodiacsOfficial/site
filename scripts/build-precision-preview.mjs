/**
 * Build the developer preview's browser bundles.
 *
 *   node scripts/build-precision-preview.mjs
 *   node scripts/build-precision-preview.mjs --check     # drift only
 *
 * Sources: src/precision-preview/{app,worker}.src.mjs, which import the
 * runtime from examples/precision-alpha.
 *
 * Output: public/precision-preview/{app,worker}.mjs, served as plain static
 * files. They are deliberately NOT part of the Astro graph: nothing else on
 * the site imports them, so no consumer page's chunks can change because
 * this exists, and `scripts/report-bundles.mjs` never sees them.
 *
 * The build asserts the output is browser-clean — a `node:` import, a
 * `require`, a `Buffer` or a `process.` reference would mean the runtime
 * had stopped being environment-neutral — and that no URL literal reached
 * the worker, because the worker must never fetch anything.
 */
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const out = join(root, 'public', 'precision-preview');
const check = process.argv.includes('--check');
mkdirSync(out, { recursive: true });

const ALIAS = {
  name: 'precision-alpha-alias',
  setup(b) {
    b.onResolve({ filter: /^@zodiacs\/precision-alpha\/browser$/ }, () => ({
      path: join(root, 'examples', 'precision-alpha', 'src', 'browser.mjs'),
    }));
  },
};

const bundles = [
  { entry: 'worker.src.mjs', file: 'worker.mjs' },
  { entry: 'app.src.mjs', file: 'app.mjs' },
];

const built = new Map();
for (const { entry, file } of bundles) {
  const result = await build({
    entryPoints: [join(root, 'src', 'precision-preview', entry)],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    legalComments: 'inline',
    minify: false,
    write: false,
    // The app references the worker by URL; keep that a real file, not an
    // inlined blob, so the page's network is legible in a driver capture.
    external: ['./worker.mjs'],
    plugins: [ALIAS],
    banner: { js: `// Built by scripts/build-precision-preview.mjs from src/precision-preview/${entry}. Do not edit.` },
  });
  built.set(file, result.outputFiles[0].text);
}

// Scanned RAW, not comment-stripped. The strip was `/\/\*[\s\S]*?\*\//g`
// plus `/^\s*\/\/.*$/gm`, which happily deletes from a literal `/*`
// inside a string to the next `*/`, and any line merely STARTING with
// `//` -- a bundled string beginning `//evil.example/collect` is a line
// like that. A dependency emitting `"see /* here */ fetch(u)"` would have
// had the region containing `fetch(` blanked before the scan saw it.
// Comments are noisier this way; a false positive is a comment to
// reword, and a false negative is the thing this gate exists to stop.
const problems = [];
const BROWSER_CLEAN = [
  ['a node: import', /from\s*["']node:/],
  ['require(', /\brequire\s*\(/],
  ['Buffer', /\bBuffer\b/],
  ['process.', /\bprocess\s*\./],
];
// Neither bundle may carry a way to transmit or to persist. The app has
// DOM access, so it is scanned too: before this, only the worker was, and
// the app is the half that could reach `document` and `navigator`.
const NO_REACH = [
  ['fetch(', /\bfetch\s*\(/],
  ['an http URL', /https?:\/\//],
  ['a protocol-relative URL', /["'`]\/\/[a-z0-9.-]+\//i],
  ['XMLHttpRequest', /XMLHttpRequest/],
  ['importScripts', /importScripts/],
  ['sendBeacon', /sendBeacon/],
  ['WebSocket', /\bWebSocket\b/],
  ['EventSource', /\bEventSource\b/],
  ['new Request', /new\s+Request\b/],
  ['localStorage', /localStorage/],
  ['sessionStorage', /sessionStorage/],
  ['indexedDB', /indexedDB/i],
  ['caches', /\bcaches\b/],
  ['document.cookie', /document\s*\.\s*cookie/],
];
for (const [file, code] of built) {
  for (const [what, re] of BROWSER_CLEAN) if (re.test(code)) problems.push(`${file}: ${what}`);
  for (const [what, re] of NO_REACH) if (re.test(code)) problems.push(`${file}: ${what}`);
}
if (problems.length) {
  console.error(`the preview bundles are not clean:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}

let drift = false;
for (const [file, code] of built) {
  const path = join(out, file);
  const before = existsSync(path) ? readFileSync(path, 'utf8') : null;
  if (before !== code) {
    drift = true;
    if (!check) writeFileSync(path, code);
  }
  console.log(`${file} ${code.length} bytes${before === code ? ' (unchanged)' : check ? ' (DRIFT)' : ''}`);
}
if (check && drift) {
  console.error('public/precision-preview/ is out of date; run node scripts/build-precision-preview.mjs');
  process.exit(1);
}
console.log('both bundles scanned raw: browser-clean, and no way to transmit or persist in either');
