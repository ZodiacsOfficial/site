import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { injectRegistryExchange, REGISTRY_EXCHANGE_FLAG } from '../src/exchange/entry.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(resolve(root, path), 'utf8');
const compact = (value) => value.replace(/\s+/g, ' ');

describe('Exchange risk and trust copy', () => {
  it('keeps the pinned sentences on the committed page, beside the room, not in a footer', async () => {
    const html = compact(await read('public/registry/exchange/index.html'));
    expect(html).toContain('independent third-party');
    expect(html).toContain('can lose all market value');
    expect(html).toContain('could lose all money used to acquire a Zodiac');
    expect(html).toContain('an onchain transaction that cannot be reversed');
    expect(html).toContain('Verify the official mint, network, amount, and destination');
    // The venue boundary, in the decision record's own words, plus the fee.
    expect(html).toContain('presents a trade that an independent venue builds, executes, and charges for');
    expect(html).toContain('operates no market');
    expect(html).toContain('<h1 id="zme-title">Registry Trading Room</h1>');
    expect(html).not.toContain('Zodiacs Mercantile Exchange');
    expect(html).toContain('may not exceed 0.10%');
    // Thin pools are a headline, not a footnote.
    expect(html).toContain('thousands of dollars');
    // The privacy boundary: an address travels only on an explicit trade.
    expect(html).toContain('only when you choose to trade, never to show a price');
    expect(html).toContain('href="/privacy/"');
    expect(html).toContain('href="/terms/"');
    expect(html).toContain('href="/disclosure/"');
  });

  it('keeps the page unindexed and self-canonical until a later, separate decision', async () => {
    const html = await read('public/registry/exchange/index.html');
    expect(html).toContain('<meta name="robots" content="noindex" />');
    expect(html).toContain('<link rel="canonical" href="https://zodiacs.org/registry/exchange/" />');
  });

  it('keeps banned surfaces off the page in both flag states', async () => {
    const committed = await read('public/registry/exchange/index.html');
    const on = injectRegistryExchange(committed, { [REGISTRY_EXCHANGE_FLAG]: '1' }).output;
    for (const html of [committed, on]) {
      expect(html).not.toContain('jup.ag/swap/');
      expect(html).not.toContain('/assets/webmcp-register.js');
      // The hub's venue-directory rule: the homepage link is the only jup.ag
      // reference a shell may carry.
      const venueLinks = html.match(/https:\/\/jup\.ag[^"']*/g) ?? [];
      expect(venueLinks.every((link) => link === 'https://jup.ag/')).toBe(true);
    }
    // The risk block survives stamping untouched.
    expect(compact(on)).toContain('presents a trade that an independent venue builds, executes, and charges for');
  });

  it('keeps the depth ladder honest about not being an order book, in source and bundle', async () => {
    for (const path of ['src/exchange/terminal.mjs', 'public/assets/exchange.js']) {
      const source = compact(await read(path));
      expect(source, path).toContain('These pools have no order book');
      expect(source, path).toContain('indicative Jupiter quote');
      expect(source, path).toContain('Sell sizes are estimates from the indexed mid');
      expect(source, path).toContain('quoted again before wallet review');
      expect(source, path).toContain('price comes from the returned atomic amounts');
      expect(source, path).toContain('fee above 0.10%, are refused');
      expect(source, path).toContain('Independent third-party data, not a valuation or recommendation');
    }
  });

  it('credits the chart-data provider beside the chart, not in a footnote', async () => {
    for (const path of ['src/exchange/terminal.mjs', 'public/assets/exchange.js']) {
      const source = await read(path);
      expect(source, path).toContain('Chart data by GeckoTerminal');
    }
  });

  it('keeps reference market and indicative quote labelled apart, in source and bundle', async () => {
    // The chart and tape describe the canonical pool; the panel's quote is
    // Jupiter's aggregate and may route beyond it. The two must never read
    // as the same market.
    for (const path of ['src/exchange/terminal.mjs', 'public/assets/exchange.js']) {
      const source = compact(await read(path));
      expect(source, path).toContain('Reference market — the sign’s canonical pool');
      expect(source, path).toContain('Orders execute through Jupiter and may route beyond it');
      expect(source, path).toContain('Indicative aggregate quote — Jupiter may route across several pools');
      expect(source, path).toContain('canonical pool · newest first');
    }
  });

  it('names GeckoTerminal in every privacy locale, beside the other providers', async () => {
    for (const path of [
      'src/pages/privacy/index.astro',
      'src/pages/es/privacy/index.astro',
      'src/pages/fr/privacy/index.astro',
      'src/pages/it/privacy/index.astro',
      'src/pages/pt/privacy/index.astro',
    ]) {
      const html = await read(path);
      expect(html, path).toContain('GeckoTerminal');
    }
  });

  it('serves both trade bundles fresh — no stale terminal after a rollback', async () => {
    const config = JSON.parse(await read('vercel.json'));
    for (const source of ['/assets/exchange.js', '/assets/trade.js']) {
      const rule = config.headers.find((entry) => entry.source === source);
      const cache = rule?.headers?.find((header) => header.key === 'Cache-Control')?.value;
      expect(cache, source).toBe('public, max-age=0, must-revalidate');
    }
  });

  it('browser-enforces the room network allowlist and noindex boundary', async () => {
    const config = JSON.parse(await read('vercel.json'));
    const rule = config.headers.find((entry) => entry.source === '/registry/exchange/(.*)');
    const headers = new Map(rule?.headers?.map(({ key, value }) => [key, value]));
    const csp = headers.get('Content-Security-Policy') ?? '';
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("connect-src 'self' https://lite-api.jup.ag https://api.dexscreener.com https://api.geckoterminal.com https://plausible.io;");
    expect(csp).toContain("frame-src 'none'");
    expect(csp).not.toContain('*');
    expect(headers.get('Referrer-Policy')).toBe('same-origin');
    expect(csp).toContain("manifest-src 'self'");
    expect(headers.get('Cache-Control')).toBe('no-store');
    expect(headers.get('X-Robots-Tag')).toBe('noindex, noarchive');
  });

  it('keeps the Cabinet free of any route to the Exchange', async () => {
    // Mandatory control: the Collection surface never gains an acquisition
    // link — including a link to this room.
    const cabinet = await read('src/pages/registry/collection/index.astro');
    expect(cabinet).not.toContain('/registry/exchange/');
    expect(cabinet).not.toContain('Mercantile');
  });
});
