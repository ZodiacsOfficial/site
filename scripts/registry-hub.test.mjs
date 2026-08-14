import { readFile } from 'node:fs/promises';
import { describe, expect, test } from 'vitest';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

describe('Zodiacs Registry authority hub', () => {
  test('is a distinct, self-canonical Registry page', async () => {
    const html = await read('public/registry/index.html');
    expect(html).toContain('<link rel="canonical" href="https://zodiacs.org/registry/"');
    expect(html.match(/<h1\b/giu)).toHaveLength(1);
    expect(html).toContain('<h1>Zodiacs <em>Registry</em></h1>');
    expect(html).toContain('one for every Zodiac sign');
    expect(html).toContain('one Solana origin and one Base counterpart per sign');
    expect(html).toContain('data-registry-established');
    expect(html).not.toContain('<h1>Astrofolio</h1>');
    expect(html).not.toContain('<h1>Terminal</h1>');
  });

  test('prints every canonical address from the source Registry', async () => {
    const [html, registryRaw] = await Promise.all([
      read('public/registry/index.html'),
      read('public/registry/zodiacs.registry.json'),
    ]);
    const registry = JSON.parse(registryRaw);
    const official = registry.assets.flatMap((asset) => (
      asset.representations.filter((representation) => representation.isOfficialRepresentation)
    ));

    expect(registry.assets).toHaveLength(12);
    expect(official).toHaveLength(24);
    expect(html.match(/data-registry-record/gu)).toHaveLength(12);
    expect(html.match(/class="record__network"/gu)).toHaveLength(24);
    for (const representation of official) {
      expect(html).toContain(`<code>${representation.address}</code>`);
    }
  });

  test('keeps the page first-party and free of market or analytics runtime', async () => {
    const [html, analyticsBuild] = await Promise.all([
      read('public/registry/index.html'),
      read('scripts/configure-legacy-analytics.mjs'),
    ]);
    expect(html).toContain("script-src 'self' 'unsafe-inline'");
    expect(html).toContain("connect-src 'self'");
    expect(html).not.toMatch(/<script[^>]+src=/iu);
    expect(html).not.toContain('/assets/app.js');
    expect(html).toContain('data-guide-loader="zodiacs-guide-loader-v1"');
    expect(html).toContain('return mod.bootstrapGuide(defaultLocale)');
    expect(html).not.toContain('plausible.io');
    expect(html).not.toContain('zodiacs-analytics:start');
    expect(html).not.toMatch(/api\.(?:dexscreener|geckoterminal)/iu);
    expect(html).not.toMatch(/market-tape|market-board|leaderboard|Buy [A-Z]/u);
    expect(html).toContain('<noscript>');
    expect(html).toContain('class="wnav__search" href="/?search=1"');
    expect(analyticsBuild).toContain("entry.isFile() && entry.name === 'index.html'");
  });

  test('offers an exact local address check with honest unknown state', async () => {
    const html = await read('public/registry/index.html');
    expect(html).toContain('data-address-verifier');
    expect(html).toContain("entry.normalized===normalized");
    expect(html).toContain("value.toLowerCase()");
    expect(html).toContain('Not found in the official Registry. Check the network and every character before continuing.');
    expect(html).toContain("link.href='/registry/'+match.sign+'/#record'");
    expect(html).not.toMatch(/fetch\s*\(/u);
  });

  test('separates Registry authority from the expert Terminal', async () => {
    const html = await read('public/registry/index.html');
    expect(html).toContain('href="/terminal/"');
    expect(html).toContain('Open Terminal');
    for (const path of [
      '/registry/zodiacs.registry.json',
      '/registry/technical/',
      '/sdk/',
      '/disclosure/',
      '/registry/collection/',
      '/registry/wallet-chart/',
    ]) expect(html).toContain(`href="${path}"`);
    expect(html).toContain('It is not government, regulator, wallet, or exchange approval');
  });

  test('hands old identity and market state to Astrofolio or Terminal without hijacking Registry state', async () => {
    const html = await read('public/registry/index.html');
    expect(html).toContain("var proQuery=['rank','outlook']");
    expect(html).toContain("var proHash=['market','briefing','research','outlook']");
    expect(html).toContain("'sign-gallery','gallery','aries'");
    expect(html).toContain("var proHashValue=hash==='outlook'?'briefing':hash");
    expect(html).toContain("location.replace('/terminal/'+location.search+(proHashValue?'#'+proHashValue:''))");
    expect(html).toContain("location.replace('/astrofolio/'+location.search+location.hash)");
    expect(html).toContain('id="verify"');
    expect(html).not.toContain("'address'].some");
  });

  test('keeps touch targets and narrow layouts explicit', async () => {
    const html = await read('public/registry/index.html');
    expect(html).toContain('min-height:44px');
    expect(html).toContain('@media (max-width:359px)');
    expect(html).toContain('@media (max-width:767px)');
    expect(html).toContain('overflow-wrap:anywhere');
  });

  test('keeps technical methodology inside the Registry hierarchy', async () => {
    const technical = await read('public/registry/technical/index.html');
    expect(technical).toContain('<title>Registry Data &amp; Methodology | Zodiacs Registry</title>');
    expect(technical).toContain('<li><a href="/registry/">Zodiacs Registry</a></li>');
    expect(technical).toContain('href="/registry/">← Return to Zodiacs Registry</a>');
    expect(technical).not.toContain('href="/registry/">← Return to Astrofolio</a>');
  });
});
