import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

export const sourceReviews = JSON.parse(readFileSync(new URL('../source-reviews.json', import.meta.url), 'utf8'));
for (const [slug, review] of Object.entries(sourceReviews.people)) {
  const raw = readFileSync(new URL(`../evidence/${slug}.json`, import.meta.url));
  if (createHash('sha256').update(raw).digest('hex') !== review.sourceSnapshotSHA256) {
    throw new Error(`${slug}: reviewed source snapshot changed; reconcile the source decision before regeneration`);
  }
}

/** Overlay reviewed editorial decisions without rewriting a historical source. */
export function reviewedEvidence(evidence, slug) {
  const review = sourceReviews.people[slug];
  if (!review) return evidence;
  const resolved = structuredClone(evidence);
  if (review.birthDate) {
    if (evidence.birth.time.slice(1, 11) !== review.previousBirthDate) {
      throw new Error(`${slug}: source birth date changed; review the correction before regenerating`);
    }
    if (evidence.birth.calendarModel !== 'proleptic-gregorian') {
      throw new Error(`${slug}: correction requires a Gregorian source record`);
    }
    resolved.birth.time = `+${review.birthDate}T00:00:00Z`;
  }
  if (review.deathDate) {
    if (evidence.death.time.slice(1, 11) !== review.previousDeathDate) {
      throw new Error(`${slug}: source death date changed; review the correction before regenerating`);
    }
    resolved.death.time = `+${review.deathDate}T00:00:00Z`;
  }
  if (review.countryLabel) resolved.birthPlace.country.label = review.countryLabel;
  return resolved;
}
