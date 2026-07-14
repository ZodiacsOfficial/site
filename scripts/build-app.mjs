// Build step for the Zodiacs.org main page.
//
// Transforms the JSX source (src/app.jsx) into a plain browser script
// (assets/app.js) using Babel's React preset — the same transform the page
// used to run in the browser via @babel/standalone, now done ahead of time so
// visitors never download or run a compiler.
//
//   node scripts/build-app.mjs
//
// Uses a local @babel/standalone install if one is present; otherwise fetches
// the pinned Babel build from unpkg (the same CDN the site already trusted).
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  REGISTRY_ESTABLISHED,
  REGISTRY_ESTABLISHMENT_PROVENANCE_URL,
} from '../src/lib/registry-establishment.mjs';
import { EN } from '../src/strings/en.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const SRC = resolve(root, 'src/app.jsx');
const OUT = resolve(root, 'public/assets/app.js');

const BABEL_VERSION = '7.26.4';
const BABEL_URL = `https://unpkg.com/@babel/standalone@${BABEL_VERSION}/babel.min.js`;

async function getBabel() {
  try {
    const mod = await import('@babel/standalone');
    return mod.default ?? mod;
  } catch {
    const res = await fetch(BABEL_URL);
    if (!res.ok) throw new Error(`Failed to fetch Babel (${res.status}) from ${BABEL_URL}`);
    const code = await res.text();
    const module = { exports: {} };
    new Function('module', 'exports', code)(module, module.exports);
    return module.exports;
  }
}

const Babel = await getBabel();
const source = await readFile(SRC, 'utf8');

const { code } = Babel.transform(source, {
  presets: ['react'],
  compact: true,
  comments: false,
});

const banner = '/* Generated from src/app.jsx by scripts/build-app.mjs — do not edit directly. */\n';
const registryMeta = [
  `const REGISTRY_ESTABLISHED=${JSON.stringify(REGISTRY_ESTABLISHED)};`,
  `const REGISTRY_ESTABLISHMENT_PROVENANCE_URL=${JSON.stringify(REGISTRY_ESTABLISHMENT_PROVENANCE_URL)};`,
  `const REGISTRY_DISCLOSURE_LABEL=${JSON.stringify(EN['disclosure.linkLabel'])};`,
  `const REGISTRY_PROVENANCE_PENDING_LABEL=${JSON.stringify(EN['disclosure.provenancePendingShort'])};`,
  `const REGISTRY_VERIFIER_NOT_FOUND_SENTENCE=${JSON.stringify(EN['registry.verifierNotFoundSentence'])};`,
  `const REGISTRY_VERIFIER_NOT_FOUND_INLINE=${JSON.stringify(EN['registry.verifierNotFoundInline'])};`,
  `const REGISTRY_ESTABLISHMENT_PROVENANCE_LABEL=${JSON.stringify(EN['registry.establishmentProvenanceLink'])};`,
].join('');
const output = banner + registryMeta + code + '\n';
await writeFile(OUT, output, 'utf8');

const hash = createHash('sha256').update(output).digest('hex').slice(0, 12);
console.log(`Wrote ${OUT}`);
console.log(`  ${output.length} bytes  ·  sha256:${hash}  ·  from src/app.jsx (${source.length} bytes)`);
