import { describe, expect, it } from 'vitest';
import { LOCALES, LOCALE_META } from '../src/lib/i18n';
import {
  ABSENT_LOCALES,
  ACTIVE_HREFLANGS,
  HREFLANG_LOCALE_POLICY,
  INACTIVE_HREFLANGS,
  STAGED_NOINDEX_LOCALES,
  X_DEFAULT_HREFLANG,
  expectedHreflangsForPath,
  hreflangRouteFamily,
} from './i18n-hreflang-policy.mjs';

describe('hreflang release policy', () => {
  it('matches locale metadata without activating staged locales', () => {
    expect(HREFLANG_LOCALE_POLICY.map((entry) => entry.locale)).toEqual(LOCALES);
    expect(HREFLANG_LOCALE_POLICY.filter((entry) => entry.indexEligible).map((entry) => entry.locale))
      .toEqual(['en', 'es', 'pt', 'fr', 'it']);
    for (const entry of HREFLANG_LOCALE_POLICY) {
      expect(entry.hreflang).toBe(LOCALE_META[entry.locale].hreflang);
    }
    expect(ACTIVE_HREFLANGS).toEqual(['en', 'es', 'pt-BR', 'fr', 'it']);
    expect(INACTIVE_HREFLANGS).toEqual(['ru', 'ar']);
    expect(STAGED_NOINDEX_LOCALES).toEqual(['ru']);
    expect(ABSENT_LOCALES).toEqual(['ar']);
    expect(X_DEFAULT_HREFLANG).toEqual({
      hreflang: 'x-default', locale: 'en', expectedBlocks: 2025,
    });
    expect(hreflangRouteFamily('/fr/tools/')).toBe('core');
    expect(hreflangRouteFamily('/birthday/february-29/')).toBe('programmatic');
    expect(hreflangRouteFamily('/ru/horoscopes/aries/')).toBeNull();
    expect([...expectedHreflangsForPath('/tools/')]).toEqual(['en', 'es', 'pt-BR', 'fr', 'it', 'x-default']);
    expect([...expectedHreflangsForPath('/learn/chinese-zodiac/dragon/')])
      .toEqual(['en', 'es', 'pt-BR', 'fr', 'it', 'x-default']);
    expect([...expectedHreflangsForPath('/horoscopes/aries/')]).toEqual([]);
    expect(HREFLANG_LOCALE_POLICY.find((entry) => entry.locale === 'ru')?.routeFamilies).toEqual([]);
    expect(HREFLANG_LOCALE_POLICY.find((entry) => entry.locale === 'ar')?.routeFamilies).toEqual([]);
  });
});
