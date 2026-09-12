import { requireCatalogLocale, type CatalogLocale, type Locale } from '../core.js';
import en from './en.js';
import es from './es.js';
import pt from './pt.js';
import fr from './fr.js';
import it from './it.js';
import ru from './ru.js';
import type { UiCatalog, UiKey } from './schema';

export const UI = {
  en,
  es,
  pt,
  fr,
  it,
  ru,
} as const satisfies Record<CatalogLocale, UiCatalog>;

/** Server-only lookup for code that runs outside Astro/Vite's import-meta environment. */
export function serverUiMessage(locale: Locale, key: UiKey): string {
  return UI[requireCatalogLocale(locale)][key];
}
