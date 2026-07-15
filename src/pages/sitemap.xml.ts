/**
 * The sitemap must cover BOTH wings — Astro routes and the legacy pages
 * served verbatim from public/ — which is why this is a custom endpoint
 * rather than @astrojs/sitemap (which only sees Astro routes and would
 * move the sitemap URL robots.txt points at).
 */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { LEGACY_URLS } from '../lib/legacy/urls';
import { DEFAULT_LOCALE, LOCALES, LOCALE_META, alternatePaths } from '../lib/i18n';
import { CHINESE_ZODIAC_ANIMALS } from '../data/chinese-zodiac';
import daily from '../data/daily.json';

const SITE = 'https://zodiacs.org';
const CHINESE_ZODIAC_PATHS = [
  '/learn/chinese-zodiac/',
  ...CHINESE_ZODIAC_ANIMALS.map((animal) => `/learn/chinese-zodiac/${animal.slug}/`),
];
// Keep these dates source-controlled: build environments may have shallow or
// absent Git history. When an evergreen page's rendered source changes, update
// its entry here in the same commit.
const EVERGREEN_LASTMOD = new Map<string, string>([
  ...[
    '/', '/birth-chart/', '/compatibility/', '/moon-sign/', '/rising-sign/',
    '/moon-phase/', '/saturn-return/', '/solar-return/', '/mercury-retrograde/', '/transits/',
    '/eclipses/', '/full-moon-calendar/', '/retrogrades/', '/today/', '/learn/', '/tools/',
    '/profile/', '/learn/how-to-read-a-birth-chart/', '/learn/communication/', '/learn/zodiac-dates/', '/learn/glossary/', '/learn/planets/',
    '/learn/houses/', '/learn/aspects/', '/learn/placements/', '/birthday/',
    '/baby-zodiac/', '/widgets/', '/methodology/', '/about/', '/privacy/',
    '/terms/', '/feeds/', '/almanac/',
    '/es/', '/es/birth-chart/', '/es/compatibility/', '/es/moon-sign/',
    '/es/rising-sign/', '/es/moon-phase/', '/es/saturn-return/', '/es/transits/',
    '/es/tools/', '/es/profile/', '/es/baby-zodiac/', '/es/methodology/', '/es/privacy/',
  ].map((loc) => [
    loc,
    [
      '/solar-return/', '/tools/', '/almanac/', '/learn/', '/learn/communication/',
      '/privacy/', '/es/privacy/',
    ].includes(loc)
      ? '2026-07-14'
      : ['/today/'].includes(loc)
      ? '2026-07-13'
      : ['/', '/learn/zodiac-dates/', '/learn/glossary/'].includes(loc) ? '2026-07-11' : '2026-07-10',
  ] as const),
  ...LEGACY_URLS.map((url) => [url.path, '2026-07-10'] as const),
  ...[
    '/disclosure/',
    ...CHINESE_ZODIAC_PATHS,
  ].map((loc) => [loc, '2026-07-15'] as const),
  ...[
    '/pt/', '/pt/birth-chart/', '/pt/compatibility/', '/pt/moon-sign/',
    '/pt/rising-sign/', '/pt/moon-phase/', '/pt/saturn-return/', '/pt/transits/',
    '/pt/tools/', '/pt/profile/', '/pt/baby-zodiac/', '/pt/methodology/', '/pt/privacy/',
    ...[
      'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
      'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
    ].map((sign) => `/pt/${sign}/`),
  ].map((loc) => [loc, '2026-07-15'] as const),
  ...[
    '/fr/', '/fr/birth-chart/', '/fr/compatibility/', '/fr/moon-sign/',
    '/fr/rising-sign/', '/fr/moon-phase/', '/fr/saturn-return/', '/fr/transits/',
    '/fr/tools/', '/fr/profile/', '/fr/baby-zodiac/', '/fr/methodology/', '/fr/privacy/',
    ...[
      'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
      'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
    ].map((sign) => `/fr/${sign}/`),
  ].map((loc) => [loc, '2026-07-15'] as const),
  ...[
    '/it/', '/it/birth-chart/', '/it/compatibility/', '/it/moon-sign/',
    '/it/rising-sign/', '/it/moon-phase/', '/it/saturn-return/', '/it/transits/',
    '/it/tools/', '/it/profile/', '/it/baby-zodiac/', '/it/methodology/', '/it/privacy/',
    ...[
      'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
      'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
    ].map((sign) => `/it/${sign}/`),
  ].map((loc) => [loc, '2026-07-15'] as const),
]);

function getLastmod(loc: string): string {
  const date = EVERGREEN_LASTMOD.get(loc);
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Missing evergreen lastmod for ${loc}`);
  }
  return date;
}

function sitemapAlternates(loc: string) {
  return alternatePaths(loc);
}

export const GET: APIRoute = async () => {
  const guides = await getCollection('guides', ({ data }) => !data.draft);
  const pairs = await getCollection('pairs', ({ data }) => !data.draft);
  const learn = await getCollection('learn', ({ data }) => !data.draft);
  const horoscopes = await getCollection('horoscopes', ({ data }) => !data.draft);
  const birthdays = await getCollection('birthdays', ({ data }) => !data.draft);
  const almanac = await getCollection('almanac', ({ data }) => !data.draft);
  const latestMonth = horoscopes.map((h) => h.data.month).sort().at(-1);

  const evergreenUrls = [
    { loc: '/', priority: 1.0 },
    { loc: '/birth-chart/', priority: 0.95 },
    { loc: '/compatibility/', priority: 0.9 },
    { loc: '/moon-sign/', priority: 0.9 },
    { loc: '/rising-sign/', priority: 0.9 },
    { loc: '/moon-phase/', priority: 0.85 },
    { loc: '/saturn-return/', priority: 0.85 },
    { loc: '/solar-return/', priority: 0.85 },
    { loc: '/mercury-retrograde/', priority: 0.85 },
    { loc: '/transits/', priority: 0.85 },
    { loc: '/eclipses/', priority: 0.85 },
    { loc: '/full-moon-calendar/', priority: 0.85 },
    { loc: '/retrogrades/', priority: 0.8 },
    { loc: '/today/', priority: 0.8 },
    { loc: '/learn/', priority: 0.85 },
    { loc: '/tools/', priority: 0.8 },
    { loc: '/profile/', priority: 0.75 },
    { loc: '/learn/how-to-read-a-birth-chart/', priority: 0.8 },
    { loc: '/learn/communication/', priority: 0.8 },
    { loc: '/learn/zodiac-dates/', priority: 0.8 },
    { loc: '/learn/glossary/', priority: 0.8 },
    { loc: '/learn/planets/', priority: 0.7 },
    { loc: '/learn/houses/', priority: 0.7 },
    { loc: '/learn/aspects/', priority: 0.7 },
    { loc: '/learn/placements/', priority: 0.7 },
    { loc: '/birthday/', priority: 0.7 },
    { loc: '/baby-zodiac/', priority: 0.8 },
    { loc: '/widgets/', priority: 0.6 },
    { loc: '/disclosure/', priority: 0.5 },
    // TODO(i18n): add locale routes and hreflang only after translated WS5
    // pages exist. These entries are deliberately English-only this pass.
    ...CHINESE_ZODIAC_PATHS.map((loc, index) => ({
      loc,
      priority: index === 0 ? 0.7 : 0.6,
    })),
    { loc: '/methodology/', priority: 0.6 },
    { loc: '/about/', priority: 0.55 },
    { loc: '/privacy/', priority: 0.4 },
    { loc: '/es/privacy/', priority: 0.4 },
    { loc: '/terms/', priority: 0.4 },
    { loc: '/feeds/', priority: 0.55 },
    { loc: '/almanac/', priority: 0.75 },
  ].map((url) => ({ ...url, lastmod: getLastmod(url.loc) }));

  const urls: { loc: string; priority: number; lastmod?: string }[] = [
    ...evergreenUrls,
    { loc: '/horoscopes/', priority: 0.8, lastmod: daily.date },
    ...guides.map((g) => ({
      loc: `/${g.data.sign}/`,
      priority: 0.9,
      lastmod: g.data.updated.toISOString().slice(0, 10),
    })),
    ...horoscopes
      .filter((h) => h.data.month === latestMonth)
      .map((h) => ({
        loc: `/horoscopes/${h.data.sign}/`,
        priority: 0.7,
        // The daily block refreshes these pages every morning.
        lastmod: daily.date,
      })),
    ...pairs.map((p) => ({
      loc: `/compatibility/${p.id}/`,
      priority: 0.75,
      lastmod: p.data.updated.toISOString().slice(0, 10),
    })),
    // Rising profiles live at /rising-sign/{sign}/, outside /learn/ —
    // an unfiltered loop here would emit URLs that have no files.
    ...learn.flatMap((l) =>
      l.data.kind === 'rising'
        ? [{
            loc: `/rising-sign/${l.data.sign}/`,
            priority: 0.8,
            lastmod: l.data.updated.toISOString().slice(0, 10),
          }]
        : [{
            loc: `/learn/${l.id}/`,
            priority: 0.65,
            lastmod: l.data.updated.toISOString().slice(0, 10),
          }]),
    ...birthdays.map((b) => ({
      loc: `/birthday/${b.id}/`,
      priority: 0.65,
      lastmod: b.data.updated.toISOString().slice(0, 10),
    })),
    ...almanac.map((entry) => ({
      loc: `/almanac/${entry.id}/`,
      priority: 0.65,
      lastmod: entry.data.updated.toISOString().slice(0, 10),
    })),
    ...LEGACY_URLS.map((u) => ({ loc: u.path, priority: u.priority, lastmod: getLastmod(u.path) })),
  ];

  const existingLocations = new Set(urls.map((url) => url.loc));
  const localizedUrls = urls.flatMap((url) => {
    if (url.loc === '/404.html') return [];
    const alternates = alternatePaths(url.loc);
    if (!alternates) return [];
    return LOCALES.flatMap((locale) => {
      const loc = alternates[locale];
      if (!loc || loc === url.loc || existingLocations.has(loc)) return [];
      existingLocations.add(loc);
      return [{
        ...url,
        loc,
        lastmod: EVERGREEN_LASTMOD.has(loc) ? getLastmod(loc) : url.lastmod,
      }];
    });
  });
  const allUrls = [
    ...urls,
    ...localizedUrls,
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${allUrls
  .map(
    (u) => {
      const alternates = sitemapAlternates(u.loc);
      const defaultAlternate = alternates?.[DEFAULT_LOCALE];
      const alternateLinks = alternates && defaultAlternate
        ? `${LOCALES.flatMap((locale) => {
            const href = alternates[locale];
            return href
              ? [`    <xhtml:link rel="alternate" hreflang="${LOCALE_META[locale].hreflang}" href="${SITE}${href}" />`]
              : [];
          }).join('\n')}
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}${defaultAlternate}" />`
        : '';
      return `  <url>
    <loc>${SITE}${u.loc}</loc>${alternateLinks ? `\n${alternateLinks}` : ''}${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}
    <priority>${u.priority.toFixed(2)}</priority>
  </url>`;
    }
  )
  .join('\n')}
</urlset>
`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
