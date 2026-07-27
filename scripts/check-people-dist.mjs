import { readFile, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const data = JSON.parse(await readFile(resolve(root, 'src/data/people.json'), 'utf8'));
const people = data.people;
const failures = [];
const sitemap = await readFile(resolve(dist, 'sitemap.xml'), 'utf8');
const searchIndex = JSON.parse(await readFile(resolve(dist, 'search-index.json'), 'utf8'));
const searchPeople = new Set(searchIndex
  .map((entry) => entry.path)
  .filter((path) => /^\/people\/[a-z0-9-]+\/$/u.test(path)));

const NOINDEX = /<meta name="robots" content="noindex, nofollow, max-image-preview:large"\s*\/?>/u;
const INDEXABLE = /<meta name="robots" content="max-image-preview:large"\s*\/?>/u;

for (const person of people) {
  const route = `/people/${person.slug}/`;
  const html = await readFile(resolve(dist, route.slice(1), 'index.html'), 'utf8').catch(() => '');
  if (!html) { failures.push(`${route}: missing`); continue; }
  const eligible = person.indexEligibility.eligible;
  if (eligible && !INDEXABLE.test(html)) failures.push(`${route}: expected indexable robots`);
  if (!eligible && !NOINDEX.test(html)) failures.push(`${route}: living protection lost`);
  if (/<link rel="alternate" hreflang=/u.test(html)) failures.push(`${route}: unexpected hreflang`);
  if (!html.includes(`<link rel="canonical" href="https://zodiacs.org${route}"`)) {
    failures.push(`${route}: self-canonical missing`);
  }
  if (eligible !== sitemap.includes(`https://zodiacs.org${route}`)) {
    failures.push(`${route}: sitemap membership must equal eligibility (${eligible})`);
  }
  if (eligible !== searchPeople.has(route)) {
    failures.push(`${route}: search membership must equal eligibility (${eligible})`);
  }
}

const directoryHtml = await readFile(resolve(dist, 'people/index.html'), 'utf8').catch(() => '');
if (!directoryHtml) failures.push('/people/: missing');
if (data.directoryIndexable) {
  if (!INDEXABLE.test(directoryHtml)) failures.push('/people/: expected indexable robots');
  if (!sitemap.includes('https://zodiacs.org/people/</loc>')) failures.push('/people/: sitemap row missing');
} else if (!NOINDEX.test(directoryHtml)) {
  failures.push('/people/: expected noindex robots');
}

const personDirectories = await readdir(resolve(dist, 'people'));
if (personDirectories.length !== people.length + 1 || !personDirectories.includes('index.html')) {
  failures.push(`expected directory plus ${people.length} person directories, found ${personDirectories.length} entries`);
}

/* Living-person asset protection stays pinned in vercel.json. */
const vercel = JSON.parse(await readFile(resolve(root, 'vercel.json'), 'utf8'));
const headerSources = (vercel.headers ?? []).map((header) => header.source).join(' ');
for (const person of people.filter((candidate) => !candidate.indexEligibility.eligible)) {
  if (!headerSources.includes(person.slug)) {
    failures.push(`${person.slug}: living-person image X-Robots protection missing from vercel.json`);
  }
}

if (failures.length) {
  console.error(`people-dist: ${failures.length} failure(s)`);
  for (const failure of failures.slice(0, 20)) console.error(`  - ${failure}`);
  process.exit(1);
}
const eligibleCount = people.filter((person) => person.indexEligibility.eligible).length;
console.log(`people-dist: OK — ${people.length + 1} routes; ${eligibleCount} indexable (+ directory ${data.directoryIndexable ? 'indexable' : 'noindex'}); ${people.length - eligibleCount} living protected; sitemap/search membership exact`);
