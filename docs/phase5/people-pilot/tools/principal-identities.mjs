/** Reviewed editorial selections for audit A20. Raw P106 evidence is unchanged.
 * See ../editorial-identities-2026-09-05.md for the primary-source review.
 * This is a closed migration of three labels, not permission to recompose copy.
 */
export const PRINCIPAL_IDENTITIES = Object.freeze({
  'neil-armstrong': ['astronaut', 'test pilot'],
  'amelia-earhart': ['aircraft pilot'],
  'maya-angelou': ['writer'],
});

export function reviewedIdentity(candidate, evidence, existingIdentity) {
  if (!Object.hasOwn(PRINCIPAL_IDENTITIES, candidate.slug)) return null;
  const disciplines = PRINCIPAL_IDENTITIES[candidate.slug];
  if (JSON.stringify(candidate.disciplines) !== JSON.stringify(disciplines)) {
    throw new Error(`${candidate.slug}: editorial selection differs from the reviewed identity migration`);
  }
  const sourced = new Set(evidence.occupations.map(({ label }) => label));
  if (disciplines.some((label) => !sourced.has(label))) {
    throw new Error(`${candidate.slug}: selected identity is absent from the cached occupation evidence`);
  }
  // The country and life-date suffix are outside this editorial migration.
  const suffixAt = existingIdentity.indexOf(' · ');
  if (suffixAt < 0) throw new Error(`${candidate.slug}: missing existing identity suffix`);
  const label = disciplines.join(' and ');
  return label[0].toUpperCase() + label.slice(1) + existingIdentity.slice(suffixAt);
}
