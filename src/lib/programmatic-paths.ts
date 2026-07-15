import { CHINESE_ZODIAC_ANIMALS } from '../data/chinese-zodiac';
import { DAYS_IN_MONTH, MONTH_SLUGS } from './birthdays';

export const BIRTHDAY_PATHS = Object.freeze(
  MONTH_SLUGS.flatMap((month, index) => (
    Array.from({ length: DAYS_IN_MONTH[index] }, (_, day) => `/birthday/${month}-${day + 1}/`)
  )),
);

export const CHINESE_ZODIAC_PATHS = Object.freeze([
  '/learn/chinese-zodiac/',
  ...CHINESE_ZODIAC_ANIMALS.map((animal) => `/learn/chinese-zodiac/${animal.slug}/`),
]);

export const LOCALIZED_PROGRAMMATIC_PATHS = Object.freeze([
  ...BIRTHDAY_PATHS,
  ...CHINESE_ZODIAC_PATHS,
]);
