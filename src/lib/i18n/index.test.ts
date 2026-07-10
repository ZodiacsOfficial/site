import { describe, expect, it } from 'vitest';
import { alternatePaths, localizePath, stripLocale, tf, UI } from './index';

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

  it('returns alternates for translated pages', () => {
    expect(alternatePaths('/es/tools/')).toEqual({ en: '/tools/', es: '/es/tools/' });
    expect(alternatePaths('/learn/placements/venus-in-scorpio/')).toBeNull();
  });

  it('interpolates localized messages without changing unsupported paths', () => {
    expect(tf('es', 'skyPlanetRetrograde', { planet: 'Plutón' })).toBe('Plutón retrógrado');
    expect(tf('es', 'pairingCta', { a: 'Aries', b: 'Tauro' })).toBe('Leer la combinación de Aries y Tauro');
    expect(localizePath('es', '/horoscopes/aries/')).toBe('/horoscopes/aries/');
  });
});
