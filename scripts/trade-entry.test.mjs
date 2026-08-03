import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  REGISTRY_TRADE_FLAG,
  injectRegistryTrade,
  registryTradeEnabled,
  renderTradeRegion,
} from '../src/trade/entry.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SIGNS = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
];
const ON = { [REGISTRY_TRADE_FLAG]: '1' };
const page = (sign) => readFile(resolve(root, `public/registry/${sign}/index.html`), 'utf8');

describe('the flag', () => {
  it('turns on for exactly one value', () => {
    expect(registryTradeEnabled(ON)).toBe(true);
    for (const value of ['0', '', 'true', 'yes', undefined]) {
      expect(registryTradeEnabled({ [REGISTRY_TRADE_FLAG]: value })).toBe(false);
    }
    expect(registryTradeEnabled({})).toBe(false);
  });
});

describe('the committed pages', () => {
  it('ship flag-off, with the region present but empty', async () => {
    for (const sign of SIGNS) {
      const html = await page(sign);
      expect(html, sign).toContain('<meta name="zodiacs-registry-trade-enabled" content="0" />');
      expect(html.match(/<!-- registry-trade:start -->/g), sign).toHaveLength(1);
      expect(html.match(/<!-- registry-trade:end -->/g), sign).toHaveLength(1);
      // Nothing of the panel ships in the committed bytes.
      expect(html, sign).not.toContain('data-trade-panel');
    }
  });

  it('carries each sign’s own mint in its slot', async () => {
    const registry = JSON.parse(
      await readFile(resolve(root, 'public/registry/zodiacs.registry.json'), 'utf8'),
    );
    const mints = new Map(registry.assets.map((a) => [a.sign, a.native.address]));
    for (const sign of SIGNS) {
      const slot = (await page(sign)).match(/<!-- registry-trade:slot (\{.*?\}) -->/);
      expect(slot, sign).not.toBeNull();
      const payload = JSON.parse(slot[1]);
      expect(payload.sign, sign).toBe(sign);
      expect(payload.mint, sign).toBe(mints.get(sign));
    }
  });

  it('keeps the pinned acquisition copy beside the region', async () => {
    for (const sign of SIGNS) {
      const html = (await page(sign)).replace(/\s+/g, ' ');
      expect(html, sign).toContain('can lose all market value');
      expect(html, sign).toContain('an onchain transaction that cannot be reversed');
      expect(html, sign).toContain('Verify the official mint, network, amount, and destination');
      expect(html, sign).toContain('Open Jupiter route');
    }
  });
});

describe('stamping', () => {
  it('adds the panel for this sign when the flag is on', async () => {
    const { output, enabled } = injectRegistryTrade(await page('aries'), ON);
    expect(enabled).toBe(true);
    expect(output).toContain('<meta name="zodiacs-registry-trade-enabled" content="1" />');
    expect(output.match(/data-trade-panel/g)).toHaveLength(1);
    expect(output).toContain('data-trade-mint="GhFiFrExPY3proVF96oth1gESWA5QPQzdtb8cy8b1YZv"');
    // The venue links stay put as the fallback.
    expect(output).toContain('Open Jupiter route');
  });

  it('says so when JavaScript is off rather than showing a dead panel', async () => {
    const { output } = injectRegistryTrade(await page('aries'), ON);
    expect(output).toContain('<noscript>');
    expect(output).toContain('Trading here needs JavaScript');
  });

  it('is byte-reversible, which is what the drift gate rests on', async () => {
    for (const sign of ['aries', 'cancer', 'pisces']) {
      const committed = await page(sign);
      const on = injectRegistryTrade(committed, ON).output;
      expect(on).not.toBe(committed);
      const off = injectRegistryTrade(on, {}).output;
      expect(off, sign).toBe(committed);
    }
  });

  it('is idempotent in both directions', async () => {
    const committed = await page('leo');
    const onceOn = injectRegistryTrade(committed, ON).output;
    expect(injectRegistryTrade(onceOn, ON).output).toBe(onceOn);
    expect(injectRegistryTrade(committed, {}).output).toBe(committed);
  });

  it('refuses a page whose markers are missing rather than writing blind', () => {
    expect(() => injectRegistryTrade('<html><body>no markers</body></html>', ON))
      .toThrow(/missing its trade region markers/);
    expect(() => injectRegistryTrade(
      '<!-- registry-trade:start --><!-- registry-trade:end -->', ON,
    )).toThrow(/missing its slot payload/);
  });
});

describe('the rendered region', () => {
  it('renders nothing but its markers when the flag is off', () => {
    const off = renderTradeRegion({ sign: 'aries', name: 'Aries', mint: 'M', enabled: false });
    expect(off).not.toContain('data-trade-panel');
    expect(off).toContain('registry-trade:slot');
  });
});
