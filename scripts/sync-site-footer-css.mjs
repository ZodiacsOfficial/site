import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = resolve(repoRoot, 'src/styles/site-footer.css');
const publicPath = resolve(repoRoot, 'public/assets/site-footer.css');
const checkOnly = process.argv.includes('--check');

const source = await readFile(sourcePath, 'utf8');

if (checkOnly) {
  const published = await readFile(publicPath, 'utf8').catch(() => null);
  if (published !== source) {
    throw new Error('site-footer.css is stale; run npm run footer:sync');
  }
  console.log('site-footer.css: public copy matches the canonical source');
} else {
  await mkdir(dirname(publicPath), { recursive: true });
  await writeFile(publicPath, source);
  console.log('site-footer.css: synchronized for static pages');
}
