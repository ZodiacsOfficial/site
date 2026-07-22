import { describe, expect, it } from 'vitest';
import { formatDate, intlLocale } from './dates';
import { pluralCategory, pluralText, tp, type PluralCatalog } from './plural';
import { SIGN_SLUGS, signPrepositional } from '../signs';
import { RUSSIAN_RUNTIME } from './ru-runtime/server';

describe('staged locale grammar infrastructure', () => {
  it('delegates Russian cardinal categories to Intl.PluralRules', () => {
    const vectors = [
      [0, 'many'], [1, 'one'], [2, 'few'], [5, 'many'], [11, 'many'],
      [21, 'one'], [22, 'few'], [25, 'many'], [1.5, 'other'],
    ] as const;
    for (const [count, category] of vectors) {
      expect(pluralCategory('ru', count), String(count)).toBe(category);
    }
  });

  it('delegates Arabic cardinal categories to Intl.PluralRules', () => {
    const vectors = [
      [0, 'zero'], [1, 'one'], [2, 'two'], [3, 'few'], [10, 'few'],
      [11, 'many'], [99, 'many'], [100, 'other'], [101, 'other'],
      [102, 'other'], [103, 'few'], [1.5, 'other'],
    ] as const;
    for (const [count, category] of vectors) {
      expect(pluralCategory('ar', count), String(count)).toBe(category);
    }
  });

  it('selects a reviewed form, interpolates values, and falls back to other', () => {
    expect(pluralText('ru', { one: '{n} result for {name}', other: '{n} results for {name}' }, 1, { name: 'Luna' }))
      .toBe('1 result for Luna');
    expect(pluralText('ru', { other: '{n} results' }, 2)).toBe('2 results');

    const catalog: PluralCatalog = {
      charts: { one: '{n} chart', few: '{n} charts', many: '{n} charts', other: '{n} charts' },
    };
    expect(tp('ru', 'charts', 22, catalog)).toBe('22 charts');
    expect(() => tp('ru', 'missing', 1, catalog)).toThrow('Missing plural translation ru.missing');
  });

  it('pins Gregorian Arabic formatting with Latin digits', () => {
    expect(intlLocale('ar')).toBe('ar-u-ca-gregory-nu-latn');
    expect(formatDate('ar', '2026-03-21T00:00:00.000Z', {
      day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
    })).toBe('21 مارس 2026');
  });

  it('provides all twelve Russian prepositional sign forms without activating labels', () => {
    expect(Object.keys(RUSSIAN_RUNTIME.signs.prepositional)).toEqual(SIGN_SLUGS);
    expect(SIGN_SLUGS.map(signPrepositional)).toEqual([
      'Овне', 'Тельце', 'Близнецах', 'Раке', 'Льве', 'Деве',
      'Весах', 'Скорпионе', 'Стрельце', 'Козероге', 'Водолее', 'Рыбах',
    ]);
    expect(() => signPrepositional('ophiuchus')).toThrow('Unknown sign: ophiuchus');
  });
});
