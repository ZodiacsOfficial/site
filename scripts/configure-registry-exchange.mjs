// Stamps the Exchange terminal into (or out of) /registry/exchange/ from
// PUBLIC_REGISTRY_EXCHANGE_ENABLED in the SHELL env. Plain-node generators do
// not read .env files — set the flag in the shell, the way
// configure-registry-trade does, or the halves skew.
//
//   node scripts/configure-registry-exchange.mjs          # stamp flag-off
//   PUBLIC_REGISTRY_EXCHANGE_ENABLED=1 node scripts/…     # stamp flag-on
//
// The committed state is always flag-off; a production build stamps it on.
// Runs in predev/prebuild, writes only when the bytes actually change.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  injectRegistryExchange,
  registryExchangeEnabled,
} from '../src/exchange/entry.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const file = resolve(root, 'public/registry/exchange/index.html');

const enabled = registryExchangeEnabled(process.env);
const source = await readFile(file, 'utf8');
const { output } = injectRegistryExchange(source, process.env);
if (output !== source) await writeFile(file, output);

console.log(
  `Registry exchange terminal: ${enabled ? 'enabled' : 'disabled'} `
  + `(${output === source ? 'no rewrite needed' : 'page rewritten'})`,
);
