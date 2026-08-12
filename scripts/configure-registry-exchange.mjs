// Stamps Zodiac Markets into (or out of) /terminal/markets/ and synchronizes
// the single discovery gateway on /terminal/pro/ from
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
  injectRegistryExchangeLanding,
  registryExchangeEnabled,
} from '../src/exchange/entry.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const exchangeFile = resolve(root, 'public/terminal/markets/index.html');
const proFile = resolve(root, 'public/terminal/pro/index.html');

const enabled = registryExchangeEnabled(process.env);
const [exchangeSource, proSource] = await Promise.all([
  readFile(exchangeFile, 'utf8'),
  readFile(proFile, 'utf8'),
]);

// Validate and render both surfaces before writing either one. A malformed or
// missing Pro marker must fail the build without leaving the Markets route and
// its only discovery entry in different flag states.
const exchangeOutput = injectRegistryExchange(exchangeSource, process.env).output;
const proOutput = injectRegistryExchangeLanding(proSource, process.env).output;
const writes = [
  exchangeOutput !== exchangeSource ? writeFile(exchangeFile, exchangeOutput) : null,
  proOutput !== proSource ? writeFile(proFile, proOutput) : null,
].filter(Boolean);
await Promise.all(writes);

console.log(
  `Registry exchange terminal: ${enabled ? 'enabled' : 'disabled'} `
  + `(${writes.length} of 2 surfaces rewritten, Pro landing included)`,
);
