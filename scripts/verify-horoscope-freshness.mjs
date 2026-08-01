/** Fail closed when a deployment would mix stale daily or monthly editions. */
import { readFile, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertHoroscopePackageFreshness,
  parseMonthlyHoroscopeEntry,
} from './horoscope-freshness-lib.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = (name) => resolve(root, 'src/data', name);
const readJson = async (name) => JSON.parse(await readFile(dataPath(name), 'utf8'));
const now = new Date();
const currentMonth = now.toISOString().slice(0, 7);
const contentRoot = resolve(root, 'src/content/horoscopes');
const contentFiles = (await readdir(contentRoot)).filter((name) => name.endsWith('.mdx')).sort();
const monthlyEntries = await Promise.all(contentFiles.map(async (name) => (
  parseMonthlyHoroscopeEntry(
    await readFile(resolve(contentRoot, name), 'utf8'),
    `src/content/horoscopes/${name}`,
  )
)));

const result = assertHoroscopePackageFreshness({
  now,
  daily: await readJson('daily.json'),
  publication: await readJson('daily-publication.json'),
  manifest: await readJson('daily-publication-manifest.json'),
  program: await readJson('horoscope-program.json'),
  transits: await readJson(`transits-${currentMonth}.json`),
  monthlyEntries,
});

console.log(
  `verify-horoscope-freshness: PASS — daily ${result.currentDate}; `
  + `monthly ${result.currentMonth} with ${result.signCount} live signs`,
);
