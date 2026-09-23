/**
 * Stamp the current UTC Astrofolio season into a built page without mutating
 * the committed source shell. All twelve versioned identity packages are
 * generated ahead of time; this selects the current one at release time.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ASTROFOLIO_IDENTITY_BASE,
  ASTROFOLIO_OG_BASE,
} from './build-astrofolio-identity.mjs';
import { resolveAstrofolioSeasonUtc, seasonsFromRegistry } from './astrofolio-season.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_DATE = new Date();
const SEASON_HUES = Object.freeze({
  aries: '#DE8E79', taurus: '#B9D4BE', gemini: '#B29DD0', cancer: '#B6D4E4',
  leo: '#E0A9B4', virgo: '#B7D9B0', libra: '#D3A9DE', scorpio: '#B9DCE8',
  sagittarius: '#E0B080', capricorn: '#C0DEA8', aquarius: '#AE8FC9', pisces: '#A9D4C4',
});
const ZODIAC_ORDER = Object.freeze(Object.keys(SEASON_HUES));
const FOMO_SOLANA_CHAIN_ID = '1399811149';
const SEASON_BAG_START = '<!-- astrofolio-season-bag:start -->';
const SEASON_BAG_END = '<!-- astrofolio-season-bag:end -->';

/**
 * The no-JavaScript buy bar for the season's sign: the same Fomo control and
 * deep link the hydrated Campaign bag renders, filled from the Registry.
 */
export function renderStaticSeasonBag(asset, indent = '      ') {
  const sign = asset?.sign;
  const index = ZODIAC_ORDER.indexOf(sign);
  const mint = asset?.representations?.find((item) => item.chain === 'solana')?.address;
  if (index < 0 || !asset.displayName || !mint) {
    throw new Error(`Astrofolio season bag needs a Registry asset with a Solana origin (${sign ?? 'unknown'})`);
  }
  const name = asset.displayName;
  const emoji = `${String.fromCodePoint(0x2648 + index)}\uFE0F`;
  const href = `https://fomo.family/coin?address=${encodeURIComponent(mint)}&amp;chainId=${FOMO_SOLANA_CHAIN_ID}`;
  return [
    `<aside class="campaign-bag campaign-bag--static" aria-label="Buy ${name}" data-campaign-bag="${sign}" style="--sign:${SEASON_HUES[sign]}">`,
    `  <span class="campaign-bag__who"><img src="/assets/zodiac-icons/128/${sign}.webp" width="40" height="40" alt=""><span><strong>${name}</strong><small><span>In season now</span></small></span></span>`,
    `  <a class="btn btn--fomo" href="${href}" rel="external nofollow" aria-label="Open Fomo to buy ${name}" data-fomo-buy="${sign}"><img src="/assets/venues/fomo-official.svg" width="34" height="34" alt=""><span class="btn--fomo__copy"><small>${name} <span class="btn--fomo__zodiac-emoji" aria-hidden="true">${emoji}</span></small><strong>Buy with Fomo</strong></span><span class="btn--fomo__arrow" aria-hidden="true">↗</span></a>`,
    '</aside>',
  ].map((line) => `${indent}${line}`).join('\n');
}

function stampSeasonBag(html, sign, registry) {
  const start = html.indexOf(SEASON_BAG_START);
  const end = html.indexOf(SEASON_BAG_END);
  if (start < 0 && end < 0) {
    // A release build always passes the Registry and must find the bag; the
    // markup-only form (no Registry) stamps the other season markers alone.
    if (registry) throw new Error('Astrofolio season stamp could not find the no-JavaScript season bag');
    return html;
  }
  if (start < 0 || end < start) throw new Error('Astrofolio season bag markers are malformed');
  const asset = registry?.assets?.find((item) => item.sign === sign);
  if (!asset) throw new Error(`Astrofolio season stamp could not render the ${sign} season bag`);
  const lineStart = html.lastIndexOf('\n', start) + 1;
  const indent = html.slice(lineStart, start);
  return `${html.slice(0, start + SEASON_BAG_START.length)}\n${renderStaticSeasonBag(asset, indent)}\n${indent}${html.slice(end)}`;
}

export function stampAstrofolioSeason(html, sign, { registry = null } = {}) {
  const source = String(html);
  const seasonName = `${sign.charAt(0).toUpperCase()}${sign.slice(1)}`;
  const next = source
    .replace(
      /\/assets\/astrofolio\/v\d+\/[a-z]+\/og-1200x630\.png/gu,
      `${ASTROFOLIO_OG_BASE}/${sign}.png`,
    )
    .replace(
      /\/assets\/og\/astrofolio\/v\d+\/[a-z]+\.png/gu,
      `${ASTROFOLIO_OG_BASE}/${sign}.png`,
    )
    .replace(
      /\/assets\/astrofolio\/v\d+\/[a-z]+\//gu,
      `${ASTROFOLIO_IDENTITY_BASE}/${sign}/`,
    )
    .replace(
      /<article class="campaign-look(?: is-season)?" data-static-sign="([a-z]+)"/gu,
      (_, look) => `<article class="campaign-look${look === sign ? ' is-season' : ''}" data-static-sign="${look}"`,
    )
    .replace(
      /<strong data-astrofolio-season-name(?:\s+style="[^"]*")?>[^<]*<\/strong>/u,
      `<strong data-astrofolio-season-name style="--season-hue:${SEASON_HUES[sign]}">${seasonName}</strong>`,
    );
  if (!next.includes(`${ASTROFOLIO_IDENTITY_BASE}/${sign}/`)) {
    throw new Error(`Astrofolio season stamp could not find the ${sign} identity package`);
  }
  if (!next.includes(`${ASTROFOLIO_OG_BASE}/${sign}.png`)) {
    throw new Error(`Astrofolio season stamp could not find the ${sign} social card`);
  }
  if (!next.includes(`<article class="campaign-look is-season" data-static-sign="${sign}"`)) {
    throw new Error(`Astrofolio season stamp could not mark ${sign} in the no-JavaScript runway`);
  }
  return stampSeasonBag(next, sign, registry);
}

export async function stampBuiltAstrofolio({
  output = resolve(root, 'dist/astrofolio/index.html'),
  now = DEFAULT_DATE,
} = {}) {
  const registry = JSON.parse(await readFile(resolve(root, 'public/registry/zodiacs.registry.json'), 'utf8'));
  const season = resolveAstrofolioSeasonUtc(now, seasonsFromRegistry(registry));
  const html = await readFile(output, 'utf8');
  const stamped = stampAstrofolioSeason(html, season.sign, { registry });
  if (stamped !== html) await writeFile(output, stamped, 'utf8');
  return season;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const season = await stampBuiltAstrofolio();
  console.log(`Astrofolio build identity: ${season.displayName} (${season.dateRange}, UTC).`);
}
