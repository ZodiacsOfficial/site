import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(resolve(root, path), 'utf8');

function functionBlock(source, name) {
  const start = source.indexOf(`    function ${name}(`);
  expect(start, `${name} exists`).toBeGreaterThanOrEqual(0);
  const end = source.indexOf('\n    function ', start + 1);
  return source.slice(start, end < 0 ? source.length : end);
}

function ordered(source, needles) {
  let cursor = -1;
  for (const needle of needles) {
    const next = source.indexOf(needle, cursor + 1);
    expect(next, `${needle} follows the previous item`).toBeGreaterThan(cursor);
    cursor = next;
  }
}

function section(html, id) {
  const start = html.indexOf(`id="${id}"`);
  expect(start, `#${id} exists`).toBeGreaterThanOrEqual(0);
  const sectionStart = html.lastIndexOf('<section', start);
  const end = html.indexOf('</section>', start);
  return html.slice(sectionStart, end + '</section>'.length);
}

describe('Zodiac Terminal consumer and Pro split', () => {
  it('pins distinct indexed route and view contracts', async () => {
    const [consumer, pro] = await Promise.all([
      read('public/terminal/index.html'),
      read('public/terminal/pro/index.html'),
    ]);

    expect(consumer).toContain('<link rel="canonical" href="https://zodiacs.org/terminal/" />');
    expect(consumer).toContain('<meta name="zodiacs-registry-view" content="terminal" />');
    expect(consumer).not.toContain('zodiacs-registry-exchange-enabled');
    expect(pro).toContain('<link rel="canonical" href="https://zodiacs.org/terminal/pro/" />');
    expect(pro).toContain('<meta name="zodiacs-registry-view" content="terminal-pro" />');
    expect(pro).toContain('<meta name="zodiacs-registry-exchange-enabled" content="0" />');
    expect(consumer).not.toMatch(/<meta\s+name="robots"[^>]*noindex/u);
    expect(pro).not.toMatch(/<meta\s+name="robots"[^>]*noindex/u);
  });

  it('keeps the no-JS consumer journey identity-first and market context low', async () => {
    const html = await read('public/terminal/index.html');
    ordered(html, [
      '<h1 id="static-capital-title">Zodiac Terminal</h1>',
      'id="official-twelve"',
      'id="identity"',
      'id="verify"',
      'class="static-site__section static-collection-section"',
      'id="thesis"',
      'id="market-snapshot"',
      'id="faq"',
      'data-terminal-market-notice',
    ]);
    expect(html).toContain('Every sign has one official token. Find yours, see the artwork, and verify the public record.');
    expect(html).toContain('data-terminal-static-view="pro"');
  });

  it('keeps the no-JS gallery identity-only', async () => {
    const html = await read('public/terminal/index.html');
    const gallery = section(html, 'official-twelve');
    expect(gallery).toContain('The 12 Official Zodiac Tokens');
    expect(gallery).toContain('This is my sign');
    expect(gallery).toContain('Official record');
    expect(gallery).toContain('Season spotlight');
    expect(gallery).not.toMatch(/liquidity|market cap|volume|pool|buy|acquir|chart/iu);
    expect(gallery.match(/id="(?:aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces)"/gu)).toHaveLength(12);
  });

  it('pins the hydrated consumer composition in the same order', async () => {
    const source = await read('src/app.jsx');
    const start = source.indexOf('<main id="main" className="zd consumer-registry">');
    const mounted = source.slice(start, source.indexOf('</main>', start));
    ordered(mounted, [
      '<ConsumerIdentityHeader sign={sign} />',
      '<ConsumerExplorer',
      '<ConsumerHowItWorks />',
      '<VerifierSection />',
      '<ConsumerPurpose />',
      '<ConsumerMarketSnapshot />',
      '<ConsumerFaq />',
      '<ConsumerClosing />',
      '<Footer />',
    ]);
    expect(mounted).not.toContain('<ConsumerMarketSection');
    expect(mounted).not.toContain('<ConsumerMarketBriefing');
    expect(mounted).not.toContain('<MarketTape');
    expect(mounted).not.toContain('<StandingsSection');
    expect(mounted).not.toContain('<PulseSection');
    expect(mounted).not.toContain('<ProMarketsGateway');
  });

  it('makes the hydrated gallery explicitly identity-only', async () => {
    const source = await read('src/app.jsx');
    const explorer = functionBlock(source, 'ConsumerExplorer');
    const gallery = functionBlock(source, 'GalleryBand');
    expect(explorer).toContain('<GalleryBand');
    expect(explorer).toContain('identityOnly');
    expect(gallery).toContain('{!identityOnly && <PlacardQuote sign={sign} />}');
    expect(gallery).toContain('{!identityOnly && <PlacardMarketPanel sign={sign} />}');
    expect(gallery).toContain("personalSlug === slug ? `${sign.name} is my sign` : 'This is my sign'");
    expect(gallery).toContain('setPersonalSlug(slug)');
    expect(gallery).toContain('Official record');
  });

  it('uses query, saved sign, then current season without saving ordinary selection', async () => {
    const source = await read('src/app.jsx');
    const rootBlock = functionBlock(source, 'Zodiacs');
    ordered(rootBlock, [
      "new URLSearchParams(window.location.search).get('sign')",
      "window.localStorage.getItem('zodiacs:today-sun-sign:v1')",
      'currentSeason()?.sign.ticker',
    ]);
    const explorer = functionBlock(source, 'ConsumerExplorer');
    expect(explorer).toContain('setActive={setActive}');
    expect(explorer).not.toContain("localStorage.setItem('zodiacs:today-sun-sign:v1'");
    expect(rootBlock).toContain("window.localStorage.setItem('zodiacs:today-sun-sign:v1', slug)");
  });

  it('keeps the consumer snapshot calm, lazy, and in zodiac order', async () => {
    const source = await read('src/app.jsx');
    const movement = functionBlock(source, 'plainMarketMovement');
    expect(movement).toContain("up ${formatPercent(movement).replace('+', '')} over 24 hours");
    expect(movement).toContain("down ${formatPercent(Math.abs(movement)).replace('+', '')} over 24 hours");
    expect(movement).toContain('unchanged over 24 hours');
    expect(movement).toContain('24h movement unavailable');
    const snapshot = functionBlock(source, 'ConsumerMarketSnapshot');
    expect(snapshot).toContain("useInView('420px 0px')");
    expect(snapshot).toContain('useTwelveQuotes(inView, retryKey)');
    expect(snapshot).toContain('Price, without the leaderboard.');
    expect(snapshot).toContain('{SIGNS.map((item) =>');
    expect(snapshot).toContain('plainMarketMovement');
    expect(snapshot).not.toMatch(/sort\(|rankBy|SelectedTokenMiniChart|PlacardMarketPanel/gu);

    const html = await read('public/terminal/index.html');
    const staticSnapshot = section(html, 'market-snapshot');
    const signs = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
    ordered(staticSnapshot, signs.map((sign) => `href="/registry/${sign}/"`));
    expect(staticSnapshot.match(/<li>/gu)).toHaveLength(12);
    expect(staticSnapshot).not.toMatch(/rank|spark|chart/iu);
  });

  it('pins the focused hydrated Pro composition and shared market read', async () => {
    const source = await read('src/app.jsx');
    const start = source.indexOf('<main id="main" className="zd terminal-pro">');
    const mounted = source.slice(start, source.indexOf('</main>', start));
    ordered(mounted, [
      '<ProMasthead sign={sign} batch={proMarket} />',
      '<ProMarketBoard active={activeTicker} setActive={setActiveTicker} batch={proMarket} />',
      '<ProSelectedSign sign={sign} batch={proMarket} />',
      '<ProMarketsGateway sign={sign} />',
      '<ConsumerMarketBriefing active={activeTicker} sharedMarket={proMarket} />',
      '<ProResearchSection sign={sign} />',
      '<ProVerifierLink sign={sign} />',
      '<Footer pro />',
    ]);
    expect(mounted).not.toContain('<StandingsSection');
    expect(mounted).not.toContain('<PulseSection');
    expect(source).toContain('const proMarket = useTwelveQuotes(pro);');
    expect(functionBlock(source, 'MarketTape')).toContain('useTwelveQuotes(!sharedBatch)');
    expect(functionBlock(source, 'ConsumerMarketBriefing')).toContain('useTwelveQuotes(!sharedMarket && inView)');
  });

  it('keeps the Pro board semantic, sortable, signed, and chart-free', async () => {
    const source = await read('src/app.jsx');
    const board = functionBlock(source, 'ProMarketBoard');
    expect(board).toContain("return TERMINAL_RANKS.has(rank) ? rank : 'marketCap'");
    expect(board).toContain("rankBy === 'change' ? 'descending' : 'none'");
    expect(board).toContain("rankBy === 'liquidity' ? 'descending' : 'none'");
    expect(board).toContain("rankBy === 'marketCap' ? 'descending' : 'none'");
    expect(board).toContain('if (a === null) return 1;');
    expect(board).toContain('return b - a || left.sign.order - right.sign.order;');
    expect(board).toContain('formatPercent(quote.priceChange24h)');
    expect(board).toContain('Official record ↗');
    expect(board).toContain("batch.stale ? ' · refresh delayed'");
    expect(board).toContain('Price and 24h change use the deepest indexed Solana pool.');
    expect(board).not.toMatch(/spark|MiniChart|geckoterminal/iu);
  });

  it('keeps only the selected-sign chart and a visible tape pause control', async () => {
    const source = await read('src/app.jsx');
    const masthead = functionBlock(source, 'ProMasthead');
    const selected = functionBlock(source, 'ProSelectedSign');
    expect(masthead).toContain("{paused ? 'Resume tape' : 'Pause tape'}");
    expect(masthead).toContain('aria-pressed={paused}');
    expect(masthead).toContain("matchMedia('(prefers-reduced-motion: reduce)')");
    expect(selected).toContain('<SelectedTokenMiniChart');
    expect(selected).toContain('<SeasonNow season={season} />');
  });

  it('pins a complete, useful no-JS Pro desk', async () => {
    const html = await read('public/terminal/pro/index.html');
    ordered(html, [
      '<h1 id="pro-static-title">Zodiac Terminal Pro</h1>',
      'id="market"',
      'id="selected"',
      'id="briefing"',
      'id="research"',
      'id="verify"',
      'data-terminal-market-notice',
    ]);
    const board = section(html, 'market');
    expect(board.match(/<tbody>[\s\S]*?<tr>/gu)?.length ?? 0).toBeGreaterThanOrEqual(1);
    expect(board.match(/Official record<\/a>/gu)).toHaveLength(12);
    expect(board).toContain('Reported market cap');
    expect(board).toContain('Price and 24h change use the deepest indexed Solana pool.');
    expect(html).toContain('Symbolic context is not a price forecast. Market observations never change the sky reading.');
    expect(board).not.toMatch(/sparkline/iu);
    expect(html).toContain('data-terminal-static-view="consumer"');
    expect(html).toContain('href="/terminal/#verify"');
  });

  it('renders only published internal Research items, matches first, and caps at three', async () => {
    const source = await read('src/app.jsx');
    const selector = functionBlock(source, 'publishedResearchItems');
    const research = functionBlock(source, 'ProResearchSection');
    expect(selector).toContain("item?.status === 'published'");
    expect(selector).toContain('Date.parse(item.visibleAt || item.publishedAt || \'\') <= now');
    expect(selector).toContain('leftMatch !== rightMatch');
    expect(selector).toContain('.slice(0, 3)');
    expect(research).toContain('data-research-status={item.status}');
    expect(research).toContain('Drafts never appear here.');
    expect(research).toContain('href="/terminal/research/"');

    const html = await read('public/terminal/pro/index.html');
    const staticResearch = section(html, 'research');
    expect(staticResearch).toContain('data-research-empty-state');
    expect(staticResearch).toContain('Drafts never render.');
    expect(staticResearch).not.toContain('/feeds/market-research');
  });

  it('keeps normal view links, resilient memory, and session-only banner dismissal', async () => {
    const source = await read('src/app.jsx');
    const link = functionBlock(source, 'TerminalViewLink');
    const remember = functionBlock(source, 'rememberTerminalView');
    const banner = functionBlock(source, 'ConsumerPreferenceBanner');
    expect(link).toContain('<a');
    expect(link).not.toMatch(/role=["']switch/gu);
    expect(remember).toContain('window.localStorage.setItem(TERMINAL_VIEW_STORAGE_KEY, view)');
    expect(remember).toMatch(/try \{[\s\S]*?\} catch/gu);
    expect(remember).toContain("trackAnalytics('terminal_view_switch', { surface, direction })");
    expect(banner).toContain('window.sessionStorage.setItem(TERMINAL_PRO_BANNER_DISMISSED_KEY, \'1\')');
    expect(banner).not.toContain('window.localStorage.setItem');
    expect(banner).not.toContain('location.replace');
    expect(banner).not.toContain('banner-dismiss');
  });

  it('maps legacy market intent to Pro and retains only valid sign and rank', async () => {
    const source = await read('src/app.jsx');
    expect(source).toContain("market: 'market'");
    expect(source).toContain("briefing: 'briefing'");
    expect(source).toContain("research: 'research'");
    expect(source).toContain("outlook: 'briefing'");
    expect(source).toContain('if (incomingSign) clean.set(\'sign\', incomingSign.asset.sign)');
    expect(source).toContain('if (TERMINAL_RANKS.has(incomingRank)) clean.set(\'rank\', incomingRank)');
    expect(source).toContain('window.location.replace(`/terminal/pro/${clean.size ? `?${clean}` : \'\'}#${proDestination}`)');

    const html = await read('public/terminal/index.html');
    for (const id of ['market', 'briefing', 'research', 'outlook']) {
      expect(html).toContain(`<span id="${id}" class="terminal-compat-target" aria-hidden="true"></span>`);
    }
  });

  it('keeps the flag-off consumer clean and the conditional gateway singular and inert', async () => {
    const [source, consumer, pro] = await Promise.all([
      read('src/app.jsx'),
      read('public/terminal/index.html'),
      read('public/terminal/pro/index.html'),
    ]);
    const gateway = functionBlock(source, 'ProMarketsGateway');
    expect(gateway).toContain('if (!REGISTRY_EXCHANGE_ENABLED) return null;');
    expect(gateway).toContain('data-pro-markets-gateway');
    expect(gateway).toContain('`${REGISTRY_EXCHANGE_PATH}#${sign.asset.sign}`');
    expect(gateway).not.toMatch(/jupiter|wallet|fetch\(/iu);
    expect(consumer).not.toContain('/terminal/markets/');
    expect(pro).not.toContain('/terminal/markets/');
    expect(pro).not.toContain('data-pro-markets-gateway');
  });

  it('preserves the exact Market & venue notice on both static views', async () => {
    const [consumer, pro] = await Promise.all([
      read('public/terminal/index.html'),
      read('public/terminal/pro/index.html'),
    ]);
    const notice = (html) => html.match(/<aside[^>]*data-terminal-market-notice[\s\S]*?<\/aside>/u)?.[0]
      .replace(/id="[^"]*terminal-market-notice-title"/gu, '')
      .replace(/aria-labelledby="[^"]*terminal-market-notice-title"/gu, '')
      .replace(/class="[^"]*"/gu, '')
      .replace(/\s+/gu, ' ')
      .trim();
    expect(notice(consumer)).toBe(notice(pro));
    expect(notice(consumer)).toContain('Zodiac tokens are speculative, thinly traded digital assets.');
    expect(notice(consumer)).toContain('receives no trading or referral compensation.');
    expect(notice(consumer)).toContain('Verify the official address, network, amount, fees, and destination before signing.');
  });

  it('leaves technical Registry market instruments available only on the technical branch', async () => {
    const source = await read('src/app.jsx');
    const technicalStart = source.indexOf('<main id="main" className="zd technical-registry">');
    const technical = source.slice(technicalStart, source.indexOf('</main>', technicalStart));
    expect(technical).toContain('<PulseSection />');
    expect(technical).toContain('<StandingsSection />');
  });
});
