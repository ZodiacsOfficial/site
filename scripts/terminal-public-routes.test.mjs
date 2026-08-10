import { access, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(resolve(root, path), 'utf8');
const exists = async (path) => access(resolve(root, path)).then(() => true, () => false);

describe('Terminal public-route split', () => {
  it('serves the advanced market and research sources only from Terminal paths', async () => {
    expect(await exists('public/terminal/markets/index.html')).toBe(true);
    expect(await exists('public/registry/exchange/index.html')).toBe(false);
    expect(await exists('src/pages/terminal/research/index.astro')).toBe(true);
    expect(await exists('src/pages/terminal/research/[slug].astro')).toBe(true);
    expect(await exists('src/pages/registry/research/index.astro')).toBe(false);
    expect(await exists('src/pages/registry/research/[slug].astro')).toBe(false);

    const markets = await read('public/terminal/markets/index.html');
    expect(markets).toContain('href="https://zodiacs.org/terminal/markets/"');
    expect(markets).toContain('"item": "https://zodiacs.org/terminal/"');
    expect(markets).not.toContain('https://zodiacs.org/registry/exchange/');

    const research = await read('src/pages/terminal/research/index.astro');
    expect(research).toContain('path="/terminal/research/"');
    expect(research).toContain('href="/terminal/"');
    expect(research).not.toContain('/registry/research/');
  });

  it('redirects legacy consumer routes directly to their Terminal destinations', async () => {
    const config = JSON.parse(await read('vercel.json'));
    const redirects = new Map(config.redirects.map((rule) => [rule.source, rule]));
    const expected = {
      '/registry/shelf': '/terminal/',
      '/registry/shelf/': '/terminal/',
      '/registry/gallery': '/terminal/',
      '/registry/gallery/': '/terminal/',
      '/registry/exchange': '/terminal/markets/',
      '/registry/exchange/': '/terminal/markets/',
      '/registry/exchange/:path(.*)': '/terminal/markets/:path',
      '/registry/research': '/terminal/research/',
      '/registry/research/': '/terminal/research/',
      '/registry/research/:path(.*)': '/terminal/research/:path',
    };

    for (const [source, destination] of Object.entries(expected)) {
      expect(redirects.get(source)?.destination, source).toBe(destination);
      expect(redirects.get(source)?.permanent, source).toBe(true);
    }
  });

  it('keeps no-store, noindex, and the provider allowlist on the new markets route', async () => {
    const config = JSON.parse(await read('vercel.json'));
    const rule = config.headers.find(({ source }) => source === '/terminal/markets/(.*)');
    const headers = new Map(rule?.headers.map(({ key, value }) => [key, value]));
    expect(headers.get('Cache-Control')).toBe('no-store');
    expect(headers.get('X-Robots-Tag')).toBe('noindex, noarchive');
    expect(headers.get('Content-Security-Policy')).toContain('https://api.geckoterminal.com');
    expect(headers.get('Content-Security-Policy')).toContain("frame-ancestors 'none'");
  });

  it('keeps the generated research ledger and feeds on canonical Terminal URLs', async () => {
    const drafts = JSON.parse(await read('src/data/registry-research/drafts.json'));
    expect(drafts.items).toHaveLength(12);
    for (const item of drafts.items) {
      expect(item.url).toBe(`/terminal/research/${item.slug}/`);
    }

    const feed = await read('src/pages/feeds/market-research.json.ts');
    const sitemap = await read('src/pages/sitemap.xml.ts');
    expect(feed).toContain("home_page_url: 'https://zodiacs.org/terminal/research/'");
    expect(sitemap).toContain("'/terminal/research/'");
    expect(sitemap).not.toContain("'/registry/research/'");
  });
});
