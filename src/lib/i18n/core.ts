export const LOCALES = ['en', 'es', 'pt', 'fr', 'it'] as const;
export type Locale = typeof LOCALES[number];

export const DEFAULT_LOCALE: Locale = 'en';

export function normalizeLocale(locale: string | undefined | null): Locale {
  const value = locale?.trim().toLowerCase();
  if (!value) return DEFAULT_LOCALE;
  return LOCALES.find((candidate) => value === candidate || value.startsWith(`${candidate}-`))
    ?? DEFAULT_LOCALE;
}
