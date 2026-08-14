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
const astrofolioHtmlPath = resolve(root, 'public/astrofolio/index.html');
const thesisHtmlPath = resolve(root, 'public/thesis/index.html');
const [astrofolioSource, thesisSource] = await Promise.all([
  readFile(astrofolioHtmlPath, 'utf8'),
  readFile(thesisHtmlPath, 'utf8'),
]);
const injectedAstrofolio = injectRegistryAuraLanding(astrofolioSource, process.env);
const astrofolioOutput = consumerizeRegistryCollection(injectedAstrofolio.output, REGISTRY_AURA_ENTRY_COPY);
const injectedThesis = injectRegistryAuraThesis(thesisSource, process.env);
const thesisOutput = injectedThesis.output;
const { enabled } = injectedAstrofolio;

await Promise.all([
  astrofolioOutput !== astrofolioSource ? writeFile(astrofolioHtmlPath, astrofolioOutput, 'utf8') : null,
  thesisOutput !== thesisSource ? writeFile(thesisHtmlPath, thesisOutput, 'utf8') : null,
]);
console.log(`Astrofolio Collection landing entry: ${enabled ? 'enabled' : 'disabled'}`);
console.log(`Registry Collection thesis action: ${enabled ? 'enabled' : 'disabled'}`);
