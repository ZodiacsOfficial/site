import { describe, expect, it } from 'vitest';
import { dailyRouteFailures } from './locale-discovery-drive.mjs';

const observedSpanishSign = () => ({
  path: '/es/horoscopes/capricorn/',
  lang: 'es',
  canonical: 'https://zodiacs.org/es/horoscopes/capricorn/',
  alternates: [
    ['en', 'https://zodiacs.org/horoscopes/capricorn/'],
    ['es', 'https://zodiacs.org/es/horoscopes/capricorn/'],
    ['pt-BR', 'https://zodiacs.org/pt/horoscopes/capricorn/'],
    ['x-default', 'https://zodiacs.org/horoscopes/capricorn/'],
  ],
  rail: [['en', '/horoscopes/capricorn/'], ['es', null], ['pt-BR', '/pt/horoscopes/capricorn/']],
  current: ['es'],
  width: 390,
  viewport: 390,
});

describe('locale browser evidence failure detection', () => {
  it('accepts a reciprocal daily route regardless of DOM link ordering', () => {
    const state = observedSpanishSign();
    state.alternates.reverse();
    state.rail.reverse();
    expect(dailyRouteFailures(state, 'es', '/horoscopes/capricorn/')).toEqual([]);
  });

  it('rejects a language rail that sends the reader to the translated homepage', () => {
    const state = observedSpanishSign();
    state.rail[2][1] = '/pt/';
    expect(dailyRouteFailures(state, 'es', '/horoscopes/capricorn/'))
      .toContain('language switch falls back or offers an unavailable edition');
  });

  it('rejects a successful navigation that silently changes the sign or language', () => {
    const state = observedSpanishSign();
    state.path = '/horoscopes/aries/';
    state.lang = 'en';
    expect(dailyRouteFailures(state, 'es', '/horoscopes/capricorn/'))
      .toEqual(expect.arrayContaining(['navigation changed the route', 'wrong document language']));
  });

  it('rejects invented French daily availability and an English canonical', () => {
    const state = observedSpanishSign();
    state.alternates.push(['fr', 'https://zodiacs.org/fr/horoscopes/capricorn/']);
    state.canonical = 'https://zodiacs.org/horoscopes/capricorn/';
    expect(dailyRouteFailures(state, 'es', '/horoscopes/capricorn/'))
      .toEqual(expect.arrayContaining(['wrong reciprocal alternates', 'wrong canonical']));
  });

  it('rejects ambiguous current language markers and visible horizontal overflow', () => {
    const state = observedSpanishSign();
    state.current.push('pt-BR');
    state.width = 420;
    expect(dailyRouteFailures(state, 'es', '/horoscopes/capricorn/'))
      .toEqual(expect.arrayContaining(['wrong current language marker', 'horizontal overflow']));
  });
});
