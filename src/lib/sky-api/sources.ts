/** Loads the committed source data the sky data API is built from. */
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { SkyApiSources } from './types';

export async function loadSkyApiSources(repoRoot: string): Promise<SkyApiSources> {
  const dataRoot = resolve(repoRoot, 'src/data');
  const parse = async (name: string) => JSON.parse(await readFile(resolve(dataRoot, name), 'utf8'));
  const monthFiles = (await readdir(dataRoot))
    .filter((name) => /^transits-\d{4}-\d{2}\.json$/.test(name))
    .sort();
  return {
    daily: await parse('daily.json'),
    sky: await parse('sky.json'),
    eclipses: await parse('eclipses.json'),
    months: await Promise.all(monthFiles.map((name) => parse(name))),
  };
}
