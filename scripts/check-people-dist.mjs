import { readFile, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const people = JSON.parse(await readFile(resolve(root, 'src/data/people.json'), 'utf8')).people;
const vercel = JSON.parse(await readFile(resolve(root, 'vercel.json'), 'utf8'));
const failures = [];
const routes = ['/people/', ...people.map((person) => `/people/${person.slug}/`)];
const indexable = people.filter((person) => person.indexEligibility.eligible);
const protectedPeople = people.filter((person) => !person.indexEligibility.eligible);
const expectedIndexablePaths = new Set(indexable.map((person) => `/people/${person.slug}/`));
const sitemap = await readFile(resolve(dist, 'sitemap.xml'), 'utf8');
const searchIndex = JSON.parse(await readFile(resolve(dist, 'search-index.json'), 'utf8'));

for (const route of routes) {
  const html = await readFile(resolve(dist, route.slice(1), 'index.html'), 'utf8').catch(() => '');
  if (!html) {
    failures.push(`${route}: missing`);
    continue;
  }
  const shouldIndex = expectedIndexablePaths.has(route);
  const expectedRobots = shouldIndex
    ? 'max-image-preview:large'
    : 'noindex, nofollow, max-image-preview:large';
  const robots = html.match(/<meta name="robots" content="([^"]+)"\s*\/?>/u)?.[1];
  if (robots !== expectedRobots) {
    failures.push(`${route}: robots=${robots ?? 'missing'}, expected ${expectedRobots}`);
  }
  if (/<link rel="alternate" hreflang=/u.test(html)) failures.push(`${route}: unexpected hreflang`);
  if (!html.includes(`<link rel="canonical" href="https://zodiacs.org${route}"`)) {
    failures.push(`${route}: self-canonical missing`);
  }
}

const sitemapPeople = new Set(
  [...sitemap.matchAll(/<loc>https:\/\/zodiacs\.org(\/people\/[^<]+)<\/loc>/gu)]
    .map((match) => match[1]),
);
const searchPeople = new Set(
  searchIndex
    .filter((entry) => entry.path === '/people/' || entry.path.startsWith('/people/'))
    .map((entry) => entry.path),
);
const exactSet = (name, actual, expected) => {
  for (const value of expected) {
    if (!actual.has(value)) failures.push(`${name}: missing ${value}`);
  }
  for (const value of actual) {
    if (!expected.has(value)) failures.push(`${name}: unexpected ${value}`);
  }
};
exactSet('sitemap', sitemapPeople, expectedIndexablePaths);
exactSet('search index', searchPeople, expectedIndexablePaths);

const headerSources = new Map(vercel.headers.map((entry) => [entry.source, entry.headers]));
if (headerSources.has('/people/(.*)')) {
  failures.push('vercel headers still blanket-noindex every People profile');
}
for (const source of [
  '/people/',
  ...protectedPeople.map((person) => `/people/${person.slug}/`),
]) {
  const value = headerSources.get(source)?.find((header) => header.key === 'X-Robots-Tag')?.value;
  if (value !== 'noindex, nofollow, noarchive') {
    failures.push(`vercel headers: ${source} is not protected`);
  }
}
for (const person of protectedPeople) {
  for (const source of [
    `/assets/people/${person.slug}(.*)`,
    `/assets/og/v2/people/${person.slug}.png`,
  ]) {
    const value = headerSources.get(source)?.find((header) => header.key === 'X-Robots-Tag')?.value;
    if (value !== 'noindex, noimageindex, noarchive') {
      failures.push(`vercel headers: ${source} is not image-index protected`);
    }
  }
}
for (const person of indexable) {
  if (headerSources.has(`/people/${person.slug}/`)) {
    failures.push(`vercel headers unexpectedly noindex ${person.slug}`);
  }
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
console.log(
  `people-dist: OK — ${indexable.length} indexable profiles;`
  + ` directory + ${protectedPeople.length} living profiles noindex;`
  + ' sitemap, search, canonicals, hreflang and image headers exact',
);
