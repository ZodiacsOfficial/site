/**
 * RSS 2.0 feed of the latest monthly horoscopes — one item per sign.
 * Static like everything else: it regenerates whenever the site builds,
 * which the monthly transit cron already triggers.
 */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SIGNS } from '../../lib/signs';
import { monthLabel } from '../../lib/horoscopes';

const SITE = 'https://zodiacs.org';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** First ~220 chars of the MDX body, markdown links flattened. */
function lede(body: string): string {
  const text = body
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_#>`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > 220 ? `${text.slice(0, 217)}…` : text;
}

export const GET: APIRoute = async () => {
  const all = await getCollection('horoscopes', ({ data }) => !data.draft);
  const latest = all.map((h) => h.data.month).sort().at(-1);
  const month = all.filter((h) => h.data.month === latest);
  const bySign = new Map(month.map((h) => [h.data.sign, h]));
  const pub = new Date(`${latest}-01T00:00:00Z`).toUTCString();

  const items = SIGNS.filter((s) => bySign.has(s.slug))
    .map((s) => {
      const entry = bySign.get(s.slug)!;
      const url = `${SITE}/horoscopes/${s.slug}/`;
      return `    <item>
      <title>${esc(`${s.name} — ${monthLabel(latest!)} horoscope`)}</title>
      <link>${url}</link>
      <guid isPermaLink="false">${url}#${latest}</guid>
      <pubDate>${pub}</pubDate>
      <description>${esc(lede(entry.body ?? ''))}</description>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Zodiacs.org monthly horoscopes</title>
    <link>${SITE}/horoscopes/</link>
    <atom:link href="${SITE}/feeds/horoscopes.xml" rel="self" type="application/rss+xml" />
    <description>All twelve signs each month, grounded in computed moon phases, retrogrades, and transits.</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
};
