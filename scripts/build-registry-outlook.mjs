import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildRegistryOutlookArtifact } from './registry-outlook-artifact.mjs';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = resolve(repositoryRoot, 'public/assets/registry-outlook.json');
const outlook = await buildRegistryOutlookArtifact(repositoryRoot);

await writeFile(outputPath, `${JSON.stringify(outlook, null, 2)}\n`, 'utf8');
console.log(`Wrote ${outputPath}`);
console.log(`  daily + weekly symbolic outlook · edition ${outlook.daily.date}`);
