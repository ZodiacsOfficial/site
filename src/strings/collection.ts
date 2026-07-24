import type { CollectionTierId } from '../lib/collection/tiers';

export const COLLECTION_EN = {
  metaTitle: 'The Collection — The Cabinet of Twelve | Zodiacs.org',
  metaDescription: 'Twelve official records, one display case. How the cabinet fills, how the Bronze, Silver, Gold, and Master tiers work, and how to read any public address.',
  breadcrumbRegistry: 'Registry',
  breadcrumbPage: 'The Collection',
  kicker: 'The collector’s wing',
  title: 'The Cabinet of Twelve.',
  intro: 'Each of the twelve signs exists as one official record. The cabinet shows which of the Twelve an address keeps — and the tiers measure how much it holds.',
  boundary: 'Address-only and read-only. There is no wallet connection, message signing, approval, transaction construction, or custody.',

  exemplarCaption: 'The complete cabinet — every seat filled. Finished cabinets are rare.',

  tiersTitle: 'How the tiers work',
  tiersIntro: 'Tiers follow the total amount held across the Twelve at one address. The cabinet is a separate count: which signs are present, each counted once, on either supported network.',
  tierColumnTier: 'Tier',
  tierColumnThreshold: 'Threshold',
  tierColumnMeaning: 'Meaning',
  tierBronze: 'Bronze',
  tierBronzeThreshold: 'Any holding at all',
  tierBronzeLine: 'A record is kept.',
  tierSilver: 'Silver',
  tierSilverThreshold: '100,000+ held in total',
  tierSilverLine: 'A serious shelf.',
  tierGold: 'Gold',
  tierGoldThreshold: '1,000,000+ held in total',
  tierGoldLine: 'Deep conviction — a thousandth of a single record’s supply.',
  tierMaster: 'Master of the Cabinet',
  tierMasterThreshold: 'Gold, with all twelve present',
  tierMasterLine: 'The registry’s highest distinction. Few ever finish.',
  ruleCabinet: 'The cabinet counts each sign once, whatever the balance and whichever the network.',
  ruleTier: 'The tier follows the total amount across every sign.',
  ruleVerifiable: 'Any public address can be read — standing in the registry is verifiable by anyone.',

  purposeTitle: 'What the cabinet is for',
  purposeBody: 'The cabinet is an address’s standing in the registry: a display anyone can verify, shaped entirely by what it keeps. The tiers mark the climb. The full cabinet — Master — is the capstone, and it is deliberately hard to finish.',
  purposeCatalogue: 'The twelve records live in the catalogue; each lot page lists where its record can be acquired.',
  purposeCatalogueLink: 'Browse the catalogue →',

  checkerTitle: 'Read an address',
  checkerIntro: 'Paste a public address to see its cabinet and tier. The read is a balance check against the official registry — nothing more.',
  addressLabel: 'Public address',
  addressPlaceholder: 'Paste a public address',
  addressHelp: 'Accepted formats: a 32-byte Solana base58 public key or a Base 0x address.',
  supportedNetworks: 'Configured networks: {networks}.',
  solana: 'Solana',
  base: 'Base',
  check: 'Read the cabinet',
  checking: 'Reading the record…',
  invalidAddress: 'That doesn’t read as a supported public address.',
  unavailable: 'The public record could not be read just now. Nothing about the address changed.',
  invalidResponse: 'The balance read returned an unreadable result. Try again later.',
  offlineTitle: 'The checker is resting.',
  offlineBody: 'Balance reads are not configured on this deployment. The cabinet and the tiers above read the same.',
  noJavaScript: 'JavaScript is required for the address checker. The cabinet, the tiers, and the catalogue read without it.',

  resultKicker: 'Cabinet reading',
  standsAt: '{address} stands at {tier}.',
  standsAtNone: '{address} keeps none of the Twelve. The cabinet waits.',
  resultSummary: '{total} held across {count} of the Twelve · checked {date}',
  resultSummaryNone: 'No official records at this address · checked {date}',
  fullCabinetNote: 'All twelve are present.',
  masterNote: 'The cabinet is complete at Gold depth — Master.',
  seatAmount: '{amount} held',
  seatEmpty: 'empty seat',

  privacyTitle: 'What crosses the boundary',
  privacyBody: 'The server receives the pasted public address and returns a balance read against the official registry. Nothing else is sent, and nothing is stored beyond a short-lived cache of the public read.',
  readOnlyDisclosure: 'Read-only by design. No custody, signing, approvals, or transactions.',
  standingDisclosure: 'Tiers are standing in the registry. They never change a chart, a compatibility reading, or anything astrological.',
  amountsDisclosure: 'Amounts are on-chain balance reads at the checked time — never statements of price or value.',
  controlDisclosure: 'A balance read does not prove which person controls an address.',
  financialDisclosure: 'Not financial advice. Nothing here is a solicitation, recommendation, or statement of value.',
  registryBack: 'Return to the official Registry',
} as const;

export type CollectionStringKey = keyof typeof COLLECTION_EN;

export function collectionText(
  key: CollectionStringKey,
  values: Record<string, string | number> = {},
): string {
  return COLLECTION_EN[key].replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ''));
}

export function tierName(tier: CollectionTierId): string {
  if (tier === 'bronze') return COLLECTION_EN.tierBronze;
  if (tier === 'silver') return COLLECTION_EN.tierSilver;
  if (tier === 'gold') return COLLECTION_EN.tierGold;
  if (tier === 'master') return COLLECTION_EN.tierMaster;
  return '';
}
