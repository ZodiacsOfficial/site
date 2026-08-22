import { describe, expect, it } from 'vitest';
import { RELEASED_LOCALES, localizePath, t } from './i18n';
import {
  FOOTER_TOOLS,
  NAV_TOOLS,
  TOOL_CATALOG,
  TOOLS_HUB,
} from './nav-tools';

describe('NAV_TOOLS', () => {
  it('keeps the requested eight tools in stable order', () => {
    expect(NAV_TOOLS.map((tool) => tool.href)).toEqual([
      '/birth-chart/',
      '/compatibility/',
      '/transits/',
      '/moon-sign/',
      '/rising-sign/',
      '/moon-phase/',
      '/saturn-return/',
      '/birthday/',
    ]);
  });

  it('resolves labels, one-line sublabels, and existing localized paths', () => {
    for (const locale of RELEASED_LOCALES) {
      for (const tool of NAV_TOOLS) {
        expect(t(locale, tool.label).trim()).not.toBe('');
        expect(tool.sublabel[locale]).not.toMatch(/[\r\n]/);
        expect(localizePath(locale, tool.href)).toMatch(/^\//);
      }
    }

    expect(localizePath('es', '/transits/')).toBe('/es/transits/');
    expect(localizePath('es', '/birthday/')).toBe('/birthday/');
    expect(localizePath('pt', '/transits/')).toBe('/pt/transits/');
    expect(localizePath('pt', '/birthday/')).toBe('/birthday/');
    expect(localizePath('fr', '/transits/')).toBe('/fr/transits/');
    expect(localizePath('fr', '/birthday/')).toBe('/birthday/');
    expect(localizePath('it', '/transits/')).toBe('/it/transits/');
    expect(localizePath('it', '/birthday/')).toBe('/birthday/');
  });

  it('derives the nav, footer, and tools hub from one href catalogue', () => {
    const catalogueHrefs = new Set(TOOL_CATALOG.map((tool) => tool.href));
    expect(catalogueHrefs.size).toBe(TOOL_CATALOG.length);
    expect(FOOTER_TOOLS.map((tool) => tool.href)).toEqual([
      '/birth-chart/',
      '/today/',
      '/compatibility/',
      '/moon-sign/',
      '/rising-sign/',
      '/moon-phase/',
      '/saturn-return/',
      '/transits/',
      '/retrogrades/',
    ]);
    expect(TOOLS_HUB).toHaveLength(15);
    for (const tool of [...NAV_TOOLS, ...FOOTER_TOOLS, ...TOOLS_HUB]) {
      expect(catalogueHrefs.has(tool.href)).toBe(true);
    }
  });
});
