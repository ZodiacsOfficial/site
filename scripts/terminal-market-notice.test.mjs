import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(resolve(root, path), 'utf8');
const compact = (value) => value.replace(/\s+/gu, ' ');

const REQUIRED_COPY = [
  'speculative, thinly traded digital assets',
  'could lose all money used to acquire one',
  'no established predictive relationship with asset prices',
  'does not operate a DEX, exchange, broker, or custodial service',
  'Jupiter, an independent third-party liquidity aggregator',
  'wallet reviews, approves, and signs',
  'holds no keys or funds',
  'receives no trading or referral compensation',
  'do not imply affiliation or endorsement',
  'not an offer or solicitation',
  'accounting, legal, tax, or financial advice',
  'may not be available in all regions',
];

describe('Terminal market and venue notice coverage', () => {
  it('keeps one canonical, link-free notice component for Astro Terminal routes', async () => {
    const component = compact(await read('src/components/TerminalMarketVenueNotice.astro'));
    expect(component).toContain('data-terminal-market-notice');
    expect(component).not.toMatch(/<a\b/iu);
    for (const phrase of REQUIRED_COPY) expect(component).toContain(phrase);
  });

  it('renders the notice in both Terminal research templates without replacing their local boundaries', async () => {
    for (const path of [
      'src/pages/terminal/research/index.astro',
      'src/pages/terminal/research/[slug].astro',
    ]) {
      const source = await read(path);
      expect(source, path).toContain('terminalMarketNotice');
    }
    expect(await read('src/pages/terminal/research/index.astro')).toContain('Research boundary');
    expect(await read('src/pages/terminal/research/[slug].astro')).toContain('Audit receipt');
  });

  it('keeps the full notice beside the existing point-of-action risk block on Zodiac Markets', async () => {
    const markets = compact(await read('public/terminal/markets/index.html'));
    expect(markets.match(/data-terminal-market-notice/gu) ?? []).toHaveLength(1);
    expect(markets).toContain('Before anything is signed');
    for (const phrase of REQUIRED_COPY) expect(markets).toContain(phrase);
  });

  it('retains exactly one complete notice on the Terminal landing', async () => {
    const terminal = compact(await read('public/terminal/index.html'));
    expect(terminal.match(/data-terminal-market-notice/gu) ?? []).toHaveLength(1);
    for (const phrase of REQUIRED_COPY) expect(terminal).toContain(phrase);
  });
});
