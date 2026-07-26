/**
 * Assemble the reviewed Phase 5 People pilot into the one static production
 * data file the site consumes. This script is deterministic and offline: its
 * only inputs are the committed evidence, computation, copy, and manifest.
 *
 * Usage:
 *   node scripts/build-people-pilot.mjs
 *   node scripts/build-people-pilot.mjs --check
 */
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pilot = resolve(root, 'docs/phase5/people-pilot');
const outputPath = resolve(root, 'src/data/people.json');
const checkOnly = process.argv.includes('--check');

const manifest = JSON.parse(await readFile(resolve(pilot, 'manifest.json'), 'utf8'));
const people = [];

for (const source of manifest.people) {
  const computed = JSON.parse(
    await readFile(resolve(pilot, 'computed', `${source.slug}.json`), 'utf8'),
  );
  const copy = JSON.parse(
    await readFile(resolve(pilot, 'copy', `${source.slug}.json`), 'utf8'),
  );
  const signIndex = [
    'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
    'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
  ];

  people.push({
    ...source,
    indexEligibility: {
      ...source.indexEligibility,
      eligible: false,
      blockedBy: ['phase-5b-noindex-pilot — owner approval and legal review required before indexing'],
    },
    portrait: source.portrait.available
      ? { ...source.portrait, assetPath: `/assets/people/${source.slug}.webp` }
      : source.portrait,
    placements: computed.placements.map((placement) => ({
      ...placement,
      longitude: Number((
        signIndex.indexOf(placement.sign) * 30 + placement.degree
      ).toFixed(2)),
    })),
    aspectsStableAcrossCivilDay: computed.aspectsStableAcrossCivilDay,
    patterns: computed.patterns,
    copy: {
      title: copy.title,
      metaDescription: copy.metaDescription,
      lede: copy.lede,
      ledeFact: copy.ledeFact,
      blocks: copy.blocks,
      birthdayLink: copy.birthdayLink,
      signLink: copy.signLink,
      measurements: copy.measurements,
    },
  });
}

const output = `${JSON.stringify({
  schema: 'zodiacs.phase5.people.v1',
  status: 'Phase 5B noindex pilot — 20 reviewed records',
  reviewedAtUtc: '2026-07-25T00:00:00Z',
  sourceManifestSha256: createHash('sha256')
    .update(await readFile(resolve(pilot, 'manifest.json')))
    .digest('hex'),
  people: people.sort((a, b) => a.slug.localeCompare(b.slug)),
}, null, 2)}\n`;

if (checkOnly) {
  const existing = await readFile(outputPath, 'utf8').catch(() => '');
  if (existing !== output) {
    console.error('people-pilot: src/data/people.json drifted; run node scripts/build-people-pilot.mjs');
    process.exit(1);
  }
  console.log(`people-pilot: OK — ${people.length} reviewed noindex records, generated data exact`);
} else {
  await writeFile(outputPath, output, 'utf8');
  console.log(`people-pilot: wrote ${people.length} reviewed noindex records to src/data/people.json`);
}
