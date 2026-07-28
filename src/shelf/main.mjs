// Driving the gallery.
//
// Input, damping, and the accessible controls that shadow every gesture. The
// page is complete without this file: the register below the stage is the real
// catalogue, and it stays in the document whether or not WebGL exists.

import {
  GALLERY, approach, clampFocus, nearestIndex, shortestTurn, signFromHash,
  wheelToFocusDelta, dragToFocusDelta,
} from './layout.mjs';
import { createScene } from './scene.mjs';
import { createCard } from './card.mjs';
import { ensureFonts } from './textures.mjs';

const stage = document.querySelector('[data-gallery-stage]');
const source = document.getElementById('gallery-figures');
if (stage && source) void mount(stage, JSON.parse(source.textContent));

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

  const HINT_ROW = 'Drag or scroll along the row. Select a sculpture to draw '
    + 'it forward, then drag to turn it. Escape returns it.';
  const HINT_SHOWING = 'Drag to turn the sculpture. The rail walks along the '
    + 'twelve; Escape returns it to the row.';

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

  // "#leo" arrives standing in front of Leo — no entrance drift, the reader
  // asked for a particular piece.
  const asked = signFromHash(window.location.hash, records.map((record) => record.slug));

  const state = {
    focus: asked >= 0 ? asked : motion.matches ? 0 : -1.4,
    targetFocus: asked >= 0 ? asked : 0,
    open: 0,
    targetOpen: 0,
    openIndex: -1,
    yaw: 0, targetYaw: 0,
    pitch: 0, targetPitch: 0,
    zoom: 0, targetZoom: 0,
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

  const navBar = document.querySelector('.wnav');
  const head = root.querySelector('.stage__head');
  const chrome = root.querySelector('.stage__chrome');
  const GAP = 20;
  const FLOOR = 140;

  function bandRects() {
    const width = mountPoint.offsetWidth;
    const height = mountPoint.offsetHeight;
    // The bar is fixed, and the stage starts at the top of the document.
    const navFloor = navBar
      ? navBar.getBoundingClientRect().bottom + window.scrollY
      : 84;
    const headFloor = head ? head.offsetTop + head.offsetHeight : navFloor;
    const controls = chrome ? chrome.offsetTop : height;

    const band = (top, bottom, left, right) => ({
      x: left,
      y: top,
      width: Math.max(FLOOR, right - left),
      height: Math.max(FLOOR, bottom - top),
    });

    const row = band(headFloor + GAP, controls - GAP, 0, width);

    // With the title out of the way, a figure on display starts under the bar
    // and stops wherever the card begins.
    const panel = card.element.hidden ? null : card.element;
    if (!panel || !panel.offsetWidth) return { row, stage: row };
    const ceiling = navFloor + GAP;
    const beside = panel.offsetLeft > width * 0.4;
    const stage = beside
      ? band(ceiling, controls - GAP, 0, panel.offsetLeft - GAP)
      : band(ceiling, panel.offsetTop - GAP, 0, width);
    return { row, stage };
  }

  function syncBands() {
    const { row, stage } = bandRects();
    scene.setBands(row, stage);
  }

  // A piece on display turns slowly, as on a dealer's turntable, until the
  // reader takes it in hand — then it is theirs to aim. Reduced motion
  // disables the turntable outright.
  const TURNTABLE_RATE = 0.22;
  let handTurned = false;

  // ---- the frame loop --------------------------------------------------
  // Nothing is drawn unless something is still moving; the gallery at rest
  // costs nothing.

  let raf = 0;
  let last = 0;
  let disposed = false;

  function settled() {
    return Math.abs(state.focus - state.targetFocus) < 0.0005
      && Math.abs(state.open - state.targetOpen) < 0.0005
      && Math.abs(state.yaw - state.targetYaw) < 0.0005
      && Math.abs(state.pitch - state.targetPitch) < 0.0005
      && Math.abs(state.zoom - state.targetZoom) < 0.0005;
  }

  function step(dt) {
    const fast = motion.matches ? 200 : 9;
    const turn = motion.matches ? 200 : 12;
    state.focus = approach(state.focus, state.targetFocus, fast, dt);
    state.open = approach(state.open, state.targetOpen, motion.matches ? 200 : 7.5, dt);
    state.yaw = approach(state.yaw, state.targetYaw, turn, dt);
    state.pitch = approach(state.pitch, state.targetPitch, turn, dt);
    state.zoom = approach(state.zoom, state.targetZoom, turn, dt);
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
    const turning = state.targetOpen === 1 && state.open > 0.98
      && !handTurned && !motion.matches && !drag;
    if (turning) {
      state.yaw += TURNTABLE_RATE * dt;
      state.targetYaw = state.yaw;
    }
    const moving = step(dt) || turning;
    scene.layout(state);
    scene.render();
    raf = moving ? requestAnimationFrame(frame) : 0;
    if (!moving) last = 0;
  }

  function invalidate() {
    if (disposed || raf) return;
    last = 0;
    raf = requestAnimationFrame(frame);
  }

  // ---- position along the row ------------------------------------------

  let snapTimer = 0;
  function scheduleSnap() {
    window.clearTimeout(snapTimer);
    snapTimer = window.setTimeout(() => {
      state.targetFocus = nearestIndex(state.targetFocus, count);
      syncChrome();
      invalidate();
    }, 140);
  }

  function focusFigure(index, { announce = true } = {}) {
    state.targetFocus = clampFocus(index, count);
    window.clearTimeout(snapTimer);
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

  // Seeded with the arrival slug so a plain visit keeps its clean URL until
  // the reader actually browses.
  let mirroredSlug = records[asked >= 0 ? asked : 0]?.slug ?? null;
  function syncChrome() {
    const index = current();
    const record = records[index];
    // The address bar names the sculpture in front, so any moment of the
    // browse can be shared. replaceState only — browsing is not history.
    if (record.slug !== mirroredSlug && window.history?.replaceState) {
      window.history.replaceState(null, '', `#${record.slug}`);
      mirroredSlug = record.slug;
    }
    const showing = state.openIndex >= 0;
    if (opener) {
      opener.textContent = showing ? 'Return the sculpture' : `View ${record.name}`;
      opener.setAttribute(
        'aria-label',
        showing ? 'Return the sculpture to the row' : `View the ${record.name} sculpture`,
      );
    }
    // The instruction follows the state: browsing the row and turning a piece
    // in the hand are different gestures.
    if (hint) {
      const text = showing ? HINT_SHOWING : HINT_ROW;
      if (hint.textContent !== text) hint.textContent = text;
    }
    for (const [i, button] of ticks.entries()) {
      const isCurrent = i === index;
      button.tabIndex = isCurrent ? 0 : -1;
      button.setAttribute('aria-current', isCurrent ? 'true' : 'false');
    }
    // The rail scrolls on narrow viewports; keep the current tick in view.
    if (rail.scrollWidth > rail.clientWidth) {
      ticks[index]?.scrollIntoView({ block: 'nearest', inline: 'center' });
    }
  }

  // ---- drawing a figure out and returning it ---------------------------

  async function openFigure(index, { takeFocus = true } = {}) {
    const record = records[index];
    handTurned = false;
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
  function showFigure(index) {
    focusFigure(index, { announce: state.targetOpen === 0 });
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
    button.innerHTML = '<span class="rail__glyph" aria-hidden="true"></span>';
    button.querySelector('.rail__glyph').textContent = record.glyph;
    button.setAttribute('aria-label', `${record.name}, Lot ${record.lot} of twelve`);
    button.addEventListener('click', () => {
      if (current() === index && state.targetOpen === 0) void openFigure(index);
      else showFigure(index);
    });
    rail.append(button);
    return button;
  });

  rail.addEventListener('keydown', (event) => {
    const moves = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 1, ArrowUp: -1 };
    let next = null;
    if (event.key in moves) next = current() + moves[event.key];
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = count - 1;
    if (next === null) return;
    event.preventDefault();
    const index = clampFocus(next, count);
    showFigure(index);
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

  canvas.addEventListener('pointerdown', (event) => {
    canvas.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = Math.hypot(a.x - b.x, a.y - b.y);
      drag = null;
      return;
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
      velocity: 0,
      time: event.timeStamp,
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

    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 5) return;
    drag.moved = true;

    if (state.targetOpen > 0) {
      // A figure drawn out turns in the hand — right around, as often as the
      // reader likes. The row stays where it is, and the turntable yields.
      handTurned = true;
      state.targetYaw = drag.yaw + (dx / 190);
      state.targetPitch = Math.max(-0.44, Math.min(0.44, drag.pitch + (dy / 300)));
    } else {
      const width = canvas.clientWidth;
      state.targetFocus = clampFocus(drag.focus + dragToFocusDelta(dx, width), count);
      const dt = Math.max(1, event.timeStamp - drag.time);
      drag.velocity = (event.clientX - drag.lastX) / dt;
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
    if (!drag || drag.id !== event.pointerId) return;
    const finished = drag;
    drag = null;

    if (!finished.moved) {
      const index = scene.pick(event.clientX, event.clientY);
      if (index >= 0) {
        if (state.targetOpen > 0) closeFigure();
        else if (index === current()) void openFigure(index);
        else focusFigure(index);
      } else if (state.targetOpen > 0) {
        closeFigure();
      }
      return;
    }

    if (state.targetOpen > 0) return;
    // Carry the throw a little, then settle on a figure.
    const carried = motion.matches ? 0 : -finished.velocity * 1.8;
    state.targetFocus = nearestIndex(
      clampFocus(state.targetFocus + carried, count), count,
    );
    syncChrome();
    speak(`${records[current()].name}, Lot ${records[current()].lot}`);
    invalidate();
  }

  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);

  canvas.addEventListener('wheel', (event) => {
    if (state.targetOpen > 0) {
      event.preventDefault();
      state.targetZoom = Math.min(1, Math.max(0, state.targetZoom - (event.deltaY / 900)));
      invalidate();
      return;
    }
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
    state.targetFocus = clampFocus(state.targetFocus + delta, count);
    syncChrome();
    scheduleSnap();
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

  motion.addEventListener?.('change', invalidate);

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
    card.close();
  });

  function teardown() {
    if (disposed) return;
    disposed = true;
    if (raf) cancelAnimationFrame(raf);
    observer.disconnect();
    scene.dispose();
  }
  window.addEventListener('pagehide', teardown, { once: true });

  root.classList.add('is-ready');
  // The hash is also a real anchor into the register below, and the browser
  // will have jumped there before this script ran. With the scene live, the
  // sculpture row IS the destination — come back up to it.
  if (asked >= 0) window.scrollTo({ top: 0, behavior: 'instant' });
  syncChrome();
  invalidate();

  // The plates arrive after the room does: each figure stands in its own metal
  // until its photograph is laid on, nearest the front first.
  void scene.dressRow(0, invalidate);
}

export { GALLERY };
