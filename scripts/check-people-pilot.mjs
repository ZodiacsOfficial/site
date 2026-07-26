import { readFile, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(await readFile(resolve(root, 'src/data/people.json'), 'utf8'));
const pilot = resolve(root, 'docs/phase5/people-pilot');
const failures = [];
const signIndex = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
];

if (data.people.length !== 20) failures.push(`expected 20 records, found ${data.people.length}`);
if (new Set(data.people.map((person) => person.slug)).size !== 20) failures.push('duplicate slug');
if (new Set(data.people.map((person) => person.qid)).size !== 20) failures.push('duplicate QID');

const birthdayFiles = new Set(
  (await readdir(resolve(root, 'src/content/birthdays')))
    .filter((file) => file.endsWith('.mdx'))
    .map((file) => file.replace(/\.mdx$/u, '')),
);

for (const person of data.people) {
  if (person.indexEligibility.eligible !== false
      || !person.indexEligibility.blockedBy.some((reason) => reason.includes('noindex'))) {
    failures.push(`${person.slug}: not pinned to the noindex pilot`);
  }
  const computed = JSON.parse(
    await readFile(resolve(pilot, 'computed', `${person.slug}.json`), 'utf8'),
  );
  for (const placement of person.placements) {
    const source = computed.placements.find((candidate) => candidate.body === placement.body);
    const expectedLongitude = signIndex.indexOf(source.sign) * 30 + source.degree;
    if (!source
        || Math.abs(placement.degree - source.degree) > 1e-9
        || Math.abs(placement.longitude - expectedLongitude) > 1e-9) {
      failures.push(`${person.slug}: ${placement.body} position drift`);
    }
  }
  const settled = person.placements.filter((placement) => placement.stableAcrossDay);
  const elementTotal = Object.values(person.patterns.elements).reduce((sum, value) => sum + value, 0);
  const modalityTotal = Object.values(person.patterns.modalities).reduce((sum, value) => sum + value, 0);
  if (person.patterns.settledBodyCount !== settled.length
      || elementTotal !== settled.length
      || modalityTotal !== settled.length) {
    failures.push(`${person.slug}: uncertain placement leaked into an aggregate`);
  }
  if (settled.length !== 10) {
    const text = [person.copy.lede, ...person.copy.blocks.map((block) => block.text)].join(' ');
    if (/\bten bodies\b/iu.test(text)) failures.push(`${person.slug}: uncertain chart claims ten-body total`);
  }
  const birthdaySlug = person.birthDate.birthdayRoute
    .replace(/^\/birthday\//u, '')
    .replace(/\/$/u, '');
  if (!birthdayFiles.has(birthdaySlug)) failures.push(`${person.slug}: broken birthday route`);
}

const sitemap = await readFile(resolve(root, 'src/pages/sitemap.xml.ts'), 'utf8');
const nav = await readFile(resolve(root, 'src/components/SiteNav.astro'), 'utf8');
if (/\/people\//u.test(sitemap)) failures.push('People route entered the sitemap');
if (/\/people\//u.test(nav)) failures.push('People route entered primary navigation');

if (failures.length) {
  console.error(`people-pilot-integrity: ${failures.length} failure(s)`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log('people-pilot-integrity: OK — 20 exact records, uncertain-time aggregates honest, discovery surfaces unchanged');
