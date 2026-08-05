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

    for (const value of [source, visible]) {
      expect(value).toContain('Every sign has one official token. Explore its story, its record, and its market.');
      expect(value).toContain('Choose a token');
      expect(value).toContain('Check an address');
    }
    expect(visible).toMatch(/href="#official-twelve"[^>]*>[\s\S]*?Choose a token/iu);
    expect(visible).toMatch(/href="#verify"[^>]*>[\s\S]*?Check an address/iu);
    expect(visible).not.toContain('Open the Cabinet');
  });

  it('renders a twelve-control pastel explorer with an accessible active state', async () => {
    const source = await read('src/app.jsx');
    const mounted = consumerRoot(source);

    expect(source).toContain('id="official-twelve"');
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
    expect(source).toContain("window.matchMedia('(prefers-reduced-motion: reduce)').matches");
    expect(source).toContain('new IntersectionObserver');
    expect(html).toContain('data-src="/assets/hero/zodiacs-hero.mp4"');
    expect(html).toContain('poster="/assets/hero/zodiacs-hero-poster.avif"');
    expect(html).toContain('preload="none"');
    expect(html).toContain('data-cine-video');
    expect(html).toContain("if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches)");
  });

  it('mounts the sculpture stage as the wide-screen explorer and keeps the bundle lazy', async () => {
    const source = await read('src/app.jsx');
    // The stage is the selector only where WebGL is live AND the viewport is
    // wide; phones and non-WebGL machines keep the pastel grid and never
    // request the scene bundle.
    expect(source).toContain("window.matchMedia('(min-width: 1021px)')");
    expect(source).toContain('GALLERY_LIVE && window.matchMedia');
    expect(source).toContain("'/assets/gallery.js'");
    expect(source).toContain('{stageMode && <GalleryBand active={active} setActive={setActive} consumer />}');
    expect(source).not.toContain('data-consumer-gallery-toggle');
    expect(source).toContain('RAIL_PLACEHOLDER_HTML');
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
    expect(placard).toContain('Trade {sign.name}');
    expect(placard).toContain('<span>The record</span>');
    expect(placard).toContain('href={registryProfilePath(sign)}');
    // Flag-off the pill is the door to the catalogue page's own panel.
    expect(placard).toContain('href={`${registryProfilePath(sign)}#acquire`}');
    expect(mounted).toContain('<ConsumerTokensSection />');
  });

  it('says one thing about a sign, in one place, at every width', async () => {
    const source = await read('src/app.jsx');
    // Both flavours of the plate render the same head, placard and sheet —
    // only the artwork differs — so the two cannot drift apart.
    expect(source).toContain('function GalleryBand({ active, setActive, consumer = false, carousel = false })');
    for (const once of [
      'className="stage-placard"',
      'className="stage-hero__head"',
      '<PlacardQuote sign={sign} />',
    ]) {
      expect(source.split(once), once).toHaveLength(2);
    }
    // Twice only because the pill has a flag-on and a flag-off face.
    expect(source.split('Trade {sign.name}')).toHaveLength(3);
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
    // One hero, one headline, at every width: the film is retired from the
    // rendered page and the plate opens it instead.
    expect(source).not.toContain('<CineHero');
    expect(source).toContain('{stageMode && <GalleryBand active={active} setActive={setActive} consumer />}');
    expect(source).toContain('{!stageMode && <GalleryBand active={active} setActive={setActive} consumer carousel />}');
    expect(source).toContain('className="stage-hero__title"');
    // The placard says what a museum label says — name, dates, price — and
    // holds the two doors; everything longer waits in the sheet.
    expect(source).toContain('className="stage-placard"');
    expect(source).toContain('function PlacardQuote(');
    expect(source).toContain('<span>The record</span>');
    // The sheet is a dialog portalled above the floating nav, and closing it
    // returns focus to the pill that opened it.
    expect(source).toContain('ReactDOM.createPortal');
    expect(source).toContain('aria-modal="true"');
    expect(source).toContain("if (event.key === 'Escape') setSheetOpen(false);");
    expect(source).toContain('tradePillRef.current?.focus({ preventScroll: true });');
    // The headline belongs to the plate, not to the page around it.
    const plate = source.slice(source.indexOf('function GalleryBand('), source.indexOf('</section>', source.indexOf('function GalleryBand(')));
    expect(plate).toContain('className="stage-hero__head"');
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

  it('lists all twelve official tokens in zodiac order with a single batched market read', async () => {
    const [source, html] = await Promise.all([
      read('src/app.jsx'),
      read('public/registry/index.html'),
    ]);
    const visible = visibleMarkup(html);

    expect(source).toContain('Twelve tokens, live.');
    expect(source).toContain('function loadTwelveMarketQuotes()');
    expect(source).toContain('https://api.dexscreener.com/tokens/v1/solana/');
    // Zodiac order, never a leaderboard: the strip renders SIGNS in
    // registry order and no consumer surface sorts by performance.
    expect(source).toContain('{SIGNS.map((item) => {');
    expect(source).not.toMatch(/\.sort\(\(a, b\) => \(b\.marketCap/u);
    // The static fallback carries the crawlable twelve with truncated mints.
    expect(visible).toContain('Twelve tokens, live');
    expect(visible).toContain('Every sign has one official token');
    expect((visible.match(/class="static-token-list"/gu) ?? [])).toHaveLength(1);
    expect(visible).toContain('Live prices appear with JavaScript');
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
