import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

/**
 * Source boundary whose rendered state is represented by the Phase 1
 * acceptance screenshots. Daily data is deliberately excluded: an unattended
 * edition update must not invalidate the reviewed template geometry.
 */
export const PHASE1_TEMPLATE_SOURCE_PATHS = Object.freeze([
  'astro.config.mjs',
  'package-lock.json',
  'package.json',
  'scripts/write-phase1-build-receipt.mjs',
  'src/content.config.ts',
  'src/data/transits-2026-07.json',
  'src/data/transits-2026-08.json',
  'tsconfig.json',
  'scripts/phase1-acceptance-evidence.test.mjs',
  'tests/phase1-acceptance-drive.mjs',
  'tests/visual/browser.mjs',
  'tests/visual/phase1-evidence-contract.mjs',
  'tests/visual/preview-server.mjs',
]);

/**
 * Directories contain render inputs whose filenames can change over time.
 * Walking them means a new published monthly edition or replacement pastel
 * icon invalidates stale screenshots without requiring this list to be edited.
 */
export const PHASE1_TEMPLATE_SOURCE_DIRECTORIES = Object.freeze([
  'public/assets/zodiac-icons',
  'public/fonts',
  'src/components',
  'src/content/horoscopes',
  'src/islands',
  'src/layouts',
  'src/lib',
  'src/pages/horoscopes',
  'src/pages/today',
  'src/styles',
]);

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

async function sourceFiles(repositoryRoot, relativePath) {
  const absolute = resolve(repositoryRoot, relativePath);
  const entries = await readdir(absolute, { withFileTypes: true }).catch((error) => {
    if (error?.code === 'ENOTDIR') return null;
    throw error;
  });
  if (entries === null) return [relativePath];
  const nested = await Promise.all(entries
    .filter((entry) => !entry.name.startsWith('.'))
    .map((entry) => sourceFiles(repositoryRoot, `${relativePath}/${entry.name}`)));
  return nested.flat();
}

export async function phase1TemplateSourceSha256(
  repositoryRoot,
  { readSource = readFile } = {},
) {
  const digest = createHash('sha256');
  const directoryFiles = (await Promise.all(
    PHASE1_TEMPLATE_SOURCE_DIRECTORIES.map((path) => sourceFiles(repositoryRoot, path)),
  )).flat();
  const paths = [...new Set([...PHASE1_TEMPLATE_SOURCE_PATHS, ...directoryFiles])].sort();
  for (const path of paths) {
    const absolute = resolve(repositoryRoot, path);
    digest.update(relative(repositoryRoot, absolute).replaceAll('\\', '/'));
    digest.update('\0');
    digest.update(await readSource(absolute));
    digest.update('\0');
  }
  return digest.digest('hex');
}
