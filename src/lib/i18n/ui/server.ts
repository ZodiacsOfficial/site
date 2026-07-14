import type { Locale } from '../core';
import en from './en';
import es from './es';
import pt from './pt';
import type { UiCatalog } from './schema';

export const UI = {
  en,
  es,
  pt,
} as const satisfies Record<Locale, UiCatalog>;
