import { access, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(resolve(root, path), 'utf8');
const SIGNS = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
];
const SHOP_IMAGE_PATHS = [
  '/assets/astrofolio/merch/t-shirt-800.webp',
  '/assets/astrofolio/merch/cap-800.webp',
  '/assets/astrofolio/merch/hoodie-800.webp',
];
const EXPECTED_FAQS = [
  {
    q: 'What is Astrofolio?',
    a: 'Astrofolio is the collection of twelve official Zodiac tokens—one for each sign—with its own design and public Registry record.',
  },
  {
    q: 'How do I know a Zodiac is official?',
    a: 'Compare the complete token address with the published Registry. A name or ticker alone is not enough.',
  },
  {
    q: 'Why does each sign have Solana and Base addresses?',
    a: 'Each Zodiac began on Solana and has an official Base counterpart. Both verified addresses appear in the same Registry record.',
  },
  {
    q: 'Do I need a wallet to browse?',
    a: 'No. You can browse the collection, see market context, and verify addresses without connecting a wallet.',
  },
  {
    q: 'Where can I find Astrofolio merchandise?',
    a: 'Browse the Astrofolio Shop for clothing inspired by the twelve signs.',
  },
  {
    q: 'What are the risks?',
    a: 'Zodiac tokens are speculative and can be volatile or hard to sell. Prices can fall to zero, and wallet mistakes or scams can cause permanent loss.',
  },
  {
    q: 'What is Zodiac Markets?',
    a: 'Zodiac Markets is the trading interface for the Twelve. Jupiter Ultra supplies the executable route and transaction; your wallet reviews, approves, and signs.',
  },
  {
    q: 'What is the Terminal?',
    a: 'The Terminal is the market desk for all twelve Zodiacs, with live prices, liquidity, charts, season context, and research.',
  },
];
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
  const marker = html.indexOf(`id="${id}"`);
  expect(marker, `#${id} exists`).toBeGreaterThanOrEqual(0);
  const start = html.lastIndexOf('<section', marker);
  const end = html.indexOf('</section>', marker);
  expect(start, `#${id} is a section`).toBeGreaterThanOrEqual(0);
  expect(end, `#${id} closes`).toBeGreaterThan(marker);
  return html.slice(start, end + '</section>'.length);
}

function normalizedText(value) {
  return value
    .replace(/<br\s*\/?\s*>/giu, ' ')
    .replace(/<[^>]+>/gu, ' ')
    .replace(/&(?:rsquo|#39);/gu, "'")
    .replace(/&(?:ldquo|rdquo);/gu, '"')
    .replace(/&mdash;/gu, '—')
    .replace(/&amp;/gu, '&')
    .replace(/\s+/gu, ' ')
    .trim();
}

const PROHIBITED_CONSUMER_TERM = /\bsculptures?\b/iu;

function astrofolioConsumerSource(source) {
  const start = source.indexOf('    function ConsumerIdentityHeader(');
  const end = source.indexOf('\n    function TechnicalRecordsSection(', start);
  expect(start, 'Astrofolio consumer source begins').toBeGreaterThanOrEqual(0);
  expect(end, 'Astrofolio consumer source ends').toBeGreaterThan(start);
  return source
    .slice(start, end)
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/\/\/[^\n]*/gu, '')
    // These are implementation identifiers and asset directories, not copy.
    .replace(/SCULPTURE_PRESENTATION|renderSculpture|data-vitrine-sculpture/giu, '')
    .replace(/\/assets\/sculptures\//giu, '/assets/artwork/');
}

function staticConsumerCopy(html) {
  const title = html.match(/<title>([\s\S]*?)<\/title>/iu)?.[1] ?? '';
  const metadata = [...html.matchAll(/<meta\s+(?:name|property)="(?:description|og:title|og:description|og:image:alt|twitter:title|twitter:description|twitter:image:alt)"\s+content="([^"]*)"\s*\/?>/giu)]
    .map((match) => match[1]);
  const attributes = [...html.matchAll(/\s(?:alt|aria-label|title)="([^"]*)"/giu)]
    .map((match) => match[1]);
  const visibleBody = (html.match(/<body[^>]*>([\s\S]*?)<\/body>/iu)?.[1] ?? '')
    .replace(/<style\b[\s\S]*?<\/style>/giu, ' ')
    .replace(/<script\b[\s\S]*?<\/script>/giu, ' ')
    .replace(/<!--[\s\S]*?-->/gu, ' ');
  const schemas = [...html.matchAll(/<script type="application\/ld\+json">\s*([\s\S]*?)<\/script>/gu)]
    .map((match) => JSON.parse(match[1]));
  const schemaCopy = schemas.flatMap((document) => {
    const values = [];
    const visit = (value, key = '') => {
      if (typeof value === 'string') {
        if (['name', 'description', 'text', 'headline', 'alternativeHeadline', 'caption'].includes(key)) values.push(value);
        return;
      }
      if (Array.isArray(value)) {
        value.forEach((item) => visit(item, key));
        return;
      }
      if (value && typeof value === 'object') {
        Object.entries(value).forEach(([childKey, child]) => visit(child, childKey));
      }
    };
    visit(document);
    return values;
  });
  return normalizedText([title, ...metadata, ...attributes, normalizedText(visibleBody), ...schemaCopy].join(' '));
}

describe('Astrofolio consumer and Terminal market-desk split', () => {
  it('pins the indexed routes and their owner-directed names', async () => {
    const [consumer, pro] = await Promise.all([
      read('public/astrofolio/index.html'),
      read('public/terminal/index.html'),
    ]);

    expect(consumer).toContain('<link rel="canonical" href="https://zodiacs.org/astrofolio/" />');
    expect(consumer).toContain('<meta name="zodiacs-registry-view" content="terminal" />');
    expect(consumer).toContain('<title>Astrofolio · Choose your sign and see its official Zodiac token · Zodiacs.org</title>');
    expect(consumer).toContain('<meta property="og:title" content="Astrofolio · Zodiacs" />');
    expect(consumer).toContain('<meta name="twitter:title" content="Astrofolio · Zodiacs" />');
    expect(consumer).toContain('"position": 2, "name": "Astrofolio"');
    // Owner addendum 2026-08-31: Astrofolio carries the exchange marker,
    // committed off, for its flag-gated market-gateway venue-route entry.
    expect(consumer).toContain('<meta name="zodiacs-registry-exchange-enabled" content="0" />');
    expect(consumer).not.toMatch(/Zodiac Terminal(?: Pro)?/u);
    expect(consumer).not.toMatch(/<meta\s+name="robots"[^>]*noindex/u);

    expect(pro).toContain('<link rel="canonical" href="https://zodiacs.org/terminal/" />');
    expect(pro).toContain('<meta name="zodiacs-registry-view" content="terminal-pro" />');
    expect(pro).toContain('<meta name="zodiacs-registry-exchange-enabled" content="0" />');
    expect(pro).toContain('<title>Terminal · Live Prices, Liquidity &amp; Research · Zodiacs.org</title>');
    expect(pro).toContain('<meta property="og:title" content="Terminal · Zodiacs" />');
    expect(pro).toContain('<meta name="twitter:title" content="Terminal · Zodiacs" />');
    expect(pro).toContain('"position": 2, "name": "Terminal"');
    expect(pro).not.toMatch(/Zodiac Terminal(?: Pro)?/u);
    expect(pro).not.toMatch(/<meta\s+name="robots"[^>]*noindex/u);
  });

  it('keeps the prohibited visual-art term out of Astrofolio consumer copy', async () => {
    const [source, html] = await Promise.all([
      read('src/app.jsx'),
      read('public/astrofolio/index.html'),
    ]);

    // Internal transition hooks and the legacy asset directory remain stable;
    // this guard deliberately inspects copy, metadata, visible text, alt text,
    // ARIA labels, and structured-data text rather than matching raw files.
    expect(astrofolioConsumerSource(source)).not.toMatch(PROHIBITED_CONSUMER_TERM);
    expect(staticConsumerCopy(html)).not.toMatch(PROHIBITED_CONSUMER_TERM);
  });

  it('keeps the no-JS Astrofolio journey complete and in the locked order', async () => {
    const html = await read('public/astrofolio/index.html');
    ordered(html, [
      'id="official-twelve"',
      'id="market-snapshot"',
      'id="terminal"',
      'id="about"',
      'id="story"',
      'id="shop"',
      'id="collection"',
      'id="registry"',
      'id="verify"',
      'id="market-layer"',
      'id="faq"',
      'data-terminal-market-notice',
    ]);

    const opening = section(html, 'official-twelve');
    expect(normalizedText(opening)).toContain('Astrofolio Leo Season · The Twelve Choose your sign');
    expect(opening.match(/class="static-vitrine__choice"/gu)).toHaveLength(12);
    expect(opening.match(/data-static-sign="[a-z]+"/gu)).toHaveLength(12);
    expect(opening).toContain('id="astrofolio-aries" checked');
    expect(opening).toContain('<h2 id="static-aries-title">Aries</h2>');
    ordered(opening, [
      '<h2 id="static-aries-title">Aries</h2>',
      'class="static-vitrine__price"',
      'class="static-vitrine__actions"',
      '<p class="static-vitrine__dates">March 21 to April 19</p>',
    ]);
    expect(opening).toContain('<span class="static-vitrine__figure">Price unavailable</span>');
    expect(opening).toContain('<span class="static-vitrine__movement">movement unavailable</span>');
    expect(opening).toContain('href="/registry/aries/">Explore Aries</a>');
    expect(opening).toContain('href="https://fomo.family/coin?address=GhFiFrExPY3proVF96oth1gESWA5QPQzdtb8cy8b1YZv&amp;chainId=1399811149"');
    expect(opening).toContain('src="/assets/venues/fomo-official.svg"');
    expect(opening).toContain('data-fomo-buy="aries"');
    expect(opening).toContain('href="/astrofolio/how-to-buy/aries/">Other ways to buy</a>');
    expect(opening).not.toContain('href="/terminal/');
    expect(opening).not.toContain('/registry/aries/#acquire');
    expect(html).not.toMatch(/href="[^"]*jup\.ag/iu);
    expect(opening).not.toMatch(/aggregate|market cap|indexed liquidity|volume|tape/iu);

    const howToBuyLinks = html.match(/href="\/astrofolio\/how-to-buy\/[a-z]+\/"/gu) ?? [];
    expect(howToBuyLinks).toHaveLength(12);
    expect(html.match(/data-fomo-buy="[a-z]+"/gu)).toHaveLength(12);
    expect(opening.match(/<small>[A-Z][a-z]+ <span class="btn--fomo__zodiac-emoji" aria-hidden="true">[♈-♓]️<\/span><\/small><strong>Buy with Fomo<\/strong>/gu)).toHaveLength(12);
    expect(opening).not.toContain(' selected</small>');
    expect(html.match(/href="https:\/\/fomo\.family\/coin\?address=[^"&]+&amp;chainId=1399811149"/gu)).toHaveLength(12);
    expect(html).not.toMatch(/href="\/terminal\/\?sign=[a-z]+#selected"/gu);
    const marketGateway = section(html, 'market-layer');
    expect(marketGateway.match(/href="\/registry\/technical\/#market-transparency"/gu)).toHaveLength(1);
    expect(marketGateway.match(/href="\/terminal\/\?rank=marketCap"/gu)).toHaveLength(1);
    expect(normalizedText(marketGateway)).toContain("Latest market snapshot Who's leading today?");
    expect(normalizedText(marketGateway)).toContain('The latest available snapshot ranks the Twelve by reported market cap.');
    expect(marketGateway).toContain('role="list" aria-label="Zodiac market-cap leaderboard"');
    expect(marketGateway.match(/<li(?:\s|>)/gu)).toHaveLength(12);
    expect(marketGateway.match(/class="consumer-market-leaderboard__icon"/gu)).toHaveLength(12);
    expect(marketGateway.match(/\/assets\/zodiac-icons\/48\/[a-z]+\.avif/gu)).toHaveLength(12);
    expect(marketGateway.match(/\/assets\/zodiac-icons\/48\/[a-z]+\.webp/gu)).toHaveLength(12);
    expect(marketGateway.match(/width="34" height="34"/gu)).toHaveLength(12);
    expect(html).not.toContain('See market details');
    expect(html).not.toContain('class="static-terminal-gateway"');
    const shop = section(html, 'shop');
    for (const href of [
      'https://shop.app/m/41mzeq7f2h',
      'https://shop.app/products/9655740694871/astrofolio-t-shirt',
      'https://shop.app/products/9654676455767/astrofolio-cap',
      'https://shop.app/products/9654762504535/astrofolio-hoodie',
    ]) {
      expect(shop).toContain(`href="${href}"`);
    }
    for (const image of SHOP_IMAGE_PATHS) {
      expect(shop).toContain(`src="${image}"`);
      await expect(access(resolve(root, `public${image}`))).resolves.toBeUndefined();
    }
    expect(shop).not.toContain('cdn.shopify.com');
    expect(html).not.toContain('data-terminal-preference-banner');

    const registry = section(html, 'registry');
    expect(normalizedText(registry)).toContain('Names and symbols can be copied. The Registry identifies each official Zodiac by its complete token address.');
    expect(normalizedText(registry)).toContain("Open the verified list, then use your browser's Find command to search for the complete address. Never paste a recovery phrase.");
    expect(registry).toContain('id="verify"');
    expect(registry).toContain('class="consumer-destinations__card static-verifier"');
    expect(registry).toContain('href="/registry/">Browse all twelve records');
    expect(registry).toContain('href="/registry/zodiacs.registry.json">Open the verified address list');
  });

  it('pins the hydrated consumer composition in the same order', async () => {
    const source = await read('src/app.jsx');
    const start = source.indexOf('<main id="main" className="zd consumer-registry">');
    const mounted = source.slice(start, source.indexOf('</main>', start));
    ordered(mounted, [
      '<ConsumerExplorer',
      '<ConsumerIntroduction />',
      '<ConsumerStory />',
      '<ConsumerShop />',
      '<ConsumerCabinet />',
      '<ConsumerRegistryGuide sign={sign} />',
      '<ConsumerMarketGateway batch={consumerMarket} activeTicker={activeTicker} />',
      '<ConsumerFaq />',
      '<MarketVenueNotice />',
    ]);
    expect(source.slice(source.indexOf('</main>', start))).toContain(
      '<SiteEnd tagline="The official public Registry of the Twelve." />',
    );
    expect(source).toContain('<span id="market-snapshot" className="terminal-compat-target" aria-hidden="true" />');
    expect(source).toContain('<span id="terminal" className="terminal-compat-target" aria-hidden="true" />');
    expect(mounted).not.toMatch(/ConsumerMarketSnapshot|ConsumerTerminalStrip|ConsumerMarketSection|ConsumerMarketBriefing|MarketTape|StandingsSection|PulseSection|ProMarketsGateway/gu);
  });

  it('builds the first screen as an accessible, interruptible Lit Vitrine', async () => {
    const source = await read('src/app.jsx');
    const identity = functionBlock(source, 'ConsumerIdentityHeader');
    const rail = functionBlock(source, 'VitrineDiscRail');
    const layers = functionBlock(source, 'useConsumerSelectionLayers');
    const explorer = functionBlock(source, 'ConsumerExplorer');
    const placard = functionBlock(source, 'VitrinePlacard');

    expect(normalizedText(identity)).toContain('Astrofolio {season.name} Season · The Twelve Choose your sign');
    expect(identity).not.toContain('<TerminalViewLink');
    expect(explorer).toContain('className="consumer-explorer astrofolio-vitrine"');
    expect(explorer).toContain('aria-label="Astrofolio sign collection"');
    expect(explorer).toContain('/assets/sculptures/512/${layer.slug}.webp');
    expect(explorer).toContain('data-vitrine-stage');
    expect(explorer).toContain('{layers.map(renderSculpture)}');
    expect(rail).toContain('role="group" aria-label="Choose your zodiac sign"');
    expect(rail).toContain('ArrowRight: Math.min(SIGNS.length - 1, activeIndex + 1)');
    expect(rail).toContain('ArrowLeft: Math.max(0, activeIndex - 1)');
    expect(rail).toContain('Home: 0');
    expect(rail).toContain('End: SIGNS.length - 1');
    expect(rail).toContain('tabIndex={selected ? 0 : -1}');
    expect(rail).toContain('aria-pressed={selected}');
    expect(rail).toContain("trackAnalytics('registry_sign_selected', { sign: next.asset.sign, source: 'consumer_explorer' })");
    expect(rail).toContain("url.searchParams.set('sign', next.asset.sign)");
    expect(rail).toContain("window.history.replaceState(null, '', `${url.pathname}?${url.searchParams}${url.hash}`)");
    expect(layers).toContain("matchMedia('(prefers-reduced-motion: reduce)')");
    expect(layers).toContain('pendingIdRef.current = id');
    expect(layers).toContain('const markLayerReady = useCallback((id) =>');
    expect(layers).toContain('current.filter((layer) => layer.ready)');
    expect(layers).toContain('layer.id === id ? { ...layer, ready: true } : layer');
    expect(layers).toContain('transitionIdRef.current = null');
    expect(layers).toContain('if (transitionIdRef.current !== id) return');
    expect(layers).toContain('setTransitionId(id)');
    expect(layers).toContain('if (transitionId === null) return undefined');
    expect(layers).toContain('window.clearTimeout(timerRef.current)');
    expect(layers).toContain('window.setTimeout(() => settleLayer(transitionId), 240)');
    expect(explorer).toContain("event.propertyName === 'opacity'");
    expect(explorer).toContain('const decoded = image.decode?.()');
    expect(explorer).toContain('decoded.then(() => markLayerReady(layer.id), () => markLayerReady(layer.id))');
    expect(explorer).toContain("image.src = `/assets/sculptures/512/${layer.slug}.webp`");
    expect(explorer).toContain("image.src = `/assets/cabinet-materials/gold/${layer.slug}.webp`");
    expect(explorer).toContain('markLayerFailed(layer.id)');
    expect(explorer).toContain('vitrine-stage__fallback');
    expect(explorer).toContain('`${item.name} Zodiac artwork`');
    expect(explorer).toContain('`${item.name} artwork unavailable; ${item.symbol} symbol shown`');
    expect(explorer).toContain("'--vitrine-stage-height': `${desktopStageHeight}px`");
    expect(placard).toContain('{layers.map(renderLayer)}');
    expect(placard).toContain('Explore {item.name}');
    expect(placard).toContain('marketRankForSign(item, batch)');
    expect(placard).toContain('Data &amp; methodology');
    expect(placard).toContain('howToBuyPath(item)');
    expect(placard).toContain('fomoBuyPath(item)');
    expect(placard).toContain('/assets/venues/fomo-official.svg');
    expect(placard).toContain('<small>{item.name} <span className="btn--fomo__zodiac-emoji" aria-hidden="true">{zodiacEmoji(item)}</span></small><strong>Buy with Fomo</strong>');
    expect(functionBlock(source, 'zodiacEmoji')).toContain("`${symbol}\\uFE0F`");
    expect(placard).not.toContain(' selected</small>');
    expect(placard).toContain('>Other ways to buy</a>');
    expect(placard).toContain('<span>Opens the Fomo app</span>');
    expect(placard).toContain("trackAnalytics('astrofolio_fomo_open'");
    expect(placard).not.toContain('/terminal/');
    expect(placard).not.toContain('className="vitrine-official-note"');
    expect(placard).not.toContain('&ldquo;official&rdquo; means the address is listed in the Zodiacs Registry');
    ordered(placard, [
      'className="vitrine-placard__actions"',
      'className="vitrine-market-meta"',
      'consumerSignDateLabel(item)',
    ]);
    expect(source).not.toContain('function terminalMarketPath(');
    expect(source).not.toContain('function zodiacMarketsPath(');
    expect(placard).not.toContain('#acquire');
  });

  it('uses query, saved sign, then current season without saving ordinary selection', async () => {
    const source = await read('src/app.jsx');
    const rootBlock = functionBlock(source, 'Zodiacs');
    ordered(rootBlock, [
      "new URLSearchParams(window.location.search).get('sign')",
      "window.localStorage.getItem('zodiacs:today-sun-sign:v1')",
      'currentSeason()?.sign.ticker',
    ]);
    expect(functionBlock(source, 'ConsumerExplorer')).not.toContain('localStorage.setItem');
    expect(functionBlock(source, 'VitrineDiscRail')).not.toContain('localStorage.setItem');
    expect(rootBlock).not.toContain("window.localStorage.setItem('zodiacs:today-sun-sign:v1'");
  });

  it('uses one first-screen market read and keeps market context inside the placard', async () => {
    const source = await read('src/app.jsx');
    const rootBlock = functionBlock(source, 'Zodiacs');
    const placard = functionBlock(source, 'VitrinePlacard');
    const marketGateway = functionBlock(source, 'ConsumerMarketGateway');
    expect(rootBlock).toContain('const consumerMarket = useTwelveQuotes(!technical && !pro);');
    expect(rootBlock.match(/const consumerMarket = useTwelveQuotes\(!technical && !pro\);/gu)).toHaveLength(1);
    expect(rootBlock.match(/batch=\{consumerMarket\}/gu)).toHaveLength(2);
    expect(rootBlock).toContain('<ConsumerExplorer');
    expect(rootBlock).toContain('<ConsumerMarketGateway batch={consumerMarket} activeTicker={activeTicker} />');
    expect(placard).not.toContain('useTwelveQuotes(');
    expect(marketGateway).not.toContain('useTwelveQuotes(');
    expect(placard).toContain('<VitrinePrice sign={item} batch={batch} live={layer.current} />');
    expect(placard).toContain('marketRankForSign(item, batch)');
    expect(placard).toContain('Data &amp; methodology');
    expect(placard).not.toContain('/terminal/');
    expect(placard).not.toContain('className="vitrine-official-note"');
    expect(source).not.toContain('function ConsumerMarketSnapshot(');
    expect(source).not.toContain('<summary>See market details</summary>');

    const movement = functionBlock(source, 'plainMarketMovement');
    expect(movement).toContain("up ${formatPercent(movement).replace('+', '')} today");
    expect(movement).toContain("down ${formatPercent(Math.abs(movement)).replace('+', '')} today");
    expect(movement).toContain("return 'unchanged today'");
    expect(movement).toContain("return 'movement unavailable'");
    const vitrinePrice = functionBlock(source, 'VitrinePrice');
    expect(vitrinePrice).toContain("change > 0 ? 'up' : change < 0 ? 'down' : 'flat'");
    expect(vitrinePrice).toContain('className={`vitrine-price__movement is-${direction}`}');

    const fallback = await read('public/astrofolio/index.html');
    expect(fallback).toContain('<span id="market-snapshot" class="terminal-compat-target" aria-hidden="true"></span>');
    expect(fallback).not.toContain('class="static-snapshot"');
  });

  it('does not insert defensive purchase copy into the Astrofolio journey', async () => {
    const source = await read('src/app.jsx');
    const fallback = await read('public/astrofolio/index.html');
    const removed = [
      'If you want to go further',
      'Most people stop at browsing, and that is fine.',
      'Astrofolio.xyz is a separate website.',
      'Zodiacs.org does not take payment or complete purchases.',
      'Can I buy a Zodiac on Zodiacs.org?',
    ];
    for (const copy of removed) {
      expect(source, copy).not.toContain(copy);
      expect(fallback, copy).not.toContain(copy);
    }
    expect(source).not.toContain('function ConsumerBuyGuide(');
    expect(fallback).not.toContain('id="buying-guide"');
    expect(fallback).not.toContain('href="#buying-guide"');
    expect(fallback).toContain('href="/astrofolio/">Astrofolio</a>');
    expect(fallback).not.toContain('href="https://astrofolio.xyz/"');
  });

  it('keeps the collection story, Shop, Registry guide, leaderboard, and FAQs exact', async () => {
    const source = await read('src/app.jsx');
    const introduction = functionBlock(source, 'ConsumerIntroduction');
    expect(introduction).toContain('id="what-is-astrofolio"');
    expect(introduction).toContain('<h2 id="consumer-intro-title">Twelve signs. One collection.</h2>');
    expect(introduction).toContain('Astrofolio brings the twelve official Zodiac tokens into one place.');
    expect(introduction).toContain('One public Registry');

    const story = functionBlock(source, 'ConsumerStory');
    expect(story).toContain('id="thesis" className="consumer-story reveal"');
    expect(story).toContain('Symbol · record · identity');
    expect(story).toContain('<h2 id="consumer-story-title">The story behind the collection.</h2>');
    expect(story).toContain('<span className="consumer-purpose__cta consumer-story__cta"><span>Read the story</span><span className="consumer-purpose__arrow" aria-hidden="true">→</span></span>');

    const shop = functionBlock(source, 'ConsumerShop');
    expect(shop).toContain('id="shop" className="consumer-shop reveal"');
    expect(shop).toContain('<h2 id="consumer-shop-title">Wear your sign.</h2>');
    expect(shop).toContain('href="https://shop.app/m/41mzeq7f2h" rel="noopener noreferrer external"');
    expect(shop).toContain('{ASTROFOLIO_SHOP_PRODUCTS.map((product, index) =>');
    const shopProductsStart = source.indexOf('    const ASTROFOLIO_SHOP_PRODUCTS = Object.freeze([');
    const shopProducts = source.slice(shopProductsStart, source.indexOf('\n    function ConsumerShop(', shopProductsStart));
    for (const href of [
      'https://shop.app/products/9655740694871/astrofolio-t-shirt',
      'https://shop.app/products/9654676455767/astrofolio-cap',
      'https://shop.app/products/9654762504535/astrofolio-hoodie',
    ]) {
      expect(shopProducts).toContain(`href: '${href}'`);
    }
    for (const image of SHOP_IMAGE_PATHS) {
      expect(shopProducts).toContain(`image: '${image}'`);
    }
    expect(shopProducts).not.toContain('cdn.shopify.com');

    expect(source).not.toContain('function ConsumerTerminalStrip(');
    expect(functionBlock(source, 'VitrinePlacard')).toContain('>Other ways to buy</a>');
    expect(functionBlock(source, 'VitrinePlacard')).toContain('href={fomoBuyPath(item)}');
    expect(functionBlock(source, 'VitrinePlacard')).not.toContain('/terminal/');
    const marketGateway = functionBlock(source, 'ConsumerMarketGateway');
    expect(marketGateway).toContain('id="market-layer"');
    expect(marketGateway).toContain('<h2 id="consumer-market-gateway-title">Who&rsquo;s leading today?</h2>');
    expect(marketGateway).toContain('<ol role="list" aria-label="Zodiac market-cap leaderboard">');
    expect(marketGateway).toContain('.sort((left, right) =>');
    expect(marketGateway).toContain('return right.marketCap - left.marketCap || left.item.order - right.item.order;');
    expect(marketGateway).toContain('{rows.map(({ item, marketCap, change }, index) =>');
    expect(marketGateway).toContain('formatUsdCompact(marketCap)');
    expect(marketGateway).toContain("batch.stale ? 'Delayed'");
    expect(marketGateway).toContain('batch.quotes?.[item.asset.sign]');
    expect(marketGateway).toContain('href="/registry/technical/#market-transparency"');
    expect(marketGateway).toContain('<span>How ranking works</span>');
    expect(marketGateway).toContain('href="/terminal/?rank=marketCap"');
    expect(marketGateway).toContain('<span>View full market</span>');
    expect(marketGateway).toContain('Market data comes from an independent index');
    expect(marketGateway).toContain('className="consumer-market-leaderboard__icon"');
    expect(marketGateway).toContain('/assets/zodiac-icons/48/${item.asset.sign}.avif');
    expect(marketGateway).toContain('/assets/zodiac-icons/48/${item.asset.sign}.webp');
    expect(marketGateway).toContain('width="34" height="34"');

    const marketLoader = functionBlock(source, 'loadTwelveMarketQuotes');
    expect(marketLoader).toContain('isPinnedPairForSign(pair, sign)');
    expect(marketLoader).toContain('latest/dex/pairs/solana/${missingPairIds.join(\',\')}');
    expect(marketLoader).toContain('const pair = configured');
    expect(marketLoader).toContain('pinnedPairsBySign.get(sign.asset.sign) || null');
    expect(marketLoader).not.toContain('configured ? market?.bestPair');
    const pinnedValidator = functionBlock(source, 'isPinnedPairForSign');
    expect(pinnedValidator).toContain('pair?.pairAddress === config.pairId');
    expect(pinnedValidator).toContain('pair?.baseToken?.address === mint');
    expect(pinnedValidator).toContain('pair?.quoteToken?.address === SOLANA_WRAPPED_SOL_MINT');
    const marketParser = functionBlock(source, 'parseMarketContextPayload');
    expect(marketParser).not.toContain('|| pairs[0]');

    const cabinet = functionBlock(source, 'ConsumerCabinet');
    expect(cabinet).toContain('id="cabinet" className="consumer-cabinet-section reveal"');
    expect(cabinet).toContain('<h2 id="consumer-cabinet-title">Cabinet of Twelve</h2>');
    expect(cabinet).toContain('<span>Open the Cabinet</span><span className="consumer-purpose__arrow"');
    expect(cabinet).toContain('{SIGNS.map((item, index) =>');
    expect(cabinet).toContain("aries: { finish: 'crown', numeral: 'V', count: '×12' }");
    expect(cabinet).toContain("aquarius: { finish: 'gold', numeral: 'IV', count: '×3' }");

    const verifier = functionBlock(source, 'ConsumerVerifier');
    expect(verifier).toContain('function ConsumerVerifier({ embedded = false })');
    expect(verifier).toContain("const Wrapper = embedded ? 'div' : 'section'");
    expect(verifier).toContain("(embedded ? ' is-embedded' : '')");
    expect(verifier).toContain('<h3 id="consumer-verify-title">Verify an address</h3>');
    expect(verifier).toContain('Check a Zodiac token address');
    expect(verifier).toContain('Paste the token address shown where you found it. We&rsquo;ll tell you whether it appears in the verified list. Never paste a recovery phrase.');
    expect(verifier).toContain('This checks a token address, not a personal account.');
    expect(verifier).not.toContain('This checker only shows information. It cannot move money or approve anything.');
    expect(verifier).not.toContain('vrf__examples');
    expect(verifier).not.toContain('mono');
    const registry = functionBlock(source, 'ConsumerRegistryGuide');
    expect(registry).toContain('id="registry" className="consumer-registry-guide reveal"');
    expect(registry).toContain('<h2 id="consumer-registry-title">Know you have the official Zodiac.</h2>');
    expect(registry).toContain('<ConsumerVerifier embedded />');
    expect(registry).toContain('Open the complete {sign.name} record');
    const faqStart = source.indexOf('    const CONSUMER_FAQS = [');
    const faqSource = source.slice(faqStart, source.indexOf('    function ConsumerFaq(', faqStart));
    expect(faqSource.match(/\n\s*q:/gu)).toHaveLength(EXPECTED_FAQS.length);
    ordered(faqSource, [
      "q: 'Where can I find Astrofolio merchandise?'",
      "q: 'What are the risks?'",
      "q: 'What is Zodiac Markets?'",
      "q: 'What is the Terminal?'",
    ]);
    const fallback = await read('public/astrofolio/index.html');
    const staticFaq = section(fallback, 'faq');
    expect(staticFaq.match(/<details\s+class="consumer-faq__item">/gu)).toHaveLength(EXPECTED_FAQS.length);
    ordered(staticFaq, [
      '<summary>Where can I find Astrofolio merchandise?</summary>',
      '<summary>What are the risks?</summary>',
      '<summary>What is Zodiac Markets?</summary>',
      '<summary>What is the Terminal?</summary>',
    ]);
    for (const item of EXPECTED_FAQS) {
      expect(faqSource).toContain(`q: '${item.q}'`);
      expect(faqSource).toContain(`a: '${item.a}'`);
      expect(normalizedText(staticFaq)).toContain(`${item.q} ${item.a}`);
    }
    const schemaDocuments = [...fallback.matchAll(/<script type="application\/ld\+json">\s*([\s\S]*?)<\/script>/gu)]
      .map((match) => JSON.parse(match[1]));
    const schemaFaq = schemaDocuments
      .flatMap((document) => document['@graph'] ?? [document])
      .find((node) => node['@type'] === 'FAQPage');
    expect(schemaFaq.mainEntity.map((item) => ({
      q: item.name,
      a: item.acceptedAnswer.text,
    }))).toEqual(EXPECTED_FAQS);

    expect(source).not.toContain('function ConsumerClosing(');
    expect(fallback).not.toContain('<section class="static-astrofolio-closing"');
    expect(functionBlock(source, 'TerminalViewLink')).toContain("{pro ? 'Open the Terminal' : 'Astrofolio'}");
    expect(functionBlock(source, 'SiteEnd')).not.toContain('shop.astrofolio.xyz');
    const staticFooter = fallback.slice(fallback.indexOf('<footer class="zfooter zfooter--compact">'), fallback.indexOf('</footer>', fallback.indexOf('<footer class="zfooter zfooter--compact">')));
    expect(staticFooter).not.toContain('shop.astrofolio.xyz');
    expect(source).not.toContain('function ConsumerPreferenceBanner(');
    expect(source).not.toContain('data-terminal-preference-banner');
    expect(source).not.toContain('TERMINAL_PRO_BANNER_DISMISSED_KEY');
  });

  it('keeps consumer navigation on Astrofolio and market depth on Terminal', async () => {
    const source = await read('src/app.jsx');
    const header = functionBlock(source, 'Header');
    expect(header).toContain("const terminalNav = {");
    expect(header).toContain("href: '/astrofolio/'");
    expect(header).toContain("label: 'Astrofolio'");
    expect(header).toContain("description: 'Choose a sign and explore the collection'");
    expect(header).not.toContain("label: 'Terminal'");

    const proStart = source.indexOf('<main id="main" className="zd terminal-pro">');
    const proMounted = source.slice(proStart, source.indexOf('</main>', proStart));
    ordered(proMounted, [
      '<ProMasthead batch={proMarket} />',
      '<ProSelectedSign sign={sign} batch={proMarket} />',
      '<ProMarketBoard active={activeTicker} setActive={setActiveTicker} batch={proMarket} />',
      '<ProMarketsGateway sign={sign} />',
      '<ConsumerMarketBriefing active={activeTicker} sharedMarket={proMarket} />',
      '<ProResearchSection sign={sign} />',
      '<ProVerifierLink sign={sign} />',
      '<MarketVenueNotice />',
    ]);
    expect(source.slice(source.indexOf('</main>', proStart))).toContain(
      '<SiteEnd tagline="Live market context, anchored to verified public records." />',
    );
    expect(functionBlock(source, 'ProMasthead')).toContain('<h1 id="pro-terminal-title">Terminal</h1>');
    expect(source).toContain('const proMarket = useTwelveQuotes(pro);');
  });

  it('preserves view-switch analytics enums and resilient storage', async () => {
    const source = await read('src/app.jsx');
    const link = functionBlock(source, 'TerminalViewLink');
    const remember = functionBlock(source, 'rememberTerminalView');
    expect(link).toContain("const direction = pro ? 'consumer_to_pro' : 'pro_to_consumer'");
    expect(link).toContain('data-terminal-view-link={view}');
    expect(link).not.toMatch(/role=["']switch/gu);
    expect(remember).toContain('window.localStorage.setItem(TERMINAL_VIEW_STORAGE_KEY, view)');
    expect(remember).toMatch(/try \{[\s\S]*?\} catch/gu);
    expect(remember).toContain("trackAnalytics('terminal_view_switch', { surface, direction })");
  });

  it('keeps legacy market intent mapped to the canonical Terminal URL', async () => {
    const source = await read('src/app.jsx');
    expect(source).toContain("market: 'market'");
    expect(source).toContain("briefing: 'briefing'");
    expect(source).toContain("research: 'research'");
    expect(source).toContain("outlook: 'briefing'");
    expect(source).toContain('window.location.replace(`/terminal/${clean.size ? `?${clean}` : \'\'}#${proDestination}`)');
    const html = await read('public/astrofolio/index.html');
    for (const id of ['market', 'briefing', 'research', 'outlook']) {
      expect(html).toContain(`<span id="${id}" class="terminal-compat-target" aria-hidden="true"></span>`);
    }
  });

  it('leaves technical Registry instruments on the technical branch', async () => {
    const source = await read('src/app.jsx');
    const start = source.indexOf('<main id="main" className="zd technical-registry">');
    const mounted = source.slice(start, source.indexOf('</main>', start));
    expect(mounted).toContain('<PulseSection />');
    expect(mounted).toContain('<StandingsSection />');
    const standings = functionBlock(source, 'StandingsSection');
    expect(standings).toContain('entry?.capturedAt || dist?.capturedAt');
    expect(standings).toContain('Each sign keeps its own');
    expect(standings).toContain('Token accounts are');
    expect(standings).toContain('not verified people or unique wallet owners');
    expect(standings).not.toContain('wallet concentration is lower');
  });
});
