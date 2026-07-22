import { localizePath, type ReleasedLocale as Locale } from './i18n';
import { SIGNS, signName } from './signs';
import { EN } from '../strings/en.mjs';
import { additionFormat, additionText } from '../strings/additions';

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

type DisclosureCatalogKey = Extract<keyof typeof EN, `disclosure.${string}`>;
export type DisclosureTextKey = DisclosureCatalogKey extends `disclosure.${infer Key}` ? Key : never;

export function disclosureText(locale: Locale, key: DisclosureTextKey): string {
  const catalogKey = `disclosure.${key}` as DisclosureCatalogKey;
  return additionText(locale, catalogKey, EN[catalogKey]);
}

export function disclosureRows(locale: Locale): readonly DisclosureRow[] {
  return [
  {
    id: 'operator',
    label: disclosureText(locale, 'operatorLabel'),
    statement: disclosureText(locale, 'operatorStatement'),
    status: 'pending',
    evidence: disclosureText(locale, 'operatorEvidence'),
    links: [],
  },
  {
    id: 'economic-interest',
    label: disclosureText(locale, 'economicLabel'),
    statement: disclosureText(locale, 'economicStatement'),
    status: 'pending',
    evidence: disclosureText(locale, 'economicEvidence'),
    links: [],
  },
  {
    id: 'origin',
    label: disclosureText(locale, 'originLabel'),
    statement: disclosureText(locale, 'originStatement'),
    status: 'pending',
    evidence: disclosureText(locale, 'originEvidence'),
    links: SIGNS.map((sign) => ({
      label: additionFormat(
        locale,
        'disclosure.originSlot',
        { sign: signName(sign, locale) },
        EN['disclosure.originSlot'],
      ),
    })),
  },
  {
    id: 'separation',
    label: disclosureText(locale, 'separationLabel'),
    statement: disclosureText(locale, 'separationStatement'),
    status: 'verified',
    evidence: disclosureText(locale, 'separationEvidence'),
    links: [
      { label: disclosureText(locale, 'linkPrivacy'), href: localizePath(locale, '/privacy/') },
      { label: disclosureText(locale, 'linkMethodology'), href: localizePath(locale, '/methodology/') },
    ],
  },
  {
    id: 'read-only',
    label: disclosureText(locale, 'readOnlyLabel'),
    statement: disclosureText(locale, 'readOnlyStatement'),
    status: 'verified',
    evidence: disclosureText(locale, 'readOnlyEvidence'),
    links: [
      { label: disclosureText(locale, 'linkRegistry'), href: '/registry/zodiacs.registry.json' },
      { label: disclosureText(locale, 'linkSdk'), href: '/sdk/' },
    ],
  },
  {
    id: 'financial-advice',
    label: disclosureText(locale, 'adviceLabel'),
    statement: disclosureText(locale, 'adviceStatement'),
    status: 'verified',
    evidence: disclosureText(locale, 'adviceEvidence'),
    links: [
      { label: disclosureText(locale, 'linkTerms'), href: '/terms/' },
      { label: disclosureText(locale, 'linkThesis'), href: '/thesis/' },
    ],
  },
  ];
}

/** English compatibility export for existing consumers and contract tests. */
export const DISCLOSURE_ROWS: readonly DisclosureRow[] = disclosureRows('en');
