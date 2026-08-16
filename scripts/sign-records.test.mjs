import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  CONSTELLATIONS,
  HYG_ATTRIBUTION,
  validateConstellations,
} from './constellation-data.mjs';
import {
  SIGN_PROFILE_PEOPLE,
  SIGN_PROFILE_RALLY_LINES,
  SIGN_PROFILE_PROTECTED_LINKS,
  registryProfilePersonLinkRel,
  validateSignProfileRallyLines,
} from './sign-profile-data.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(resolve(root, path), 'utf8');
const signs = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
];

function visibleMarkup(html) {
  return html
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, '')
    .replace(/<!--([\s\S]*?)-->/gu, '');
}

describe('Zodiac token records', () => {
  it('keeps one validated, sign-specific rally line for every profile', () => {
    expect(Object.keys(SIGN_PROFILE_RALLY_LINES)).toEqual(signs);
    expect(validateSignProfileRallyLines(signs)).toEqual([]);
    expect(SIGN_PROFILE_RALLY_LINES.scorpio).toBe('Scorpio never does anything halfway.');
    expect(new Set(Object.values(SIGN_PROFILE_RALLY_LINES)).size).toBe(12);
  });

  it('commits a valid, attributed constellation subset for all twelve signs', async () => {
    expect(Object.keys(CONSTELLATIONS)).toEqual(signs);
    expect(validateConstellations(signs)).toEqual([]);
    expect(HYG_ATTRIBUTION.license).toBe('CC BY-SA 4.0');

    for (const sign of signs) {
      const constellation = CONSTELLATIONS[sign];
      expect(constellation.stars.length).toBeGreaterThanOrEqual(5);
      expect(constellation.edges.length).toBeGreaterThanOrEqual(3);
      expect(constellation.stars.some((star) => star.id === constellation.focusId)).toBe(true);
      for (const star of constellation.stars.filter((entry) => entry.kind === 'star')) {
        expect(star.source).toBe('hyg-v4.0');
        expect(star.hygId).toBeTypeOf('number');
      }

      const svg = await read(`public/assets/constellations/${sign}.svg`);
      expect(svg).toContain(`${HYG_ATTRIBUTION.sourceBlob}`);
      expect(svg).toContain(`${HYG_ATTRIBUTION.license}`);
      expect(svg).toContain('Guide lines are not official constellation boundaries.');
    }

    const attribution = await read('public/assets/constellations/ATTRIBUTION.txt');
    expect(attribution).toContain(HYG_ATTRIBUTION.url);
    expect(attribution).toContain(HYG_ATTRIBUTION.licenseUrl);
    expect(attribution).toContain('SIMBAD M44');
  });

  it('leads with identity and emotional context, then explains the token, market, and verified address', async () => {
    for (const [index, sign] of signs.entries()) {
      const html = await read(`public/registry/${sign}/index.html`);
      const visible = visibleMarkup(html);
      const name = sign.charAt(0).toUpperCase() + sign.slice(1);

      expect((visible.match(/<h1\b/gu) || [])).toHaveLength(1);
      expect(visible).toContain(`Zodiac sign <span class="g">·</span> ${index + 1} of 12`);
      expect(visible).toContain(`${name} at a glance`);
      expect(visible).toContain(`The ${name} token`);
      expect(visible).toContain(`Born under ${name}`);
      expect(visible).toContain(`${name} today`);
      expect(visible).toContain('Market standings');
      expect(visible).not.toContain('The Zodiac Race');
      expect(visible).toContain('Check the token');
      expect(visible).toContain(`${name} in the sky`);
      expect(visible).toContain(`The story of ${name}`);
      expect(visible).toContain('Explore all 12');
      expect(visible).not.toContain('class="lot__epithet"');
      expect(visible).not.toContain('not a physical sculpture or a one-of-one NFT');
      expect(visible).not.toContain(`Why ${name} is in the collection`);
      expect(visible).not.toContain('recognizable artwork');
      expect(visible).not.toContain('It pairs a familiar sign');
      expect(html).not.toContain('/terminal/markets/');
      expect(visible).toContain('<section class="quick" aria-labelledby="quick-title" data-live-quote>');
      expect(visible).toContain('Latest recorded price');
      expect(visible).toContain('Price history');
      expect(visible).toContain(`The ${name} token is a digital item people can own or send.`);
      expect(visible).toContain(`No new ${name} tokens can be created.`);
      expect(visible).toContain('This page only shows information. It cannot make a purchase or move money.');
      expect(visible).not.toMatch(/Continue to Jupiter|What do I need before I continue|How to buy/u);
      expect(html).not.toMatch(/href="https:\/\/jup\.ag\//u);
      expect(visible).not.toContain('data-trade-panel');
      expect(visible).not.toContain('registry-trade:slot');
      expect(visible).not.toMatch(/>Museum label<|>Catalogue note<|>Provenance<|>Acquisition<|>The catalogue</u);

      const glanceIndex = visible.indexOf(`${name} at a glance`);
      const identityIndex = visible.indexOf(`id="identity"`);
      const tokenIndex = visible.indexOf(`id="token"`);
      const marketIndex = visible.indexOf(`id="market"`);
      const legacyAliasIndex = visible.indexOf(`id="acquire"`);
      const addressIndex = visible.indexOf(`id="record"`);
      const storyIndex = visible.indexOf(`The story of ${name}`);
      expect(glanceIndex).toBeGreaterThan(-1);
      expect(identityIndex).toBeGreaterThan(glanceIndex);
      expect(tokenIndex).toBeGreaterThan(identityIndex);
      expect(marketIndex).toBeGreaterThan(tokenIndex);
      expect(legacyAliasIndex).toBeGreaterThan(marketIndex);
      expect(addressIndex).toBeGreaterThan(marketIndex);
      expect(addressIndex).toBeGreaterThan(legacyAliasIndex);
      expect(storyIndex).toBeGreaterThan(addressIndex);
    }
  });

  it('connects pride, dated public attention, famous people, and neutral market standings', async () => {
    for (const sign of signs) {
      const html = await read(`public/registry/${sign}/index.html`);
      const visible = visibleMarkup(html);
      const name = sign.charAt(0).toUpperCase() + sign.slice(1);

      expect(visible).toContain('data-share-sign');
      expect(visible).toContain(SIGN_PROFILE_RALLY_LINES[sign]);
      expect(visible).not.toContain('data-copy-identity=');
      expect(visible).not.toContain('for your bio</button>');
      expect(visible).not.toContain('symbol works anywhere text does');
      expect(visible).not.toContain(`${name} season returns every year`);
      expect(visible).not.toContain('Read about four people born during');
      expect(visible).not.toContain('<dt>Symbol</dt>');
      expect(visible).toContain(`People who share ${name}`);
      expect(visible).toContain('Hundreds of millions');
      expect(visible).toContain('A rough estimate based on one-twelfth of the world’s population.');
      expect(visible).toContain('It describes the sign, not token ownership.');
      expect(visible).toContain('Wikipedia views');
      expect(visible).toContain(`The English Wikipedia page for ${name} averaged`);
      expect(visible).toContain('One person may account for more than one view.');
      expect(visible).toContain('This shows interest, not ownership or value.');
      expect(visible).not.toContain('Ethereum');
      expect(visible).not.toContain('Dogecoin');
      expect(visible).not.toContain('meme coins');
      expect(visible).toContain('You’re in good company');
      expect(visible).toContain('Birth dates are sourced. These people did not endorse Zodiacs.org.');
      expect(visible).not.toContain('No endorsement is implied.');
      for (const person of SIGN_PROFILE_PEOPLE[sign]) {
        expect(visible).toContain(`href="/people/${person}/"`);
      }

      const standings = visible.match(/<ol class="standings__list" data-standings-list>([\s\S]*?)<\/ol>/u)?.[1] ?? '';
      expect(visible).toContain('<details class="standings__all"><summary>See all 12 market standings</summary>');
      expect(standings.match(/<li\b/gu)).toHaveLength(12);
      expect(standings.match(/\/assets\/zodiac-icons\/48\/[a-z-]+\.webp/gu)).toHaveLength(12);
      expect(visible).toMatch(/\d+(?:st|nd|rd|th) of 12 by total market value/u);
      expect(visible).toContain('This rank only compares total market value. It does not show how many people support each sign.');
      expect(visible).not.toContain('leads this snapshot');
      expect(visible).not.toContain('one place above');
      expect(visible).not.toContain('/race');

      const strip = visible.match(/<nav class="strip" aria-label="All twelve signs">([\s\S]*?)<\/nav>/u)?.[1] ?? '';
      expect(strip.match(/class="strip__name"/gu)).toHaveLength(12);
      expect(strip.match(/\/assets\/zodiac-icons\/128\/[a-z-]+\.webp/gu)).toHaveLength(12);
    }

    const scorpio = await read('public/registry/scorpio/index.html');
    for (const person of ['marie-curie', 'pablo-picasso', 'bill-gates', 'leonardo-dicaprio']) {
      expect(scorpio).toContain(`href="/people/${person}/"`);
    }
  });

  it('allows only the two owner-authorized protected People links on Scorpio', async () => {
    const peopleRelease = JSON.parse(await read('src/data/people.json'));
    const indexPolicy = JSON.parse(await read('docs/phase5/people-pilot/index-policy.json'));
    const peopleBySlug = new Map(peopleRelease.people.map((person) => [person.slug, person]));
    const expectedProtected = ['bill-gates', 'leonardo-dicaprio'];
    const mapped = Object.entries(SIGN_PROFILE_PEOPLE).flatMap(([sign, personSlugs]) => (
      personSlugs.map((personSlug) => ({ sign, personSlug }))
    ));
    const mappedProtected = mapped.filter(({ personSlug }) => (
      !peopleBySlug.get(personSlug)?.indexEligibility.eligible
    ));

    expect(Object.keys(SIGN_PROFILE_PROTECTED_LINKS).sort()).toEqual(expectedProtected);
    expect(indexPolicy.expansion.personSpecificLinkAuthorization).toMatchObject({
      profiles: expectedProtected,
      surface: '/registry/scorpio/',
    });
    expect(mappedProtected).toEqual(expectedProtected.map((personSlug) => ({
      sign: 'scorpio',
      personSlug,
    })));

    for (const personSlug of expectedProtected) {
      expect(SIGN_PROFILE_PROTECTED_LINKS[personSlug]).toEqual({
        sign: 'scorpio',
        surface: '/registry/scorpio/',
        rel: 'nofollow',
      });
      const person = peopleBySlug.get(personSlug);
      expect(person?.living).toBe(true);
      expect(person?.indexEligibility.eligible).toBe(false);
      expect(registryProfilePersonLinkRel({
        sign: 'scorpio',
        person,
        policyAuthorization: indexPolicy.expansion.personSpecificLinkAuthorization,
      })).toBe('nofollow');
    }

    expect(() => registryProfilePersonLinkRel({
      sign: 'libra',
      person: peopleBySlug.get('serena-williams'),
      policyAuthorization: indexPolicy.expansion.personSpecificLinkAuthorization,
    })).toThrow('protected/non-indexable People records require exact, surface-specific authorization');
    expect(() => registryProfilePersonLinkRel({
      sign: 'libra',
      person: peopleBySlug.get('bill-gates'),
      policyAuthorization: indexPolicy.expansion.personSpecificLinkAuthorization,
    })).toThrow('protected/non-indexable People records require exact, surface-specific authorization');
    expect(registryProfilePersonLinkRel({
      sign: 'scorpio',
      person: peopleBySlug.get('marie-curie'),
      policyAuthorization: indexPolicy.expansion.personSpecificLinkAuthorization,
    })).toBeNull();

    for (const sign of signs) {
      const html = await read(`public/registry/${sign}/index.html`);
      const peopleMarkup = html.match(/<div class="people-block">([\s\S]*?)<\/div>\s*<\/section>/u)?.[1] ?? '';
      const nofollowLinks = peopleMarkup.match(/<a href="\/people\/[a-z0-9-]+\/" rel="nofollow">/gu) ?? [];
      expect(nofollowLinks).toHaveLength(sign === 'scorpio' ? 2 : 0);
      if (sign === 'scorpio') {
        for (const personSlug of expectedProtected) {
          expect(peopleMarkup).toContain(
            `<a href="/people/${personSlug}/" rel="nofollow">`,
          );
        }
      }
    }
  });

  it('separates a live selected-token quote from the honestly labelled daily archive', async () => {
    const [source, leo] = await Promise.all([
      read('scripts/build-sign-pages.mjs'),
      read('public/registry/leo/index.html'),
    ]);

    for (const value of [source, leo]) {
      expect(value).toContain('https://api.dexscreener.com/tokens/v1/solana/');
      expect(value).toContain('data-live-price');
      expect(value).toContain('data-live-change');
      expect(value).toContain("pair.baseToken.address !== MINT");
      expect(value).toContain('if (marketStarted && !document.hidden) loadLiveQuote();');
      expect(value).toContain('function startMarketData()');
      expect(value).toContain('Last price shown. A newer price is temporarily unavailable.');
      expect(value).toContain('/assets/data/registry-market-history.v1.json');
      expect(value).toContain("archive.schema !== 'zodiacs.registry-market-history.v1'");
      expect(value).toContain("' daily price through '");
      expect(value).toContain("' daily prices through '");
      expect(value).toContain('One daily price is available. The chart will appear after the next one.');
      expect(value).toContain('if (finite.length < 2)');
      expect(value).not.toContain('if (finite.length < 8)');
      expect(value).toContain('Price history unavailable.');
      expect(value).toContain('seven.disabled = sevenPoints.length < 2');
      expect(value).toContain('gap > 1.5 * 86400000');
      expect(value).toContain("['Total market value', fmtCompact(asset.marketCapUsd)");
      expect(value).toContain("['Traded in 24 hours', fmtCompact(asset.volume24hUsd)");
      expect(value).toContain('data-chart-summary');
      expect(value).not.toContain('https://api.dexscreener.com/latest/dex/pairs/');
    }
    expect(leo).toContain('data-market-range="7d"');
    expect(leo).toContain('data-market-range="30d"');
    expect(leo).toContain('data-market-range="all"');
    expect(leo).toContain('View live chart ↗');
    expect(leo).toContain('The source reports each sign’s price, trading activity and total market value.');
    expect(leo).toContain('Where do these numbers come from?');
    expect(leo).toMatch(/data-market-foot>Updated [^<]+<\/div>/u);
    expect(leo).toContain('<noscript><style>.reveal { opacity: 1 !important;');
  });

  it('keeps small prices precise and emits no catalogue purchase handoff', async () => {
    const [source, scorpio] = await Promise.all([
      read('scripts/build-sign-pages.mjs'),
      read('public/registry/scorpio/index.html'),
    ]);
    expect(scorpio).toContain('$0.00006807');
    expect(source).not.toContain('wing_acquisition_click');
    expect(scorpio).not.toMatch(/href="https:\/\/jup\.ag\//u);
    expect(source).toContain('function canPublishRank(snapshot, standings)');
    expect(source).toContain('assetsWithMarketCap');
    expect(source).toContain("'Market rank unavailable'");
  });

  it('links every record to its constellation, collection, registry, and sign-filtered research', async () => {
    for (const sign of signs) {
      const html = await read(`public/registry/${sign}/index.html`);
      expect(html).toContain(`/assets/constellations/${sign}.svg`);
      expect(html).toContain('<a href="/astrofolio/">Astrofolio</a>');
      expect(html).toContain('<a href="/registry/">All signs</a>');
      expect(html).toContain(`/terminal/research/?sign=${sign}&amp;type=daily`);
      expect(html).toContain(`/terminal/research/?sign=${sign}`);
    }
  });

  it('emits the Guide bootstrap and parseable executable inline scripts on every record', async () => {
    for (const sign of signs) {
      const html = await read(`public/registry/${sign}/index.html`);
      const scripts = [...html.matchAll(/<script(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/giu)]
        .map((match) => match[1])
        .filter((script) => script.trim());
      const guideBootstrap = scripts.find((script) => script.includes("import('/assets/assistant-ui.js')"));
      expect(guideBootstrap).toContain('return mod.bootstrapGuide(defaultLocale)');
      expect(guideBootstrap).toContain('return mod.openAssistant(');
      expect(html).toContain('data-guide-loader="zodiacs-guide-loader-v1"');
      expect(scripts).toEqual(expect.arrayContaining([
        expect.stringContaining("trackWingEvent('wing_record_view')"),
        expect.stringContaining("var ARCHIVE_URL = '/assets/data/registry-market-history.v1.json'"),
      ]));
      for (const script of scripts) {
        expect(() => new Function(script)).not.toThrow();
      }
    }
  });
});
