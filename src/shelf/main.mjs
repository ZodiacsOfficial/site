// Driving the gallery band — the twelve sculptures on the registry page.
//
// Input, damping, and the accessible controls that shadow every gesture. The
// page is complete without this file: without WebGL the band never renders
// and the disc strip serves as the selector instead.

import {
  DOCK, GALLERY, TURNTABLE, approach, clampFocus, dockMagnify, embedBand, nearestIndex,
  shortestTurn, signFromHash, wheelToFocusDelta, dragToFocusDelta, dragIntent,
  flingCarry, turntableActive,
} from './layout.mjs';
import { createScene } from './scene.mjs';
import { createCard } from './card.mjs';
import { ensureFonts } from './textures.mjs';

// The twelve records ride inside the bundle (stamped by build-shelf.mjs), so
// any page that renders the stage skeleton can host the row. A page may still
// override them with a JSON island, which wins when present.
const stage = document.querySelector('[data-gallery-stage]');
const source = document.getElementById('gallery-figures');
if (stage) {
  void mount(stage, source ? JSON.parse(source.textContent) : __GALLERY_FIGURES__);
}

function supported() {
  try {
    const probe = document.createElement('canvas');
    return Boolean(probe.getContext('webgl2') || probe.getContext('webgl'));
  } catch {
    return false;
  }
}

async function mount(root, records) {
  if (!supported()) return;

  const count = records.length;
  const mountPoint = root.querySelector('[data-gallery-canvas]');
  const rail = root.querySelector('[data-gallery-rail]');
  const opener = root.querySelector('[data-gallery-open]');
  const hint = root.querySelector('[data-gallery-hint]');
  const live = root.querySelector('[data-gallery-live]');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  // The consumer rectangle shows one piece rather than a shelf to open: the
  // record it would draw out is already beside it on the page. Read once — the
  // rectangle is not a mode the reader can leave.
  const spotlight = root.hasAttribute('data-gallery-spotlight');

  const nameLabel = root.querySelector('[data-gallery-name]');

  const HINT_ROW = 'Drag to browse · Choose a sign to open.';
  const HINT_SHOWING = 'Drag to rotate · Esc to close.';
  const dockMotion = window.matchMedia('(hover: hover) and (pointer: fine)');

  await ensureFonts();

  const canvas = document.createElement('canvas');
  canvas.className = 'stage__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  mountPoint.append(canvas);

  let scene;
  try {
    scene = createScene(canvas, records);
  } catch {
    canvas.remove();
    return;
  }

  // "/registry/#leo" arrives standing in front of Leo with its record open —
  // the reader asked for a particular piece. Otherwise the host page names
  // the starting sign.
  const slugs = records.map((record) => record.slug);
  const asked = signFromHash(window.location.hash, slugs);
  const seeded = asked >= 0 ? asked : slugs.indexOf(root.dataset.galleryInitial ?? '');
  const start = Math.max(0, seeded);

  const state = {
    // The first painted sculpture must agree with the host's selected record.
    // Arrival choreography belongs to the page around the canvas, not to a
    // trip through unrelated signs inside it.
    focus: start,
    targetFocus: start,
    // A distant selector jump dips the current piece out and the destination
    // in, rather than driving the camera past every sign between them.
    switchFrom: -1,
    switchProgress: 1,
    open: 0,
    targetOpen: 0,
    openIndex: -1,
    yaw: 0, targetYaw: 0,
    pitch: 0, targetPitch: 0,
    zoom: 0, targetZoom: 0,
    hover: -1,
    spotlight,
    reducedMotion: motion.matches,
  };

  const card = createCard(root, { onClose: () => closeFigure() });

  // ---- the vitrine -------------------------------------------------------
  //
  // The stage shares one viewport with the header above it, the controls below
  // it, and — once a sculpture is drawn out — the card beside or under it.
  // Rather than pick a camera position and hope the tallest figure clears the
  // title, measure the band actually left over and hand it to the scene, which
  // fits the camera to it. Offsets rather than client rects: they ignore the
  // card's entrance transform and the page's scroll position alike.

  const chrome = root.querySelector('.gband__chrome');
  const GAP = 20;
  const FLOOR = 140;

  function bandRects() {
    const width = mountPoint.offsetWidth;
    const height = mountPoint.offsetHeight;

    // The section is its own room. The row band runs from its top down to
    // its controls; with a card open, the piece on display gets whatever the
    // card leaves — beside it on wide viewports, above it on narrow ones.
    const row = embedBand(width, height, chrome ? chrome.offsetTop : height, GAP, FLOOR);

    const band = (top, bottom, left, right) => ({
      x: left,
      y: top,
      width: Math.max(FLOOR, right - left),
      height: Math.max(FLOOR, bottom - top),
    });

    const panel = card.element.hidden ? null : card.element;
    if (!panel || !panel.offsetWidth) return { row, stage: row };
    const controls = chrome ? chrome.offsetTop : height;
    const beside = panel.offsetLeft > width * 0.4;
    const stage = beside
      ? band(GAP, controls - GAP, 0, panel.offsetLeft - GAP)
      : band(GAP, panel.offsetTop - GAP, 0, width);
    return { row, stage };
  }

  function syncBands() {
    const { row, stage } = bandRects();
    scene.setBands(row, stage);
  }

  // A piece on display turns slowly, as on a dealer's turntable, until the
  // reader takes it in hand — then it is theirs to aim. Reduced motion
  // disables the turntable outright. The Registry spotlight is already the
  // display pose, so it receives the same turntable without opening a card.
  const TURNTABLE_RATE = spotlight ? TURNTABLE.spotlightRate : TURNTABLE.openedRate;
  let handTurned = false;
  let stageVisible = true;
  let externallyPaused = root.hasAttribute('data-gallery-paused');
  let turnResumeTimer = 0;
  let forcedTurnResume = false;

  function syncRotationState(explicit = null) {
    if (!spotlight) return;
    const next = explicit
      ?? (state.reducedMotion ? 'manual' : handTurned ? 'held' : 'ambient');
    if (root.dataset.galleryRotation !== next) root.dataset.galleryRotation = next;
  }

  syncRotationState();

  function clearTurnResume({ clearForced = false } = {}) {
    window.clearTimeout(turnResumeTimer);
    turnResumeTimer = 0;
    if (clearForced) forcedTurnResume = false;
  }

  function scheduleTurnResume({ force = false } = {}) {
    if (force) forcedTurnResume = true;
    clearTurnResume();
    if ((!spotlight && !forcedTurnResume) || state.reducedMotion || !handTurned) return;
    turnResumeTimer = window.setTimeout(() => {
      turnResumeTimer = 0;
      forcedTurnResume = false;
      handTurned = false;
      syncRotationState();
      invalidate();
    }, TURNTABLE.resumeAfter);
  }

  function resetSpotlightTurn(index, { immediate = false } = {}) {
    if (!spotlight) return;
    handTurned = false;
    clearTurnResume({ clearForced: true });
    state.targetYaw = shortestTurn(state.yaw, 0);
    state.targetPitch = 0;
    state.targetZoom = 0;
    if (immediate || state.reducedMotion) {
      state.yaw = state.targetYaw;
      state.pitch = state.targetPitch;
      state.zoom = state.targetZoom;
    }
    syncRotationState();
    void scene.refine(index).then((changed) => { if (changed) invalidate(); });
  }

  // ---- the frame loop --------------------------------------------------
  // Nothing is drawn unless something is still moving; the gallery at rest
  // costs nothing.

  let raf = 0;
  let last = 0;
  let disposed = false;

  // Exponential response for gestures that move through adjacent pieces.
  // At 15/s the visible travel is about 98% complete inside 260ms. Distant
  // choices use the shorter, non-spatial handoff below instead.
  const FOCUS_RESPONSE = 15;
  const TURN_RESPONSE = 14;
  const DIRECT_SWITCH_SECONDS = 0.22;

  function settled() {
    return Math.abs(state.focus - state.targetFocus) < 0.0005
      && state.switchFrom < 0
      && Math.abs(state.open - state.targetOpen) < 0.0005
      && Math.abs(state.yaw - state.targetYaw) < 0.0005
      && Math.abs(state.pitch - state.targetPitch) < 0.0005
      && Math.abs(state.zoom - state.targetZoom) < 0.0005;
  }

  function step(dt) {
    if (state.reducedMotion) {
      state.focus = state.targetFocus;
      state.switchFrom = -1;
      state.switchProgress = 1;
      state.open = state.targetOpen;
      state.yaw = state.targetYaw;
      state.pitch = state.targetPitch;
      state.zoom = state.targetZoom;
      return false;
    }

    state.focus = approach(state.focus, state.targetFocus, FOCUS_RESPONSE, dt);
    state.open = approach(state.open, state.targetOpen, 9, dt);
    state.yaw = approach(state.yaw, state.targetYaw, TURN_RESPONSE, dt);
    state.pitch = approach(state.pitch, state.targetPitch, TURN_RESPONSE, dt);
    state.zoom = approach(state.zoom, state.targetZoom, TURN_RESPONSE, dt);
    if (state.switchFrom >= 0) {
      state.switchProgress = Math.min(
        1,
        state.switchProgress + (dt / DIRECT_SWITCH_SECONDS),
      );
      if (state.switchProgress >= 1) state.switchFrom = -1;
    }
    if (settled()) {
      state.focus = state.targetFocus;
      state.open = state.targetOpen;
      state.yaw = state.targetYaw;
      state.pitch = state.targetPitch;
      state.zoom = state.targetZoom;
      return false;
    }
    return true;
  }

  function frame(now) {
    if (disposed) return;
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now;
    const turning = turntableActive({
      spotlight,
      open: state.open,
      targetOpen: state.targetOpen,
      switchFrom: state.switchFrom,
      focus: state.focus,
      targetFocus: state.targetFocus,
      stageVisible,
      paused: externallyPaused,
      handTurned,
      reducedMotion: state.reducedMotion,
      dragging: Boolean(drag) || pointers.size > 0,
    });
    if (turning) {
      state.yaw += TURNTABLE_RATE * dt;
      state.targetYaw = state.yaw;
    }
    // Advance first so reduced-motion input paints its destination on this
    // frame rather than briefly rendering the old state and then stopping.
    const stateMoving = step(dt);
    const settling = scene.layout(state, dt);
    scene.render();
    const moving = stateMoving || turning || settling;
    raf = moving ? requestAnimationFrame(frame) : 0;
    if (!moving) last = 0;
  }

  function invalidate() {
    if (disposed || raf) return;
    last = 0;
    raf = requestAnimationFrame(frame);
  }

  // The spotlight otherwise has a perpetual frame loop. Keep the museum
  // turntable alive only while its room is near the viewport.
  const visibilityObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver(([entry]) => {
      stageVisible = entry.isIntersecting;
      if (stageVisible) invalidate();
    }, { rootMargin: '120px 0px' })
    : null;
  visibilityObserver?.observe(root);

  const pauseTurntable = () => { externallyPaused = true; };
  const resumeTurntable = () => {
    externallyPaused = false;
    invalidate();
  };
  root.addEventListener('zodiacs:gallery-pause', pauseTurntable);
  root.addEventListener('zodiacs:gallery-resume', resumeTurntable);

  // ---- position along the row ------------------------------------------

  let snapTimer = 0;
  let snapFromIndex = -1;
  function clearSnap() {
    window.clearTimeout(snapTimer);
    snapTimer = 0;
    snapFromIndex = -1;
  }
  function scheduleSnap(fromIndex = current()) {
    if (snapFromIndex < 0) {
      snapFromIndex = fromIndex;
      if (spotlight) clearTurnResume();
    }
    window.clearTimeout(snapTimer);
    snapTimer = window.setTimeout(() => {
      snapTimer = 0;
      const previous = snapFromIndex;
      snapFromIndex = -1;
      state.targetFocus = nearestIndex(state.targetFocus, count);
      if (spotlight && current() !== previous) resetSpotlightTurn(current());
      else {
        syncRotationState();
        scheduleTurnResume();
      }
      syncChrome();
      invalidate();
    }, 140);
  }

  function focusFigure(index, { announce = true, immediate = false } = {}) {
    const target = clampFocus(index, count);
    const previous = current();
    const visualIndex = state.switchFrom >= 0 && state.switchProgress < 0.5
      ? state.switchFrom
      : nearestIndex(state.focus, count);
    const distant = spotlight && Math.abs(target - visualIndex) > 1;

    state.targetFocus = target;
    if (immediate || state.reducedMotion) {
      state.focus = target;
      state.switchFrom = -1;
      state.switchProgress = 1;
    } else if (distant) {
      // Hold both endpoints at the centre of the room and hand the light from
      // one to the other. The scene owns the opacity curve; focus can already
      // become the destination without revealing intervening sculptures.
      state.focus = target;
      state.switchFrom = visualIndex;
      state.switchProgress = 0;
    } else {
      state.switchFrom = -1;
      state.switchProgress = 1;
    }
    if (spotlight && target !== previous) {
      // Every newly chosen cast arrives face-first, then begins its own quiet
      // turn. Returning by the shortest path avoids unwinding a hand turn.
      resetSpotlightTurn(target, { immediate });
    }
    clearSnap();
    syncChrome();
    if (announce) speak(`${records[current()].name}, Lot ${records[current()].lot}`);
    invalidate();
  }

  function current() {
    return nearestIndex(state.targetFocus, count);
  }

  let spoken = 0;
  function speak(message) {
    if (!live) return;
    window.clearTimeout(spoken);
    spoken = window.setTimeout(() => { live.textContent = message; }, 220);
  }

  // Seeded empty: the first sync announces the arrival sign to the host
  // page, hash or no hash. The band never writes the address bar — the
  // page's hashes belong to its section anchors.
  let mirroredSlug = null;
  let chromeIndex = -1;
  let chromeShowing = null;

  function centerRail(index) {
    const tick = ticks[index];
    const maximum = rail.scrollWidth - rail.clientWidth;
    if (!tick || maximum <= 0) return;
    const target = tick.offsetLeft + (tick.offsetWidth / 2) - (rail.clientWidth / 2);
    rail.scrollTo({ left: Math.max(0, Math.min(maximum, target)), behavior: 'auto' });
  }

  function syncChrome() {
    const index = current();
    const record = records[index];
    const indexChanged = index !== chromeIndex;
    const showing = state.targetOpen > 0;
    const showingChanged = showing !== chromeShowing;
    if (record.slug !== mirroredSlug) {
      mirroredSlug = record.slug;
      // The host page owns the address bar; the selection is an event.
      root.dispatchEvent(new CustomEvent('zodiacs:gallery-sign', {
        bubbles: true,
        detail: { slug: record.slug },
      }));
    }
    if (opener && (indexChanged || showingChanged)) {
      opener.textContent = showing ? 'Back to the Twelve' : `View ${record.name}`;
      opener.setAttribute(
        'aria-label',
        showing ? 'Return the sculpture to the row' : `View the ${record.name} sculpture`,
      );
    }
    // The instruction follows the state: browsing the row and turning a piece
    // in the hand are different gestures.
    if (hint && (indexChanged || showingChanged)) {
      const text = showing ? HINT_SHOWING : HINT_ROW;
      if (hint.textContent !== text) hint.textContent = text;
    }
    if (indexChanged) {
      for (const [i, button] of ticks.entries()) {
        const isCurrent = i === index;
        button.tabIndex = isCurrent ? 0 : -1;
        button.setAttribute('aria-current', isCurrent ? 'true' : 'false');
        button.setAttribute('aria-pressed', isCurrent ? 'true' : 'false');
      }
      // Keep a narrow rail centred without asking scrollIntoView to move the
      // page or any of the band's ancestors.
      if (!drag) centerRail(index);
      // At rest the current sign is the one standing proud.
      if (!rail.matches(':hover')) dockAt(null);
    }
    chromeIndex = index;
    chromeShowing = showing;
  }

  // ---- drawing a figure out and returning it ---------------------------

  async function openFigure(index, { takeFocus = true } = {}) {
    // Nothing is ever drawn out of the rectangle. Guarding here rather than at
    // each caller makes it a property of the mode instead of a promise every
    // future call site has to keep.
    if (spotlight) return;
    const record = records[index];
    clearTurnResume({ clearForced: true });
    handTurned = false;
    setHover(-1);
    // One gesture: a side figure swings to the front as it is drawn out.
    state.targetFocus = clampFocus(index, count);
    clearSnap();
    state.openIndex = index;
    state.targetOpen = 1;
    state.targetYaw = 0;
    state.targetPitch = 0;
    state.targetZoom = 0;
    root.classList.add('is-open');
    card.open(record);
    // The card is in the document now, so the room it leaves can be measured
    // before the first frame of the piece being drawn out.
    syncBands();
    syncChrome();
    speak(`${record.name} drawn forward. Lot ${record.lot} of twelve.`);
    invalidate();
    // Moving from one piece on display to the next leaves the reader's focus
    // where it was — on the rail they are walking along.
    if (takeFocus) card.closer.focus({ preventScroll: true });
    if (await scene.refine(index)) invalidate();
  }

  /** Walking the rail with a piece already on display swaps the piece. */
  function showFigure(index, { immediate = false } = {}) {
    focusFigure(index, { announce: state.targetOpen === 0, immediate });
    if (state.targetOpen > 0 && index !== state.openIndex) {
      void openFigure(index, { takeFocus: false });
    }
  }

  function closeFigure() {
    if (state.openIndex < 0) return;
    const index = state.openIndex;
    state.targetOpen = 0;
    // A figure turned right around settles back the short way rather than
    // unwinding every turn it was given.
    state.targetYaw = shortestTurn(state.yaw, 0);
    state.targetPitch = 0;
    state.targetZoom = 0;
    root.classList.remove('is-open');
    card.close();
    // Keep the figure identified until it is back in line, then release it.
    window.setTimeout(() => {
      if (state.targetOpen === 0) state.openIndex = -1;
    }, 700);
    syncChrome();
    speak(`${records[index].name} returned to the row.`);
    ticks[index]?.focus({ preventScroll: true });
    invalidate();
  }

  function toggle(index) {
    if (state.openIndex >= 0 && state.targetOpen > 0) closeFigure();
    else void openFigure(index);
  }

  // ---- the tick rail: the gallery's keyboard and pointer contract -------

  const ticks = records.map((record, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'rail__tick';
    button.style.setProperty('--sign', record.hue);
    button.dataset.index = String(index);
    button.tabIndex = index === 0 ? 0 : -1;
    button.setAttribute('aria-pressed', index === 0 ? 'true' : 'false');
    // The tick is the sign's pastel disc — the same icon wallets show for
    // the token — so the row and a holder's wallet visibly agree.
    button.innerHTML = '<picture aria-hidden="true">'
      + `<source srcset="/assets/zodiac-icons/48/${record.slug}.avif" type="image/avif"/>`
      + `<img src="/assets/zodiac-icons/48/${record.slug}.webp" width="26" height="26"`
      + ' alt="" loading="lazy" decoding="async"/></picture>';
    button.setAttribute('aria-label', `${record.name}, Lot ${record.lot} of twelve`);
    button.addEventListener('click', () => {
      if (spotlight) { showFigure(index); return; }
      if (current() === index && state.targetOpen === 0) void openFigure(index);
      else showFigure(index);
    });
    return button;
  });
  // One swap: the page's inert placeholder discs hand the rail to the live
  // ticks without a frame of empty chrome between them.
  rail.replaceChildren(...ticks);
  root.classList.add('is-ready');
  root.dispatchEvent(new CustomEvent('zodiacs:gallery-ready', { bubbles: true }));

  // ---- the rail magnifies like a dock ------------------------------------
  //
  // Whatever the cursor is nearest swells most and its neighbours less, so the
  // row of twelve reads as one creature moving under the hand. At rest the
  // current sign stands proud on its own — a reader on a touchscreen, or on a
  // keyboard, still sees which of the twelve the row is holding.

  // The pitch the wave is measured in: one resting tick. Read from the
  // stylesheet so the two never drift apart.
  const tickPitch = parseFloat(getComputedStyle(rail).getPropertyValue('--tick')) || 32;
  let dockFrame = 0;

  /** Size every disc for a cursor at `cursorX`, or for rest when null. */
  function dockAt(cursorX) {
    dockFrame = 0;
    const resting = current();
    let nearest = -1;
    let best = Infinity;
    for (const [i, button] of ticks.entries()) {
      if (cursorX === null) {
        button.style.setProperty('--mag', i === resting ? String(1 + DOCK.rest) : '1');
        continue;
      }
      const box = button.getBoundingClientRect();
      const away = (box.left + (box.width / 2)) - cursorX;
      button.style.setProperty('--mag', dockMagnify(away / tickPitch).toFixed(3));
      if (Math.abs(away) < best) { best = Math.abs(away); nearest = i; }
    }
    // The wave names whichever disc it has swollen most.
    if (cursorX === null) clearName('rail');
    else nameFor(nearest, 'rail');
  }

  function scheduleDock(cursorX) {
    if (dockFrame) cancelAnimationFrame(dockFrame);
    dockFrame = requestAnimationFrame(() => dockAt(cursorX));
  }

  rail.addEventListener('pointermove', (event) => {
    // A wave that follows the cursor is motion; reduced motion keeps only the
    // resting magnification, which is affordance rather than animation. Read
    // at event time, so a reader who changes the preference is obeyed without
    // reloading the page.
    if (motion.matches || !dockMotion.matches || event.pointerType !== 'mouse') return;
    scheduleDock(event.clientX);
  });
  rail.addEventListener('pointerleave', () => scheduleDock(null));

  rail.addEventListener('keydown', (event) => {
    const moves = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 1, ArrowUp: -1 };
    let next = null;
    if (event.key in moves) next = current() + moves[event.key];
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = count - 1;
    if (next === null) return;
    event.preventDefault();
    const index = clampFocus(next, count);
    // Keyboard navigation is high-frequency and should feel as direct as the
    // focus ring itself. It keeps selection feedback but skips spatial travel.
    showFigure(index, { immediate: true });
    ticks[index].focus({ preventScroll: true });
  });

  opener?.addEventListener('click', () => toggle(current()));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.targetOpen > 0) {
      event.preventDefault();
      closeFigure();
    }
  });

  // ---- pointer -----------------------------------------------------------

  const pointers = new Map();
  let drag = null;
  let pinch = 0;
  const TOUCH_FIGURES_PER_VIEWPORT = 3;
  const VELOCITY_BLEND = 0.35;

  /**
   * One label, one meaning: this is the piece you are pointing at. It serves
   * the sculptures and the rail alike, placed under whichever it is naming.
   * Whoever raised it owns it — the rail leaving must not take down a name
   * the row has just put up, or the two surfaces fight over one element.
   */
  let namedBy = null;

  function clearName(source) {
    if (!nameLabel || namedBy !== source) return;
    namedBy = null;
    nameLabel.classList.remove('is-visible', 'is-rail');
  }

  function nameFor(index, source) {
    if (!nameLabel) return;
    if (index < 0 || !source) {
      clearName(source);
      return;
    }
    namedBy = source;
    const record = records[index];
    nameLabel.textContent = `${record.name} — Lot ${record.lot}`;
    const x = source === 'rail'
      ? (() => {
        const box = ticks[index].getBoundingClientRect();
        return (box.left + (box.width / 2)) - mountPoint.getBoundingClientRect().left;
      })()
      : scene.screenX(index);
    if (Number.isFinite(x)) {
      const width = mountPoint.offsetWidth;
      nameLabel.style.left = `${Math.min(width - 70, Math.max(70, x))}px`;
    }
    nameLabel.classList.toggle('is-rail', source === 'rail');
    nameLabel.classList.add('is-visible');
  }

  /** The hovered figure lifts to say it opens; the label names it. */
  function setHover(index) {
    if (state.hover === index) return;
    state.hover = index;
    canvas.style.cursor = index >= 0 ? 'pointer' : '';
    if (index >= 0) nameFor(index, 'stage');
    else clearName('stage');
    invalidate();
  }

  canvas.addEventListener('pointerleave', () => setHover(-1));

  function restoreGesture(cancelled, { settleTurn = false } = {}) {
    if (cancelled.mode === 'rotate') {
      // A cancelled turn returns to the exact target it found. Keep ambient
      // motion out until that restoration has settled, then resume quietly.
      handTurned = settleTurn ? true : cancelled.handTurned;
      state.targetYaw = cancelled.yaw;
      state.targetPitch = cancelled.pitch;
      state.targetZoom = cancelled.zoom;
    } else {
      state.targetFocus = cancelled.focus;
      if (spotlight) handTurned = cancelled.handTurned;
      syncChrome();
    }
    syncRotationState();
    scheduleTurnResume({ force: settleTurn });
    invalidate();
  }

  canvas.addEventListener('pointerdown', (event) => {
    // Mouse and pen keep their existing capture contract. Touch waits until
    // horizontal intent is clear so a vertical page scroll remains native.
    if (event.pointerType !== 'touch') canvas.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2) {
      if (spotlight && drag) {
        const interrupted = drag;
        drag = null;
        pinch = 0;
        restoreGesture(interrupted, { settleTurn: interrupted.mode === 'rotate' });
        return;
      }
      const [a, b] = [...pointers.values()];
      pinch = Math.hypot(a.x - b.x, a.y - b.y);
      drag = null;
      return;
    }
    // A third contact never starts a replacement gesture while two pointers
    // already own the canvas.
    if (pointers.size > 2) {
      pointers.delete(event.pointerId);
      return;
    }
    const gestureMode = state.targetOpen > 0
      || (spotlight && scene.pick(event.clientX, event.clientY) === current())
      ? 'rotate'
      : 'browse';
    if (spotlight || gestureMode === 'rotate') {
      clearTurnResume({ clearForced: gestureMode === 'rotate' });
    }
    drag = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      focus: state.targetFocus,
      yaw: state.targetYaw,
      pitch: state.targetPitch,
      zoom: state.targetZoom,
      handTurned,
      mode: gestureMode,
      pointerType: event.pointerType,
      touchIntent: 'pending',
      velocity: 0,
      velocitySamples: 0,
      time: event.timeStamp,
      lastMove: event.timeStamp,
      moved: false,
    };
  });

  canvas.addEventListener('pointermove', (event) => {
    if (pointers.has(event.pointerId)) {
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }

    if (pointers.size === 2 && pinch > 0) {
      const [a, b] = [...pointers.values()];
      const spread = Math.hypot(a.x - b.x, a.y - b.y);
      state.targetZoom = Math.min(1, Math.max(0, state.targetZoom + ((spread - pinch) / 320)));
      pinch = spread;
      invalidate();
      return;
    }

    if (!drag || drag.id !== event.pointerId) {
      // Hovering a figure is the invitation to open it. Pointer devices
      // only — touch has no hover, and there a tap opens directly.
      if (!drag && event.pointerType === 'mouse' && state.targetOpen === 0) {
        setHover(scene.pick(event.clientX, event.clientY));
      }
      return;
    }
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved) {
      if (drag.pointerType === 'touch') {
        if (drag.touchIntent === 'vertical') return;
        drag.touchIntent = dragIntent(dx, dy);
        if (drag.touchIntent !== 'horizontal') return;
        if (!canvas.hasPointerCapture(event.pointerId)) {
          canvas.setPointerCapture(event.pointerId);
        }
      } else if (Math.hypot(dx, dy) < 5) {
        return;
      }
      drag.moved = true;
      clearSnap();
      setHover(-1);
    }

    if (drag.mode === 'rotate') {
      // A figure drawn out turns in the hand — right around, as often as the
      // reader likes. The Registry spotlight is already drawn forward, so
      // the same gesture turns it without changing the selected sign.
      handTurned = true;
      syncRotationState('dragging');
      state.targetYaw = drag.yaw + (dx / 190);
      // A touch keeps vertical movement available to the page; mouse and pen
      // retain the full two-axis inspection.
      if (drag.pointerType !== 'touch') {
        state.targetPitch = Math.max(-0.44, Math.min(0.44, drag.pitch + (dy / 300)));
      }
    } else {
      const width = canvas.clientWidth;
      const span = drag.pointerType === 'touch' ? TOUCH_FIGURES_PER_VIEWPORT : 4;
      state.targetFocus = clampFocus(
        drag.focus + dragToFocusDelta(dx, width, span),
        count,
      );
      const dt = Math.max(1, event.timeStamp - drag.time);
      const sample = (event.clientX - drag.lastX) / dt;
      drag.velocity = drag.velocitySamples === 0
        ? sample
        : (drag.velocity * (1 - VELOCITY_BLEND)) + (sample * VELOCITY_BLEND);
      drag.velocitySamples += 1;
      drag.lastMove = event.timeStamp;
      syncChrome();
    }
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    drag.time = event.timeStamp;
    invalidate();
  });

  function endPointer(event) {
    pointers.delete(event.pointerId);
    if (pointers.size < 2) pinch = 0;
    if (!drag || drag.id !== event.pointerId) {
      if (pointers.size === 0) {
        syncRotationState();
        scheduleTurnResume();
        invalidate();
      }
      return;
    }
    const finished = drag;
    drag = null;

    if (!finished.moved) {
      if (spotlight) {
        handTurned = finished.handTurned;
        syncRotationState();
        scheduleTurnResume();
        invalidate();
      }
      // A vertical touch belongs to the page, even if the browser happens to
      // deliver pointerup before it emits pointercancel for native scrolling.
      if (finished.touchIntent === 'vertical') return;
      const index = scene.pick(event.clientX, event.clientY);
      // On the plate a sculpture has one meaning: select that sign. Buying is
      // kept on the labelled Trade control, so a second tap never changes its
      // meaning beneath the reader.
      if (spotlight) {
        if (index < 0) { invalidate(); return; }
        if (index !== current()) showFigure(index);
        else invalidate();
        return;
      }
      if (index >= 0) {
        // One gesture, one meaning: a sculpture opens its record — front,
        // side, it makes no difference. Tapping the piece already on display
        // returns it; tapping a different one swaps the viewing.
        if (state.targetOpen > 0) {
          if (index === state.openIndex) closeFigure();
          else void openFigure(index, { takeFocus: false });
        } else {
          void openFigure(index);
        }
      } else if (state.targetOpen > 0) {
        closeFigure();
      }
      return;
    }

    if (finished.mode === 'rotate') {
      syncRotationState();
      scheduleTurnResume();
      return;
    }
    // Carry the throw a little, then settle on a figure.
    const idleMs = Math.max(0, event.timeStamp - finished.lastMove);
    const carried = motion.matches ? 0 : flingCarry(finished.velocity, idleMs);
    const previous = nearestIndex(finished.focus, count);
    state.targetFocus = nearestIndex(
      clampFocus(state.targetFocus + carried, count), count,
    );
    if (spotlight && current() !== previous) resetSpotlightTurn(current());
    else {
      syncRotationState();
      scheduleTurnResume();
    }
    syncChrome();
    speak(`${records[current()].name}, Lot ${records[current()].lot}`);
    invalidate();
  }

  function cancelPointer(event) {
    pointers.delete(event.pointerId);
    if (pointers.size < 2) pinch = 0;
    if (drag?.id !== event.pointerId) {
      if (pointers.size === 0) {
        syncRotationState();
        scheduleTurnResume();
        invalidate();
      }
      return;
    }
    const cancelled = drag;
    drag = null;
    // Cancellation is not a release. Put the row or sculpture back exactly
    // where this gesture found it, without picking, snapping, or momentum.
    restoreGesture(cancelled, { settleTurn: cancelled.mode === 'rotate' });
  }

  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', cancelPointer);
  canvas.addEventListener('lostpointercapture', cancelPointer);

  canvas.addEventListener('wheel', (event) => {
    if (state.targetOpen > 0) {
      event.preventDefault();
      state.targetZoom = Math.min(1, Math.max(0, state.targetZoom - (event.deltaY / 900)));
      invalidate();
      return;
    }
    // Mid-page, a vertical wheel is the page scrolling past — only a
    // sideways wheel walks the row.
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
    // Firefox reports wheel deltas in lines, and some setups in pages; both
    // would crawl if read as pixels.
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? canvas.clientHeight : 1;
    const delta = wheelToFocusDelta(event.deltaX * unit, event.deltaY * unit);
    if (!delta) return;
    // At either end the row gives the wheel back so the page can scroll.
    const atStart = state.targetFocus <= 0.002 && delta < 0;
    const atEnd = state.targetFocus >= count - 1.002 && delta > 0;
    if (atStart || atEnd) return;
    event.preventDefault();
    const previous = current();
    state.targetFocus = clampFocus(state.targetFocus + delta, count);
    syncChrome();
    scheduleSnap(previous);
    invalidate();
  }, { passive: false });

  // ---- viewport ----------------------------------------------------------

  function resize() {
    const rect = mountPoint.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    scene.resize(rect.width, rect.height, window.devicePixelRatio || 1);
    syncBands();
    invalidate();
  }

  // The card counts as furniture: it decides how much room a figure on display
  // has, and it grows as its market context and records arrive.
  const observer = new ResizeObserver(resize);
  observer.observe(mountPoint);
  observer.observe(card.element);
  resize();

  const onMotionChange = () => {
    state.reducedMotion = motion.matches;
    if (state.reducedMotion) {
      state.focus = state.targetFocus;
      state.switchFrom = -1;
      state.switchProgress = 1;
      state.open = state.targetOpen;
      state.yaw = state.targetYaw;
      state.pitch = state.targetPitch;
      state.zoom = state.targetZoom;
    }
    if (state.reducedMotion) clearTurnResume();
    else scheduleTurnResume();
    syncRotationState();
    invalidate();
  };
  motion.addEventListener?.('change', onMotionChange);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
    } else if (!document.hidden) {
      invalidate();
    }
  });

  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    root.classList.remove('is-ready', 'is-open');
    root.dispatchEvent(new CustomEvent('zodiacs:gallery-unready', { bubbles: true }));
    card.close();
  });

  // Three restores its renderer resources after a recoverable context loss.
  // Restore the presentation contract with them; otherwise a context lost
  // while the canvas is hidden on mobile leaves a healthy returned canvas at
  // opacity zero for the rest of the page lifetime.
  canvas.addEventListener('webglcontextrestored', () => {
    root.classList.add('is-ready');
    root.dispatchEvent(new CustomEvent('zodiacs:gallery-ready', { bubbles: true }));
    resize();
    invalidate();
  });

  function teardown() {
    if (disposed) return;
    disposed = true;
    if (raf) cancelAnimationFrame(raf);
    clearTurnResume({ clearForced: true });
    clearSnap();
    observer.disconnect();
    visibilityObserver?.disconnect();
    motion.removeEventListener?.('change', onMotionChange);
    root.removeEventListener('zodiacs:gallery-pause', pauseTurntable);
    root.removeEventListener('zodiacs:gallery-resume', resumeTurntable);
    scene.dispose();
  }
  window.addEventListener('pagehide', teardown, { once: true });

  // The host page steers the row: its own selector still names signs, and the
  // row follows without re-announcing what it was just told.
  root.addEventListener('zodiacs:gallery-focus', (event) => {
    const slug = event?.detail?.slug;
    const index = slugs.indexOf(String(slug || '').toLowerCase());
    if (index >= 0 && index !== current()) {
      mirroredSlug = records[index].slug;
      focusFigure(index, { announce: false });
    }
  });

  root.classList.add('is-ready');
  // A slug in the hash is a request to view that piece: bring the band into
  // view and put the record on display. The static catalogue carries the
  // same ids for readers without JavaScript.
  if (asked >= 0 && spotlight) {
    // The rectangle is already standing in front of the asked-for piece —
    // seeded before the first frame — so arrival only has to bring it into
    // view. There is no record to open: it is on the page beside the figure.
    root.scrollIntoView({ block: 'center', behavior: 'instant' });
  } else if (asked >= 0) {
    root.scrollIntoView({ block: 'center', behavior: 'instant' });
    void openFigure(asked, { takeFocus: false });
  }
  syncChrome();
  invalidate();

  // The plates arrive after the room does: each figure stands in its own metal
  // until its photograph is laid on, nearest the front first.
  void scene.dressRow(start, invalidate);
  if (spotlight) void scene.refine(start).then((changed) => { if (changed) invalidate(); });
}

export { GALLERY };
