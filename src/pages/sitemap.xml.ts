/**
 * The sitemap must cover BOTH wings — Astro routes and the legacy pages
 * served verbatim from public/ — which is why this is a custom endpoint
 * rather than @astrojs/sitemap (which only sees Astro routes and would
 * move the sitemap URL robots.txt points at).
 */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { LEGACY_URLS } from '../lib/legacy/urls';
import { LOCALIZED_PATHS, alternatePaths } from '../lib/i18n';
import daily from '../data/daily.json';

const SITE = 'https://zodiacs.org';
// Keep these dates source-controlled: build environments may have shallow or
// absent Git history. When an evergreen page's rendered source changes, update
// its entry here in the same commit.
const EVERGREEN_LASTMOD = new Map<string, string>([
  ...[
    '/', '/birth-chart/', '/compatibility/', '/moon-sign/', '/rising-sign/',
    '/moon-phase/', '/saturn-return/', '/mercury-retrograde/', '/transits/',
    '/eclipses/', '/full-moon-calendar/', '/retrogrades/', '/learn/', '/tools/',
    '/profile/', '/learn/how-to-read-a-birth-chart/', '/learn/zodiac-dates/', '/learn/planets/',
    '/learn/houses/', '/learn/aspects/', '/learn/placements/', '/birthday/',
    '/baby-zodiac/', '/widgets/', '/methodology/', '/about/', '/privacy/',
    '/terms/', '/feeds/',
    '/es/', '/es/birth-chart/', '/es/compatibility/', '/es/moon-sign/',
    '/es/rising-sign/', '/es/moon-phase/', '/es/saturn-return/', '/es/transits/',
    '/es/tools/', '/es/profile/', '/es/baby-zodiac/', '/es/methodology/',
  ].map((loc) => [
    loc,
    ['/', '/learn/', '/learn/zodiac-dates/'].includes(loc) ? '2026-07-11' : '2026-07-10',
  ] as const),
  ...LEGACY_URLS.map((url) => [url.path, '2026-07-10'] as const),
]);

function getLastmod(loc: string): string {
  const date = EVERGREEN_LASTMOD.get(loc);
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Missing evergreen lastmod for ${loc}`);
  }
  return date;
}

export const GET: APIRoute = async () => {
  const guides = await getCollection('guides', ({ data }) => !data.draft);
  const pairs = await getCollection('pairs', ({ data }) => !data.draft);
  const learn = await getCollection('learn', ({ data }) => !data.draft);
  const horoscopes = await getCollection('horoscopes', ({ data }) => !data.draft);
  const birthdays = await getCollection('birthdays', ({ data }) => !data.draft);
  const latestMonth = horoscopes.map((h) => h.data.month).sort().at(-1);

  const evergreenUrls = [
    { loc: '/', priority: 1.0 },
    { loc: '/birth-chart/', priority: 0.95 },
    { loc: '/compatibility/', priority: 0.9 },
    { loc: '/moon-sign/', priority: 0.9 },
    { loc: '/rising-sign/', priority: 0.9 },
    { loc: '/moon-phase/', priority: 0.85 },
    { loc: '/saturn-return/', priority: 0.85 },
    { loc: '/mercury-retrograde/', priority: 0.85 },
    { loc: '/transits/', priority: 0.85 },
    { loc: '/eclipses/', priority: 0.85 },
    { loc: '/full-moon-calendar/', priority: 0.85 },
    { loc: '/retrogrades/', priority: 0.8 },
    { loc: '/learn/', priority: 0.85 },
    { loc: '/tools/', priority: 0.8 },
    { loc: '/profile/', priority: 0.75 },
    { loc: '/learn/how-to-read-a-birth-chart/', priority: 0.8 },
    { loc: '/learn/zodiac-dates/', priority: 0.8 },
    { loc: '/learn/planets/', priority: 0.7 },
    { loc: '/learn/houses/', priority: 0.7 },
    { loc: '/learn/aspects/', priority: 0.7 },
    { loc: '/learn/placements/', priority: 0.7 },
    { loc: '/birthday/', priority: 0.7 },
    { loc: '/baby-zodiac/', priority: 0.8 },
    { loc: '/widgets/', priority: 0.6 },
    { loc: '/methodology/', priority: 0.6 },
    { loc: '/about/', priority: 0.55 },
    { loc: '/privacy/', priority: 0.4 },
    { loc: '/terms/', priority: 0.4 },
    { loc: '/feeds/', priority: 0.55 },
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
    ...LEGACY_URLS.map((u) => ({ loc: u.path, priority: u.priority, lastmod: getLastmod(u.path) })),
  ];

  const localizedUrls = urls
    .filter((u) => LOCALIZED_PATHS.has(u.loc) && u.loc !== '/404.html')
    .map((u) => {
      const loc = alternatePaths(u.loc)!.es;
      return { ...u, loc, lastmod: EVERGREEN_LASTMOD.has(loc) ? getLastmod(loc) : u.lastmod };
    });
  const allUrls = [...urls, ...localizedUrls];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${allUrls
  .map(
    (u) => {
      const alternates = alternatePaths(u.loc);
      return `  <url>
    <loc>${SITE}${u.loc}</loc>${alternates ? `
    <xhtml:link rel="alternate" hreflang="en" href="${SITE}${alternates.en}" />
    <xhtml:link rel="alternate" hreflang="es" href="${SITE}${alternates.es}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}${alternates.en}" />` : ''}${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}
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
