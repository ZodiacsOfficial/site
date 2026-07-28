// Driving the shelf.
//
// Input, damping, and the accessible controls that shadow every gesture. The
// page is complete without this file: the register below the stage is the
// real catalogue, and it stays in the document whether or not WebGL exists.

import {
  SHELF, approach, clampFocus, nearestIndex,
  wheelToFocusDelta, dragToFocusDelta,
} from './layout.mjs';
import { createScene } from './scene.mjs';
import { createCard } from './card.mjs';
import { ensureFonts } from './textures.mjs';

const stage = document.querySelector('[data-shelf-stage]');
const source = document.getElementById('shelf-volumes');
if (stage && source) void mount(stage, JSON.parse(source.textContent));

function supported() {
  try {
    const probe = document.createElement('canvas');
    return Boolean(probe.getContext('webgl2') || probe.getContext('webgl'));
  } catch {
    return false;
  }
}

async function mount(root, volumes) {
  if (!supported()) return;

  const count = volumes.length;
  const mountPoint = root.querySelector('[data-shelf-canvas]');
  const rail = root.querySelector('[data-shelf-rail]');
  const opener = root.querySelector('[data-shelf-open]');
  const live = root.querySelector('[data-shelf-live]');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');

  await ensureFonts();

  const canvas = document.createElement('canvas');
  canvas.className = 'stage__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  mountPoint.append(canvas);

  let scene;
  try {
    scene = createScene(canvas, volumes);
  } catch {
    canvas.remove();
    return;
  }

  const state = {
    focus: motion.matches ? 0 : -1.7,
    targetFocus: 0,
    open: 0,
    targetOpen: 0,
    openIndex: -1,
    yaw: 0, targetYaw: 0,
    pitch: 0, targetPitch: 0,
    zoom: 0, targetZoom: 0,
  };

  const card = createCard(root, { onClose: () => closeVolume() });

  // ---- the frame loop --------------------------------------------------
  // Nothing is drawn unless something is still moving; the shelf at rest
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
    const turn = motion.matches ? 200 : 14;
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
    const moving = step(dt);
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

  // ---- shelf position --------------------------------------------------

  let snapTimer = 0;
  function scheduleSnap() {
    window.clearTimeout(snapTimer);
    snapTimer = window.setTimeout(() => {
      state.targetFocus = nearestIndex(state.targetFocus, count);
      syncChrome();
      invalidate();
    }, 140);
  }

  function focusVolume(index, { announce = true } = {}) {
    state.targetFocus = clampFocus(index, count);
    window.clearTimeout(snapTimer);
    syncChrome();
    if (announce) speak(`${volumes[current()].name}, Lot ${volumes[current()].lot}`);
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

  function syncChrome() {
    const index = current();
    const volume = volumes[index];
    if (opener) {
      opener.textContent = state.openIndex >= 0 ? 'Close the volume' : `Open ${volume.name}`;
      opener.setAttribute(
        'aria-label',
        state.openIndex >= 0 ? 'Close the volume' : `Open the ${volume.name} volume`,
      );
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

  // ---- opening and closing ---------------------------------------------

  async function openVolume(index) {
    const volume = volumes[index];
    state.openIndex = index;
    state.targetOpen = 1;
    state.targetYaw = 0;
    state.targetPitch = 0;
    state.targetZoom = 0;
    root.classList.add('is-open');
    card.open(volume);
    syncChrome();
    speak(`${volume.name} opened. Lot ${volume.lot} of twelve.`);
    invalidate();
    card.closer.focus({ preventScroll: true });
    if (await scene.dressCover(index)) invalidate();
  }

  function closeVolume() {
    if (state.openIndex < 0) return;
    const index = state.openIndex;
    state.targetOpen = 0;
    state.targetYaw = 0;
    state.targetPitch = 0;
    state.targetZoom = 0;
    root.classList.remove('is-open');
    card.close();
    // Keep the volume identified until it is back in line, then release it.
    window.setTimeout(() => {
      if (state.targetOpen === 0) state.openIndex = -1;
    }, 700);
    syncChrome();
    speak(`${volumes[index].name} reshelved.`);
    ticks[index]?.focus({ preventScroll: true });
    invalidate();
  }

  function toggle(index) {
    if (state.openIndex >= 0 && state.targetOpen > 0) closeVolume();
    else void openVolume(index);
  }

  // ---- the tick rail: the shelf's keyboard and pointer contract ---------

  const ticks = volumes.map((volume, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'rail__tick';
    button.style.setProperty('--sign', volume.hue);
    button.dataset.index = String(index);
    button.tabIndex = index === 0 ? 0 : -1;
    button.innerHTML = '<span class="rail__glyph" aria-hidden="true"></span>';
    button.querySelector('.rail__glyph').textContent = volume.glyph;
    button.setAttribute('aria-label', `${volume.name}, Lot ${volume.lot} of twelve`);
    button.addEventListener('click', () => {
      if (current() === index && state.targetOpen === 0) void openVolume(index);
      else {
        if (state.targetOpen > 0) closeVolume();
        focusVolume(index);
      }
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
    if (state.targetOpen > 0) closeVolume();
    const index = clampFocus(next, count);
    focusVolume(index);
    ticks[index].focus({ preventScroll: true });
  });

  opener?.addEventListener('click', () => toggle(current()));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.targetOpen > 0) {
      event.preventDefault();
      closeVolume();
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
      state.targetZoom = Math.min(1, Math.max(0, state.targetZoom + (spread - pinch) / 320));
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
      // An opened volume turns in the hand; the shelf stays where it is.
      state.targetYaw = Math.max(-0.62, Math.min(0.62, drag.yaw + dx / 260));
      state.targetPitch = Math.max(-0.44, Math.min(0.44, drag.pitch + dy / 300));
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
        if (state.targetOpen > 0) closeVolume();
        else if (index === current()) void openVolume(index);
        else focusVolume(index);
      } else if (state.targetOpen > 0) {
        closeVolume();
      }
      return;
    }

    if (state.targetOpen > 0) return;
    // Carry the throw a little, then settle on a volume.
    const carried = motion.matches ? 0 : -finished.velocity * 2.4;
    state.targetFocus = nearestIndex(
      clampFocus(state.targetFocus + carried, count), count,
    );
    syncChrome();
    speak(`${volumes[current()].name}, Lot ${volumes[current()].lot}`);
    invalidate();
  }

  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);

  canvas.addEventListener('wheel', (event) => {
    if (state.targetOpen > 0) {
      event.preventDefault();
      state.targetZoom = Math.min(1, Math.max(0, state.targetZoom - event.deltaY / 900));
      invalidate();
      return;
    }
    // Firefox reports wheel deltas in lines, and some setups in pages; both
    // would crawl if read as pixels.
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? canvas.clientHeight : 1;
    const delta = wheelToFocusDelta(event.deltaX * unit, event.deltaY * unit);
    if (!delta) return;
    // At either end the shelf gives the wheel back so the page can scroll.
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
    invalidate();
  }

  const observer = new ResizeObserver(resize);
  observer.observe(mountPoint);
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
  syncChrome();
  invalidate();
}

export { SHELF };
