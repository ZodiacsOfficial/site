import type { Locale } from '../lib/i18n/core';
import { ES_ADDITIONS } from './additions.es.mjs';
import { FR_ADDITIONS } from './additions.fr.mjs';
import { IT_ADDITIONS } from './additions.it.mjs';
import { PT_ADDITIONS } from './additions.pt.mjs';

const EMPTY = Object.freeze({});

export const ADDITION_CATALOGS = {
  en: EMPTY,
  es: ES_ADDITIONS,
  pt: PT_ADDITIONS,
  fr: FR_ADDITIONS,
  it: IT_ADDITIONS,
} as const satisfies Record<Locale, Readonly<Record<string, string>>>;

export function additionText(locale: Locale, key: string, english?: string): string {
  if (locale === 'en') {
    if (english == null) throw new Error(`English source is required for additive key ${key}`);
    return english;
  }
  const value = (ADDITION_CATALOGS[locale] as Readonly<Record<string, string>>)[key];
  if (value == null) throw new Error(`Missing ${locale} translation for additive key ${key}`);
  return value;
}

export function additionFormat(
  locale: Locale,
  key: string,
  values: Record<string, string | number>,
  english?: string,
): string {
  return additionText(locale, key, english).replace(
    /\{([A-Za-z][A-Za-z0-9]*)\}/g,
    (token, name: string) => Object.prototype.hasOwnProperty.call(values, name)
      ? String(values[name])
      : token,
  );
}

export function localizedAdditionObject<T extends Readonly<Record<string, string>>>(
  locale: Locale,
  prefix: string,
  english: T,
): { [K in keyof T]: string } {
  return Object.fromEntries(Object.entries(english).map(([key, value]) => [
    key,
    additionText(locale, `${prefix}.${key}`, value),
  ])) as { [K in keyof T]: string };
}
