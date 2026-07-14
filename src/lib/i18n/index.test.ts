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
  type UiKey,
} from './index';

describe('i18n helpers', () => {
  it('keeps every localized UI catalog aligned with all 331 English keys', () => {
    const englishKeys = Object.keys(UI.en).sort();
    expect(englishKeys).toHaveLength(331);
    for (const locale of LOCALES) {
      expect(Object.keys(UI[locale]).sort()).toEqual(englishKeys);
    }
  });

  it('preserves interpolation placeholders in every localized message', () => {
    const placeholders = (message: string) => (
      [...message.matchAll(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g)]
        .map((match) => match[1])
        .sort()
    );
    const keys = Object.keys(UI.en) as UiKey[];
    for (const locale of LOCALES) {
      for (const key of keys) {
        expect(placeholders(UI[locale][key]), locale + '.' + key).toEqual(placeholders(UI.en[key]));
      }
    }
  });

  it('uses the canonical browser-only privacy disclosure', () => {
    expect(UI.en.privacyDevice).toBe(
      'The entire calculation happens in your browser; your birth date, time, and place are not sent to a chart API.',
    );
    expect(Object.keys(UI.en).filter((key) => key.startsWith('privacyDevice'))).toEqual(['privacyDevice']);
  });

  it('localizes only supported core paths', () => {
    expect(localizePath('es', '/birth-chart/')).toBe('/es/birth-chart/');
    expect(localizePath('pt', '/birth-chart/')).toBe('/pt/birth-chart/');
    expect(localizePath('es', '/compatibility/aries-taurus/')).toBe('/compatibility/aries-taurus/');
    expect(stripLocale('/es/aries/')).toBe('/aries/');
    expect(stripLocale('/pt/aries/')).toBe('/aries/');
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
    expect(alternatePaths('/es/tools/')).toEqual({
      en: '/tools/',
      es: '/es/tools/',
      pt: '/pt/tools/',
    });
    expect(alternatePaths('/pt/privacy/')).toEqual({
      en: '/privacy/',
      es: '/es/privacy/',
      pt: '/pt/privacy/',
    });
    expect(LOCALIZED_PATHS.get('/tools/')).toEqual(LOCALES);
    expect(Object.keys(alternatePaths('/tools/') ?? {})).toEqual([...LOCALES]);
    expect(alternatePaths('/es/404/')).toEqual({
      en: '/404.html',
      es: '/es/404/',
      pt: '/pt/404/',
    });
    expect(alternatePaths('/learn/placements/venus-in-scorpio/')).toBeNull();
  });

  it('interpolates localized messages without changing unsupported paths', () => {
    expect(tf('es', 'skyPlanetRetrograde', { planet: 'Plutón' })).toBe('Plutón retrógrado');
    expect(tf('es', 'pairingCta', { a: 'Aries', b: 'Tauro' })).toBe('Leer la combinación de Aries y Tauro');
    expect(tf('pt', 'skyPlanetRetrograde', { planet: 'Plutão' })).toBe('Plutão retrógrado');
    expect(tf('pt', 'pairingCta', { a: 'Áries', b: 'Touro' })).toBe('Leia a combinação entre Áries e Touro');
    expect(localizePath('es', '/horoscopes/aries/')).toBe('/horoscopes/aries/');
  });

  it('uses the approved Brazilian Portuguese registry register', () => {
    expect(UI.pt.navCollect).toBe('Registro');
    expect(UI.pt.recordLabel).toBe('Ala do acervo');
    expect(UI.pt.recordOneOfTwelve).toBe(
      'também integra os Doze — um registro canônico no acervo.',
    );
    expect(UI.pt.recordViewLink).toBe('Ver o registro →');
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

  it('keeps the Portuguese baby result sentences grammatical when signs are inserted', () => {
    expect(UI.pt.babySunNearEdge + ' Gêmeos ' + UI.pt.babySunNearEdgeTail).toBe(
      'A data fica perto da transição de signo, então nascer mais de um dia antes ou depois pode levar o Sol para Gêmeos — a data do nascimento é que decide.',
    );
    expect(
      UI.pt.babySunSplitA + ' Áries ' + UI.pt.babySunSplitOr + ' Touro ' + UI.pt.babySunSplitTail,
    ).toBe(
      'O Sol muda de signo nesta data: o bebê nasce com o Sol em Áries ou Touro dependendo do horário. O momento exato do nascimento decide.',
    );
    expect(UI.pt.babyMoonBody).toContain('Bebês que nascem na mesma semana');
  });
});
