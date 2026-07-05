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

  const urls: { loc: string; priority: number; lastmod?: string }[] = [
    { loc: '/', priority: 1.0 },
    { loc: '/birth-chart/', priority: 0.95 },
    { loc: '/moon-sign/', priority: 0.9 },
    { loc: '/rising-sign/', priority: 0.9 },
    { loc: '/learn/', priority: 0.85 },
    { loc: '/tools/', priority: 0.8 },
    { loc: '/methodology/', priority: 0.6 },
    ...guides.map((g) => ({
      loc: `/${g.data.sign}/`,
      priority: 0.9,
      lastmod: g.data.updated.toISOString().slice(0, 10),
    })),
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
