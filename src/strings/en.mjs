/**
 * English source catalogue for additive trust/growth surfaces.
 *
 * Keep these keys stable: the parallel locale branch can translate this
 * catalogue without searching Astro, JSX, or generated HTML. Until a locale
 * supplies a value, new pages deliberately fall back to this English copy.
 */
export const EN = Object.freeze({
  'disclosure.metaTitle': 'Disclosure — Zodiacs.org Registry',
  'disclosure.metaDescription': 'Plain-language operator, economic-interest, provenance, separation, read-only, and financial-advice disclosures for the Zodiacs.org Registry.',
  'disclosure.kicker': 'Registry disclosure',
  'disclosure.title': 'The facts, including the unresolved ones.',
  'disclosure.intro': 'This page separates facts supported by public evidence from statements that still require operator confirmation. Pending rows are not treated as verified.',
  'disclosure.scope': 'These disclosures apply to the Registry wing. The astrology tools remain free, browser-computed, and usable without the Registry.',
  'disclosure.tableLabel': 'Registry disclosures and evidence status',
  'disclosure.statementHeading': 'Statement',
  'disclosure.evidenceHeading': 'Status and evidence',
  'disclosure.statusVerified': 'Verified from published materials',
  'disclosure.statusPending': 'Pending operator confirmation',
  'disclosure.operatorLabel': 'Operator relationship',
  'disclosure.operatorStatement': 'Zodiacs.org and Astrofolio share an operator.',
  'disclosure.operatorEvidence': 'No operator attestation is present in the repository.',
  'disclosure.economicLabel': 'Economic interest',
  'disclosure.economicStatement': 'The operator holds positions in the twelve Registry assets.',
  'disclosure.economicEvidence': 'No holdings attestation is present in the repository.',
  'disclosure.originLabel': 'Origin',
  'disclosure.originStatement': 'Deployment provenance must be evidenced per sign by the earliest on-chain deploy transaction.',
  'disclosure.originEvidence': 'The Registry publishes canonical addresses, but it does not yet publish the twelve deploy-transaction receipts.',
  'disclosure.originSlot': '{sign} deploy transaction — pending',
  'disclosure.separationLabel': 'Separation',
  'disclosure.separationStatement': 'The astrology tools are free, contain no advertising or cross-site trackers, and operate independently of the Registry. Using them requires no awareness of the Registry.',
  'disclosure.separationEvidence': 'The calculators compute in the browser, and the astrology navigation does not require a Registry interaction.',
  'disclosure.readOnlyLabel': 'Read-only posture',
  'disclosure.readOnlyStatement': 'The Registry and @zodiacs/sdk do not connect wallets, hold assets, request signatures, construct transactions, or submit transactions.',
  'disclosure.readOnlyEvidence': 'The published Registry is paste-address-based, and the SDK documents and tests a read-only API surface.',
  'disclosure.adviceLabel': 'Financial advice and solicitation',
  'disclosure.adviceStatement': 'Nothing on Zodiacs.org is financial advice or a solicitation to buy, sell, or hold an asset.',
  'disclosure.adviceEvidence': 'The Registry, thesis, SDK, and terms publish this limitation directly.',
  'disclosure.linkPrivacy': 'Privacy',
  'disclosure.linkMethodology': 'Methodology',
  'disclosure.linkRegistry': 'Machine-readable Registry',
  'disclosure.linkSdk': 'SDK posture',
  'disclosure.linkTerms': 'Terms',
  'disclosure.linkThesis': 'Thesis',
  'disclosure.establishedLabel': 'Registry establishment',
  'disclosure.establishedPrefix': 'Est.',
  'disclosure.establishedProvenance': 'Earliest deploy transaction',
  'disclosure.establishedPending': 'Earliest deploy provenance — pending',
  'disclosure.operatorRequest': 'Operator input still required',
  'disclosure.operatorRequestBody': 'Confirm the shared-operator wording, disclose economic interests, provide one deploy-transaction link per sign, and confirm the establishment year against the earliest transaction.',
  'disclosure.backRegistry': 'Return to the Registry',
  'disclosure.linkLabel': 'Disclosure',
  'disclosure.aboutNotice': 'The Registry’s operator relationship, economic-interest statement, evidence status, and pending deploy-provenance slots are published on the disclosure page.',
  'disclosure.aboutLink': 'Read the Registry disclosure',
  'disclosure.provenancePendingShort': 'Deploy provenance pending',
  'registry.verifierNotFoundSentence': 'Not found in the official Zodiacs.org registry.',
  'registry.verifierNotFoundInline': 'not found in the official Zodiacs.org registry',
  'registry.establishmentProvenanceLink': 'Provenance ↗',
  'registry.ogLotAlt': '{sign} — Nº {number} of 12, Lot {lot} of XII in the official Zodiacs.org Registry.',
  'archive.receiptsLabel': 'Receipts',
  'archive.archivedReceipt': 'Archived copy',
  'archive.pendingPrimary': 'Pending archived primary source',
  'archive.verifiedRegistry': 'Matches the official record',
  'archive.entries.accidental-libra.receipts.wrongLibra': 'Portnoy: “I’m buying the wrong libra”',
  'archive.entries.accidental-libra.receipts.mintAddress': 'Portnoy post containing the Libra mint address',
  'archive.entries.zodiac-iwo.receipts.primary': 'inversebrah: zodiac shorthand post',
  'archive.entries.onboarding-wave.receipts.primary': 'wantonwallet: 1,200+ wallet onboarding record',
  'archive.entries.astrology-girlies.receipts.primary': 'iJaadee: astrology community call',
  'archive.entries.oldest-meme.receipts.primary': 'Andrew Kang: “Human Civilization’s Oldest Meme”',
  'archive.entries.astrologers-arrive.receipts.primary': 'TikTokInvestors: “The astrologers have arrived”',
  'archive.entries.horoscopes-to-hodl.receipts.primary': 'Numinous Realm: “Horoscopes to HODL”',
  'archive.entries.origin.receipts.registry': 'Published machine-readable registry',
  'archive.entries.pure-belief.receipts.primary': 'CZ: “Just a pure belief system”',
});

/** @param {keyof typeof EN} key @returns {string} */
export function en(key) {
  return String(EN[key]);
}

/**
 * @param {keyof typeof EN} key
 * @param {Record<string, string | number>} values
 * @returns {string}
 */
export function enFormat(key, values) {
  return Object.entries(values).reduce(
    (copy, [name, value]) => copy.replaceAll(`{${name}}`, String(value)),
    String(EN[key]),
  );
}
