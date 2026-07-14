import type { Locale } from '../core';
import en from './en';
import es from './es';
import pt from './pt';
import fr from './fr';
import type { UiCatalog } from './schema';

export const UI = {
  en,
  es,
  pt,
  fr,
} as const satisfies Record<Locale, UiCatalog>;
