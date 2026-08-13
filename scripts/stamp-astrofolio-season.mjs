/**
 * Stamp the current UTC Astrofolio season into a built page without mutating
 * the committed source shell. All twelve versioned identity packages are
 * generated ahead of time; this selects the current one at release time.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveAstrofolioSeasonUtc, seasonsFromRegistry } from './astrofolio-season.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_DATE = new Date();

export function stampAstrofolioSeason(html, sign) {
  const source = String(html);
  const next = source
    .replace(
      /\/assets\/astrofolio\/v1\/[a-z]+\//gu,
      `/assets/astrofolio/v1/${sign}/`,
    )
    .replace(
      /(<input class="static-vitrine__choice"[^>]*\sid="astrofolio-[a-z]+")\s+checked(?=>)/gu,
      '$1',
    )
    .replace(
      new RegExp(`(<input class="static-vitrine__choice"[^>]*\\sid="astrofolio-${sign}")(?=>)`, 'u'),
      '$1 checked',
    );
  if (!next.includes(`/assets/astrofolio/v1/${sign}/icon-192.png`)) {
    throw new Error(`Astrofolio season stamp could not find the ${sign} lockup`);
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
