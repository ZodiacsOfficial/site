/**
 * The single authoring source for the Registry establishment label.
 *
 * The year is consistent with the repository's 2024 origin records, but the
 * directive requires operator confirmation against the earliest deploy
 * transaction. Keep the provenance URL null until that receipt is supplied;
 * UIs must render the adjacent pending slot instead of inventing a link.
 */
export const REGISTRY_ESTABLISHED = 'MMXXIV';
export const REGISTRY_ESTABLISHED_YEAR = 2024;
export const REGISTRY_ESTABLISHMENT_PROVENANCE_URL = null;

export const REGISTRY_ESTABLISHMENT = Object.freeze({
  romanYear: REGISTRY_ESTABLISHED,
  year: REGISTRY_ESTABLISHED_YEAR,
  provenanceUrl: REGISTRY_ESTABLISHMENT_PROVENANCE_URL,
  provenanceStatus: 'pending',
});
