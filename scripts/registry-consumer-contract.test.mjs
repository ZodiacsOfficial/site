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
    expect(source).toContain('className="consumer-explorer"');
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

    expect(source).toContain("src: '/assets/hero/zodiacs-hero.mp4'");
    expect(source).toContain("poster: '/assets/hero/zodiacs-hero-poster.avif'");
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

  it('presents the selected sign as its official token with a live quote and record-first actions', async () => {
    const source = await read('src/app.jsx');
    const mounted = consumerRoot(source);

    expect(source).toContain('Official {sign.name} token');
    expect(source).toContain('Native network: Solana');
    expect(source).toContain('data-token-quote');
    expect(source).toContain('View the {sign.name} token');
    expect(source).toContain('Copy Solana address');
    // The record box is a plate: the sign's gold sculpture with its pastel
    // disc seated at the corner, and a route to where the token trades.
    expect(source).toContain('src={`/assets/sculptures/512/${sign.asset.sign}.webp`}');
    expect(source).toContain('Trade {sign.name}');
    expect(source).toContain('consumer-quote__approx');
    expect(source).toContain('href={`${registryProfilePath(sign)}#acquire`}');
    expect(source).toContain('Read the {sign.name} astrology guide');
    // The primary action opens the official record; the astrology guide is
    // a labelled tertiary link, never the primary destination.
    expect(source).toContain('<a className="btn btn--primary" href={registryProfilePath(sign)}>');
    expect(source).not.toMatch(/className="btn btn--primary" href=\{`\/\$\{sign\.asset\.sign\}\/`\}/u);
    expect(mounted).toContain('<ConsumerTokensSection />');
  });

  it('lists all twelve official tokens in zodiac order with a single batched market read', async () => {
    const [source, html] = await Promise.all([
      read('src/app.jsx'),
      read('public/registry/index.html'),
    ]);
    const visible = visibleMarkup(html);

    expect(source).toContain('Twelve tokens, live.');
    expect(source).toContain('data-season-pulse');
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
