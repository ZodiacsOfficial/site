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
const terminalHtmlPath = resolve(root, 'public/terminal/index.html');
const thesisHtmlPath = resolve(root, 'public/thesis/index.html');
const [terminalSource, thesisSource] = await Promise.all([
  readFile(terminalHtmlPath, 'utf8'),
  readFile(thesisHtmlPath, 'utf8'),
]);
const injectedTerminal = injectRegistryAuraLanding(terminalSource, process.env);
const terminalOutput = consumerizeRegistryCollection(injectedTerminal.output, REGISTRY_AURA_ENTRY_COPY);
const injectedThesis = injectRegistryAuraThesis(thesisSource, process.env);
const thesisOutput = injectedThesis.output;
const { enabled } = injectedTerminal;

await Promise.all([
  terminalOutput !== terminalSource ? writeFile(terminalHtmlPath, terminalOutput, 'utf8') : null,
  thesisOutput !== thesisSource ? writeFile(thesisHtmlPath, thesisOutput, 'utf8') : null,
]);
console.log(`Terminal Collection landing entry: ${enabled ? 'enabled' : 'disabled'}`);
console.log(`Registry Collection thesis action: ${enabled ? 'enabled' : 'disabled'}`);
