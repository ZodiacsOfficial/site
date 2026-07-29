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

  it('keeps the embedded scene off the address bar and off vertical wheels', async () => {
    const scene = await read('src/shelf/main.mjs');
    expect(scene).toContain("root.hasAttribute('data-gallery-embed')");
    // Hash writes belong to the standalone page alone.
    expect(scene).toContain('} else if (window.history?.replaceState) {');
    // A vertical wheel over the band is the page scrolling past.
    expect(scene).toContain('Math.abs(event.deltaX) <= Math.abs(event.deltaY)');
    // Opening a sculpture from the hub is a navigation, not a card.
    expect(scene).toContain("window.location.assign(`/registry/gallery/#${records[index].slug}`)");
  });

  it('bakes the twelve into the bundle so the skeleton is enough', async () => {
    const generator = await read('scripts/build-shelf.mjs');
    expect(generator).toContain('__GALLERY_FIGURES__: JSON.stringify(figureData)');
    const bundle = await read('public/assets/gallery.js');
    // A record only the baked data would carry into the bundle.
    expect(bundle).toContain('The Maiden. Last of the immortals to leave.');
  });
});
