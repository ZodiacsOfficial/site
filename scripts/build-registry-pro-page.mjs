// Generates the committed, flag-off /registry/pro/ page.
//
//   node scripts/build-registry-pro-page.mjs
//
// The builder never reads feature flags. Production builds may stamp the
// terminal in afterwards; the drift job can always regenerate this disabled
// baseline from source.

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderRegistryProPage } from '../src/pro/page.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'public/registry/pro');
const outFile = resolve(outDir, 'index.html');

await mkdir(outDir, { recursive: true });
const html = `${renderRegistryProPage()}\n`;
await writeFile(outFile, html);

process.stdout.write(`registry-pro: wrote registry/pro/index.html (${Buffer.byteLength(html)} bytes, flag off)\n`);
