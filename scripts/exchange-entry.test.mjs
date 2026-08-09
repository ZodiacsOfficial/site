import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  REGISTRY_EXCHANGE_FLAG,
  injectRegistryExchange,
  registryExchangeEnabled,
  renderExchangeRegion,
} from '../src/exchange/entry.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ON = { [REGISTRY_EXCHANGE_FLAG]: '1' };
const page = () => readFile(resolve(root, 'public/registry/exchange/index.html'), 'utf8');

describe('the flag', () => {
  it('turns on for exactly one value', () => {
    expect(registryExchangeEnabled(ON)).toBe(true);
    for (const value of ['0', '', 'true', 'yes', undefined]) {
      expect(registryExchangeEnabled({ [REGISTRY_EXCHANGE_FLAG]: value })).toBe(false);
    }
    expect(registryExchangeEnabled({})).toBe(false);
  });
});

describe('the committed page', () => {
  it('ships flag-off, with the region present but empty', async () => {
    const html = await page();
    expect(html).toContain('<meta name="zodiacs-registry-exchange-enabled" content="0" />');
    expect(html.match(/<!-- registry-exchange:start -->/g)).toHaveLength(1);
    expect(html.match(/<!-- registry-exchange:end -->/g)).toHaveLength(1);
    // Nothing of the terminal ships in the committed bytes.
    expect(html).not.toContain('data-zme-terminal');
    expect(html).not.toContain('/assets/exchange.js');
  });

  it('bakes no mint, pool, or venue endpoint into the page', async () => {
    const html = await page();
    const registry = JSON.parse(
      await readFile(resolve(root, 'public/registry/zodiacs.registry.json'), 'utf8'),
    );
    for (const asset of registry.assets) {
      expect(html).not.toContain(asset.native.address);
    }
    expect(html).not.toContain('jup.ag/swap/');
    expect(html).not.toContain('lite-api.jup.ag');
    expect(html).not.toContain('api.geckoterminal.com');
    expect(html).not.toContain('api.dexscreener.com');
  });
});

describe('stamping', () => {
  it('adds the terminal container and runtime when the flag is on', async () => {
    const { output, enabled } = injectRegistryExchange(await page(), ON);
    expect(enabled).toBe(true);
    expect(output).toContain('<meta name="zodiacs-registry-exchange-enabled" content="1" />');
    expect(output.match(/data-zme-terminal/g)).toHaveLength(1);
    expect(output.match(/src="\/assets\/exchange\.js"/g)).toHaveLength(1);
  });

  it('says so when JavaScript is off rather than showing a dead terminal', async () => {
    const { output } = injectRegistryExchange(await page(), ON);
    expect(output).toContain('<noscript>');
    expect(output).toContain('The terminal needs JavaScript');
  });

  it('is byte-reversible, which is what the drift gate rests on', async () => {
    const committed = await page();
    const on = injectRegistryExchange(committed, ON).output;
    expect(on).not.toBe(committed);
    expect(injectRegistryExchange(on, {}).output).toBe(committed);
  });

  it('is idempotent in both directions', async () => {
    const committed = await page();
    const onceOn = injectRegistryExchange(committed, ON).output;
    expect(injectRegistryExchange(onceOn, ON).output).toBe(onceOn);
    expect(injectRegistryExchange(committed, {}).output).toBe(committed);
  });

  it('refuses a page whose markers are missing rather than writing blind', () => {
    expect(() => injectRegistryExchange('<html><body>no markers</body></html>', ON))
      .toThrow(/missing its terminal region markers/);
    expect(() => injectRegistryExchange(
      '<!-- registry-exchange:start --><!-- registry-exchange:end -->', ON,
    )).toThrow(/missing its slot payload/);
  });
});

describe('the rendered region', () => {
  it('renders nothing but its markers when the flag is off', () => {
    const off = renderExchangeRegion({ enabled: false });
    expect(off).not.toContain('data-zme-terminal');
    expect(off).not.toContain('/assets/exchange.js');
    expect(off).toContain('registry-exchange:slot');
  });
});
