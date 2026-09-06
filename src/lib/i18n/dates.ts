import { LOCALE_META, type Locale } from './core';

export { TECHNICAL_OFFSET_LOCALE, TECHNICAL_WALL_LOCALE } from '../time/technical-locales';

export function intlLocale(locale: Locale): string {
  return LOCALE_META[locale].intlLocale;
}

export function formatDate(
  locale: Locale,
  value: Date | string,
  options: Intl.DateTimeFormatOptions,
): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleDateString(intlLocale(locale), options);
}

export function formatTime(
  locale: Locale,
  value: Date | string,
  options: Intl.DateTimeFormatOptions,
): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleTimeString(intlLocale(locale), options);
}

export function formatDateTime(
  locale: Locale,
  value: Date | string,
  options: Intl.DateTimeFormatOptions,
): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat(intlLocale(locale), options).format(date);
}

export function formatShortDate(locale: Locale, value: Date | string): string {
  return formatDate(locale, value, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}
