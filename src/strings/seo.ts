import type { Locale } from '../lib/i18n/core';
import { additionText, localizedAdditionObject } from './additions';
import { BREADCRUMB_LABELS, OG_EN, SCHEMA_EN } from './seo.en.mjs';

// TODO(i18n-og, estimate: 1 engineer-day plus four-locale visual QA): teach
// build-og-void.mjs locale-scoped filenames/manifests before localized pages
// reference translated artwork. The current generator is English-only code,
// so localized OG images are not a pure configuration change.

export function schemaCatalog(locale: Locale) {
  return localizedAdditionObject(locale, 'schema', SCHEMA_EN);
}

export function breadcrumbLabelForLocale(segment: string, locale: Locale): string {
  const key = decodeURIComponent(String(segment || '')).toLowerCase();
  const english = BREADCRUMB_LABELS[key as keyof typeof BREADCRUMB_LABELS];
  if (!english) return key.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  return additionText(locale, `schema.breadcrumbLabels.${key}`, english);
}

export function ogAltForPathAndLocale(path: string, locale: Locale): string {
  const normalized = path === '/'
    ? '/'
    : `/${String(path || '/').split(/[?#]/, 1)[0].replace(/^\/+|\/+$/g, '')}/`;
  const tool = OG_EN.tools.find((entry) => entry.path === normalized);
  if (tool) {
    return `${additionText(locale, `og.tools.${tool.key}.title`, tool.title)} — Zodiacs.org`;
  }
  for (const [key, special] of [
    ['registry', OG_EN.registry],
    ['thesis', OG_EN.thesis],
    ['disclosure', OG_EN.disclosure],
  ] as const) {
    if (special.path === normalized) {
      return additionText(locale, `og.${key}.alt`, special.alt);
    }
  }
  return additionText(locale, 'og.fallbackAlt', OG_EN.fallbackAlt);
}
