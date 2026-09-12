import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const candidate = JSON.parse(await readFile(new URL('candidate.json', root), 'utf8'));
const lock = JSON.parse(await readFile(new URL('npm-shrinkwrap.json', root), 'utf8'));
const ephemeris = JSON.parse(await readFile(new URL('node_modules/astronomy-engine/package.json', root), 'utf8'));
if (candidate.ephemeris?.name !== 'astronomy-engine'
  || candidate.ephemeris.version !== lock.packages?.['node_modules/astronomy-engine']?.version
  || candidate.ephemeris.version !== ephemeris.version || ephemeris.name !== candidate.ephemeris.name) {
  throw new Error('Resolved ephemeris version does not match the locked candidate facts.');
}
const artifact = await readFile(new URL(`vendor/zodiacs-engine-${candidate.version}.tgz`, root));
if (createHash('sha256').update(artifact).digest('hex') !== candidate.sha256) throw new Error('Candidate artifact hash mismatch.');
await mkdir(new URL('dist/', root), { recursive: true });
const bundled = await build({ absWorkingDir: fileURLToPath(root), entryPoints: { app: 'src/app.mjs', widget: 'src/widget.mjs' },
  outdir: 'dist', bundle: true, platform: 'browser', format: 'esm', target: 'es2022', legalComments: 'inline', metafile: true, write: false });
// This candidate locks one flat ephemeris installation. A different nested
// resolution must fail instead of inheriting an unrelated top-level version.
const ephemerisInputs = Object.keys(bundled.metafile.inputs).filter((path) => /(?:^|\/)astronomy-engine\//.test(path));
if (ephemerisInputs.length !== 1 || ephemerisInputs[0] !== 'node_modules/astronomy-engine/esm/astronomy.js') {
  throw new Error('Bundled ephemeris does not match the verified candidate installation.');
}
for (const file of bundled.outputFiles) await writeFile(file.path, file.contents);
for (const name of ['natal.html', 'transits.html', 'widget.html', 'styles.css', 'favicon.svg']) {
  await copyFile(new URL(`src/${name}`, root), new URL(`dist/${name}`, root));
}
const notices = await Promise.all(['LICENSE', 'NOTICE', 'LICENSING.md'].map(async (name) =>
  `${name}\n${await readFile(new URL(`node_modules/@zodiacs/engine/${name}`, root), 'utf8')}`));
await writeFile(new URL('dist/THIRD_PARTY_NOTICES.txt', root), notices.join('\n\n'));
console.log(`Built three examples with candidate ${candidate.version}; artifact SHA256 ${candidate.sha256}`);
