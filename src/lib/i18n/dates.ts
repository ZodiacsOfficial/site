import { normalizeLocale, type Locale } from './index';

export const TECHNICAL_OFFSET_LOCALE = 'en-US';
export const TECHNICAL_WALL_LOCALE = 'en-CA';

export function intlLocale(locale: Locale): string {
  return locale === 'es' ? 'es-419' : 'en-US';
}

export function formatDate(
  locale: Locale,
  value: Date | string,
  options: Intl.DateTimeFormatOptions,
): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleDateString(intlLocale(normalizeLocale(locale)), options);
}

export function formatTime(
  locale: Locale,
  value: Date | string,
  options: Intl.DateTimeFormatOptions,
): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleTimeString(intlLocale(normalizeLocale(locale)), options);
}

export function formatDateTime(
  locale: Locale,
  value: Date | string,
  options: Intl.DateTimeFormatOptions,
): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat(intlLocale(normalizeLocale(locale)), options).format(date);
}

export function formatShortDate(locale: Locale, value: Date | string): string {
  return formatDate(locale, value, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}
