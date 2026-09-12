import { t, type CatalogLocale } from '../lib/i18n';
import { ModuleLoadError } from '../lib/module-load';

export const calculationLoadMessage = (locale: CatalogLocale): string => t(locale, 'calculationLoadError');

export function calculationError(cause: unknown, locale: CatalogLocale, fallback: string): string {
  return cause instanceof ModuleLoadError ? calculationLoadMessage(locale) : fallback;
}

/** Native module maps can retain a rejected import even after our cache clears.
 * Reload is explicit, never automatic, and warns about unsaved form entries. */
export default function CalculationReload({ error, locale }: { error: string | null; locale: CatalogLocale }) {
  if (error !== calculationLoadMessage(locale)) return null;
  return (
    <div class="field__help">
      <button class="btn btn--glass" type="button" onClick={() => window.location.reload()}>{t(locale, 'calculationReload')}</button>
      {' '}{t(locale, 'calculationReloadWarning')}
    </div>
  );
}
