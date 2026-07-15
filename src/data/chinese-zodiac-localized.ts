import type { Locale } from '../lib/i18n/core';
import { additionFormat, additionText, localizedAdditionObject } from '../strings/additions';
import { CHINESE_ZODIAC_ANIMALS, CHINESE_ZODIAC_COPY } from './chinese-zodiac';

export function chineseZodiacCopy(locale: Locale) {
  return localizedAdditionObject(locale, 'chineseZodiac', CHINESE_ZODIAC_COPY);
}

export function chineseZodiacAnimals(locale: Locale) {
  if (locale === 'en') return CHINESE_ZODIAC_ANIMALS;
  return CHINESE_ZODIAC_ANIMALS.map((animal) => ({
    ...animal,
    name: additionText(locale, `chineseZodiac.animals.${animal.slug}.name`, animal.name),
    association: additionText(locale, `chineseZodiac.animals.${animal.slug}.association`, animal.association),
    context: additionText(locale, `chineseZodiac.animals.${animal.slug}.context`, animal.context),
  }));
}

export function chineseZodiacLocalizedText(
  locale: Locale,
  key: keyof typeof CHINESE_ZODIAC_COPY,
  values: Record<string, string | number> = {},
): string {
  return additionFormat(locale, `chineseZodiac.${key}`, values, CHINESE_ZODIAC_COPY[key]);
}
