// Stamps Terminal's venue route into (or out of) /terminal/markets/ and
// synchronizes the flag-gated discovery entries on /terminal/ and — since the
// 2026-08-31 owner addendum — /astrofolio/ from
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
  REGISTRY_EXCHANGE_FLAG,
  injectRegistryExchange,
  injectRegistryExchangeLanding,
  registryExchangeBuildEnv,
  registryExchangeEnabled,
} from '../src/exchange/entry.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const exchangeFile = resolve(root, 'public/terminal/markets/index.html');
const terminalFile = resolve(root, 'public/terminal/index.html');
const astrofolioFile = resolve(root, 'public/astrofolio/index.html');

const buildEnv = registryExchangeBuildEnv(process.env);
const enabled = registryExchangeEnabled(buildEnv);
const [exchangeSource, terminalSource, astrofolioSource] = await Promise.all([
  readFile(exchangeFile, 'utf8'),
  readFile(terminalFile, 'utf8'),
  readFile(astrofolioFile, 'utf8'),
]);

// Validate and render every surface before writing any one of them. A
// malformed or missing marker must fail the build without leaving the venue
// route and its discovery entries in different flag states.
const exchangeOutput = injectRegistryExchange(exchangeSource, buildEnv).output;
const terminalOutput = injectRegistryExchangeLanding(terminalSource, buildEnv).output;
const astrofolioOutput = injectRegistryExchangeLanding(astrofolioSource, buildEnv).output;
const writes = [
  exchangeOutput !== exchangeSource ? writeFile(exchangeFile, exchangeOutput) : null,
  terminalOutput !== terminalSource ? writeFile(terminalFile, terminalOutput) : null,
  astrofolioOutput !== astrofolioSource ? writeFile(astrofolioFile, astrofolioOutput) : null,
].filter(Boolean);
await Promise.all(writes);

console.log(
  `Terminal venue route: ${enabled ? 'enabled' : 'disabled'} `
  + `(${writes.length} of 3 surfaces rewritten, Terminal and Astrofolio landings included; `
  + `${Object.prototype.hasOwnProperty.call(process.env, REGISTRY_EXCHANGE_FLAG)
    ? 'explicit exchange flag'
    : process.env.VERCEL_ENV === 'production'
      ? 'Vercel production default'
      : 'flag-off default'})`,
);
