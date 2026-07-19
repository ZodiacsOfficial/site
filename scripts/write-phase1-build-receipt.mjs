/**
 * Bind the completed `dist` tree to the Phase 1 render-source boundary.
 * The visual acceptance driver refuses to capture when this receipt is
 * missing or stale, preventing old HTML from being labeled as current proof.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { phase1TemplateSourceSha256, sha256 } from '../tests/visual/phase1-evidence-contract.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const payloadFiles = {
  daily: 'src/data/daily.json',
  dailyPublication: 'src/data/daily-publication.json',
  dailyPublicationManifest: 'src/data/daily-publication-manifest.json',
  horoscopeProgram: 'src/data/horoscope-program.json',
};
const payloadBytes = Object.fromEntries(await Promise.all(
  Object.entries(payloadFiles).map(async ([name, path]) => [name, await readFile(resolve(root, path))]),
));
const daily = JSON.parse(payloadBytes.daily.toString('utf8'));
const publicationManifest = JSON.parse(payloadBytes.dailyPublicationManifest.toString('utf8'));

const receipt = {
  schema: 'zodiacs.phase1-build-receipt.v1',
  builtAt: new Date().toISOString(),
  templateSourceSha256: await phase1TemplateSourceSha256(root),
  dailyDate: daily.date,
  publicationCanonicalSha256: publicationManifest.publication.canonicalSha256,
  renderPayloadSha256: Object.fromEntries(
    Object.entries(payloadBytes).map(([name, bytes]) => [name, sha256(bytes)]),
  ),
};

await mkdir(dist, { recursive: true });
await writeFile(resolve(dist, '.phase1-build-receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(`Phase 1 build receipt: ${receipt.templateSourceSha256}`);
