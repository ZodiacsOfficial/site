import { readdir } from 'node:fs/promises';
import { dirname, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Every embed route that actually built, not a hand-kept list: a new one is
 * publicly reachable the moment it ships, so it has to carry the same backlink,
 * privacy, budget and keyboard guarantees as the rest without anyone
 * remembering to add it. `/embed/sky/light/` shipped unverified under the old
 * list.
 *
 * This lives apart from the verifier so importing the route list cannot run a
 * verification as a side effect.
 */
export async function builtRoutes(distRoot = resolve(root, 'dist')) {
  const embedRoot = resolve(distRoot, 'embed');
  const entries = await readdir(embedRoot, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name === 'index.html')
    .map((entry) => posix.relative(
      embedRoot.split('\\').join('/'),
      resolve(entry.parentPath ?? entry.path, entry.name).split('\\').join('/'),
    ).replace(/\/index\.html$/u, ''))
    .sort();
}

/**
 * The floor, not the coverage: every route that builds is checked, and a route
 * that stops building has to be noticed rather than silently dropping out of
 * the set.
 */
export const REQUIRED_EMBED_ROUTES = ['chart', 'moon', 'sky', 'sky/light'];
