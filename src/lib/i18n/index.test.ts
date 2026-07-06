import { describe, expect, it } from 'vitest';
import { alternatePaths, localizePath, stripLocale, UI } from './index';

describe('i18n helpers', () => {
  it('keeps the Spanish catalog aligned with English keys', () => {
    expect(Object.keys(UI.es).sort()).toEqual(Object.keys(UI.en).sort());
  });

  it('localizes only supported core paths', () => {
    expect(localizePath('es', '/birth-chart/')).toBe('/es/birth-chart/');
    expect(localizePath('es', '/compatibility/aries-taurus/')).toBe('/compatibility/aries-taurus/');
    expect(stripLocale('/es/aries/')).toBe('/aries/');
  });

  it('returns alternates for translated pages', () => {
    expect(alternatePaths('/es/tools/')).toEqual({ en: '/tools/', es: '/es/tools/' });
    expect(alternatePaths('/learn/placements/venus-in-scorpio/')).toBeNull();
  });
});
