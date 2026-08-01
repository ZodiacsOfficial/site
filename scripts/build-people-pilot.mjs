/**
 * Assemble the reviewed Phase 5 People pilot into the one static production
 * data file the site consumes. This script is deterministic and offline: its
 * only inputs are the committed evidence, computation, copy, and manifest.
 *
 * Usage:
 *   node scripts/build-people-pilot.mjs
 *   node scripts/build-people-pilot.mjs --check
 */
import { access, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyEvidenceTrustOverride,
  materializeTrustedPerson,
  selectPublishablePeople,
  trustOverrideFor,
  validatePeopleTrustPolicy,
  validatePersonTrustFacts,
} from './people-trust.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pilot = resolve(root, 'docs/phase5/people-pilot');
const outputPath = resolve(root, 'src/data/people.json');
const checkOnly = process.argv.includes('--check');

const manifest = JSON.parse(await readFile(resolve(pilot, 'manifest.json'), 'utf8'));
const indexPolicyPath = resolve(pilot, 'index-policy.json');
const indexPolicy = JSON.parse(await readFile(indexPolicyPath, 'utf8'));
const trustPolicyPath = resolve(pilot, 'trust-policy.json');
const trustPolicy = JSON.parse(await readFile(trustPolicyPath, 'utf8'));
const depth = JSON.parse(await readFile(resolve(pilot, 'depth-report.json'), 'utf8'));
const indexableProfiles = new Set(indexPolicy.indexableProfiles);
const protectedLivingProfiles = new Set(indexPolicy.protectedLivingProfiles);
const quarantinedProfiles = new Set(trustPolicy.quarantinedProfiles.map((entry) => entry.slug));
const people = [];

const trustPolicyFailures = validatePeopleTrustPolicy(trustPolicy, manifest);
if (trustPolicyFailures.length > 0) {
  throw new Error(`People trust policy failed:\n- ${trustPolicyFailures.join('\n- ')}`);
}
for (const slug of quarantinedProfiles) {
  if (indexableProfiles.has(slug) || protectedLivingProfiles.has(slug)) {
    throw new Error(`${slug}: quarantined profile remains in the publication policy`);
  }
  const staleAssets = [
    resolve(root, 'public/assets/og/v2/people', `${slug}.png`),
    resolve(root, 'public/assets/people', `${slug}.webp`),
    resolve(root, 'public/assets/people', `${slug}-192.webp`),
  ];
  for (const asset of staleAssets) {
    if (await access(asset).then(() => true).catch(() => false)) {
      throw new Error(`${slug}: quarantined profile still has a public asset (${asset})`);
    }
  }
}

if (indexPolicy.schema !== 'zodiacs.phase5.people-index-policy.v1') {
  throw new Error(`Unsupported People index policy: ${indexPolicy.schema}`);
}
if (indexableProfiles.size !== indexPolicy.indexableProfiles.length
    || protectedLivingProfiles.size !== indexPolicy.protectedLivingProfiles.length) {
  throw new Error('People index policy contains a duplicate slug');
}
const manifestSlugs = new Set(manifest.people.map((person) => person.slug));
for (const slug of [...indexableProfiles, ...protectedLivingProfiles]) {
  if (!manifestSlugs.has(slug)) throw new Error(`People index policy names unknown slug: ${slug}`);
}
if (indexableProfiles.size + protectedLivingProfiles.size + quarantinedProfiles.size !== manifestSlugs.size) {
  throw new Error('People publication and quarantine policies do not partition the complete reviewed manifest');
}
if (indexPolicy.directoryIndexable !== (
  indexableProfiles.size >= indexPolicy.minimumIndexableProfilesForDirectory
)) {
  throw new Error('People directory eligibility disagrees with its minimum-profile rule');
}

for (const rawSource of selectPublishablePeople(manifest.people, trustPolicy)) {
  const override = trustOverrideFor(trustPolicy, rawSource.slug);
  const rawEvidence = JSON.parse(
    await readFile(resolve(pilot, 'evidence', `${rawSource.slug}.json`), 'utf8'),
  );
  const evidence = applyEvidenceTrustOverride(rawEvidence, override);
  const computed = JSON.parse(
    await readFile(resolve(pilot, 'computed', `${rawSource.slug}.json`), 'utf8'),
  );
  const copy = JSON.parse(
    await readFile(resolve(pilot, 'copy', `${rawSource.slug}.json`), 'utf8'),
  );
  const signIndex = [
    'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
    'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
  ];

  const trustFailures = validatePersonTrustFacts({
    slug: rawSource.slug,
    birthDate: evidence.birth?.time?.slice(1, 11) ?? '',
    deathDate: evidence.death?.time?.slice(1, 11) ?? null,
    living: evidence.living,
    birthPlace: {
      entity: evidence.birthPlace?.entity,
      normalisedLabel: override?.fields.birthPlace.normalisedLabel
        ?? rawSource.birthPlace.normalisedLabel,
      country: evidence.birthPlace?.country,
      coordinates: evidence.birthPlace?.coordinates,
    },
  });
  if (trustFailures.length > 0) {
    throw new Error(`People trust gate failed:\n- ${trustFailures.join('\n- ')}`);
  }
  if (computed.storedDate !== evidence.birth.time.slice(1, 11)
      || computed.qid !== rawSource.qid
      || computed.computation.timeZone !== (override?.fields.birthPlace.timeZone
        ?? rawSource.birthPlace.timeZone)
      || Math.abs(computed.computation.latitude - evidence.birthPlace.coordinates.latitude) > 1e-9
      || Math.abs(computed.computation.longitude - evidence.birthPlace.coordinates.longitude) > 1e-9) {
    throw new Error(`${rawSource.slug}: computed chart does not match the trusted birth tuple`);
  }

  const source = materializeTrustedPerson({
    source: rawSource,
    computed,
    copy,
    override,
    similarity: depth.perSlugMax?.[rawSource.slug] ?? 0,
  });
  const indexEligible = indexableProfiles.has(source.slug);
  const livingProtected = protectedLivingProfiles.has(source.slug);
  if (indexEligible === livingProtected) {
    throw new Error(`${source.slug}: must appear in exactly one Phase 5C policy set`);
  }
  if (indexEligible && source.living) {
    throw new Error(`${source.slug}: living profile cannot enter the conservative index allowlist`);
  }
  if (livingProtected && !source.living) {
    throw new Error(`${source.slug}: protected-living policy disagrees with the reviewed record`);
  }
  if (indexEligible && (
    source.suppression.status !== 'active'
    || !source.sunSign.determinable
    || !source.indexEligibility.contentChecksPassed
    || source.indexEligibility.contentCheckFailures.length > 0
  )) {
    throw new Error(`${source.slug}: failed an immutable profile index-eligibility check`);
  }

  people.push({
    ...source,
    indexEligibility: {
      ...source.indexEligibility,
      eligible: indexEligible,
      blockedBy: indexEligible
        ? []
        : ['phase-5c-living-person-protection — separate consent or qualified review required'],
    },
    portrait: source.portrait.available
      ? { ...source.portrait, assetPath: `/assets/people/${source.slug}.webp` }
      : source.portrait,
    placements: source.placements.map((placement) => ({
      ...placement,
      longitude: Number((
        signIndex.indexOf(placement.sign) * 30 + placement.degree
      ).toFixed(2)),
    })),
  });
}

const releaseCounts = {
  reviewedSourceRecords: manifest.people.length,
  publishedRecords: people.length,
  indexableDeceasedRecords: indexableProfiles.size,
  protectedLivingRecords: protectedLivingProfiles.size,
  historicalWithdrawals: indexPolicy.withdrawn?.length ?? 0,
  quarantinedRecords: quarantinedProfiles.size,
};
if (releaseCounts.publishedRecords + releaseCounts.quarantinedRecords
    !== releaseCounts.reviewedSourceRecords
    || releaseCounts.indexableDeceasedRecords + releaseCounts.protectedLivingRecords
      !== releaseCounts.publishedRecords) {
  throw new Error(`People release counts disagree: ${JSON.stringify(releaseCounts)}`);
}
const releaseStatus = `Phase 5 public release — ${releaseCounts.publishedRecords} published records: `
  + `${releaseCounts.indexableDeceasedRecords} indexable deceased, `
  + `${releaseCounts.protectedLivingRecords} protected living; `
  + `${releaseCounts.historicalWithdrawals} historical withdrawal${releaseCounts.historicalWithdrawals === 1 ? '' : 's'}; `
  + `${releaseCounts.quarantinedRecords} quarantined`;

const output = `${JSON.stringify({
  schema: 'zodiacs.phase5.people.v1',
  status: releaseStatus,
  releaseCounts,
  reviewedAtUtc: people.map((person) => person.reviewedAtUtc).sort().at(-1),
  sourceManifestSha256: createHash('sha256')
    .update(await readFile(resolve(pilot, 'manifest.json')))
    .digest('hex'),
  sourceIndexPolicySha256: createHash('sha256')
    .update(await readFile(indexPolicyPath))
    .digest('hex'),
  sourceTrustPolicySha256: createHash('sha256')
    .update(await readFile(trustPolicyPath))
    .digest('hex'),
  indexPolicyApprovedAtUtc: indexPolicy.approvedAtUtc,
  trustPolicyApprovedAtUtc: trustPolicy.approvedAtUtc,
  directoryIndexable: indexPolicy.directoryIndexable,
  people: people.sort((a, b) => a.slug.localeCompare(b.slug)),
}, null, 2)}\n`;

if (checkOnly) {
  const existing = await readFile(outputPath, 'utf8').catch(() => '');
  if (existing !== output) {
    console.error('people-pilot: src/data/people.json drifted; run node scripts/build-people-pilot.mjs');
    process.exit(1);
  }
  console.log(
    `people-release: OK — ${indexableProfiles.size} indexable profiles,`
    + ` ${protectedLivingProfiles.size} protected living profiles,`
    + ` ${quarantinedProfiles.size} quarantined profiles, generated data exact`,
  );
} else {
  await writeFile(outputPath, output, 'utf8');
  console.log(
    `people-release: wrote ${people.length} reviewed records`
    + ` (${indexableProfiles.size} indexable, ${quarantinedProfiles.size} quarantined)`
    + ' to src/data/people.json',
  );
}
