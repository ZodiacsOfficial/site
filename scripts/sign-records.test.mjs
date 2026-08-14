import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  CONSTELLATIONS,
  HYG_ATTRIBUTION,
  validateConstellations,
} from './constellation-data.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(resolve(root, path), 'utf8');
const signs = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
];

function visibleMarkup(html) {
  return html
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, '')
    .replace(/<!--([\s\S]*?)-->/gu, '');
}

describe('official Zodiac token records', () => {
  it('commits a valid, attributed constellation subset for all twelve signs', async () => {
    expect(Object.keys(CONSTELLATIONS)).toEqual(signs);
    expect(validateConstellations(signs)).toEqual([]);
    expect(HYG_ATTRIBUTION.license).toBe('CC BY-SA 4.0');

    for (const sign of signs) {
      const constellation = CONSTELLATIONS[sign];
      expect(constellation.stars.length).toBeGreaterThanOrEqual(5);
      expect(constellation.edges.length).toBeGreaterThanOrEqual(3);
      expect(constellation.stars.some((star) => star.id === constellation.focusId)).toBe(true);
      for (const star of constellation.stars.filter((entry) => entry.kind === 'star')) {
        expect(star.source).toBe('hyg-v4.0');
        expect(star.hygId).toBeTypeOf('number');
      }

      const svg = await read(`public/assets/constellations/${sign}.svg`);
      expect(svg).toContain(`${HYG_ATTRIBUTION.sourceBlob}`);
      expect(svg).toContain(`${HYG_ATTRIBUTION.license}`);
      expect(svg).toContain('Guide lines are not official constellation boundaries.');
    }

    const attribution = await read('public/assets/constellations/ATTRIBUTION.txt');
    expect(attribution).toContain(HYG_ATTRIBUTION.url);
    expect(attribution).toContain(HYG_ATTRIBUTION.licenseUrl);
    expect(attribution).toContain('SIMBAD M44');
  });

  it('puts the live price, buying guide, and verified address before optional catalogue detail', async () => {
    for (const [index, sign] of signs.entries()) {
      const html = await read(`public/registry/${sign}/index.html`);
      const visible = visibleMarkup(html);
      const name = sign.charAt(0).toUpperCase() + sign.slice(1);

      expect((visible.match(/<h1\b/gu) || [])).toHaveLength(1);
      expect(visible).toContain(`Official Zodiac Token <span class="g">·</span> Sign ${index + 1} of 12`);
      expect(visible).toContain(`${name} is the official digital token for the ${name} zodiac sign. See today’s price, verify the address, and learn how buying works.`);
      expect(visible).not.toContain('class="lot__epithet"');
      expect(visible).not.toContain('not a physical sculpture or a one-of-one NFT');
      expect(html).not.toContain('/terminal/markets/');
      expect(visible).toContain(`${name} price now`);
      expect(visible).toContain('<section class="quick" aria-labelledby="quick-title" data-live-quote>');
      expect(visible).toContain(`href="#acquire"><span>How to buy ${name}</span>`);
      expect(visible).toContain('You can browse this page without a wallet.');
      expect(visible).toContain('Key facts');
      expect(visible).toContain(`About ${name}`);
      expect(visible).toContain(`Why ${name} is in the collection`);
      expect(visible).toContain(`See the ${name} constellation`);
      expect(visible).toContain(`Read the ${name} story`);
      expect(visible).toContain('Official addresses');
      expect(visible).toContain(`How to buy ${name}`);
      expect(visible).toContain('Daily price archive');
      expect(visible).toContain('Explore all 12');
      expect(visible).not.toMatch(/>Museum label<|>Catalogue note<|>Provenance<|>Acquisition<|>The catalogue</u);
      expect((visible.match(/<details\b/gu) || []).length).toBeGreaterThanOrEqual(7);

      const quickIndex = visible.indexOf(`${name} price now`);
      const buyIndex = visible.indexOf(`id="acquire"`);
      const addressIndex = visible.indexOf(`id="record"`);
      const storyIndex = visible.indexOf(`Read the ${name} story`);
      expect(quickIndex).toBeGreaterThan(-1);
      expect(buyIndex).toBeGreaterThan(quickIndex);
      expect(addressIndex).toBeGreaterThan(buyIndex);
      expect(storyIndex).toBeGreaterThan(addressIndex);
    }
  });

  it('separates a live selected-token quote from the honestly labelled daily archive', async () => {
    const [source, leo] = await Promise.all([
      read('scripts/build-sign-pages.mjs'),
      read('public/registry/leo/index.html'),
    ]);

    for (const value of [source, leo]) {
      expect(value).toContain('https://api.dexscreener.com/tokens/v1/solana/');
      expect(value).toContain('data-live-price');
      expect(value).toContain('data-live-change');
      expect(value).toContain("pair.baseToken.address !== MINT");
      expect(value).toContain('if (!document.hidden) loadLiveQuote();');
      expect(value).toContain('Last live price shown · refresh temporarily unavailable');
      expect(value).toContain('/assets/data/registry-market-history.v1.json');
      expect(value).toContain("archive.schema !== 'zodiacs.registry-market-history.v1'");
      expect(value).toContain("'Archive through '");
      expect(value).toContain("' daily close.'");
      expect(value).toContain('A trend line will appear after 8 honest daily closes.');
      expect(value).toContain('if (finite.length < 8)');
      expect(value).toContain('Price history unavailable.');
      expect(value).toContain("var required = range === '7d' ? 7 : 30");
      expect(value).toContain('gap > 1.5 * 86400000');
      expect(value).toContain("['Market cap', fmtCompact(asset.marketCapUsd)");
      expect(value).toContain("['FDV', fmtCompact(asset.fdvUsd)");
      expect(value).not.toContain('https://api.dexscreener.com/latest/dex/pairs/');
    }
    expect(leo).toContain('data-market-range="7d"');
    expect(leo).toContain('data-market-range="30d"');
    expect(leo).toContain('data-market-range="all"');
    expect(leo).toContain('Open live chart ↗');
    expect(leo).toContain('Daily closes—not the live price above');
    expect(leo).toContain('<noscript><style>.reveal { opacity: 1 !important;');
  });

  it('links every record to its constellation and sign-filtered research', async () => {
    for (const sign of signs) {
      const html = await read(`public/registry/${sign}/index.html`);
      expect(html).toContain(`/assets/constellations/${sign}.svg`);
      expect(html).toContain(`href="/astrofolio/?sign=${sign}"`);
      expect(html).toContain('<a href="/astrofolio/">Astrofolio</a>');
      expect(html).toContain('Astrofolio.xyz');
      expect(html).toContain('<a href="/registry/">Zodiacs Registry</a>');
      expect(html).toContain(`/terminal/research/?sign=${sign}&amp;type=daily`);
      expect(html).toContain(`/terminal/research/?sign=${sign}`);
    }
  });

  it('emits the Guide bootstrap and parseable executable inline scripts on every record', async () => {
    for (const sign of signs) {
      const html = await read(`public/registry/${sign}/index.html`);
      const scripts = [...html.matchAll(/<script(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/giu)]
        .map((match) => match[1])
        .filter((script) => script.trim());
      const guideBootstrap = scripts.find((script) => script.includes("import('/assets/assistant-ui.js')"));
      expect(guideBootstrap).toContain("mod.bootstrapGuide('en')");
      expect(scripts).toEqual(expect.arrayContaining([
        expect.stringContaining("trackWingEvent('wing_record_view')"),
        expect.stringContaining("var ARCHIVE_URL = '/assets/data/registry-market-history.v1.json'"),
      ]));
      for (const script of scripts) {
        expect(() => new Function(script)).not.toThrow();
      }
    }
  });
});
