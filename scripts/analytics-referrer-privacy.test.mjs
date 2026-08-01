import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const transformMarker = 'transformRequest: function (payload) {';

async function walkHtml(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) paths.push(...await walkHtml(path));
    else if (entry.isFile() && entry.name.endsWith('.html')) paths.push(path);
  }
  return paths;
}

function transformBodies(source) {
  const bodies = [];
  let cursor = 0;
  while ((cursor = source.indexOf(transformMarker, cursor)) !== -1) {
    const open = source.indexOf('{', cursor);
    let depth = 1;
    let end = open + 1;
    while (depth > 0 && end < source.length) {
      if (source[end] === '{') depth += 1;
      else if (source[end] === '}') depth -= 1;
      end += 1;
    }
    if (depth !== 0) throw new Error('unterminated Plausible transformRequest');
    bodies.push(source.slice(open + 1, end - 1));
    cursor = end;
  }
  return bodies;
}

async function analyticsSurfaces() {
  const sourcePaths = [
    'src/layouts/Base.astro',
    'scripts/configure-legacy-analytics.mjs',
    'scripts/build-sign-pages.mjs',
    'scripts/build-archive.mjs',
  ].map((path) => resolve(root, path));
  const publicPaths = await walkHtml(resolve(root, 'public'));
  const candidates = [...sourcePaths, ...publicPaths];
  const surfaces = [];
  for (const path of candidates) {
    const source = await readFile(path, 'utf8');
    if (source.includes('window.plausible.init')) {
      surfaces.push({ path: relative(root, path), source });
    }
  }
  return surfaces;
}

describe('Plausible referrer privacy', () => {
  it('nulls the referrer in every source and checked-in outbound payload transform', async () => {
    const surfaces = await analyticsSurfaces();
    expect(surfaces.length).toBeGreaterThan(0);

    for (const surface of surfaces) {
      const bodies = transformBodies(surface.source);
      expect(bodies, `${surface.path} must transform every Plausible payload`).not.toHaveLength(0);

      for (const body of bodies) {
        const transform = new Function('payload', 'document', 'location', `${body}\nreturn payload;`);
        const payload = {
          r: 'https://zodiacs.org/?private_query=discard',
          u: 'https://zodiacs.org/current/?private_query=discard',
          p: { url: 'https://zodiacs.org/current/?private_query=discard' },
        };
        const transformed = transform(
          payload,
          { querySelector: () => ({ href: 'https://zodiacs.org/canonical/' }) },
          { origin: 'https://zodiacs.org', pathname: '/fallback/' },
        );

        expect(transformed.r, `${surface.path} retained a referrer`).toBeNull();
        expect(transformed.u).toBe('https://zodiacs.org/canonical/');
        expect(transformed.p).not.toHaveProperty('url');
      }
    }
  });
});
