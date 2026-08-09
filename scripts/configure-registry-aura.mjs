import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  REGISTRY_AURA_ENTRY_COPY,
  injectRegistryAuraLanding,
  injectRegistryAuraThesis,
} from '../src/lib/registry-aura-entry.mjs';
import { consumerizeRegistryCollection } from './registry-consumer-entry.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const registryHtmlPath = resolve(root, 'public/registry/index.html');
const thesisHtmlPath = resolve(root, 'public/thesis/index.html');
const [registrySource, thesisSource] = await Promise.all([
  readFile(registryHtmlPath, 'utf8'),
  readFile(thesisHtmlPath, 'utf8'),
]);
const injectedRegistry = injectRegistryAuraLanding(registrySource, process.env);
const registryOutput = consumerizeRegistryCollection(injectedRegistry.output, REGISTRY_AURA_ENTRY_COPY);
const injectedThesis = injectRegistryAuraThesis(thesisSource, process.env);
const thesisOutput = injectedThesis.output;
const { enabled } = injectedRegistry;

await Promise.all([
  registryOutput !== registrySource ? writeFile(registryHtmlPath, registryOutput, 'utf8') : null,
  thesisOutput !== thesisSource ? writeFile(thesisHtmlPath, thesisOutput, 'utf8') : null,
]);
console.log(`Registry Collection landing entry: ${enabled ? 'enabled' : 'disabled'}`);
console.log(`Registry Collection thesis action: ${enabled ? 'enabled' : 'disabled'}`);
