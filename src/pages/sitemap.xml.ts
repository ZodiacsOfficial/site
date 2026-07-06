/**
 * The sitemap must cover BOTH wings — Astro routes and the legacy pages
 * served verbatim from public/ — which is why this is a custom endpoint
 * rather than @astrojs/sitemap (which only sees Astro routes and would
 * move the sitemap URL robots.txt points at).
 */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { LEGACY_URLS } from '../lib/legacy/urls';

const SITE = 'https://zodiacs.org';

export const GET: APIRoute = async () => {
  const guides = await getCollection('guides', ({ data }) => !data.draft);
  const pairs = await getCollection('pairs', ({ data }) => !data.draft);
  const learn = await getCollection('learn', ({ data }) => !data.draft);
  const horoscopes = await getCollection('horoscopes', ({ data }) => !data.draft);
  const latestMonth = horoscopes.map((h) => h.data.month).sort().at(-1);

  const urls: { loc: string; priority: number; lastmod?: string }[] = [
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
    { loc: '/horoscopes/', priority: 0.8 },
    { loc: '/tools/', priority: 0.8 },
    { loc: '/profile/', priority: 0.75 },
    { loc: '/learn/planets/', priority: 0.7 },
    { loc: '/learn/houses/', priority: 0.7 },
    { loc: '/learn/aspects/', priority: 0.7 },
    { loc: '/learn/placements/', priority: 0.7 },
    { loc: '/methodology/', priority: 0.6 },
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
        lastmod: h.data.updated.toISOString().slice(0, 10),
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
    ...LEGACY_URLS.map((u) => ({ loc: u.path, priority: u.priority })),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${SITE}${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}
    <priority>${u.priority.toFixed(2)}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
