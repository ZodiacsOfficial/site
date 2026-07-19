import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { EN } from '../strings/en.mjs';
import { additionFormat } from '../strings/additions';
import {
  DISCLOSURE_ROWS,
  disclosureRows,
  disclosureText,
  type DisclosureTextKey,
} from './disclosure';
import { LOCALES, LOCALE_META, localizePath, type Locale } from './i18n';
import {
  REGISTRY_ESTABLISHED,
  REGISTRY_ESTABLISHMENT,
  REGISTRY_ESTABLISHMENT_PROVENANCE_URL,
} from './registry-establishment.mjs';
import { SIGNS, signName } from './signs';

const ROW_IDS = [
  'operator',
  'economic-interest',
  'origin',
  'separation',
  'read-only',
  'financial-advice',
] as const;
const PENDING_IDS = ['operator', 'economic-interest', 'origin'] as const;
const ROUTE_TEXT_KEYS = [
  'metaTitle',
  'metaDescription',
  'kicker',
  'title',
  'intro',
  'scope',
  'establishedLabel',
  'establishedPrefix',
  'establishedPending',
  'tableLabel',
  'statementHeading',
  'evidenceHeading',
  'statusPending',
  'statusVerified',
  'operatorLabel',
  'operatorStatement',
  'operatorEvidence',
  'economicLabel',
  'economicStatement',
  'economicEvidence',
  'originLabel',
  'originStatement',
  'originEvidence',
  'separationLabel',
  'separationStatement',
  'separationEvidence',
  'readOnlyLabel',
  'readOnlyStatement',
  'readOnlyEvidence',
  'adviceLabel',
  'adviceStatement',
  'adviceEvidence',
  'linkPrivacy',
  'linkMethodology',
  'linkRegistry',
  'linkSdk',
  'linkTerms',
  'linkThesis',
  'operatorRequest',
  'operatorRequestBody',
  'backRegistry',
] as const satisfies readonly DisclosureTextKey[];

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function routeFile(locale: Locale): string {
  const prefix = LOCALE_META[locale].pathPrefix.replace(/^\//, '');
  return resolve(repo, 'dist', prefix, 'disclosure/index.html');
}

function routeRow(html: string, id: typeof ROW_IDS[number]): string {
  return html.match(new RegExp(`<tr\\b[^>]*id="${id}"[^>]*>([\\s\\S]*?)<\\/tr>`))?.[1] ?? '';
}

function literalTextPattern(value: string): RegExp {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<!\\p{L})${escaped}(?!\\p{L})`, 'u');
}

describe('registry disclosure contract', () => {
  it('publishes every required disclosure row exactly once', () => {
    expect(DISCLOSURE_ROWS.map((row) => row.id)).toEqual(ROW_IDS);
  });

  it('keeps every unverified operator claim visibly pending', () => {
    const pending = DISCLOSURE_ROWS.filter((row) => row.status === 'pending');
    expect(pending.map((row) => row.id)).toEqual(['operator', 'economic-interest', 'origin']);
    expect(pending.slice(0, 2).every((row) => /unverified/i.test(row.statement))).toBe(true);
    // Pending facts stay explicit in their own statement as well as row status;
    // no operator confirmation is inferred from absent repository evidence.
    expect(pending.every((row) => !`${row.statement} ${row.evidence}`.includes('[OPERATOR'))).toBe(true);
  });

  it('describes Aura wallet access as optional, public-address-only, and non-transactional', () => {
    const row = DISCLOSURE_ROWS.find((candidate) => candidate.id === 'read-only')!;
    expect(row.statement).toContain('may connect to compatible wallet software');
    expect(row.statement).toContain('authorized public accounts');
    expect(row.statement).toContain('uses one compatible address for the lookup');
    expect(row.statement).toContain('after a user click');
    expect(row.statement).toContain('does not hold assets');
    expect(row.statement).toContain('request signatures or approvals');
    expect(row.statement).toContain('construct or submit transactions');
    expect(row.statement).toContain('switch networks');
    expect(row.statement).not.toContain('do not connect wallets');
    expect(row.evidence).toContain('forwards only the one address used for its holdings lookup');
    expect(row.evidence).toContain('not proof of identity, control, or legal ownership');
  });

  it('defines official as a Registry classification without implying safety or value', () => {
    const row = DISCLOSURE_ROWS.find((candidate) => candidate.id === 'financial-advice')!;
    expect(row.statement).toContain('not a wallet score or price signal');
    expect(row.statement).toContain('no purchase is required');
    expect(row.evidence).toContain('“Official” is a Registry classification only');
    for (const excludedClaim of [
      'government approval',
      'identity verification',
      'safety',
      'value',
      'liquidity',
      'future performance',
    ]) {
      expect(row.evidence).toContain(excludedClaim);
    }
  });

  it('keeps one quiet public-lookup note at the Accession Desk', async () => {
    const source = await readFile(resolve(repo, 'src/islands/RegistryAura.tsx'), 'utf8');
    const boundary = (source.match(/<details class="aura-wallet-connect aura-desk-details"[\s\S]*?<\/details>/)?.[0] ?? '')
      .replace(/\s+/g, ' ');

    expect(boundary).toContain('sends the public address to its holdings provider');
    expect(boundary).toContain('simply fills the public address field');
    expect(boundary).toContain('nothing is signed');
    expect(boundary).toContain('href="/privacy/"');
    expect(boundary).toContain('href="/disclosure/"');
  });

  it('keeps the English privacy and terms pages explicit about Aura data and asset risk', async () => {
    const [privacySource, termsSource] = await Promise.all([
      readFile(resolve(repo, 'src/pages/privacy/index.astro'), 'utf8'),
      readFile(resolve(repo, 'src/pages/terms/index.astro'), 'utf8'),
    ]);
    const privacy = privacySource.replace(/\s+/g, ' ');
    const terms = termsSource.replace(/\s+/g, ' ');

    for (const required of [
      'configured blockchain-data provider',
      'does not include birth fields, chart names, chart placements, or chart geometry',
      'becomes ineligible for restoration after eight hours',
      'ineligible after 24 hours',
      'deleted the next time Aura reads them',
      'We do not promise that a public-address request is never logged',
      'Clearing Aura cannot recall copies',
      'no birth data, public address, chart identifier, connected account identifier, or exact held-sign list',
    ]) {
      expect(privacy).toContain(required);
    }

    for (const required of [
      'result in a total loss',
      'Blockchain transactions are often irreversible',
      "does not prove control of an address, legal ownership of an asset, or a person's identity",
      '“official,” “official Zodiac,” and similar wording mean only',
      'not an endorsement, solicitation, or statement that an asset is suitable for you',
      'still pending operator confirmation',
    ]) {
      expect(terms).toContain(required);
    }
  });

  it('provides one pending deploy-transaction slot per sign', () => {
    const origin = DISCLOSURE_ROWS.find((row) => row.id === 'origin');
    expect(origin?.links).toHaveLength(12);
    expect(origin?.links.every((link) => !link.href && link.label.endsWith('— pending'))).toBe(true);
  });

  it('centralizes the provisional year and leaves provenance unsupplied', () => {
    expect(REGISTRY_ESTABLISHED).toBe(REGISTRY_ESTABLISHMENT.romanYear);
    expect(REGISTRY_ESTABLISHMENT_PROVENANCE_URL).toBeNull();
  });

  it('keeps pending chips on the established #E0B080 convention', async () => {
    const source = await readFile(resolve(repo, 'src/components/DisclosureTable.astro'), 'utf8');
    expect(source).toMatch(/\.status-chip--pending\s*\{[\s\S]*color:\s*#E0B080;/);
  });

  it('keeps the six-row contract and pending provenance localized in every catalog', () => {
    for (const locale of LOCALES) {
      const rows = disclosureRows(locale);
      expect(rows.map((row) => row.id), locale).toEqual(ROW_IDS);
      expect(rows.filter((row) => row.status === 'pending').map((row) => row.id), locale)
        .toEqual(PENDING_IDS);
      expect(rows.filter((row) => row.status === 'verified').map((row) => row.id), locale)
        .toEqual(['separation', 'read-only', 'financial-advice']);
      expect(rows.every((row) => !`${row.statement} ${row.evidence}`.includes('[OPERATOR')), locale)
        .toBe(true);

      const origin = rows.find((row) => row.id === 'origin')!;
      expect(origin.links, locale).toHaveLength(SIGNS.length);
      expect(origin.links.map((link) => link.label), locale).toEqual(SIGNS.map((sign) => (
        additionFormat(
          locale,
          'disclosure.originSlot',
          { sign: signName(sign, locale) },
          EN['disclosure.originSlot'],
        )
      )));
      expect(origin.links.every((link) => !link.href && !link.label.includes('[OPERATOR')), locale)
        .toBe(true);

      const separation = rows.find((row) => row.id === 'separation')!;
      expect(separation.links.map((link) => link.href), locale).toEqual([
        localizePath(locale, '/privacy/'),
        localizePath(locale, '/methodology/'),
      ]);
    }
  });

  it('render-checks all five routes without operator scaffolding or English copy leakage', async () => {
    for (const locale of LOCALES) {
      const html = await readFile(routeFile(locale), 'utf8');
      const route = localizePath(locale, '/disclosure/');
      expect(html, locale).toContain(`<html lang="${LOCALE_META[locale].htmlLang}">`);
      expect(html, locale).toContain(`<link rel="canonical" href="https://zodiacs.org${route}">`);
      expect(html, locale).not.toContain('[OPERATOR');
      for (const key of [
        'operatorStatement',
        'operatorEvidence',
        'economicStatement',
        'economicEvidence',
      ] as const) {
        expect(html, `${locale}:disclosure.${key}`).toContain(disclosureText(locale, key));
      }
      expect(html.match(/class="[^"]*status-chip--pending[^"]*"/g), locale).toHaveLength(3);
      expect(html.match(/class="[^"]*status-chip--verified[^"]*"/g), locale).toHaveLength(3);
      expect(html.match(/class="[^"]*establishment__pending[^"]*"/g), locale).toHaveLength(1);
      expect(html, locale).toContain(disclosureText(locale, 'establishedPending'));
      expect(html.match(/class="[^"]*evidence-slot[^"]*"/g), locale).toHaveLength(12);
      for (const link of disclosureRows(locale).find((row) => row.id === 'origin')!.links) {
        expect(html, `${locale}:${link.label}`).toContain(link.label);
      }

      for (const id of PENDING_IDS) {
        const row = routeRow(html, id);
        expect(row, `${locale}:${id}`).toContain('status-chip--pending');
        expect(row, `${locale}:${id}`).toContain(disclosureText(locale, 'statusPending'));
        expect(row, `${locale}:${id}`).not.toContain('status-chip--verified');
        expect(row, `${locale}:${id}`).not.toContain(disclosureText(locale, 'statusVerified'));
      }
      for (const hreflang of ['en', 'es', 'pt-BR', 'fr', 'it', 'x-default']) {
        expect(html, `${locale}:${hreflang}`).toContain(`hreflang="${hreflang}"`);
      }
      expect(html, locale).toContain(`href="${localizePath(locale, '/disclosure/')}"`);
      expect(html, locale).toContain(`href="${localizePath(locale, '/privacy/')}"`);
      expect(html, locale).toContain(`href="${localizePath(locale, '/methodology/')}"`);

      if (locale === 'en') continue;
      for (const key of ROUTE_TEXT_KEYS) {
        const english = EN[`disclosure.${key}`];
        if (english === disclosureText(locale, key)) continue;
        expect(html, `${locale} leaked disclosure.${key}`).not.toMatch(literalTextPattern(english));
      }
    }
  });
});
