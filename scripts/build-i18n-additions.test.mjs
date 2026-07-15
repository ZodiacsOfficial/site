import { describe, expect, it } from 'vitest';
import { GROWTH_UI_EN } from '../src/lib/i18n/ui/growth';
import { EN as TRUST_EN } from '../src/strings/en.mjs';
import {
  i18nAdditionEntries,
  i18nAdditionSections,
  i18nManifestIsCurrent,
  renderI18nAdditions,
} from './build-i18n-additions.mjs';

const EXPECTED_SECTION_COUNTS = {
  'WS1 — trust, disclosure, and archive receipts': 65,
  'WS2b — email capture and shared footer': 29,
  'WS2c — OG and social-card art': 118,
  'WS2d — structured data': 43,
  'WS3 — share cards and result sharing': 36,
  'WS4 — PWA, install prompt, and flag-off push scaffold': 22,
  'WS5 — programmatic pages and Chinese zodiac': 77,
  'WS6 — widgets': 83,
  'WS8 — wallet natal chart': 68,
};

describe('additive locale handoff manifest', () => {
  it('covers the exact 541-key additive source set without duplicates', () => {
    const sections = i18nAdditionEntries();
    const entries = sections.flatMap(({ entries: values }) => values);
    const counts = Object.fromEntries(sections.map(({ title, entries: values }) => [title, values.length]));

    expect(counts).toEqual(EXPECTED_SECTION_COUNTS);
    expect(entries).toHaveLength(541);
    expect(new Set(entries.map(({ key }) => key)).size).toBe(entries.length);
    expect(i18nAdditionSections()).toEqual(
      sections.map(({ title, entries: values }) => [title, values.map(({ key }) => key)]),
    );
  });

  it('derives all trust and shared-UI additions, including footer disclosure, from source catalogs', () => {
    const byTitle = new Map(i18nAdditionEntries().map(({ title, entries }) => [title, entries]));
    const trustKeys = byTitle.get('WS1 — trust, disclosure, and archive receipts').map(({ key }) => key);
    const sharedEntries = byTitle.get('WS2b — email capture and shared footer');

    expect(trustKeys).toEqual(Object.keys(TRUST_EN).sort((a, b) => a.localeCompare(b)));
    expect(sharedEntries.map(({ key }) => key)).toEqual(
      Object.keys(GROWTH_UI_EN).sort((a, b) => a.localeCompare(b)),
    );
    expect(sharedEntries.find(({ key }) => key === 'footerDisclosure')).toMatchObject({
      english: 'Disclosure',
      pendingLocales: ['ES', 'PT', 'FR', 'IT'],
    });
  });

  it('gives every key an English default, a one-line usage brief, and an explicit locale state', () => {
    const entries = i18nAdditionEntries().flatMap(({ entries: values }) => values);
    for (const entry of entries) {
      expect(entry.english, entry.key).not.toBe('');
      expect(entry.context, entry.key).toMatch(/^Location: .+\. Tone: .+\.$/);
      expect(entry.context, entry.key).not.toContain('\n');
      expect(entry.pendingLocales, entry.key).toEqual(expect.any(Array));
      expect(entry.pendingLocales.every((locale) => ['ES', 'PT', 'FR', 'IT'].includes(locale)), entry.key).toBe(true);
      expect(new Set(entry.pendingLocales).size, entry.key).toBe(entry.pendingLocales.length);
    }
  });

  it('carries placeholder and artwork line-break requirements beside every affected default', () => {
    const entries = i18nAdditionEntries().flatMap(({ entries: values }) => values);
    for (const entry of entries) {
      const placeholders = [...new Set(entry.english.match(/\{[A-Za-z][A-Za-z0-9]*\}/g) ?? [])];
      for (const placeholder of placeholders) {
        expect(entry.context, `${entry.key} must preserve ${placeholder}`).toContain(placeholder);
      }
      if (entry.english.includes('<br/>')) {
        expect(entry.context, `${entry.key} must preserve <br/>`).toContain('literal <br/>');
      }
      if (entry.english.includes('[OPERATOR TO ')) {
        expect(entry.context, `${entry.key} must preserve its pending marker`).toContain('operator-action marker verbatim');
      }
    }
  });

  it('renders all per-key fields and keeps the checked-in manifest byte-current', async () => {
    const rendered = renderI18nAdditions();
    expect(rendered).toContain('TODO(i18n): translation handoff for 541 additive keys');
    expect(rendered).toContain('`push.prompt.accept`');
    expect(
      i18nAdditionEntries()
        .flatMap(({ entries: values }) => values)
        .find(({ key }) => key === 'push.prompt.accept')?.pendingLocales,
    ).toEqual([]);
    expect(rendered.match(/^  - EN default:/gm)).toHaveLength(541);
    expect(rendered.match(/^  - Usage:/gm)).toHaveLength(541);
    expect(rendered.match(/^  - Pending locales:/gm)).toHaveLength(541);
    expect(rendered).toContain('`footerDisclosure`');
    expect(await i18nManifestIsCurrent()).toBe(true);
  });
});
