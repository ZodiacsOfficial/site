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

  it('makes the consumer hero about choosing a token and checking an address', async () => {
    const [source, html] = await Promise.all([
      read('src/app.jsx'),
      read('public/registry/index.html'),
    ]);
    const visible = visibleMarkup(html);

    // The no-JS shell can explain the route in prose; the mounted sculpture
    // stage no longer repeats that large hero copy above the work.
    expect(visible).toContain('One official token for every sign. Browse the sculptures, watch the market, and verify the record.');
    expect(source).not.toContain('One official token for every sign. Browse the sculptures, watch the market, and verify the record.');
    for (const value of [source, visible]) {
      // The verifier is reachable in plain words. "Check an address" named
      // the mechanism, and "Check a token is official" dropped its "that".
      expect(value).toContain('Verify a token');
      expect(value).not.toContain('Check an address');
      expect(value).not.toContain('Check a token is official');
    }
    expect(visible).toContain('Choose a token');
    expect(visible).toMatch(/href="#official-twelve"[^>]*>[\s\S]*?Choose a token/iu);
    expect(visible).toMatch(/href="#verify"[^>]*>[\s\S]*?Verify a token/iu);
    expect(visible).not.toContain('Open the Cabinet');
  });

  it('renders a twelve-control pastel explorer with an accessible active state', async () => {
    const source = await read('src/app.jsx');
    const mounted = consumerRoot(source);

    expect(source).toContain('id="official-twelve"');
    expect(source).toContain('<h1 id="consumer-explorer-title" className="sr-only">Zodiacs Official Registry</h1>');
    expect(source).toContain('aria-labelledby="consumer-explorer-title"');
    expect(source.split('<h1 id="consumer-explorer-title"'), 'consumer Registry h1').toHaveLength(2);
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

  it('keeps market and builder detail out of the mounted consumer journey', async () => {
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

  it('preserves the original cinematic media and reduced-motion contract', async () => {
    const [source, html] = await Promise.all([
      read('src/app.jsx'),
      read('public/registry/index.html'),
    ]);

    // The rendered page opens on the gallery at every width, so the film is
    // the no-JS shell's hero alone — and it still must not autoplay for a
    // reader who asked for stillness.
    expect(source).not.toContain("src: '/assets/hero/zodiacs-hero.mp4'");
    expect(html).toContain('@media (prefers-reduced-motion: reduce)');
    expect(source).toContain('new IntersectionObserver');
    expect(html).toContain('data-src="/assets/hero/zodiacs-hero.mp4"');
    expect(html).toContain('poster="/assets/hero/zodiacs-hero-poster.avif"');
    expect(html).toContain('preload="none"');
    expect(html).toContain('data-cine-video');
    expect(html).toContain("if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches)");
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
    const gallery = source.slice(
      source.indexOf('function GalleryBand('),
      source.indexOf('function ConsumerExplorer('),
    );

    expect(tape).toContain('className="market-tape__viewport" aria-hidden="true"');
    expect(tape).toContain("{renderItems('primary')}");
    expect(tape).toContain("{renderItems('echo')}");
    expect(tape).toContain('data-market-tape-sign={item.asset.sign}');
    expect(tape).not.toContain('<button');
    expect(tape).not.toContain('<a ');
    expect(tape).not.toContain('onClick=');
    expect(tape).not.toContain('aria-pressed=');
    expect(gallery.indexOf('<MarketTape')).toBeGreaterThan(-1);
    expect(gallery.indexOf('<MarketTape')).toBeLessThan(gallery.indexOf('<section'));
  });

  it('lets the season materialize inside the scene without another framed card', async () => {
    const html = await read('public/registry/index.html');
    const materialPass = html.slice(html.indexOf('Registry material pass'));
    const seasonRule = materialPass.slice(
      materialPass.indexOf('.season-now {'),
      materialPass.indexOf('.season-now::before'),
    );
    const railRule = materialPass.slice(
      materialPass.indexOf('.gband--consumer .rail {'),
      materialPass.indexOf('.gband--consumer .rail__tick img'),
    );

    expect(seasonRule).toContain('border: 0;');
    expect(seasonRule).toContain('border-radius: 0;');
    expect(seasonRule).toContain('background: transparent;');
    expect(seasonRule).toContain('opacity: 1;');
    expect(seasonRule).toContain('opacity 240ms cubic-bezier(0.23, 1, 0.32, 1) 50ms');
    expect(seasonRule).toContain('transform 280ms cubic-bezier(0.23, 1, 0.32, 1) 50ms');
    expect(materialPass).toMatch(/@starting-style \{\s*\.season-now \{\s*opacity: 0;\s*transform: translateY\(7px\);/u);
    expect(materialPass).toMatch(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.consumer-registry \.season-now \{[\s\S]*?transition-property: opacity !important;/u);
    expect(railRule).toContain('border: 0;');
    expect(railRule).toContain('border-radius: 0;');
    expect(railRule).toContain('background: transparent;');
    expect(railRule).toContain('backdrop-filter: none;');
  });

  it('presents the selected sign on a placard: name, dates, price, two doors', async () => {
    const source = await read('src/app.jsx');
    const mounted = consumerRoot(source);

    const placard = source.slice(
      source.indexOf('className="stage-placard"'),
      source.indexOf('className="stage-sheet"'),
    );
    expect(placard).toContain('className="stage-placard__name"');
    expect(placard).toContain('{signDateLabel(sign)}');
    expect(placard).toContain('<PlacardQuote sign={sign} />');
    expect(placard).toContain('Buy {sign.name}');
    expect(placard).toContain('<span>The record</span>');
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
    expect(source).toContain('<span>The record</span>');
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

  it('ranks all twelve official tokens with one batched market read and explicit data semantics', async () => {
    const [source, html] = await Promise.all([
      read('src/app.jsx'),
      read('public/registry/index.html'),
    ]);
    const visible = visibleMarkup(html);

    expect(source).toContain('The wheel, <span className="it">in motion.</span>');
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
    expect(source).toContain('Share snapshot');
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
    expect(source).toContain('className="market-row__record market-glass"');
    expect(source).toContain('<span className="market-row__record-label">Official record</span>');
    expect(source).toContain('aria-label={`Open the official ${item.name} record`}');
    expect(source).toContain("shared.searchParams.set('outlook', horizon)");
    expect(source).toContain("edition.date === utcToday");
    // The static fallback carries the crawlable twelve with truncated mints.
    expect(visible).toContain('The wheel, in motion');
    expect(visible).toContain('The interactive edition ranks the twelve');
    expect((visible.match(/class="static-token-list"/gu) ?? [])).toHaveLength(1);
    expect(visible).toContain('Live figures and sharing appear with JavaScript');
  });

  it('removes the directional-price aside from the auditable outlook', async () => {
    const [source, html] = await Promise.all([
      read('src/app.jsx'),
      read('public/registry/index.html'),
    ]);
    const visible = visibleMarkup(html);

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
