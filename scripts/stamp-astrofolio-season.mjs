/**
 * Stamp the current UTC Astrofolio season into a built page without mutating
 * the committed source shell. All twelve versioned identity packages are
 * generated ahead of time; this selects the current one at release time.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ASTROFOLIO_IDENTITY_BASE } from './build-astrofolio-identity.mjs';
import { resolveAstrofolioSeasonUtc, seasonsFromRegistry } from './astrofolio-season.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_DATE = new Date();
const SEASON_HUES = Object.freeze({
  aries: '#DE8E79', taurus: '#B9D4BE', gemini: '#B29DD0', cancer: '#B6D4E4',
  leo: '#E0A9B4', virgo: '#B7D9B0', libra: '#D3A9DE', scorpio: '#B9DCE8',
  sagittarius: '#E0B080', capricorn: '#C0DEA8', aquarius: '#AE8FC9', pisces: '#A9D4C4',
});

export function stampAstrofolioSeason(html, sign) {
  const source = String(html);
  const seasonName = `${sign.charAt(0).toUpperCase()}${sign.slice(1)}`;
  const next = source
    .replace(
      /\/assets\/astrofolio\/v\d+\/[a-z]+\//gu,
      `${ASTROFOLIO_IDENTITY_BASE}/${sign}/`,
    )
    .replace(
      /(<input class="static-vitrine__choice"[^>]*\sid="astrofolio-[a-z]+")\s+checked(?=>)/gu,
      '$1',
    )
    .replace(
      new RegExp(`(<input class="static-vitrine__choice"[^>]*\\sid="astrofolio-${sign}")(?=>)`, 'u'),
      '$1 checked',
    )
    .replace(
      /<strong data-astrofolio-season-name(?:\s+style="[^"]*")?>[^<]*<\/strong>/u,
      `<strong data-astrofolio-season-name style="--season-hue:${SEASON_HUES[sign]}">${seasonName}</strong>`,
    );
  if (!next.includes(`${ASTROFOLIO_IDENTITY_BASE}/${sign}/`)) {
    throw new Error(`Astrofolio season stamp could not find the ${sign} identity package`);
  }
  if (!next.includes(`id="astrofolio-${sign}" checked`)) {
    throw new Error(`Astrofolio season stamp could not select ${sign} in the no-JavaScript vitrine`);
  }
  return next;
}

export async function stampBuiltAstrofolio({
  output = resolve(root, 'dist/astrofolio/index.html'),
  now = DEFAULT_DATE,
} = {}) {
  const registry = JSON.parse(await readFile(resolve(root, 'public/registry/zodiacs.registry.json'), 'utf8'));
  const season = resolveAstrofolioSeasonUtc(now, seasonsFromRegistry(registry));
  const html = await readFile(output, 'utf8');
  const stamped = stampAstrofolioSeason(html, season.sign);
  if (stamped !== html) await writeFile(output, stamped, 'utf8');
  return season;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const season = await stampBuiltAstrofolio();
  console.log(`Astrofolio build identity: ${season.displayName} (${season.dateRange}, UTC).`);
}
