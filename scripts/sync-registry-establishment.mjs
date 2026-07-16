/**
 * Synchronize no-JS Registry-wing HTML with the exported establishment record.
 * The large legacy documents live in public/ and bypass Astro templating, so
 * their marked spans are generated here before dev/build instead of owning
 * independent year literals.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  REGISTRY_ESTABLISHED,
  REGISTRY_ESTABLISHED_YEAR,
  REGISTRY_ESTABLISHMENT_PROVENANCE_URL,
} from '../src/lib/registry-establishment.mjs';
import { injectRegistryAuraLanding } from '../src/lib/registry-aura-entry.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

export const ESTABLISHMENT_HTML_FILES = [
  'public/registry/index.html',
  'public/sdk/index.html',
];

export function injectRegistryEstablishment(source) {
  let count = 0;
  const output = source.replace(
    /(<span\s+data-registry-established(?:="[^"]*")?>)[^<]*(<\/span>)/g,
    (_match, open, close) => {
      count += 1;
      return `${open}${REGISTRY_ESTABLISHED}${close}`;
    },
  );
  return { output, count };
}

export async function syncRegistryEstablishment(env = process.env) {
  let total = 0;
  for (const relativePath of ESTABLISHMENT_HTML_FILES) {
    const path = resolve(root, relativePath);
    const source = await readFile(path, 'utf8');
    const established = injectRegistryEstablishment(source);
    const output = relativePath === 'public/registry/index.html'
      ? injectRegistryAuraLanding(established.output, env).output
      : established.output;
    const { count } = established;
    if (!count) throw new Error(`Missing data-registry-established marker: ${relativePath}`);
    total += count;
    if (output !== source) await writeFile(path, output, 'utf8');
  }

  const metaPath = resolve(root, 'public/registry/registry-meta.json');
  const meta = `${JSON.stringify({
    established: REGISTRY_ESTABLISHED,
    year: REGISTRY_ESTABLISHED_YEAR,
    provenanceUrl: REGISTRY_ESTABLISHMENT_PROVENANCE_URL,
    provenanceStatus: REGISTRY_ESTABLISHMENT_PROVENANCE_URL ? 'verified' : 'pending',
  }, null, 2)}\n`;
  let current = '';
  try { current = await readFile(metaPath, 'utf8'); } catch { /* first generation */ }
  if (current !== meta) await writeFile(metaPath, meta, 'utf8');
  return total;
}

const invoked = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invoked) {
  const count = await syncRegistryEstablishment();
  console.log(`registry-establishment: synchronized ${count} static HTML slots`);
}
