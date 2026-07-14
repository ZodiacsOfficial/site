import { SIGNS } from './signs';
import { EN, enFormat } from '../strings/en.mjs';

export type DisclosureStatus = 'verified' | 'pending';

export interface DisclosureEvidence {
  label: string;
  href?: string;
  external?: boolean;
}

export interface DisclosureRow {
  id: 'operator' | 'economic-interest' | 'origin' | 'separation' | 'read-only' | 'financial-advice';
  label: string;
  statement: string;
  status: DisclosureStatus;
  evidence: string;
  links: DisclosureEvidence[];
}

export const DISCLOSURE_ROWS: readonly DisclosureRow[] = [
  {
    id: 'operator',
    label: EN['disclosure.operatorLabel'],
    statement: EN['disclosure.operatorStatement'],
    status: 'pending',
    evidence: EN['disclosure.operatorEvidence'],
    links: [],
  },
  {
    id: 'economic-interest',
    label: EN['disclosure.economicLabel'],
    statement: EN['disclosure.economicStatement'],
    status: 'pending',
    evidence: EN['disclosure.economicEvidence'],
    links: [],
  },
  {
    id: 'origin',
    label: EN['disclosure.originLabel'],
    statement: EN['disclosure.originStatement'],
    status: 'pending',
    evidence: EN['disclosure.originEvidence'],
    links: SIGNS.map((sign) => ({
      label: enFormat('disclosure.originSlot', { sign: sign.name }),
    })),
  },
  {
    id: 'separation',
    label: EN['disclosure.separationLabel'],
    statement: EN['disclosure.separationStatement'],
    status: 'verified',
    evidence: EN['disclosure.separationEvidence'],
    links: [
      { label: EN['disclosure.linkPrivacy'], href: '/privacy/' },
      { label: EN['disclosure.linkMethodology'], href: '/methodology/' },
    ],
  },
  {
    id: 'read-only',
    label: EN['disclosure.readOnlyLabel'],
    statement: EN['disclosure.readOnlyStatement'],
    status: 'verified',
    evidence: EN['disclosure.readOnlyEvidence'],
    links: [
      { label: EN['disclosure.linkRegistry'], href: '/registry/zodiacs.registry.json' },
      { label: EN['disclosure.linkSdk'], href: '/sdk/' },
    ],
  },
  {
    id: 'financial-advice',
    label: EN['disclosure.adviceLabel'],
    statement: EN['disclosure.adviceStatement'],
    status: 'verified',
    evidence: EN['disclosure.adviceEvidence'],
    links: [
      { label: EN['disclosure.linkTerms'], href: '/terms/' },
      { label: EN['disclosure.linkThesis'], href: '/thesis/' },
    ],
  },
] as const;
