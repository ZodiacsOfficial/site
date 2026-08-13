import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GLOSSARY } from '../src/data/glossary.ts';
import { searchIndex } from '../src/lib/search/score.ts';
import { buildSearchIndex } from './build-search-index.mjs';
import { CURATED_WING_ENTRIES } from './search-index-lib.mjs';

let fixtureRoot;

async function addPage(relativePath, {
  lang = 'en',
  title = 'Fixture | Zodiacs.org',
  description = 'A fixture page for search.',
  robots = '',
} = {}) {
  const path = join(fixtureRoot, relativePath);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `<!doctype html><html lang="${lang}"><head>
    <title>${title}</title>
    <meta name="description" content="${description}">
    ${robots ? `<meta name="robots" content="${robots}">` : ''}
  </head><body></body></html>`, 'utf8');
}

afterEach(async () => {
  vi.restoreAllMocks();
  if (fixtureRoot) await rm(fixtureRoot, { recursive: true, force: true });
  fixtureRoot = undefined;
});

describe('buildSearchIndex', () => {
  it('walks a built fixture tree and excludes non-indexable pages', async () => {
    fixtureRoot = await mkdtemp(join(tmpdir(), 'zodiacs-search-index-'));
    await addPage('index.html', { title: 'Home | Zodiacs.org' });
    await addPage('learn/orbs/index.html', { title: 'Orbs | Zodiacs.org' });
    await addPage('es/learn/orbs/index.html', { lang: 'es' });
    await addPage('registry/index.html');
    await addPage('private/index.html', { robots: 'nofollow, noindex' });
    await addPage('learn/page/2/index.html');

    vi.spyOn(console, 'log').mockImplementation(() => {});
    const first = await buildSearchIndex({ distRoot: fixtureRoot, minEntries: 0 });
    const firstJson = await readFile(join(fixtureRoot, 'search-index.json'), 'utf8');
    const second = await buildSearchIndex({ distRoot: fixtureRoot, minEntries: 0 });
    const secondJson = await readFile(join(fixtureRoot, 'search-index.json'), 'utf8');

    expect(first.entries.filter((entry) => !['astrofolio', 'terminal', 'registry', 'term'].includes(entry.kind))).toEqual([
      {
        path: '/',
        title: 'Home',
        description: 'A fixture page for search.',
        kind: 'page',
      },
      {
        path: '/learn/orbs/',
        title: 'Orbs',
        description: 'A fixture page for search.',
        kind: 'learn',
      },
    ]);
    expect(first.entries.filter((entry) => ['astrofolio', 'terminal', 'registry'].includes(entry.kind)))
      .toEqual([...CURATED_WING_ENTRIES].sort((left, right) => left.path.localeCompare(right.path)));
    expect(first.entries.filter((entry) => entry.kind !== 'term'))
      .toHaveLength(2 + 17);
    expect(first.entries).toHaveLength(2 + 17 + GLOSSARY.length);
    expect(first.entries.filter((entry) => entry.kind === 'term')).toHaveLength(GLOSSARY.length);
    expect(searchIndex(first.entries, 'registry')[0]).toMatchObject({ kind: 'registry' });
    expect(searchIndex(first.entries, 'registry')).toContainEqual(expect.objectContaining({
      path: '/registry/',
      kind: 'registry',
    }));
    expect(searchIndex(first.entries, 'astrofolio')[0]).toMatchObject({
      path: '/astrofolio/',
      kind: 'astrofolio',
    });
    expect(searchIndex(first.entries, 'zodiac gallery verifier')[0]).toMatchObject({
      path: '/astrofolio/',
      kind: 'astrofolio',
    });
    expect(searchIndex(first.entries, 'zodiac capital markets')[0]).toMatchObject({
      path: '/terminal/',
      kind: 'terminal',
    });
    expect(searchIndex(first.entries, 'market tape liquidity')[0]).toMatchObject({
      path: '/terminal/',
      kind: 'terminal',
    });
    expect(searchIndex(first.entries, 'ranked zodiac tokens')[0]).toMatchObject({
      path: '/terminal/',
      kind: 'terminal',
    });
    expect(searchIndex(first.entries, 'thesis')[0]).toMatchObject({
      path: '/thesis/',
      kind: 'registry',
    });
    expect(searchIndex(first.entries, 'aries record')[0]).toMatchObject({
      path: '/registry/aries/',
      kind: 'registry',
    });
    expect(first.gzipBytes).toBeLessThan(150 * 1024);
    expect(second.entries).toEqual(first.entries);
    expect(secondJson).toBe(firstJson);
  });
});
