// The gallery band — the twelve as the registry hub's selector.
//
// The contract has three parties: the hub page (pre-paint WebGL probe + the
// band's CSS), the hub application (the skeleton, the strip gate, the lazy
// bundle), and the scene (embed mode: no card, no hash writes, events out,
// navigation in). Each is pinned where it lives, source and artifact both,
// so the compiled output cannot drift from the contract.

import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(resolve(root, path), 'utf8');

describe('the gallery band on the registry hub', () => {
  it('renders the embedded stage skeleton and gates the strip on the probe', async () => {
    const source = await read('src/app.jsx');
    for (const marker of [
      'data-gallery-embed',
      'data-gallery-initial',
      'zodiacs:gallery-sign',
      'zodiacs:gallery-focus',
      "'/assets/gallery.js'",
      "classList.contains('gallery-live')",
    ]) expect(source).toContain(marker);
    // One selector or the other, decided once by the probe — never both.
    expect(source).toContain('{!GALLERY_LIVE && <Selector');
    expect(source).toContain('{GALLERY_LIVE && (');
  });

  it('ships the same contract in the compiled application', async () => {
    const bundle = await read('public/assets/app.js');
    for (const marker of [
      'data-gallery-embed',
      'data-gallery-initial',
      'zodiacs:gallery-sign',
      'zodiacs:gallery-focus',
      '/assets/gallery.js',
      'gallery-live',
    ]) expect(bundle).toContain(marker);
    // The pastel-polish bans hold for the band's copy too.
    expect(bundle).not.toContain('Auto-rotating');
    expect(bundle).not.toContain('Scroll or drag');
  });

  it('probes WebGL before first paint and dresses the live page', async () => {
    const html = await read('public/registry/index.html');
    expect(html).toContain("documentElement.classList.add('gallery-live')");
    expect(html).toContain('.gband {');
    // The featured card yields its duplicate artwork to the band.
    expect(html).toContain('html.gallery-live #featured-sign .glyph-stage { display: none; }');
  });

  it('keeps the scene off the address bar and off vertical wheels', async () => {
    const scene = await read('src/shelf/main.mjs');
    // The band never writes the hash — the page's hashes belong to its
    // section anchors; a slug is read on arrival only.
    expect(scene).not.toContain('replaceState');
    expect(scene).toContain('signFromHash(window.location.hash');
    // A vertical wheel over the band is the page scrolling past.
    expect(scene).toContain('Math.abs(event.deltaX) <= Math.abs(event.deltaY)');
    // A sculpture opens its record in place — never a navigation.
    expect(scene).not.toContain('location.assign');
    expect(scene).toContain('void openFigure(index)');
    // Hovering says so before the click does.
    expect(scene).toContain('setHover(scene.pick(');
  });

  it('renders the record card and the hover label in the band', async () => {
    const source = await read('src/app.jsx');
    for (const marker of [
      'data-gallery-card',
      'data-market-jupiter',
      'data-market-dexscreener',
      'data-gallery-name',
      'Open Jupiter route',
      'View market data',
    ]) expect(source).toContain(marker);
    const html = await read('public/registry/index.html');
    expect(html).toContain('.gcard {');
    expect(html).toContain('.gband.is-open {');
    expect(html).toContain('.gband__name {');
    // The static catalogue carries the twelve as fragment targets for the
    // sign pages' backlinks, JavaScript or not.
    for (const slug of ['aries', 'virgo', 'pisces']) {
      expect(html).toContain(`<li id="${slug}">`);
    }
  });

  it('shows the wallet disc where a holder checks it', async () => {
    // The rail ticks are the pastel discs wallets show, and the card sets
    // the same disc beside the addresses it names.
    const scene = await read('src/shelf/main.mjs');
    expect(scene).toContain('/assets/zodiac-icons/48/');
    const card = await read('src/shelf/card.mjs');
    expect(card).toContain('/assets/zodiac-icons/128/');
    expect(card).toContain('As it appears in wallets.');
    const html = await read('public/registry/index.html');
    expect(html).toContain('.gcard .rec__disc');
    expect(html).toContain('.gband .rail__tick img');
    const bundle = await read('public/assets/gallery.js');
    expect(bundle).toContain('As it appears in wallets.');
  });

  it('strikes the casts in relief from their own artwork', async () => {
    const sceneSource = await read('src/shelf/scene.mjs');
    expect(sceneSource).toContain('bumpMap = map');
    expect(sceneSource).toContain('bumpScale');
  });

  it('magnifies the rail from one custom property, width included', async () => {
    // The centipede depends on --mag driving *width* as well as scale: a
    // swollen disc has to push its neighbours aside, not cover them. Scale
    // alone would still look magnified and would silently lose the wave.
    const html = await read('public/registry/index.html');
    expect(html).toContain('width: calc(var(--tick) * var(--mag))');
    expect(html).toContain('transform: scale(var(--mag)); transform-origin: bottom center;');
    // The scene measures the wave in this pitch, so the CSS has to declare it.
    expect(html).toMatch(/\.gband \.rail \{\s*--tick:/);

    const scene = await read('src/shelf/main.mjs');
    expect(scene).toContain("getPropertyValue('--tick')");
    expect(scene).toContain("setProperty('--mag'");
    // The resting magnification is affordance, not animation: the current
    // sign stands proud for touch and keyboard readers who raise no wave.
    expect(scene).toContain('1 + DOCK.rest');
    // And the wave itself is withheld while a reader asks for less motion,
    // read at event time rather than latched at mount.
    expect(scene).toContain('if (motion.matches || event.pointerType !== \'mouse\') return;');
  });

  it('spends size on focus rather than on which sign it is', async () => {
    const layout = await read('src/shelf/layout.mjs');
    // Fitting the twelve together caps the set into a narrow height band, so
    // the spotlight's jump is the dominant size signal instead of identity.
    expect(layout).toContain('heightSpread');
    expect(layout).toContain('export function fitScales');
    expect(layout).toContain('export const SPOTLIGHT');
    expect(layout).toContain('export const DOCK');
    expect(layout).toContain('export function dockMagnify');

    const sceneSource = await read('src/shelf/scene.mjs');
    // The set is fitted together, never figure by figure.
    expect(sceneSource).toContain('fitScales(');
    // Emphasis has to reach scale *and* opacity, or the row recedes in size
    // while staying equally lit — half a spotlight reads as a glitch.
    expect(sceneSource).toContain('spot.scale');
    expect(sceneSource).toContain('spot.opacity');
    // The camera frames the row it actually got, so a shorter tallest figure
    // pulls the camera in rather than shrinking the row on screen.
    expect(sceneSource).toContain('rowContent(GALLERY, tallest)');

    const bundle = await read('public/assets/gallery.js');
    expect(bundle).toContain('--mag');
    expect(bundle).toContain('--tick');
  });

  it('bakes the twelve into the bundle so the skeleton is enough', async () => {
    const generator = await read('scripts/build-shelf.mjs');
    expect(generator).toContain('__GALLERY_FIGURES__: JSON.stringify(figureData)');
    const bundle = await read('public/assets/gallery.js');
    // A record only the baked data would carry into the bundle.
    expect(bundle).toContain('The Maiden. Last of the immortals to leave.');
  });
});
