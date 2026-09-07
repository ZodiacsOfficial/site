import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const candidate = JSON.parse(await readFile(new URL('candidate.json', root), 'utf8'));
const artifact = await readFile(new URL(`vendor/zodiacs-engine-${candidate.version}.tgz`, root));
if (createHash('sha256').update(artifact).digest('hex') !== candidate.sha256) throw new Error('Candidate artifact hash mismatch.');
await mkdir(new URL('dist/', root), { recursive: true });
await build({ absWorkingDir: fileURLToPath(root), entryPoints: { app: 'src/app.mjs', widget: 'src/widget.mjs' },
  outdir: 'dist', bundle: true, platform: 'browser', format: 'esm', target: 'es2022', legalComments: 'inline' });
for (const name of ['natal.html', 'transits.html', 'widget.html', 'styles.css', 'favicon.svg']) {
  await copyFile(new URL(`src/${name}`, root), new URL(`dist/${name}`, root));
}
const notices = await Promise.all(['LICENSE', 'NOTICE', 'LICENSING.md'].map(async (name) =>
  `${name}\n${await readFile(new URL(`node_modules/@zodiacs/engine/${name}`, root), 'utf8')}`));
await writeFile(new URL('dist/THIRD_PARTY_NOTICES.txt', root), notices.join('\n\n'));
console.log(`Built three examples with candidate ${candidate.version}; artifact SHA256 ${candidate.sha256}`);
