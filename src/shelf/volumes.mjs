// The shelf's volume table — build-time only.
//
// One entry per sign, assembled from the two files that already hold this
// material: registry/zodiacs.registry.json (element, modality, ruler,
// archetype, dates, symbol) and scripts/sign-data.mjs (lot numeral, glyph,
// epithet, display dates). Nothing is retyped here, so the shelf cannot
// drift from the catalogue it stands for.
//
// Addresses are deliberately absent. The page fetches them from the registry
// file itself when a volume is opened, which keeps one answer to "what is the
// Leo mint" on the whole site.

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { SIGN_PAGES, SIGN_ORDER } from '../../scripts/sign-data.mjs';
import { NAV_SIGNS } from '../../scripts/wing-nav.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const REGISTRY = resolve(here, '../../public/registry/zodiacs.registry.json');

const TITLE_CASE = {
  fire: 'Fire',
  earth: 'Earth',
  air: 'Air',
  water: 'Water',
  cardinal: 'Cardinal',
  fixed: 'Fixed',
  mutable: 'Mutable',
};

function titled(value) {
  return TITLE_CASE[value] ?? value;
}

/**
 * "The Ram. Where the year begins." — the epithet's first sentence names the
 * figure, which is what belongs on a cover. The rest is the page's business.
 */
export function figureOf(epithet) {
  return epithet.split('.')[0]?.trim() ?? '';
}

export async function readVolumes() {
  const registry = JSON.parse(await readFile(REGISTRY, 'utf8'));
  const assets = new Map(registry.assets.map((asset) => [asset.sign, asset]));
  const nav = new Map(NAV_SIGNS.map((sign) => [sign.slug, sign]));

  return SIGN_ORDER.map((slug, i) => {
    const asset = assets.get(slug);
    const page = SIGN_PAGES[slug];
    const chrome = nav.get(slug);
    if (!asset || !page || !chrome) throw new Error(`shelf: incomplete record for ${slug}`);

    const { metadata } = asset;
    return {
      slug,
      order: i + 1,
      lot: page.lot,
      name: asset.displayName,
      // Keep U+FE0E. Without the text-presentation selector the browser
      // resolves ♈ to the colour emoji font, on the page and in the canvas
      // alike, and the spines end up wearing stickers.
      glyph: page.glyph,
      figure: figureOf(page.epithet),
      epithet: page.epithet,
      hue: chrome.hue,
      symbol: asset.native.symbol,
      element: titled(metadata.element),
      modality: titled(metadata.modality),
      ruler: metadata.rulingPlanet,
      archetype: metadata.archetype,
      dates: page.datesDisplay,
      datesShort: chrome.dates,
      star: page.principalStar.name,
    };
  });
}

/** "Fixed fire · ruled by the Sun" — the classification line, in wing voice. */
export function classification(volume) {
  return `${volume.modality} ${volume.element.toLowerCase()} · ruled by ${volume.ruler}`;
}
