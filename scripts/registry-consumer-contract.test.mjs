import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(resolve(root, path), 'utf8');
const signs = [
  'aries',
  'taurus',
  'gemini',
  'cancer',
  'leo',
  'virgo',
  'libra',
  'scorpio',
  'sagittarius',
  'capricorn',
  'aquarius',
  'pisces',
];
const movedHashes = [
  ['pulse', 'market-transparency'],
  ['standings', 'market-transparency'],
  ['onchain-access', 'access-third-parties'],
  ['builders', 'builder-tools'],
  ['sdk', 'builder-tools'],
  ['security', 'safety-evidence'],
];

function visibleMarkup(html) {
  return html
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, '')
    .replace(/<!--([\s\S]*?)-->/gu, '');
}

function consumerRoot(source) {
  const start = source.indexOf('<main id="main" className="zd consumer-registry">');
  const end = source.indexOf('</main>', start);
  if (start < 0 || end < 0) return '';
  return source.slice(start, end);
}

describe('Registry consumer and technical information architecture', () => {
  it('keeps the canonical record at twelve signs and twenty-four representations', async () => {
    const registry = JSON.parse(await read('public/registry/zodiacs.registry.json'));
    expect(registry.assets.map((asset) => asset.sign)).toEqual(signs);
    expect(registry.assets).toHaveLength(12);
    expect(registry.assets.flatMap((asset) => asset.representations)).toHaveLength(24);
    for (const asset of registry.assets) {
      expect(asset.representations.map((representation) => representation.chain)).toEqual([
        'solana',
        'base',
      ]);
    }
  });

  it('opens with one market identity, a plain-language promise, and the verification path', async () => {
    const [source, html] = await Promise.all([
      read('src/app.jsx'),
      read('public/registry/index.html'),
    ]);
    const visible = visibleMarkup(html);

    for (const value of [source, visible]) {
      expect(value).toContain('Zodiac Capital Markets');
      expect(value).toContain('Twelve signs. Twelve transferable tokens. One live public market.');
      expect(value).not.toMatch(/<h1[^>]*>\s*Astrofolio\s*<\/h1>/iu);
    }
    for (const value of [source, visible]) {
      // The verifier is reachable in plain words. "Check an address" named
      // the mechanism, and "Check a token is official" dropped its "that".
      expect(value).toContain('Verify a token');
      expect(value).not.toContain('Check an address');
      expect(value).not.toContain('Check a token is official');
    }
    expect(visible).toContain('The 12 Official Zodiac Tokens');
    expect(visible).toMatch(/href="#official-twelve"[^>]*>[\s\S]*?The twelve/iu);
    expect(visible).toMatch(/href="#verify"[^>]*>[\s\S]*?Verify a token/iu);
    expect(visible).not.toContain('Open the Cabinet');
  });

  it('renders one H1 before the tape, pulse, sculpture, and compact market board', async () => {
    const source = await read('src/app.jsx');
    const mounted = consumerRoot(source);
    const explorer = source.slice(
      source.indexOf('function ConsumerExplorer('),
      source.indexOf('function ConsumerHowItWorks('),
    );

    const mountedH1 = source.match(/<h1 id="consumer-explorer-title"/gu) ?? [];
    const masthead = source.slice(
      source.indexOf('function ConsumerCapitalHeader('),
      source.indexOf('function ConsumerMarketSection('),
    );
    expect(mountedH1, 'mounted consumer Registry h1').toHaveLength(1);
    expect(masthead).toContain('<header className="capital-masthead"');
    expect(masthead).toContain('<h1 id="consumer-explorer-title">Zodiac Capital Markets</h1>');
    expect(masthead).toContain('<MarketTape season={season} />');
    expect(masthead).toContain('className="capital-pulse"');
    expect(source).toContain('<ConsumerCapitalHeader />');
    expect(source.indexOf('<ConsumerCapitalHeader />')).toBeLessThan(source.indexOf('className="consumer-capital-opening"'));
    expect(source.indexOf('className="consumer-capital-opening"')).toBeLessThan(source.indexOf('<ConsumerResearchPulse />'));
    expect(source).toContain('id="official-twelve"');
    expect(explorer).toContain('aria-label="Interactive gallery of the twelve official Zodiac tokens"');
    // In stage mode the section is also the page's opening scene.
    expect(source).toContain("'consumer-explorer' + (stageMode ? ' consumer-explorer--stage' : '')");
    expect(source).toContain('data-consumer-sign=');
    expect(source).toContain('aria-pressed={isActive}');
    expect(source).toContain('tabIndex={isActive ? 0 : -1}');
    expect(source).toContain('data-consumer-preview');
    expect(source).toContain('data-consumer-live');
    expect(source).toContain('/assets/zodiac-icons/');
    expect(mounted).not.toContain('className="close__sigil"');
  });

  it('keeps builder detail out of the market-led consumer journey', async () => {
    const [source, html] = await Promise.all([
      read('src/app.jsx'),
      read('public/registry/index.html'),
    ]);
    const mounted = consumerRoot(source);
    const fallback = visibleMarkup(html);

    expect(mounted).not.toBe('');
    for (const component of [
      'PulseSection',
      'StandingsSection',
      'OnchainAccessSection',
      'ForBuildersSection',
      'BuiltWithZodiacsSection',
      'SdkSection',
      'SecuritySection',
    ]) {
      expect(mounted).not.toContain(`<${component}`);
    }
    for (const id of ['pulse', 'standings', 'onchain-access', 'builders', 'sdk', 'security']) {
      expect(fallback).not.toMatch(new RegExp(`id=["']${id}["']`, 'u'));
    }
    expect(fallback).not.toMatch(/Market snapshot|npm i @zodiacs\/sdk|Acquisition venues/iu);
  });

  it('uses plain verifier instructions and distinguishes official, unknown, and invalid input', async () => {
    const source = await read('src/app.jsx');

    for (const sentence of [
      'Check a Zodiac token address',
      'Paste the mint or contract address shown by a wallet or marketplace.',
      'Never paste a seed phrase.',
      'Official ',
      ' address on ',
      'This address isn’t in the official Zodiac list.',
      'That doesn’t look like a Solana or Base address.',
    ]) expect(source).toContain(sentence);
    expect(source).toContain('data-verifier-state=');
    expect(source).toContain('role="status"');
    expect(source).toContain('aria-live="polite"');
  });

  it('keeps the mounted and no-JavaScript first paint on the same non-cinematic identity', async () => {
    const [source, html] = await Promise.all([
      read('src/app.jsx'),
      read('public/registry/index.html'),
    ]);

    const visible = visibleMarkup(html);
    expect(source).not.toContain('function CineHero(');
    expect(source).not.toContain('className="cine__frame"');
    expect(visible).toContain('<h1 id="static-capital-title">Zodiac Capital Markets</h1>');
    expect(visible).toContain('Twelve signs. Twelve transferable tokens. One live public market.');
    expect(visible).not.toContain('The official Registry · Est. MMXXIV');
    expect(visible).not.toContain('Twelve signs. One register.');
    expect(visible).not.toContain('Astrofolio');
    expect(html).toContain('@media (prefers-reduced-motion: reduce)');
    expect(source).toContain('new IntersectionObserver');
  });

  it('mounts the sculpture stage on every capable viewport and keeps the bundle lazy', async () => {
    const source = await read('src/app.jsx');
    // Phones and desktops share the real stage whenever WebGL exists. The
    // flat carousel is now a capability fallback, not a width breakpoint.
    expect(source).toContain('return GALLERY_LIVE;');
    expect(source).not.toContain("window.matchMedia('(min-width: 1021px)')");
    expect(source).toContain("'/assets/gallery.js'");
    expect(source).toContain('carousel={!stageMode}');
    expect(source).not.toContain('data-consumer-gallery-toggle');
    expect(source).toContain('RAIL_PLACEHOLDER_HTML');
  });

  it('shows the current season as a gold sculpture, countdown, and progress instrument', async () => {
    const [source, html, bundle] = await Promise.all([
      read('src/app.jsx'),
      read('public/registry/index.html'),
      read('public/assets/app.js'),
    ]);

    const seasonNow = source.slice(
      source.indexOf('function SeasonNow({ season })'),
      source.indexOf("/* The placard's price"),
    );
    for (const marker of [
      'function SeasonNow({ season })',
      '<SeasonNow season={season} />',
      'Now in season',
      "remaining === 1 ? '' : 's'",
      'Date.UTC(year, month - 1, day)',
      'remaining: Math.max(0, total - day)',
    ]) expect(source).toContain(marker);
    expect(seasonNow).toContain('src={`/assets/sculptures/512/${sign.asset.sign}.webp`}');
    expect(seasonNow).toContain('className="season-now__progress season-now__progress-track"');
    expect(seasonNow).toContain('role="progressbar"');
    expect(seasonNow).toContain('aria-valuenow={day}');
    expect(seasonNow).not.toContain('useTwelveQuotes');
    expect(seasonNow).not.toContain('formatPriceUsd');
    expect(seasonNow).not.toContain('season-now__market-row');
    expect(seasonNow).not.toMatch(/\bprice\b/iu);
    expect(html).toContain('.season-now {');
    expect(html).toContain('.season-now__progress > span');
    for (const marker of ['season-now', 'Now in season', 'remaining']) {
      expect(bundle).toContain(marker);
    }
  });

  it('keeps the top market tape display-only and duplicates only for the visual loop', async () => {
    const source = await read('src/app.jsx');
    const tape = source.slice(
      source.indexOf('function MarketTape('),
      source.indexOf('function SeasonNow('),
    );
    const masthead = source.slice(
      source.indexOf('function ConsumerCapitalHeader('),
      source.indexOf('function ConsumerMarketSection('),
    );

    expect(tape).toContain('className="market-tape__viewport" aria-hidden="true"');
    expect(tape).toContain("{renderItems('primary')}");
    expect(tape).toContain("{renderItems('echo')}");
    expect(tape).toContain('data-market-tape-sign={item.asset.sign}');
    expect(tape).not.toContain('<button');
    expect(tape).not.toContain('<a ');
    expect(tape).not.toContain('onClick=');
    expect(tape).not.toContain('aria-pressed=');
    expect(masthead).toContain('<MarketTape season={season} />');
    expect(source.slice(source.indexOf('function GalleryBand('), source.indexOf('function VerifierSection(')))
      .not.toContain('<MarketTape');
  });

  it('lets the season materialize inside the scene without another framed card', async () => {
    const html = await read('public/registry/index.html');
    const seasonBase = html.slice(
      html.indexOf('.season-now {'),
      html.indexOf('.season-now__identity {'),
    );
    const controlPass = html.slice(html.indexOf('Registry control pass'));
    const seasonTransition = controlPass.slice(
      controlPass.indexOf('.season-now {'),
      controlPass.indexOf('.season-now__identity,'),
    );
    const railRule = controlPass.slice(
      controlPass.indexOf('.gband--consumer .rail {'),
      controlPass.indexOf('.gband--consumer .rail__tick img'),
    );

    expect(seasonBase).toContain('border: 0;');
    expect(seasonBase).toContain('border-radius: 0;');
    expect(seasonBase).toContain('background: transparent;');
    expect(seasonTransition).toContain('opacity: 1;');
    expect(seasonTransition).toContain('opacity 240ms cubic-bezier(0.23, 1, 0.32, 1) 50ms');
    expect(seasonTransition).toContain('transform 280ms cubic-bezier(0.23, 1, 0.32, 1) 50ms');
    expect(controlPass).toMatch(/@starting-style \{\s*\.season-now \{\s*opacity: 0;\s*transform: translateY\(7px\);/u);
    expect(controlPass).toMatch(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.consumer-registry \.season-now \{[\s\S]*?transition-property: opacity !important;/u);
    expect(railRule).toContain('border: 0;');
    expect(railRule).toContain('border-radius: 0;');
    expect(railRule).toContain('background: transparent;');
    expect(railRule).toContain('backdrop-filter: none;');
  });

  it('presents the selected sign with archived market context and two explicit doors', async () => {
    const source = await read('src/app.jsx');
    const mounted = consumerRoot(source);

    const placard = source.slice(
      source.indexOf('className="stage-placard"'),
      source.indexOf('className="stage-sheet"'),
    );
    expect(placard).toContain('className="stage-placard__name"');
    expect(placard).toContain('{signDateLabel(sign)}');
    expect(placard).toContain('<PlacardQuote sign={sign} />');
    expect(placard).toContain('<PlacardMarketPanel sign={sign} />');
    expect(placard).toContain('Buy {sign.name}');
    expect(placard).toContain('<span>Official record</span>');
    expect(placard).toContain('href={registryProfilePath(sign)}');
    // Flag-off the pill is the door to the catalogue page's own panel.
    expect(placard).toContain('href={`${registryProfilePath(sign)}#acquire`}');
    expect(mounted).toContain('<ConsumerMarketSection');
    expect(mounted).toContain('<ConsumerOutlookSection active={activeTicker} setActive={setActiveTicker} />');
  });

  it('says one thing about a sign, in one place, at every width', async () => {
    const source = await read('src/app.jsx');
    // Both flavours of the plate render the same placard and sheet — only
    // the artwork differs. The old editorial hero no longer sits above it.
    expect(source).toContain('function GalleryBand({ active, setActive, consumer = false, carousel = false })');
    for (const once of [
      'className="stage-placard"',
      '<PlacardQuote sign={sign} />',
      '<PlacardMarketPanel sign={sign} />',
    ]) {
      expect(source.split(once), once).toHaveLength(2);
    }
    expect(source).not.toContain('className="stage-hero__head"');
    expect(source).not.toContain('className="stage-hero__title"');
    expect(source).not.toContain('className="stage-hero__eyebrow"');
    expect(source).not.toContain('className="stage-hero__line"');
    // The flag-on and flag-off pill faces use the same explicit purchase verb.
    expect(source.split('Buy {sign.name}')).toHaveLength(3);
    expect(source).toContain('Acquisition Desk — buy {sign.name}');
    // The record card and its quote are gone; the placard carries the price.
    expect(source).not.toContain('function ConsumerSignPanel(');
    expect(source).not.toContain('data-token-quote');
    expect(source).not.toContain('className="consumer-preview"');
  });

  it('drops the second chain and the guide detour from the record box', async () => {
    const [source, html] = await Promise.all([
      read('src/app.jsx'),
      read('public/registry/index.html'),
    ]);
    // The landing is about a sign's official token on its native network. The
    // Base counterpart is a fact of the catalogue page, not of choosing; and
    // the astrology guide is a whole other wing.
    expect(source).not.toContain('Also recorded on Base');
    expect(source).not.toContain('astrology guide');
    expect(html).not.toContain('astrology guide');
    // Their styles go with them rather than lingering as dead selectors.
    for (const dead of [
      '.consumer-preview__base', '.consumer-preview__guide',
      '.consumer-preview__links', '.consumer-preview__trade',
    ]) {
      expect(html, dead).not.toContain(dead);
    }
  });

  it('opens on the gallery itself where the stage is live, film hero standing down', async () => {
    const source = await read('src/app.jsx');
    // The film and old title card are retired; the sculpture-led stage opens
    // the page without repeating the Registry lockup already in navigation.
    expect(source).not.toContain('<CineHero');
    expect(source).toContain('carousel={!stageMode}');
    expect(source).not.toContain('className="stage-hero__head"');
    expect(source).not.toContain('className="stage-hero__title"');
    expect(source).not.toContain('The Official Registry · Est.');
    expect(source).not.toContain('Twelve signs.<br />');
    // The placard says what a museum label says — name, dates, price — and
    // holds the two doors; everything longer waits in the sheet.
    expect(source).toContain('className="stage-placard"');
    expect(source).toContain('function PlacardQuote(');
    expect(source).toContain('<span>Official record</span>');
    // The sheet is a dialog portalled above the floating nav, and closing it
    // returns focus to the pill that opened it.
    expect(source).toContain('ReactDOM.createPortal');
    expect(source).toContain('aria-modal="true"');
    expect(source).toContain("if (event.key === 'Escape') {");
    expect(source).toContain('closeSheet();');
    expect(source).toContain('entry.node.inert = true;');
    expect(source).toContain("body.style.position = 'fixed';");
    expect(source).toContain('tradePillRef.current?.focus({ preventScroll: true });');
    // The compact season instrument belongs directly to the stage; the old
    // nested hero container does not.
    const plate = source.slice(source.indexOf('function GalleryBand('), source.indexOf('</section>', source.indexOf('function GalleryBand(')));
    expect(plate).toContain('<SeasonNow season={season} />');
    expect(plate).not.toContain('className="stage-hero__head"');
    expect(plate).toContain('className="gband__rail-top"');
  });

  it('opens the sheet on the thing the reader asked for', async () => {
    const source = await read('src/app.jsx');
    const sheet = source.slice(
      source.indexOf('className="stage-sheet__panel"'),
      source.indexOf('document.body,'),
    );
    // The panel names itself — disc, sign, and the venue it trades through —
    // so a second identity block above it would only push the trade down.
    expect(sheet).toContain('<LandingTrade sign={sign} />');
    expect(sheet).not.toContain('ConsumerSignPanel');
    expect(sheet).toContain('className="stage-sheet__record"');
    expect(sheet).toContain('The full record');
  });

  it('keeps the trade panel behind its flag and its own lazy bundle', async () => {
    const [source, html] = await Promise.all([
      read('src/app.jsx'),
      read('public/registry/index.html'),
    ]);
    // Flag-off the landing carries the door to the catalogue page's panel;
    // flag-on it carries the panel. Never a runtime read of the venue.
    expect(source).toContain('REGISTRY_TRADE_ENABLED');
    expect(source).toContain('data-landing-trade');
    expect(source).toContain("'/assets/trade.js'");
    expect(source).toContain("rootMargin: '400px 0px'");
    expect(html).toContain('<meta name="zodiacs-registry-trade-enabled" content="0" />');
    expect(html).not.toContain('/assets/trade.js');
  });

  it('ranks a compact market board before expanding all twelve, with one batched read', async () => {
    const [source, html] = await Promise.all([
      read('src/app.jsx'),
      read('public/registry/index.html'),
    ]);
    const visible = visibleMarkup(html);

    expect(source).toContain('<span className="consumer-section-head__eyebrow">Live market board</span>');
    expect(source).toContain('<h2 id="consumer-market-title">The twelve, ranked live.</h2>');
    expect(source).not.toContain('Live Zodiac market');
    expect(visible).toContain('<p class="static-site__eyebrow">Live market board</p>');
    expect(visible).toContain('<h2>The twelve, ranked live.</h2>');
    expect(source).toContain('const compactLimit = useCompactMarketLimit();');
    expect(source).toContain('window.matchMedia(query).matches ? 3 : 6');
    expect(source).toContain('setLimit(media.matches ? 3 : 6)');
    expect(source).toContain('const visibleRows = expanded ? rows : rows.slice(0, compactLimit);');
    expect(source).toContain("{expanded ? 'Show leaders only' : `Show all ${rows.length}`}");
    expect(source).toContain('aria-expanded={expanded}');
    expect(source).toContain('aria-controls="market-ranked-twelve"');
    expect(source).toContain('function loadTwelveMarketQuotes()');
    expect(source).toContain('https://api.dexscreener.com/tokens/v1/solana/');
    expect(source).toContain("marketCap: { label: 'Market cap'");
    expect(source).toContain("liquidity: { label: 'Indexed liquidity'");
    expect(source).toContain("change: { label: '24h move'");
    expect(source).toContain('if (av === null) return 1;');
    expect(source).toContain('marketCap: toFiniteNumber(pair.marketCap)');
    expect(source).toContain('fdv: toFiniteNumber(pair.fdv)');
    expect(source).toContain('market.liquidityUsd += liquidity;');
    expect(source).toContain("if (indexedPairs === 0) return unavailableMarketContext('no-pair');");
    expect(source).toContain('const MARKET_REFRESH_MS = 120_000;');
    expect(source).toContain('aria-label="Share snapshot"');
    expect(source).toContain('<MarketSocialIcon network="share" /><span>Share</span>');
    expect(source).toContain('function MarketSocialIcon({ network })');
    expect(source).toContain("['x', 'X']");
    expect(source).toContain("['telegram', 'Telegram']");
    expect(source).toContain("['whatsapp', 'WhatsApp']");
    expect(source).toContain("new URL('https://x.com/intent/post')");
    expect(source).toContain("new URL('https://t.me/share/url')");
    expect(source).toContain("new URL('https://wa.me/')");
    expect(source).toContain('aria-label={`Share on ${label}`}');
    expect(source).not.toContain('Post to X');
    expect(source).toContain("url.searchParams.set('rank', rankBy)");
    expect(source).toContain("url.searchParams.set('sign', activeSign.asset.sign)");
    expect(source).not.toContain('galleryFocusRequest');
    expect(source).not.toContain('showInGallery');
    expect(source).not.toContain('className="market-row__view');
    expect(source).not.toContain('market-glass');
    expect(source).toContain('className="registry-pill registry-pill--segment"');
    expect(source).toContain('className="registry-pill registry-pill--share market-board__share-primary"');
    expect(source).toContain('className="registry-pill registry-pill--icon market-board__social"');
    expect(source).toContain('className="market-row__record registry-pill registry-pill--record"');
    expect(source).toContain('<span className="market-row__record-label">Official record</span>');
    expect(source).toContain('aria-label={`Open the official ${item.name} record`}');
    expect(source).toContain("shared.searchParams.set('outlook', horizon)");
    expect(source).toContain("edition.date === utcToday");
    // The static fallback carries the crawlable twelve with truncated mints.
    expect(visible).toContain('The interactive edition ranks the twelve');
    expect((visible.match(/class="static-token-list"/gu) ?? [])).toHaveLength(1);
    expect(visible).toContain('Live figures and sharing appear with JavaScript');
  });

  it('keeps archived chart gaps honest and unlocks 7D and 30D only with enough observations', async () => {
    const source = await read('src/app.jsx');
    const chart = source.slice(
      source.indexOf('function MarketHistoryChart('),
      source.indexOf('function PlacardMarketPanel('),
    );

    expect(source).toContain("const REGISTRY_MARKET_HISTORY_URL = '/assets/data/registry-market-history.v1.json';");
    expect(chart).toContain("{ id: '7d', label: '7D', count: 7 }");
    expect(chart).toContain("{ id: '30d', label: '30D', count: 30 }");
    expect(chart).toContain('disabled={Number.isFinite(option.count) && pricedAvailable.length < option.count}');
    expect(chart).toContain('const priced = selected.filter(point => point.priceUsd !== null);');
    expect(chart).toContain('const calendarGap = index > 0');
    expect(chart).toContain('currentDay - previousDay !== 86_400_000');
    expect(chart).toContain('if (point.priceUsd === null || calendarGap)');
    expect(chart).toContain("'No archived price is available yet.'");
    expect(chart).toContain("'History is building from the first archived day.'");
    expect(chart).toContain('has ${priced.length} archived daily price observations');
    expect(chart).not.toMatch(/interpolat/iu);
  });

  it('publishes a source-separated Research Desk preview with five stable filters', async () => {
    const source = await read('src/app.jsx');
    const research = source.slice(
      source.indexOf('const RESEARCH_FILTERS'),
      source.indexOf('const OUTLOOK_SIGNAL_UI'),
    );
    const mounted = consumerRoot(source);

    for (const label of ['All', 'Zodiacs Research', 'Astrology News', 'Astronomy', 'Calendar']) {
      expect(research).toContain(`'${label}'`);
    }
    expect(research).toContain("item.sourceType === 'zodiacs-research'");
    expect(research).toContain("item.sourceType === 'astrology-news'");
    expect(research).toContain("item.sourceType === 'astronomy'");
    expect(research).toContain('External source · ${item.publisher}');
    expect(research).toContain('Zodiacs Research · Reviewed');
    expect(research).toContain('Independent headlines');
    expect(research).toContain('Open Markets Research');
    expect(source).toContain('function useQueuedRegistryNews(enabled)');
    expect(source).toContain('let acceptedRegistryNews = null;');
    expect(source).toContain('const pendingCount = incoming');
    expect(source).toContain('if (incoming) acceptRegistryNews(incoming);');
    expect(research).toContain('Show {external.pendingCount} new source update');
    expect(research).toContain('onClick={external.acceptUpdates}');
    expect(research).toContain('Sky facts, symbolic readings, and market observations remain separate.');
    expect(research).toContain('Symbolic research—not investment advice. Market observations never alter the sky score.');
    expect(research).toContain('.slice(0, 5)');
    expect(mounted.indexOf('<ConsumerResearchPulse />')).toBeGreaterThan(mounted.indexOf('className="consumer-capital-opening"'));
    expect(mounted.indexOf('<ConsumerResearchPulse />')).toBeLessThan(mounted.indexOf('<ConsumerHowItWorks />'));
    expect(mounted.indexOf('<ConsumerResearchSection active={activeTicker} />')).toBeGreaterThan(mounted.indexOf('<ConsumerHowItWorks />'));
  });

  it('turns astrology into a named, auditable three-step market-check path', async () => {
    const [source, html, bundle] = await Promise.all([
      read('src/app.jsx'),
      read('public/registry/index.html'),
      read('public/assets/app.js'),
    ]);
    const visible = visibleMarkup(html);
    const outlook = source.slice(
      source.indexOf('function ConsumerOutlookSection('),
      source.indexOf('function ConsumerExplorer('),
    );

    expect(outlook).toContain('<h2 id="consumer-outlook-title">Sky signals. <span className="it">Market checks.</span></h2>');
    expect(outlook.match(/className="outlook-flow__step /gu) ?? []).toHaveLength(3);
    for (const label of ['Sky factor', 'Sign signal', 'Market check']) {
      expect(outlook).toContain(`<span className="outlook-flow__label">${label}</span>`);
    }
    expect(outlook).not.toContain('outlook-dial');
    expect(outlook).toContain('<time dateTime={factor.at}>{formatOutlookEventMoment(factor.at)}</time>');
    expect(outlook).toContain('className="outlook-factor__impact"');
    expect(outlook).toContain('<summary>Show calculation</summary>');
    expect(outlook).toContain('<code>{factor.calculation}</code>');
    expect(html).toMatch(/\.outlook-factor__calculation summary \{[\s\S]*?min-height: 44px;/u);
    expect(outlook).toContain('Observed separately · never an input');
    expect(outlook).toContain('Market data never changes the astrology score.');
    expect(outlook).toContain('className="outlook-lab__stale" role="status"');
    expect(outlook).toContain('The research instrument is temporarily unavailable. Live markets and official records remain independent.');
    expect(outlook).toContain('className="outlook-lab__coverage" role="status"');
    expect(outlook).toContain('disabled={!outlook || !editionIsCurrent || !coverageComplete}>Share signal</button>');
    expect(outlook).toContain("scoreTone >= 12 ? 'Supportive' : scoreTone <= -12 ? 'Friction' : 'Neutral'");
    expect(source).toContain("const REGISTRY_OUTLOOK_URL = '/assets/registry-outlook.json';");
    expect(outlook).toContain("fetch(REGISTRY_OUTLOOK_URL, {\n          // Revalidate even a still-fresh response cached before this daily\n          // publication received its explicit max-age=0 delivery policy.\n          cache: 'no-cache',");
    expect(bundle).toContain("const REGISTRY_OUTLOOK_URL='/assets/registry-outlook.json';");
    expect(bundle).toContain("fetch(REGISTRY_OUTLOOK_URL,{cache:'no-cache',headers:{accept:'application/json'}})");
    expect(outlook).toContain('<a href={REGISTRY_OUTLOOK_URL}>Open the machine-readable edition ↗</a>');
    expect(visible).toContain('href="/assets/registry-outlook.json"');
    expect(source).not.toContain('className="outlook-challenge"');
    expect(source).not.toContain('Why no price arrow?');
    expect(visible).not.toContain('Why no price arrow?');
  });

  it('publishes a useful no-JavaScript technical record from the canonical addresses', async () => {
    const [registryRaw, html] = await Promise.all([
      read('public/registry/zodiacs.registry.json'),
      read('public/registry/technical/index.html'),
    ]);
    const registry = JSON.parse(registryRaw);
    const visible = visibleMarkup(html);

    expect(visible).toContain('data-registry-technical-fallback');
    expect((visible.match(/data-technical-sign(?:=|\s)/gu) ?? [])).toHaveLength(12);
    expect((visible.match(/data-technical-representation(?:=|\s)/gu) ?? [])).toHaveLength(24);
    for (const id of [
      'records-networks',
      'market-transparency',
      'access-third-parties',
      'builder-tools',
      'safety-evidence',
    ]) {
      expect(visible).toMatch(new RegExp(`id=["']${id}["']`, 'u'));
    }
    for (const heading of [
      'Records and networks',
      'Market and transparency',
      'Access and third parties',
      'Builders',
      'Safety and evidence',
    ]) expect(visible).toContain(heading);
    for (const asset of registry.assets) {
      expect(visible).toContain(asset.displayName);
      for (const representation of asset.representations) {
        expect(visible).toContain(representation.address);
      }
    }
  });

  it('maps every moved consumer hash to the matching technical destination', async () => {
    const source = await read('src/app.jsx');
    const start = source.indexOf('const LEGACY_TECHNICAL_HASHES');
    const end = source.indexOf('function Zodiacs()', start);
    const mapping = source.slice(start, end);
    for (const [legacy, destination] of movedHashes) {
      expect(mapping).toMatch(new RegExp(`["']?${legacy}["']?\\s*:\\s*["']${destination}["']`, 'u'));
    }
    expect(source).toContain('window.location.replace(`/registry/technical/');
  });

  it('uses image artwork instead of visible zodiac Unicode in both registry shells', async () => {
    const [consumer, technical] = await Promise.all([
      read('public/registry/index.html'),
      read('public/registry/technical/index.html'),
    ]);
    const zodiacUnicode = /[♈♉♊♋♌♍♎♏♐♑♒♓]/u;
    expect(visibleMarkup(consumer)).not.toMatch(zodiacUnicode);
    expect(visibleMarkup(technical)).not.toMatch(zodiacUnicode);
  });
});
