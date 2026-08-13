import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(resolve(root, path), 'utf8');
const SIGNS = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
];
const SUPPORT_COPY = "Each sign has one gold sculpture and one official token. See yours, with today's price and a simple guide to buying it.";
const RISK_COPY = 'Zodiac tokens are speculative, thinly traded digital assets. Prices can be volatile, liquidity may disappear, and you could lose all money used to acquire one. Astrology has no established predictive relationship with asset prices.';

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
    .replace(/&amp;/gu, '&')
    .replace(/\s+/gu, ' ')
    .trim();
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
    expect(consumer).not.toContain('zodiacs-registry-exchange-enabled');
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

  it('keeps the no-JS Astrofolio journey complete and in the locked order', async () => {
    const html = await read('public/astrofolio/index.html');
    ordered(html, [
      'id="official-twelve"',
      'id="buy"',
      'id="market-snapshot"',
      'id="registry"',
      'id="verify"',
      'id="thesis"',
      'id="faq"',
      'class="static-astrofolio-closing"',
      'data-terminal-market-notice',
    ]);

    const opening = section(html, 'official-twelve');
    expect(normalizedText(opening)).toContain(`Astrofolio The Twelve Official Zodiacs Choose your sign ${SUPPORT_COPY}`);
    expect(opening.match(/class="static-vitrine__choice"/gu)).toHaveLength(12);
    expect(opening.match(/data-static-sign="[a-z]+"/gu)).toHaveLength(12);
    expect(opening).toContain('id="astrofolio-leo" checked');
    expect(opening).toContain('<h2 id="static-leo-title">Leo</h2><p class="static-vitrine__dates">July 23 to August 22</p>');
    expect(opening).toContain('<span class="static-vitrine__figure">Price unavailable</span>');
    expect(opening).toContain('<span class="static-vitrine__movement">movement unavailable</span>');
    expect(opening).toContain('>See Leo</a>');
    expect(opening).toContain('>How to buy Leo</a>');
    expect(opening).toContain('>View official record</a>');
    expect(opening).not.toMatch(/aggregate|market cap|indexed liquidity|volume|tape/iu);

    const marketLinks = html.match(/href="\/terminal\/(?:\?[^"#]*)?"/gu) ?? [];
    expect(marketLinks).toHaveLength(1);
    expect(html).toContain('<a href="/terminal/" data-terminal-static-view="pro">Market view</a>');
    expect(html).not.toContain('data-terminal-preference-banner');

    const verifier = section(html, 'verify');
    expect(normalizedText(verifier)).toContain('Compare the mint or contract address shown by a wallet or marketplace with the official list. Never paste a seed phrase.');
    expect(normalizedText(verifier)).toContain("use your browser's Find command to search for the complete address");
    expect(verifier).toContain('href="/registry/zodiacs.registry.json">Open the official address list</a>');
  });

  it('pins the hydrated consumer composition in the same order', async () => {
    const source = await read('src/app.jsx');
    const start = source.indexOf('<main id="main" className="zd consumer-registry">');
    const mounted = source.slice(start, source.indexOf('</main>', start));
    ordered(mounted, [
      '<ConsumerExplorer',
      '<ConsumerBuyGuide sign={sign} />',
      '<ConsumerMarketSnapshot',
      '<ConsumerHowItWorks />',
      '<ConsumerVerifier />',
      '<ConsumerPurpose />',
      '<ConsumerFaq />',
      '<ConsumerClosing sign={sign} />',
      '<Footer />',
    ]);
    expect(mounted).not.toMatch(/ConsumerMarketSection|ConsumerMarketBriefing|MarketTape|StandingsSection|PulseSection|ProMarketsGateway/gu);
  });

  it('builds the first screen as an accessible, interruptible Lit Vitrine', async () => {
    const source = await read('src/app.jsx');
    const identity = functionBlock(source, 'ConsumerIdentityHeader');
    const rail = functionBlock(source, 'VitrineDiscRail');
    const layers = functionBlock(source, 'useConsumerSelectionLayers');
    const explorer = functionBlock(source, 'ConsumerExplorer');
    const placard = functionBlock(source, 'VitrinePlacard');

    expect(normalizedText(identity)).toContain(`Astrofolio The Twelve Official Zodiacs Choose your sign ${SUPPORT_COPY}`);
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
    expect(explorer).toContain("'--vitrine-stage-height': `${desktopStageHeight}px`");
    expect(placard).toContain('{layers.map(renderLayer)}');
    expect(placard).toContain('See {item.name}');
    expect(placard).toContain('How to buy {item.name}');
    expect(placard).toContain('View official record');
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

  it('reuses one first-screen market read for the placard and all-twelve list', async () => {
    const source = await read('src/app.jsx');
    const rootBlock = functionBlock(source, 'Zodiacs');
    const snapshot = functionBlock(source, 'ConsumerMarketSnapshot');
    expect(rootBlock).toContain('const consumerMarket = useTwelveQuotes(!technical && !pro, consumerMarketRetry);');
    expect(rootBlock.match(/batch=\{consumerMarket\}/gu)).toHaveLength(2);
    expect(snapshot).not.toContain('useTwelveQuotes(');
    expect(snapshot).toContain('<h2 id="consumer-snapshot-title">All twelve, today</h2>');
    expect(snapshot).toContain('{SIGNS.map((item) =>');
    expect(snapshot).toContain('plainMarketMovement(quote.priceChange24h)');
    expect(snapshot).toContain('<summary>See market details</summary>');
    expect(snapshot).not.toMatch(/sort\(|rankBy|marketCap|liquidityUsd|volume24h|SelectedTokenMiniChart|PlacardMarketPanel/gu);

    const movement = functionBlock(source, 'plainMarketMovement');
    expect(movement).toContain("up ${formatPercent(movement).replace('+', '')} today");
    expect(movement).toContain("down ${formatPercent(Math.abs(movement)).replace('+', '')} today");
    expect(movement).toContain("return 'unchanged today'");
    expect(movement).toContain("return 'movement unavailable'");

    const staticSnapshot = section(await read('public/astrofolio/index.html'), 'market-snapshot');
    ordered(staticSnapshot, SIGNS.map((slug) => `href="/registry/${slug}/"`));
    expect(staticSnapshot.match(/<li>/gu)).toHaveLength(12);
    expect(staticSnapshot).not.toMatch(/rank|spark|chart|market cap|liquidity|volume/iu);
  });

  it('pins the exact buying guidance and risk paragraph in both render paths', async () => {
    const source = await read('src/app.jsx');
    const hydrated = functionBlock(source, 'ConsumerBuyGuide');
    const fallback = section(await read('public/astrofolio/index.html'), 'buy');
    const required = [
      'How to buy your sign',
      'Buying happens on an independent service, from your own wallet.',
      'Zodiacs.org shows you the official token and the route to it. It never holds your money or your crypto.',
      'Pick your sign.',
      "Open its buying options on the sign's official record.",
      'Check before you approve: in your wallet, confirm the address, the network, the amount, and the fee.',
      'Nothing on this page connects to a wallet.',
      "What you'll need",
      'A Solana-compatible wallet and enough SOL for your amount plus the network fee.',
      'Before you spend anything',
      RISK_COPY,
    ];
    const hydratedText = normalizedText(hydrated);
    const fallbackText = normalizedText(fallback);
    for (const copy of required) {
      expect(hydratedText, copy).toContain(copy);
      expect(fallbackText, copy).toContain(copy);
    }
  });

  it('keeps the explanatory disclosures, verifier, story, four FAQs, and close exact', async () => {
    const source = await read('src/app.jsx');
    const how = functionBlock(source, 'ConsumerHowItWorks');
    for (const copy of ['What is a Zodiac?', 'Read the story', 'How verification works', 'See market details']) {
      expect(how).toContain(copy);
    }
    const verifier = functionBlock(source, 'ConsumerVerifier');
    expect(verifier).toContain('id="verify" className="consumer-verify reveal"');
    expect(verifier).toContain('Check a Zodiac token address');
    expect(verifier).toContain('Paste the mint or contract address shown by a wallet or marketplace. We&rsquo;ll tell you whether it appears in the official list. Never paste a seed phrase.');
    expect(verifier).toContain('Read-only: this checker never connects a wallet, requests a signature, or starts a transaction.');
    expect(verifier).not.toContain('vrf__examples');
    expect(verifier).not.toContain('mono');
    const faqStart = source.indexOf('    const CONSUMER_FAQS = [');
    const faqSource = source.slice(faqStart, source.indexOf('    function ConsumerFaq(', faqStart));
    expect(faqSource.match(/\n\s*q:/gu)).toHaveLength(4);
    expect(section(await read('public/astrofolio/index.html'), 'faq').match(/<dt>/gu)).toHaveLength(4);

    const close = functionBlock(source, 'ConsumerClosing');
    expect(close).toContain('See all twelve records');
    expect(close.match(/<TerminalViewLink view="pro"/gu)).toHaveLength(1);
    expect(close).toContain('view="pro" sign={sign}');
    expect(functionBlock(source, 'TerminalViewLink')).toContain("{pro ? 'Market view' : 'Astrofolio'}");
    expect(source).not.toContain('function ConsumerPreferenceBanner(');
    expect(source).not.toContain('data-terminal-preference-banner');
    expect(source).not.toContain('TERMINAL_PRO_BANNER_DISMISSED_KEY');
  });

  it('keeps consumer navigation on Astrofolio and market depth on Terminal', async () => {
    const source = await read('src/app.jsx');
    const header = functionBlock(source, 'Header');
    expect(header).toContain("? { href: '/terminal/', label: 'Terminal', description: 'The market desk for the twelve official tokens' }");
    expect(header).toContain(": { href: '/astrofolio/', label: 'Astrofolio', description: 'Choose a sign and see its official token' }");

    const proStart = source.indexOf('<main id="main" className="zd terminal-pro">');
    const proMounted = source.slice(proStart, source.indexOf('</main>', proStart));
    ordered(proMounted, [
      '<ProMasthead sign={sign} batch={proMarket} />',
      '<ProMarketBoard active={activeTicker} setActive={setActiveTicker} batch={proMarket} />',
      '<ProSelectedSign sign={sign} batch={proMarket} />',
      '<ProMarketsGateway sign={sign} />',
      '<ConsumerMarketBriefing active={activeTicker} sharedMarket={proMarket} />',
      '<ProResearchSection sign={sign} />',
      '<ProVerifierLink sign={sign} />',
      '<Footer pro />',
    ]);
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
  });
});
