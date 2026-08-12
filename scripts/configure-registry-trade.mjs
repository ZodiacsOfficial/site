// Stamps the trade panel into (or out of) the twelve catalogue pages from
// PUBLIC_REGISTRY_TRADE_ENABLED in the SHELL env. Plain-node generators do not
// read .env files — set the flag in the shell, the way configure-registry-aura
// does, or the halves skew.
//
//   node scripts/configure-registry-trade.mjs          # stamp flag-off
//   PUBLIC_REGISTRY_TRADE_ENABLED=1 node scripts/…     # stamp flag-on
//
// The committed state is always flag-off; a production build stamps it on. Runs
// in predev/prebuild, writes only when the bytes actually change.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { injectRegistryTrade, registryTradeEnabled } from '../src/trade/entry.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SIGNS = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
];

const enabled = registryTradeEnabled(process.env);
let written = 0;

for (const sign of SIGNS) {
  const file = resolve(root, `public/registry/${sign}/index.html`);
  const source = await readFile(file, 'utf8');
  const { output } = injectRegistryTrade(source, process.env);
  if (output === source) continue;
  await writeFile(file, output);
  written += 1;
}

console.log(
  `Registry trade panel: ${enabled ? 'enabled' : 'disabled'} `
  + `(${written} of ${SIGNS.length} page${written === 1 ? '' : 's'} rewritten)`,
);
