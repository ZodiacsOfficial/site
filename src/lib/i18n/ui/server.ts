import type { Locale } from '../core';
import en from './en';
import es from './es';
import pt from './pt';
import fr from './fr';
import it from './it';
import type { UiCatalog, UiKey } from './schema';

export const UI = {
  en,
  es,
  pt,
  fr,
  it,
} as const satisfies Record<Locale, UiCatalog>;

/** Server-only lookup for code that runs outside Astro/Vite's import-meta environment. */
export function serverUiMessage(locale: Locale, key: UiKey): string {
  return UI[locale][key];
}
