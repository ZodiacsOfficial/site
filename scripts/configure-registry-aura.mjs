import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  REGISTRY_AURA_ENTRY_COPY,
  injectRegistryAuraLanding,
} from '../src/lib/registry-aura-entry.mjs';
import { consumerizeRegistryCollection } from './registry-consumer-entry.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const registryHtmlPath = resolve(root, 'public/registry/index.html');
const source = await readFile(registryHtmlPath, 'utf8');
const injected = injectRegistryAuraLanding(source, process.env);
const output = consumerizeRegistryCollection(injected.output, REGISTRY_AURA_ENTRY_COPY);
const { enabled } = injected;

if (output !== source) await writeFile(registryHtmlPath, output, 'utf8');
console.log(`Registry Collection landing entry: ${enabled ? 'enabled' : 'disabled'}`);
