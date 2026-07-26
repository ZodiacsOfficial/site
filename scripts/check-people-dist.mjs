import { readFile, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const people = JSON.parse(await readFile(resolve(root, 'src/data/people.json'), 'utf8')).people;
const failures = [];
const routes = ['/people/', ...people.map((person) => `/people/${person.slug}/`)];
const sitemap = await readFile(resolve(dist, 'sitemap.xml'), 'utf8');
const searchIndex = JSON.parse(await readFile(resolve(dist, 'search-index.json'), 'utf8'));

for (const route of routes) {
  const html = await readFile(resolve(dist, route.slice(1), 'index.html'), 'utf8').catch(() => '');
  if (!html) {
    failures.push(`${route}: missing`);
    continue;
  }
  if (!/<meta name="robots" content="noindex, nofollow, max-image-preview:large"\s*\/?>/u.test(html)) {
    failures.push(`${route}: robots contract missing`);
  }
  if (/<link rel="alternate" hreflang=/u.test(html)) failures.push(`${route}: unexpected hreflang`);
  if (!html.includes(`<link rel="canonical" href="https://zodiacs.org${route}"`)) {
    failures.push(`${route}: self-canonical missing`);
  }
}

if (/https:\/\/zodiacs\.org\/people\//u.test(sitemap)) failures.push('sitemap contains People');
if (searchIndex.some((entry) => entry.path === '/people/' || entry.path.startsWith('/people/'))) {
  failures.push('search index contains People');
}
const personFiles = await readdir(resolve(dist, 'people'));
if (personFiles.length !== 21 || !personFiles.includes('index.html')) {
  failures.push(`expected directory plus 20 person directories, found ${personFiles.length} entries`);
}

if (failures.length) {
  console.error(`people-dist: ${failures.length} failure(s)`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log('people-dist: OK — 21 noindex/nofollow routes, self-canonical, no hreflang, no sitemap or search entry');
