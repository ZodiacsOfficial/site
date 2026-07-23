/**
 * The single authoring source for the Registry establishment label.
 *
 * The year and provenance URL are derived from the earliest verified origin
 * receipt in `src/data/registry-origin-receipts.json` (aquarius,
 * 2024-07-05T17:54:34Z, slot 275861144): the transaction that initialized the
 * first canonical native mint. `src/lib/disclosure.test.ts` pins these
 * constants to that data file so they cannot drift apart. MMXXIV is
 * consistent with the receipt evidence.
 */
export const REGISTRY_ESTABLISHED = 'MMXXIV';
export const REGISTRY_ESTABLISHED_YEAR = 2024;
export const REGISTRY_ESTABLISHMENT_PROVENANCE_URL = 'https://solscan.io/tx/3ntKqfqu4LYkSpqJ1DmLNdZHPNgDkkYjdUmZHH3Ejzk8Np6mA8rnaBT3C33dCHeGZhHm6j9sRpJzgtrtcvCWK9jX';

export const REGISTRY_ESTABLISHMENT = Object.freeze({
  romanYear: REGISTRY_ESTABLISHED,
  year: REGISTRY_ESTABLISHED_YEAR,
  provenanceUrl: REGISTRY_ESTABLISHMENT_PROVENANCE_URL,
  provenanceStatus: 'verified',
});
