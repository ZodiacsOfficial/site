import { SIGN_SLUGS } from '../signs';
import { DEFAULT_LOCALE, LOCALES, type Locale } from './core';
import { clientUiMessage } from './ui/client';
import { UI } from './ui/server';
import type { UiKey } from './ui/schema';

export { DEFAULT_LOCALE, LOCALES, normalizeLocale, type Locale } from './core';
export { UI } from './ui/server';
export type { UiKey } from './ui/schema';

/** Kept separate so client-side path helpers do not carry head-only metadata. */
export const LOCALE_PATH_PREFIX = {
  en: '',
  es: '/es',
  pt: '/pt',
  fr: '/fr',
  it: '/it',
} as const satisfies Record<Locale, string>;

interface LocaleMeta {
  /** URL segment, including its leading slash. Empty for the default locale. */
  pathPrefix: string;
  /** Value rendered on the document's `lang` attribute. */
  htmlLang: string;
  /** Value rendered on alternate links and sitemap entries. */
  hreflang: string;
  /** Locale passed to the browser's Intl formatters. */
  intlLocale: string;
  /** Open Graph's underscore-form locale identifier. */
  ogLocale: string;
  /** Self-name used by the footer language row. */
  languageName: string;
}

export const LOCALE_META = {
  en: {
    pathPrefix: '',
    htmlLang: 'en',
    hreflang: 'en',
    intlLocale: 'en-US',
    ogLocale: 'en_US',
    languageName: 'English',
  },
  es: {
    pathPrefix: '/es',
    htmlLang: 'es',
    hreflang: 'es',
    intlLocale: 'es-419',
    ogLocale: 'es_ES',
    languageName: 'Español',
  },
  pt: {
    pathPrefix: '/pt',
    htmlLang: 'pt-BR',
    hreflang: 'pt-BR',
    intlLocale: 'pt-BR',
    ogLocale: 'pt_BR',
    languageName: 'Português (Brasil)',
  },
  fr: {
    pathPrefix: '/fr',
    htmlLang: 'fr',
    hreflang: 'fr',
    intlLocale: 'fr-FR',
    ogLocale: 'fr_FR',
    languageName: 'Français',
  },
  it: {
    pathPrefix: '/it',
    htmlLang: 'it',
    hreflang: 'it',
    intlLocale: 'it-IT',
    ogLocale: 'it_IT',
    languageName: 'Italiano',
  },
} as const satisfies Record<Locale, LocaleMeta>;

/** D9 policy: authored interpretation corpora remain English-only. */
export function showsEnglishOnlyInterpretation(locale: Locale): boolean {
  return locale === 'en';
}

const CORE_LOCALIZED_PATHS = [
  '/',
  '/tools/',
  '/birth-chart/',
  '/compatibility/',
  '/moon-sign/',
  '/rising-sign/',
  '/moon-phase/',
  '/saturn-return/',
  '/transits/',
  '/baby-zodiac/',
  '/profile/',
  '/methodology/',
  '/privacy/',
  '/disclosure/',
  '/404.html',
  ...SIGN_SLUGS.map((slug) => `/${slug}/`),
];

/** Locales in which each translated route is actually available. */
export const LOCALIZED_PATHS: ReadonlyMap<string, readonly Locale[]> = new Map(
  CORE_LOCALIZED_PATHS.map((path) => [path, LOCALES] as const),
);

const BIRTHDAY_MONTH_LENGTHS: Readonly<Record<string, number>> = Object.freeze({
  january: 31,
  february: 29,
  march: 31,
  april: 30,
  may: 31,
  june: 30,
  july: 31,
  august: 31,
  september: 30,
  october: 31,
  november: 30,
  december: 31,
});
const CHINESE_ZODIAC_SLUGS = new Set([
  'rat', 'ox', 'tiger', 'rabbit', 'dragon', 'snake',
  'horse', 'goat', 'monkey', 'rooster', 'dog', 'pig',
]);

/** Compact client-safe recognition for the data-driven localized families. */
function isLocalizedProgrammaticPath(path: string): boolean {
  if (path === '/learn/chinese-zodiac/') return true;
  const animal = path.match(/^\/learn\/chinese-zodiac\/([a-z]+)\/$/)?.[1];
  if (animal) return CHINESE_ZODIAC_SLUGS.has(animal);

  const birthday = path.match(/^\/birthday\/([a-z]+)-(\d{1,2})\/$/);
  if (!birthday) return false;
  const maxDay = BIRTHDAY_MONTH_LENGTHS[birthday[1]];
  const day = Number(birthday[2]);
  return Boolean(maxDay && birthday[2] === String(day) && day >= 1 && day <= maxDay);
}

function availableLocales(path: string): readonly Locale[] | undefined {
  return LOCALIZED_PATHS.get(path) ?? (isLocalizedProgrammaticPath(path) ? LOCALES : undefined);
}

export function stripLocale(path: string): string {
  for (const locale of LOCALES) {
    const prefix = LOCALE_PATH_PREFIX[locale];
    if (!prefix) continue;
    if (path === prefix) return '/';
    if (path.startsWith(`${prefix}/`)) return path.slice(prefix.length) || '/';
  }
  return path;
}

export function localizePath(locale: Locale, path: string): string {
  if (path.startsWith('http') || path.startsWith('#')) return path;
  const clean = path.startsWith('/') ? path : `/${path}`;
  const canonical = stripLocale(clean);
  if (locale === DEFAULT_LOCALE) return canonical;
  if (!availableLocales(canonical)?.includes(locale)) return clean;
  return `${LOCALE_PATH_PREFIX[locale]}${canonical}`;
}

export type AlternatePaths = Partial<Record<Locale, string>>;

export function alternatePaths(path: string): AlternatePaths | null {
  // Astro emits nested locale 404s at /{locale}/404/, while English remains
  // /404.html. Normalize only this server-rendered alternate-link family so
  // the client path helper stays byte-identical.
  const clean = path.endsWith('/404/') ? '/404.html' : stripLocale(path);
  const locales = availableLocales(clean);
  if (!locales) return null;
  return Object.fromEntries(
    locales.map((locale) => [
      locale,
      clean === '/404.html' && locale !== DEFAULT_LOCALE
        ? `${LOCALE_PATH_PREFIX[locale]}/404/`
        : localizePath(locale, clean),
    ]),
  ) as AlternatePaths;
}

export function t(locale: Locale, key: UiKey): string {
  return import.meta.env.SSR ? UI[locale][key] : clientUiMessage(locale, key);
}

export function tf(
  locale: Locale,
  key: UiKey,
  values: Record<string, string | number>,
): string {
  return t(locale, key).replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, (token, name: string) => (
    Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : token
  ));
}
