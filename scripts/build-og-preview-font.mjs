#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const routePath = path.join(root, 'api/_og/chart-preview.ts');
const sourcePath = path.join(
  root,
  'node_modules/@fontsource/eb-garamond/files/eb-garamond-latin-500-italic.woff',
);
const outputPath = path.join(root, 'api/og/eb-garamond-latin-500-italic.woff');

// @fontsource/eb-garamond@5.2.7, SIL Open Font License 1.1.
// The repository's license copy lives at public/fonts/OFL-eb-garamond.txt.
const expectedSourceSha256 = '684ff1a92d73b2848db742d1b3abcfeb653dd697e631f5bb0335048bf45551ad';

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

const route = await readFile(routePath, 'utf8');
const kicker = route.match(/export const PREVIEW_KICKER = '([^']+)'/)?.[1];
if (!kicker) throw new Error('Could not read PREVIEW_KICKER from api/_og/chart-preview.ts.');

const source = await readFile(sourcePath);
const sourceSha256 = sha256(source);
if (sourceSha256 !== expectedSourceSha256) {
  throw new Error(`Unexpected EB Garamond source: ${sourceSha256}`);
}

const result = spawnSync('pyftsubset', [
  sourcePath,
  `--text=${kicker}`,
  `--output-file=${outputPath}`,
  '--flavor=woff',
  '--layout-features=kern,liga',
  '--canonical-order',
], { encoding: 'utf8' });

if (result.error) {
  throw new Error(`pyftsubset is required to regenerate the preview font: ${result.error.message}`);
}
if (result.status !== 0) {
  throw new Error(result.stderr || `pyftsubset exited ${result.status}`);
}

const output = await readFile(outputPath);
const { size } = await stat(outputPath);
if (size > 8_000) throw new Error(`Preview font subset is unexpectedly large: ${size} bytes`);

console.log(JSON.stringify({
  source: '@fontsource/eb-garamond@5.2.7/files/eb-garamond-latin-500-italic.woff',
  text: kicker,
  bytes: size,
  sha256: sha256(output),
}, null, 2));
