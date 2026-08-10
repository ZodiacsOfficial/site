// The gallery band — the twelve as Zodiac Terminal's selector.
//
// The contract has three parties: the Terminal page (pre-paint WebGL probe + the
// band's CSS), the Terminal application (the skeleton, the strip gate, the lazy
// bundle), and the scene (embed mode: no card, no hash writes, events out,
// navigation in). Each is pinned where it lives, source and artifact both,
// so the compiled output cannot drift from the contract.

import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(resolve(root, path), 'utf8');

function functionBody(source, name) {
  const signature = `function ${name}(`;
  const start = source.indexOf(signature);
  if (start < 0) return '';
  const open = source.indexOf('{', start);
  if (open < 0) return '';

  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    else if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(open + 1, index);
    }
  }
  return '';
}

describe('the gallery band on Zodiac Terminal', () => {
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
    // Capable phones keep the same live stage as desktop. Only a missing
    // WebGL probe falls back to the flat carousel; loading remains lazy.
    expect(source).toContain('return GALLERY_LIVE;');
    expect(source).not.toContain("window.matchMedia('(min-width: 1021px)')");
    expect(source).toContain('carousel={!stageMode}');
    expect(source).toContain('RAIL_PLACEHOLDER_HTML');
    expect(source).toContain('const [posterSlug, setPosterSlug] = useState(slug);');
    expect(source).toContain('if (!galleryReady) setPosterSlug(slug);');
    expect(source).toContain('src={`/assets/sculptures/512/${posterSlug}.webp`}');
    expect(source).toContain('connection?.saveData');
    expect(source).toContain("/(^|-)2g$/.test(connection?.effectiveType || '')");
    expect(source).not.toContain('data-consumer-gallery-toggle');
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

  it('keeps scene readiness declarative across breakpoints and context recovery', async () => {
    const [app, scene, appBundle, sceneBundle] = await Promise.all([
      read('src/app.jsx'),
      read('src/shelf/main.mjs'),
      read('public/assets/app.js'),
      read('public/assets/gallery.js'),
    ]);

    // React owns the section's class list, so readiness must be state rather
    // than a one-shot effect that a later mobile/desktop render can erase.
    expect(app).toContain('const [galleryReady, setGalleryReady] = useState(false);');
    expect(app).toContain("node.addEventListener('zodiacs:gallery-ready', onReady)");
    expect(app).toContain("node.addEventListener('zodiacs:gallery-unready', onUnready)");
    expect(app).toContain("+ (!carousel && galleryReady ? ' is-ready' : '')");
    // The scene also owns the interactive desktop rail children. Hide that
    // exact node on mobile instead of unmounting it, or a second desktop
    // render can only recreate the inert placeholder spans.
    expect(app).toContain('data-gallery-desktop-rail=""');
    expect(app).toContain('hidden={consumer && carousel}');
    expect(app).toContain('{railGroup}');
    expect(app).toContain('{carousel && <DiscRail active={active} setActive={setActive} />}');
    expect(app).not.toContain('carousel ? <DiscRail active={active} setActive={setActive} /> : railGroup');

    // The scene announces the initial successful mount, hides a genuinely
    // lost context, and announces Three's recovered renderer before repaint.
    const lost = scene.indexOf("canvas.addEventListener('webglcontextlost'");
    const restored = scene.indexOf("canvas.addEventListener('webglcontextrestored'");
    expect(scene.slice(0, lost)).toContain("'zodiacs:gallery-ready'");
    expect(scene.slice(lost, restored)).toContain("'zodiacs:gallery-unready'");
    expect(scene.slice(restored)).toContain("'zodiacs:gallery-ready'");

    // Both generated bundles ship the event contract; a source-only fix
    // would leave the deployed Registry with the second-cycle regression.
    for (const marker of ['zodiacs:gallery-ready', 'zodiacs:gallery-unready']) {
      expect(appBundle).toContain(marker);
      expect(sceneBundle).toContain(marker);
    }
  });

  it('probes WebGL before first paint and dresses the live page', async () => {
    const html = await read('public/terminal/index.html');
    expect(html).toContain("documentElement.classList.add('gallery-live')");
    expect(html).toContain('network.saveData');
    expect(html).toContain("/(^|-)2g$/.test(network.effectiveType || '')");
    expect(html).toContain('if (!constrained && (glProbe.getContext');
    expect(html).toContain('.gband {');
    // The fallback card is absent rather than merely concealed.
    expect(html).not.toContain('html.gallery-live #featured-sign');
  });

  it('keeps the scene off the address bar and off vertical wheels', async () => {
    const scene = await read('src/shelf/main.mjs');
    // The band never writes the hash — the page's hashes belong to its
    // section anchors; a slug is read on arrival only.
    expect(scene).not.toContain('replaceState');
    expect(scene).toContain('signFromHash(window.location.hash');
    // Vertical wheel input remains page scrolling; horizontal trackpad input
    // and direct drag/swipe walk the sculpture row.
    expect(scene).toContain('if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;');
    // A sculpture opens its record in place — never a navigation.
    expect(scene).not.toContain('location.assign');
    expect(scene).toContain('void openFigure(index)');
    // Hovering says so before the click does.
    expect(scene).toContain('setHover(scene.pick(');
  });

  it('shows one piece rather than a shelf when it is the landing’s rectangle', async () => {
    const [app, scene, layout] = await Promise.all([
      read('src/app.jsx'), read('src/shelf/main.mjs'), read('src/shelf/layout.mjs'),
    ]);
    // Read once at mount, not per selection: the rectangle is not a mode the
    // reader can leave, and the event contract stays exactly as it was.
    expect(app).toContain('data-gallery-spotlight');
    expect(scene).toContain("root.hasAttribute('data-gallery-spotlight')");
    expect(layout).toContain('export const SPOTLIGHT_STAGE');
    expect(layout).toContain('export const SPOTLIGHT_VITRINE');
    // Nothing is ever drawn out of it — the record is already on the page
    // beside the figure — so the card and the open pose stay unreachable.
    expect(scene).toContain('if (spotlight) { showFigure(index); return; }');
    const opens = scene.indexOf('async function openFigure(');
    expect(scene.slice(opens, scene.indexOf('\n  }\n', opens)))
      .toContain('if (spotlight) return;');
  });

  it('gives the Registry one bounded inspection sweep, then yields to the hand', async () => {
    const [app, driver, renderer, appBundle, sceneBundle] = await Promise.all([
      read('src/app.jsx'),
      read('src/shelf/main.mjs'),
      read('src/shelf/scene.mjs'),
      read('public/assets/app.js'),
      read('public/assets/gallery.js'),
    ]);

    // Rotation is a display treatment only: the spotlight never opens the
    // Thesis card or changes the selected sign when the focused cast is held.
    expect(driver).toContain('turntableActive({');
    expect(driver).toContain('spotlightElapsed >= TURNTABLE.spotlightSeconds');
    expect(driver).toContain("spotlightComplete ? 'rest' : 'ambient'");
    expect(driver).toContain('TURNTABLE.spotlightManualArc');
    expect(driver).toContain('Math.sin(progress * Math.PI * 2)');
    expect(driver).toContain("? 'rotate'\n      : 'browse'");
    expect(driver).toContain("if (drag.mode === 'rotate')");
    expect(driver).toContain("if (finished.mode === 'rotate')");
    expect(renderer).toContain('state.spotlight ? pose.prominence : 0');
    expect(renderer).toContain('pitch * inspected');
    expect(renderer).toContain('THREE.MathUtils.lerp(pose.rotationY, yaw, inspected)');
    expect(driver).toContain('function resetSpotlightTurn(index, { immediate = false } = {})');
    expect(driver).toContain('resetSpotlightTurn(target, { immediate });');
    expect(driver).toContain('current() !== previous) resetSpotlightTurn(current())');
    expect(driver).toContain('dragging: Boolean(drag) || pointers.size > 0');
    expect(driver).toContain('pointers.delete(event.pointerId);');
    expect(driver).toContain('restoreGesture(interrupted, { settleTurn: interrupted.mode');
    expect(driver).toContain('handTurned = finished.handTurned;');
    expect(driver).toContain('scheduleTurnResume({ force: settleTurn });');
    expect(driver).toContain('let forcedTurnResume = false;');
    expect(driver).toContain('function clearSnap()');
    expect(driver).toContain('clearTurnResume({ clearForced: gestureMode === \'rotate\' });');
    // Re-grabbing is interruptible: every new gesture owns the pose actually
    // on screen instead of continuing toward an earlier damping target.
    for (const marker of [
      'state.targetFocus = state.focus;',
      'state.targetYaw = state.yaw;',
      'state.targetPitch = state.pitch;',
      'state.targetZoom = state.zoom;',
    ]) expect(driver).toContain(marker);
    const pointerDown = driver.slice(
      driver.indexOf("canvas.addEventListener('pointerdown'"),
      driver.indexOf("canvas.addEventListener('pointermove'"),
    );
    const pointerMove = driver.slice(
      driver.indexOf("canvas.addEventListener('pointermove'"),
      driver.indexOf('function endPointer'),
    );
    expect(pointerDown).not.toContain('state.targetFocus = state.focus;');
    expect(pointerMove).toContain("drag.touchIntent !== 'horizontal'");
    expect(pointerMove.indexOf("drag.touchIntent !== 'horizontal'"))
      .toBeLessThan(pointerMove.indexOf('state.targetFocus = state.focus;'));

    // It costs no frames offscreen or behind acquisition, never autoplays for
    // reduced motion, and resumes only after a deliberate inspection pause.
    expect(driver).toContain("root.hasAttribute('data-gallery-paused')");
    expect(driver).toContain("new IntersectionObserver(([entry]) =>");
    expect(driver).toContain('TURNTABLE.resumeAfter');
    expect(driver).toContain("state.reducedMotion ? 'manual'");
    expect(app).toContain('data-gallery-paused=');
    expect(app).toContain("carousel || sheetVisible ? 'zodiacs:gallery-pause'");
    expect(app).toContain('zodiacs:gallery-pause');
    expect(app).toContain('data-gallery-turn-hint');

    // Generated output is part of the production contract.
    for (const marker of ['galleryRotation', 'zodiacs:gallery-pause']) {
      expect(sceneBundle).toContain(marker);
    }
    for (const marker of ['data-gallery-paused', 'gband__turn-hint', 'Drag the figure to turn']) {
      expect(appBundle).toContain(marker);
    }
  });

  it('loads only the selected high-resolution plate in the Registry spotlight', async () => {
    const [driver, renderer, textures] = await Promise.all([
      read('src/shelf/main.mjs'),
      read('src/shelf/scene.mjs'),
      read('src/shelf/textures.mjs'),
    ]);
    const arrival = driver.slice(driver.lastIndexOf('// The plates arrive after the room does:'));
    expect(arrival).toContain('if (spotlight)');
    expect(arrival).toContain('queueSpotlightRefine(start, { immediate: true });');
    expect(arrival).toContain('void scene.dressRow(start, invalidate);');
    expect(driver).toContain('scene.releaseExcept(index)');
    expect(driver).toContain('spotlightTextureRequest');
    expect(driver).toContain('spotlightController?.abort();');
    expect(driver).toContain('}, immediate ? 0 : 180);');
    expect(driver).toContain('spotlightTextureRequest += 1;');
    expect(renderer).toContain('function releaseExcept(index)');
    expect(renderer).toContain('const activeFaceMaps = new Set();');
    expect(renderer).toContain('sceneDisposed || signal?.aborted');
    expect(renderer).toContain('residentTextureCount: () => activeFaceMaps.size');
    expect(renderer).toContain('figure.face.map = null;');
    expect(renderer).toContain('disposeFaceMap(previous);');
    expect(renderer).not.toContain('disposables.push(map);');
    expect(textures).toContain('fetch(`/assets/sculptures/${tier}/${slug}.webp`');
    expect(textures).toContain('signal,');
    expect(textures).toContain("imageOrientation: 'flipY'");
    expect(textures).toContain("premultiplyAlpha: 'none'");
    expect(textures).toContain("colorSpaceConversion: 'none'");
    expect(textures).toContain("error?.name !== 'AbortError'");
  });

  it('keeps the rectangle’s rail out of the band the scene measures', async () => {
    const [app, html] = await Promise.all([
      read('src/app.jsx'), read('public/terminal/index.html'),
    ]);
    // bandRects() treats .gband__chrome's offsetTop as the FLOOR of the band
    // it may paint into, so chrome above the canvas would leave the figures a
    // 140px strip. The rectangle's rail wears its own class for that reason.
    expect(app).toContain('className="gband__rail-top"');
    expect(html).toContain('.gband__rail-top {');
    const opens = app.indexOf('function GalleryBand(');
    const rectangle = app.slice(opens, app.indexOf('</section>', opens));
    expect(rectangle).toContain('<div className="gband__rail-top">');
    expect(rectangle).toContain('{!consumer && (\n          <div className="gband__chrome">');
    // The sculpture keeps one interaction meaning: it selects. Acquisition
    // remains the explicit placard action, so the scene never navigates or
    // emits a hidden trade request.
    const scene = await read('src/shelf/main.mjs');
    expect(scene).not.toContain('zodiacs:gallery-trade');
    expect(scene).not.toContain('location.assign');
    expect(app).not.toContain('zodiacs:gallery-trade');
    expect(scene).toContain('if (index !== current()) showFigure(index);');
  });

  it('does not commit a touch gesture after the browser cancels it', async () => {
    const scene = await read('src/shelf/main.mjs');

    expect(scene).toContain("canvas.addEventListener('pointerup', endPointer)");
    expect(scene).not.toContain("canvas.addEventListener('pointercancel', endPointer)");
    expect(scene).toContain("canvas.addEventListener('pointercancel', cancelPointer)");
    expect(scene).toContain("canvas.addEventListener('lostpointercapture', cancelPointer)");

    const cancel = functionBody(scene, 'cancelPointer');
    expect(cancel).not.toBe('');
    expect(cancel).toContain('pointers.delete(event.pointerId)');
    expect(cancel).toMatch(/pointers\.size < 2[\s\S]*pinch = 0/);
    expect(cancel).toContain('drag = null');
    // Cancellation is cleanup only: no tap hit-test and no inertial throw.
    expect(cancel).not.toContain('scene.pick(');
    expect(cancel).not.toContain('velocity');
  });

  it('never turns a vertical touch into a sculpture tap', async () => {
    const scene = await read('src/shelf/main.mjs');
    const release = functionBody(scene, 'endPointer');

    expect(scene).toContain("drag.touchIntent = dragIntent(dx, dy)");
    expect(scene).toContain("if (drag.touchIntent === 'vertical') return");
    expect(release).toContain("if (finished.touchIntent === 'vertical') return");
    expect(release.indexOf("if (finished.touchIntent === 'vertical') return"))
      .toBeLessThan(release.indexOf('scene.pick('));
  });

  it('derives open chrome from the transition target and never scrolls the rail during drag', async () => {
    const scene = await read('src/shelf/main.mjs');
    const syncChrome = functionBody(scene, 'syncChrome');
    expect(syncChrome).not.toBe('');

    const showing = syncChrome.split('\n').find((line) => line.includes('const showing'));
    expect(showing).toContain('state.targetOpen');
    expect(showing).not.toContain('state.openIndex');
    // A drag may update selection, but must not force nested/page scroll on
    // every pointer sample. Deep-link arrival may still scroll the root once.
    expect(syncChrome).not.toContain('.scrollIntoView(');
    expect(syncChrome).toContain('if (!drag) centerRail(index)');
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
    const html = await read('public/terminal/index.html');
    expect(html).toContain('.gcard {');
    expect(html).toContain('.gband.is-open {');
    expect(html).toContain('.gband__name {');
    // The static explorer keeps all twelve token destinations useful without
    // JavaScript; every grid link opens the sign's official record.
    for (const slug of ['aries', 'virgo', 'pisces']) {
      expect(html).toContain(`href="/registry/${slug}/" aria-label="View the `);
    }
    expect(source).toContain('Drag to browse · Choose a sign to open.');
    expect(html).not.toContain('?gallery=gold');
  });

  it('shows the wallet disc where a holder checks it', async () => {
    // The rail ticks are the pastel discs wallets show, and the card sets
    // the same disc beside the addresses it names.
    const scene = await read('src/shelf/main.mjs');
    expect(scene).toContain('/assets/zodiac-icons/48/');
    const card = await read('src/shelf/card.mjs');
    expect(card).toContain('/assets/zodiac-icons/128/');
    expect(card).toContain('As it appears in wallets.');
    const html = await read('public/terminal/index.html');
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

  it('magnifies the rail visually without resizing its hit areas', async () => {
    // The pointer-following wave is paint-only: hit targets keep a stable
    // pitch while the picture grows inside them, avoiding layout work during
    // a WebGL interaction.
    const html = await read('public/terminal/index.html');
    expect(html).toContain('width: var(--tick); height: var(--tick)');
    expect(html).not.toContain('width: calc(var(--tick) * var(--mag))');
    expect(html).toContain('transform: scale(var(--mag)); transform-origin: bottom center;');
    // The scene measures the wave in this pitch, so the CSS has to declare it.
    expect(html).toMatch(/\.gband \.rail \{\s*--tick:/);

    const scene = await read('src/shelf/main.mjs');
    expect(scene).toContain("getPropertyValue('--tick')");
    expect(scene).toContain("setProperty('--mag'");
    expect(scene).toContain("'(hover: hover) and (pointer: fine)'");
    // The resting magnification is affordance, not animation: the current
    // sign stands proud for touch and keyboard readers who raise no wave.
    expect(scene).toContain('1 + DOCK.rest');
    // Keyboard selection snaps both the sculpture and its disc; pointer input
    // restores the dock transition for direct manipulation.
    expect(scene).toContain("root.dataset.galleryInput = 'keyboard';");
    expect(scene).toContain("root.dataset.galleryInput = 'pointer';");
    expect(html).toContain(".gband[data-gallery-input='keyboard'] .rail__tick picture { transition: none; }");
    // And the wave itself is withheld while a reader asks for less motion,
    // read at event time rather than latched at mount.
    expect(scene).toContain(
      'if (motion.matches || !dockMotion.matches || event.pointerType !== \'mouse\') return;',
    );
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
