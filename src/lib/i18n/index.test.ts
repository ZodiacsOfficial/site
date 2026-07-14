import { describe, expect, it } from 'vitest';
import {
  LOCALES,
  LOCALE_META,
  LOCALIZED_PATHS,
  alternatePaths,
  localizePath,
  normalizeLocale,
  showsEnglishOnlyInterpretation,
  stripLocale,
  tf,
  UI,
} from './index';

describe('i18n helpers', () => {
  it('keeps the Spanish catalog aligned with English keys', () => {
    expect(Object.keys(UI.es).sort()).toEqual(Object.keys(UI.en).sort());
  });

  it('uses the canonical browser-only privacy disclosure', () => {
    expect(UI.en.privacyDevice).toBe(
      'The entire calculation happens in your browser; your birth date, time, and place are not sent to a chart API.',
    );
    expect(Object.keys(UI.en).filter((key) => key.startsWith('privacyDevice'))).toEqual(['privacyDevice']);
  });

  it('localizes only supported core paths', () => {
    expect(localizePath('es', '/birth-chart/')).toBe('/es/birth-chart/');
    expect(localizePath('es', '/compatibility/aries-taurus/')).toBe('/compatibility/aries-taurus/');
    expect(stripLocale('/es/aries/')).toBe('/aries/');
  });

  it('derives locale parsing and prefixes from the declared locales', () => {
    for (const locale of LOCALES) {
      expect(normalizeLocale(locale.toUpperCase())).toBe(locale);
      expect(normalizeLocale(LOCALE_META[locale].htmlLang)).toBe(locale);
      expect(normalizeLocale(LOCALE_META[locale].intlLocale)).toBe(locale);
      expect(stripLocale(`${LOCALE_META[locale].pathPrefix}/tools/`)).toBe('/tools/');
    }
    expect(normalizeLocale('not-a-locale')).toBe('en');
  });

  it('keeps English interpretive corpora off every non-English locale', () => {
    expect(LOCALES.filter(showsEnglishOnlyInterpretation)).toEqual(['en']);
  });

  it('returns alternates for translated pages', () => {
    expect(alternatePaths('/es/tools/')).toEqual({ en: '/tools/', es: '/es/tools/' });
    expect(alternatePaths('/es/privacy/')).toEqual({ en: '/privacy/', es: '/es/privacy/' });
    expect(LOCALIZED_PATHS.get('/tools/')).toEqual(LOCALES);
    expect(Object.keys(alternatePaths('/tools/') ?? {})).toEqual([...LOCALES]);
    expect(alternatePaths('/learn/placements/venus-in-scorpio/')).toBeNull();
  });

  it('interpolates localized messages without changing unsupported paths', () => {
    expect(tf('es', 'skyPlanetRetrograde', { planet: 'Plutón' })).toBe('Plutón retrógrado');
    expect(tf('es', 'pairingCta', { a: 'Aries', b: 'Tauro' })).toBe('Leer la combinación de Aries y Tauro');
    expect(localizePath('es', '/horoscopes/aries/')).toBe('/horoscopes/aries/');
  });

  it('keeps the Spanish baby result sentences grammatical when signs are inserted', () => {
    expect(`${UI.es.babySunNearEdge} Géminis ${UI.es.babySunNearEdgeTail}`).toBe(
      'La fecha está cerca del borde del signo: si el bebé nace más de un día antes o después, puede tener el Sol en Géminis — la fecha de nacimiento decide.',
    );
    expect(`${UI.es.babySunSplitA} Aries ${UI.es.babySunSplitOr} Tauro ${UI.es.babySunSplitTail}`).toBe(
      'El Sol cambia de signo ese día: el bebé nace con el Sol en Aries o en Tauro según la hora. El momento exacto del nacimiento decide.',
    );
    expect(UI.es.babyMoonBody).toContain('Los bebés nacidos la misma semana');
  });
});
