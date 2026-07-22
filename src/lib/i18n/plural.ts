import { LOCALE_META, type Locale } from './core';

export type PluralCategory = Intl.LDMLPluralRule;
export type PluralForms = Readonly<Partial<Record<PluralCategory, string>> & { other: string }>;
export type PluralCatalog = Readonly<Record<string, PluralForms>>;

const rules = new Map<Locale, Intl.PluralRules>();
const EMPTY_PLURAL_CATALOG: PluralCatalog = Object.freeze({});

export function pluralCategory(locale: Locale, count: number): PluralCategory {
  let rule = rules.get(locale);
  if (!rule) {
    rule = new Intl.PluralRules(LOCALE_META[locale].intlLocale);
    rules.set(locale, rule);
  }
  return rule.select(count);
}

export function pluralText(
  locale: Locale,
  forms: PluralForms,
  count: number,
  values: Readonly<Record<string, string | number>> = {},
): string {
  const category = pluralCategory(locale, count);
  const template = forms[category] ?? forms.other;
  const tokens = { n: count, ...values };
  return template.replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, (token, name: string) => (
    Object.prototype.hasOwnProperty.call(tokens, name)
      ? String(tokens[name as keyof typeof tokens])
      : token
  ));
}

/**
 * Plural-aware translation seam. R0 intentionally ships no RU/AR catalog;
 * callers receive a loud error until a reviewed locale catalog is supplied.
 */
export function tp(
  locale: Locale,
  key: string,
  count: number,
  catalog: PluralCatalog = EMPTY_PLURAL_CATALOG,
  values?: Readonly<Record<string, string | number>>,
): string {
  const forms = catalog[key];
  if (!forms) throw new Error(`Missing plural translation ${locale}.${key}`);
  return pluralText(locale, forms, count, values);
}
