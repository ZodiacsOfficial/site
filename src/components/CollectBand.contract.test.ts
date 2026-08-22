import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('birthday Registry bridge contract', () => {
  it('reuses the sanctioned band only for a definite English birthday sign', async () => {
    const source = await readFile(
      new URL('../pages/birthday/[slug].astro', import.meta.url),
      'utf8',
    );
    expect(source).toContain('{sign && (');
    expect(source).toContain(
      '<CollectBand signName={sign.name} slug={sign.slug} surface="birthday" />',
    );
    expect(source).not.toMatch(/<CollectBand[^>]*(?:cusp|heroSign)/u);
  });

  it('applies the same data-sign gate to all localized birthday previews', async () => {
    const source = await readFile(
      new URL('./programmatic/LocalizedBirthdayPage.astro', import.meta.url),
      'utf8',
    );
    expect(source).toContain('{sign && (');
    expect(source).toContain('signName={localName(sign)}');
    expect(source).toContain('surface="birthday"');
    expect(source).not.toMatch(/<CollectBand[^>]*(?:cusp|heroSign)/u);
  });

  it('measures rendered bands with only sign, surface, and locale', async () => {
    const source = await readFile(new URL('./CollectBand.astro', import.meta.url), 'utf8');
    expect(source).toContain("window.zodiacsAnalytics.track('registry_bridge_impression', properties)");
    expect(source).toContain("window.zodiacsAnalytics.track('registry_bridge_click', properties)");
    expect(source).toContain(
      'var properties = { sign: sign, surface: surface, locale: locale };',
    );
    expect(source).toContain('<script is:inline>');
  });
});
