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

  it('uses plain-language headings and explains what the token and artwork are', async () => {
    for (const [index, sign] of signs.entries()) {
      const html = await read(`public/registry/${sign}/index.html`);
      const visible = visibleMarkup(html);
      const name = sign.charAt(0).toUpperCase() + sign.slice(1);

      expect((visible.match(/<h1\b/gu) || [])).toHaveLength(1);
      expect(visible).toContain(`Official Zodiac Token <span class="g">·</span> Sign ${index + 1} of 12`);
      expect(visible).toContain(`${name} is the transferable token for the ${name} sign.`);
      expect(visible).toContain('The gold sculpture is its collection artwork—not a physical sculpture or a one-of-one NFT.');
      expect(visible).toContain('Token facts');
      expect(visible).toContain(`What ${name} represents`);
      expect(visible).toContain(`Why ${name} has a place in the set`);
      expect(visible).toContain(`The ${name} constellation`);
      expect(visible).toContain(`The story behind ${name}`);
      expect(visible).toContain('Official addresses');
      expect(visible).toContain(`Get ${name}`);
      expect(visible).toContain('Explore all 12');
      expect(visible).not.toMatch(/>Museum label<|>Catalogue note<|>Provenance<|>Acquisition<|>The catalogue</u);
    }
  });

  it('uses the Registry archive for honest charts and keeps valuation fields separate', async () => {
    const [source, leo] = await Promise.all([
      read('scripts/build-sign-pages.mjs'),
      read('public/registry/leo/index.html'),
    ]);

    for (const value of [source, leo]) {
      expect(value).toContain('/assets/data/registry-market-history.v1.json');
      expect(value).toContain("archive.schema !== 'zodiacs.registry-market-history.v1'");
      expect(value).toContain('One dated observation');
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
  });

  it('links every record to its constellation and sign-filtered research', async () => {
    for (const sign of signs) {
      const html = await read(`public/registry/${sign}/index.html`);
      expect(html).toContain(`/assets/constellations/${sign}.svg`);
      expect(html).toContain(`/registry/research/?sign=${sign}&amp;type=daily`);
      expect(html).toContain(`/registry/research/?sign=${sign}`);
    }
  });

  it('emits parseable executable inline scripts on every record', async () => {
    for (const sign of signs) {
      const html = await read(`public/registry/${sign}/index.html`);
      const scripts = [...html.matchAll(/<script(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/giu)]
        .map((match) => match[1])
        .filter((script) => script.trim());
      expect(scripts.length).toBeGreaterThan(3);
      for (const script of scripts) {
        expect(() => new Function(script)).not.toThrow();
      }
    }
  });
});
