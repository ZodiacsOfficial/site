// Stamps the Zodiac Markets terminal into (or out of) /registry/pro/ from shell
// environment flags. Plain-node generators intentionally do not read .env.
//
//   node scripts/configure-registry-pro.mjs
//   PUBLIC_REGISTRY_PRO_ENABLED=1 node scripts/configure-registry-pro.mjs
//
// Chat's independent flag is effective only while the master Pro flag is on.
// The committed state is always restored by running this script without flags.

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  injectRegistryPro,
  registryProChatEnabled,
  registryProEnabled,
} from '../src/pro/entry.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const file = resolve(root, 'public/registry/pro/index.html');

const enabled = registryProEnabled(process.env);
const chatEnabled = registryProChatEnabled(process.env);
const source = await readFile(file, 'utf8');
const { output } = injectRegistryPro(source, process.env);
if (output !== source) await writeFile(file, output);

console.log(
  `Zodiac Markets terminal: ${enabled ? 'enabled' : 'disabled'}; `
  + `chat: ${chatEnabled ? 'enabled' : 'disabled'} `
  + `(${output === source ? 'no rewrite needed' : 'page rewritten'})`,
);
