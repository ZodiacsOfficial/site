/**
 * The reference-instant migration of 2026-09-23, delegated by the owner and
 * recorded in corrections/2026-09-23-reference-instants.json.
 *
 * compute-astro.mjs resolves a record's noon reference instant and its
 * civil-day bounds as the birth chart calculator does. Once it has rewritten
 * computed/{slug}.json for the named records, this tool carries only their
 * chart-derived fields into manifest.json: the instant, offset, civil-day
 * bounds and meridian residual; the Sun's degree and cusp check; the Moon;
 * the unknown-time band; the data-quality label; the content depth measured
 * from the current copy and depth report; and the migration's provenance.
 * Everything reviewed on its own terms (portraits and their credits,
 * sources, identity, disciplines, index eligibility, suppression) is carried
 * over untouched. build-manifest.mjs --slug is not used for this: it
 * re-derives a record from the evidence cache, which would undo reviewed
 * portrait decisions.
 *
 * It fails closed when a named record's Sun sign would change or become
 * undeterminable, or its data-quality label is not the one build-manifest
 * derives: those are factual corrections, reviewed on their own.
 *
 *   node docs/phase5/people-pilot/tools/migrate-reference-instants.mjs --slug=a,b
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { sourceReviews } from './source-reviews.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PILOT = join(HERE, '..');

export const MIGRATION_ID = 'reference-instants-2026-09-23';
const REVIEWED_AT_UTC = '2026-09-23T00:00:00Z';
const PILOT_TOOLS = `docs/phase5/people-pilot/tools @ ${MIGRATION_ID}`;

const slugs = [...new Set(process.argv
  .filter((argument) => argument.startsWith('--slug='))
  .flatMap((argument) => argument.slice('--slug='.length).split(','))
  .map((slug) => slug.trim())
  .filter(Boolean))];
if (slugs.length === 0) throw new Error('Name the records to migrate with --slug=a,b');

const manifest = JSON.parse(await readFile(join(PILOT, 'manifest.json'), 'utf8'));
const depth = JSON.parse(await readFile(join(PILOT, 'depth-report.json'), 'utf8'));
const bySlug = new Map(manifest.people.map((person) => [person.slug, person]));
const unknown = slugs.filter((slug) => !bySlug.has(slug));
if (unknown.length > 0) throw new Error(`Unknown People record(s): ${unknown.join(', ')}`);

// The same per-page similarity build-manifest.mjs records.
const perPageSimilarity = { ...depth.perSlugMax };
for (const pair of depth.topPairs) {
  perPageSimilarity[pair.a] = Math.max(perPageSimilarity[pair.a] ?? 0, pair.similarity);
  perPageSimilarity[pair.b] = Math.max(perPageSimilarity[pair.b] ?? 0, pair.similarity);
}

/** build-manifest.mjs's data-quality label. */
function qualityLabel(slug, moon) {
  if (sourceReviews.people[slug]?.status === 'adopted-date') {
    return 'Adopted birth date; date uncertain; birth time unknown';
  }
  return moon.uncertain
    ? 'Birth date sourced; birth time unknown; Moon sign undetermined'
    : 'Birth date sourced; birth time unknown';
}

let moved = 0;
for (const slug of slugs) {
  const person = bySlug.get(slug);
  const computed = JSON.parse(await readFile(join(PILOT, 'computed', `${slug}.json`), 'utf8'));
  const copy = JSON.parse(await readFile(join(PILOT, 'copy', `${slug}.json`), 'utf8'));
  const source = computed.computation;
  const target = person.computation;
  for (const key of ['timeZone', 'civilTime', 'latitude', 'longitude', 'coordinateSourceEntity']) {
    if (source[key] !== target[key]) throw new Error(`${slug}: computed ${key} differs from the reviewed record`);
  }
  if (computed.sun.sign !== person.sunSign.slug) {
    throw new Error(`${slug}: the Sun sign would change (${person.sunSign.slug} → ${computed.sun.sign}); review it as a factual correction`);
  }
  if (computed.cusp.ambiguous) {
    throw new Error(`${slug}: the Sun's sign would become undeterminable; review it as a factual correction`);
  }
  if (person.dataQualityLabel !== qualityLabel(slug, person.moon)) {
    throw new Error(`${slug}: the data-quality label is not the derived one; review it before migrating`);
  }
  if (source.utcInstant !== target.utcInstant) moved += 1;

  const residualMinutes = (source.longitude / 15) * 60 - source.utcOffsetMinutesAtBirth;
  Object.assign(target, {
    utcInstant: source.utcInstant,
    utcOffsetMinutesAtBirth: source.utcOffsetMinutesAtBirth,
    civilDayStartUtc: source.civilDayStartUtc,
    civilDayEndUtc: source.civilDayEndUtc,
    meridianResidualMinutes: Number(residualMinutes.toFixed(2)),
    meridianResidualMoonDegrees: Number((Math.abs(residualMinutes) / 60 * 0.55).toFixed(4)),
  });
  person.sunSign = {
    ...person.sunSign,
    degree: computed.sun.degree,
    determinable: true,
    cuspCheck: computed.cusp,
  };
  person.moon = computed.moon;
  person.unknownTimeErrorBandDegrees = computed.unknownTimeErrorBandDegrees;
  person.dataQualityLabel = qualityLabel(slug, computed.moon);
  person.reviewedAtUtc = REVIEWED_AT_UTC;
  person.computationInputVersion = { ...person.computationInputVersion, pilotTools: PILOT_TOOLS };
  person.contentDepth = {
    originalWords: copy.measurements.originalWords,
    substantiveStatements: copy.measurements.substantiveStatements,
    highestPairwiseSimilarity: perPageSimilarity[slug] ?? 0,
  };
}

await writeFile(join(PILOT, 'manifest.json'), `${JSON.stringify(manifest, null, 1)}\n`, 'utf8');
console.log(`${MIGRATION_ID}: migrated ${slugs.length} manifest records; ${moved} reference instants moved.`);
