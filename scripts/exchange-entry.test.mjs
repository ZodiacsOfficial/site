import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  REGISTRY_EXCHANGE_FLAG,
  REGISTRY_EXCHANGE_LANDING_COPY,
  REGISTRY_EXCHANGE_META,
  REGISTRY_EXCHANGE_PATH,
  REGISTRY_EXCHANGE_PUBLIC_NAME,
  injectRegistryExchange,
  injectRegistryExchangeLanding,
  registryExchangeEnabled,
  renderExchangeRegion,
} from '../src/exchange/entry.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ON = { [REGISTRY_EXCHANGE_FLAG]: '1' };
const page = () => readFile(resolve(root, 'public/terminal/markets/index.html'), 'utf8');
const proPage = () => readFile(resolve(root, 'public/terminal/pro/index.html'), 'utf8');
const consumerPage = () => readFile(resolve(root, 'public/terminal/index.html'), 'utf8');
const landing = () => [
  '<!doctype html>',
  '<html><head>',
  `<meta name="${REGISTRY_EXCHANGE_META}" content="0" />`,
  '</head><body>Registry landing fixture</body></html>',
].join('\n');

describe('the flag', () => {
  it('turns on for exactly one value', () => {
    expect(registryExchangeEnabled(ON)).toBe(true);
    for (const value of ['0', '', 'true', 'yes', undefined]) {
      expect(registryExchangeEnabled({ [REGISTRY_EXCHANGE_FLAG]: value })).toBe(false);
    }
    expect(registryExchangeEnabled({})).toBe(false);
  });

  it('exports one stable public integration contract for the expert Terminal gateway', () => {
    expect(REGISTRY_EXCHANGE_PATH).toBe('/terminal/markets/');
    expect(REGISTRY_EXCHANGE_PUBLIC_NAME).toBe('Terminal');
    expect(REGISTRY_EXCHANGE_LANDING_COPY).toEqual({
      eyebrow: 'Terminal',
      action: 'Open venue route',
      description: 'All 12 · charts · recent trades · independent venue quotes',
      ariaLabel: 'Open the Terminal venue route for the selected Zodiac token',
    });
    expect(Object.isFrozen(REGISTRY_EXCHANGE_LANDING_COPY)).toBe(true);
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
    expect(output).toContain('aria-label="Terminal venue route"');
    expect(output).not.toContain('Registry Trading Room');
    expect(output).not.toContain('aria-label="Exchange terminal"');
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

describe('Terminal gateway flag synchronization', () => {
  it('commits the expert marker off and leaves Astrofolio unmarked', async () => {
    const [pro, consumer] = await Promise.all([proPage(), consumerPage()]);
    expect(pro.match(new RegExp(REGISTRY_EXCHANGE_META, 'g'))).toHaveLength(1);
    expect(pro).toContain(`<meta name="${REGISTRY_EXCHANGE_META}" content="0" />`);
    expect(consumer).not.toContain(REGISTRY_EXCHANGE_META);
  });

  it('stamps the Terminal marker from the exact same flag', () => {
    const committed = landing();
    const on = injectRegistryExchangeLanding(committed, ON);
    expect(on.enabled).toBe(true);
    expect(on.output).toContain(`<meta name="${REGISTRY_EXCHANGE_META}" content="1" />`);
    expect(on.output.match(new RegExp(REGISTRY_EXCHANGE_META, 'g'))).toHaveLength(1);
    expect(injectRegistryExchangeLanding(on.output, {}).output).toBe(committed);
  });

  it('is idempotent and fails closed when the Terminal marker is missing', () => {
    const committed = landing();
    const on = injectRegistryExchangeLanding(committed, ON).output;
    expect(injectRegistryExchangeLanding(on, ON).output).toBe(on);
    expect(injectRegistryExchangeLanding(committed, {}).output).toBe(committed);
    expect(() => injectRegistryExchangeLanding('<html><head></head></html>', ON))
      .toThrow(/Terminal landing is missing its flag marker/);
    expect(() => injectRegistryExchangeLanding(`${committed}\n${committed}`, ON))
      .toThrow(/Terminal landing must contain exactly one flag marker/);
  });

  it('is byte-reversible on the committed Terminal page', async () => {
    const committed = await proPage();
    const on = injectRegistryExchangeLanding(committed, ON).output;
    expect(on).not.toBe(committed);
    expect(injectRegistryExchangeLanding(on, {}).output).toBe(committed);
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

describe('the committed-off drift invariant', () => {
  it('unstamps the page in the fresh-checkout drift job before diffing public output', async () => {
    const workflow = await readFile(resolve(root, '.github/workflows/site-check.yml'), 'utf8');
    const job = workflow.slice(workflow.indexOf('  legacy-drift:'), workflow.indexOf('  phase3-delivery-sql:'));
    expect(job).toContain('node scripts/build-exchange.mjs');
    expect(job).toContain('node scripts/configure-registry-exchange.mjs');
    expect(job.indexOf('configure-registry-exchange.mjs')).toBeLessThan(job.indexOf('git diff --exit-code'));
  });

  it('configures the route and Terminal landing together before writing either', async () => {
    const configure = await readFile(resolve(root, 'scripts/configure-registry-exchange.mjs'), 'utf8');
    expect(configure).toContain("resolve(root, 'public/terminal/markets/index.html')");
    expect(configure).toContain("resolve(root, 'public/terminal/pro/index.html')");
    expect(configure).not.toContain("resolve(root, 'public/terminal/index.html')");
    expect(configure).toContain('injectRegistryExchange(exchangeSource, process.env)');
    expect(configure).toContain('injectRegistryExchangeLanding(proSource, process.env)');
    expect(configure.indexOf('const exchangeOutput =')).toBeLessThan(configure.indexOf('const writes ='));
    expect(configure.indexOf('const proOutput =')).toBeLessThan(configure.indexOf('const writes ='));
    expect(configure).toContain('await Promise.all(writes)');
    expect(configure).toContain('of 2 surfaces rewritten, Terminal landing included');
  });
});
