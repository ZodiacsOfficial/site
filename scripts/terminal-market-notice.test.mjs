import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(resolve(root, path), 'utf8');
const compact = (value) => value.replace(/\s+/gu, ' ');

const MARKET_NOTICE_PARAGRAPHS = [
  'Zodiac tokens are speculative, thinly traded digital assets. Prices can be volatile, liquidity may disappear, and you could lose all money used to acquire one. Astrology has no established predictive relationship with asset prices.',
  'Zodiacs.org provides the Terminal interface and public Registry; it does not operate a DEX, exchange, broker, or custodial service. When trading is available, Jupiter, an independent third-party liquidity aggregator, supplies the executable quote, builds and submits the transaction, and charges any venue fee shown; your wallet reviews, approves, and signs. Zodiacs.org holds no keys or funds, cannot reverse transactions, and receives no trading or referral compensation. References to Jupiter do not imply affiliation or endorsement.',
  'Information is for informational purposes only and is not an offer or solicitation, an investment recommendation or trading strategy, or accounting, legal, tax, or financial advice. Third-party services may not be available in all regions. Verify the official address, network, amount, fees, and destination before signing.',
];

function notice(source) {
  const match = source.match(/<aside[^>]*data-terminal-market-notice[\s\S]*?<\/aside>/u);
  expect(match, 'the canonical notice exists').not.toBeNull();
  return match[0];
}

function paragraphText(source) {
  return [...source.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gu)].map((match) => compact(
    match[1]
      .replace(/<[^>]+>/gu, ' ')
      .replace(/&amp;/gu, '&'),
  ).trim());
}

describe('Terminal market and venue notice coverage', () => {
  it('keeps one canonical, link-free notice component for market-facing routes', async () => {
    const component = notice(await read('src/components/TerminalMarketVenueNotice.astro'));
    expect(component).toContain('data-terminal-market-notice');
    expect(component).toContain('Market &amp; venue notice');
    expect(component).not.toMatch(/<a\b/iu);
    expect(paragraphText(component)).toEqual(MARKET_NOTICE_PARAGRAPHS);
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
    const markets = await read('public/terminal/markets/index.html');
    expect(markets.match(/data-terminal-market-notice/gu) ?? []).toHaveLength(1);
    expect(markets).toContain('Before anything is signed');
    expect(paragraphText(notice(markets))).toEqual(MARKET_NOTICE_PARAGRAPHS);
  });

  it('retains exactly one complete notice on both Terminal landings', async () => {
    for (const path of ['public/astrofolio/index.html', 'public/terminal/index.html']) {
      const terminal = await read(path);
      expect(terminal.match(/<aside[^>]*data-terminal-market-notice/gu) ?? [], path).toHaveLength(1);
      expect(paragraphText(notice(terminal)), path).toEqual(MARKET_NOTICE_PARAGRAPHS);
    }
  });
});
