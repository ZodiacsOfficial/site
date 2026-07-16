import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { injectRegistryAuraLanding } from '../src/lib/registry-aura-entry.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const registryHtmlPath = resolve(root, 'public/registry/index.html');
const source = await readFile(registryHtmlPath, 'utf8');
const { output, enabled } = injectRegistryAuraLanding(source, process.env);

if (output !== source) await writeFile(registryHtmlPath, output, 'utf8');
console.log(`Registry Aura landing entry: ${enabled ? 'enabled' : 'disabled'}`);
