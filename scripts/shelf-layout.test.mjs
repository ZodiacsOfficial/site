import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

import {
  DOCK,
  GALLERY,
  SPOTLIGHT,
  SPOTLIGHT_STAGE,
  SPOTLIGHT_VITRINE,
  TURNTABLE,
  VITRINE,
  angleStep,
  approach,
  clampFocus,
  dockMagnify,
  dragIntent,
  dragToFocusDelta,
  embedBand,
  emphasis,
  figurePose,
  fitScale,
  fitScales,
  flingCarry,
  floorY,
  isVisible,
  lerpContent,
  lerpRect,
  nearestIndex,
  neighbourPush,
  rowContent,
  shortestTurn,
  signFromHash,
  stageContent,
  turntableActive,
  vitrineFrame,
  wheelToFocusDelta,
} from '../src/shelf/layout.mjs';
import { figureOf, readFigures, classification } from '../src/shelf/figures.mjs';

const COUNT = 12;

describe('turntable policy', () => {
  const ready = {
    spotlight: true,
    open: 0,
    targetOpen: 0,
    switchFrom: -1,
    focus: 4,
    targetFocus: 4,
    stageVisible: true,
    paused: false,
    handTurned: false,
    reducedMotion: false,
    dragging: false,
  };

  it('turns the settled Registry spotlight without opening a card', () => {
    expect(turntableActive(ready)).toBe(true);
    expect(TURNTABLE.spotlightRate).toBeLessThan(TURNTABLE.openedRate);
    expect(TURNTABLE.resumeAfter).toBe(2400);
  });

  it('preserves the Thesis opened-sculpture turntable', () => {
    expect(turntableActive({
      ...ready,
      spotlight: false,
      open: 1,
      targetOpen: 1,
    })).toBe(true);
  });

  it.each([
    ['offscreen', { stageVisible: false }],
    ['behind the purchase sheet', { paused: true }],
    ['under the hand', { dragging: true }],
    ['held after a hand turn', { handTurned: true }],
    ['under reduced motion', { reducedMotion: true }],
    ['during a sign handoff', { switchFrom: 3 }],
    ['while focus is settling', { focus: 3.9 }],
  ])('stops %s', (_label, change) => {
    expect(turntableActive({ ...ready, ...change })).toBe(false);
  });
});

describe('gallery geometry', () => {
  it('sets the focused figure at the origin, square to the camera', () => {
    for (let i = 0; i < COUNT; i += 1) {
      const pose = figurePose(i, i, GALLERY);
      expect(pose.x).toBeCloseTo(0, 10);
      expect(pose.rotationY).toBeCloseTo(0, 10);
      // The focused figure steps forward out of the row.
      expect(pose.z).toBeCloseTo(GALLERY.focusOut, 10);
      expect(pose.y).toBeCloseTo(GALLERY.baseY + GALLERY.focusLift, 10);
      expect(pose.prominence).toBe(1);
    }
  });

  it('orders the twelve left to right without collisions', () => {
    const xs = Array.from({ length: COUNT }, (_, i) => figurePose(i, 5, GALLERY).x);
    for (let i = 1; i < COUNT; i += 1) {
      expect(xs[i]).toBeGreaterThan(xs[i - 1]);
      // Every gap clears the widest a cast may be, so no two figures can
      // ever intersect however differently the twelve are proportioned.
      expect(xs[i] - xs[i - 1]).toBeGreaterThan(GALLERY.maxWidth);
    }
  });

  it('curves the ends away from the viewer', () => {
    const first = figurePose(0, 5.5, GALLERY);
    const last = figurePose(11, 5.5, GALLERY);
    expect(first.rotationY).toBeLessThan(0);
    expect(last.rotationY).toBeGreaterThan(0);
    // Symmetric about a focus placed midway between the two middle figures.
    expect(first.rotationY).toBeCloseTo(-last.rotationY, 10);
    expect(first.z).toBeLessThan(0);
    expect(first.z).toBeCloseTo(last.z, 10);
    expect(first.y).toBeCloseTo(GALLERY.baseY, 10);
  });

  it('keeps the arc gentle enough to read as a row', () => {
    const span = Math.abs(figurePose(11, 5.5, GALLERY).rotationY) * 2;
    expect(span).toBeLessThan(Math.PI / 4);
    expect(angleStep(GALLERY)).toBeCloseTo(GALLERY.spacing / GALLERY.radius, 12);
  });

  it('eases the neighbours apart and leaves the focus alone', () => {
    expect(neighbourPush(0, GALLERY)).toBe(0);
    expect(neighbourPush(1, GALLERY)).toBeCloseTo(GALLERY.neighbourEase, 10);
    expect(neighbourPush(-1, GALLERY)).toBeCloseTo(-GALLERY.neighbourEase, 10);
    // The push decays with distance rather than shifting the whole row.
    expect(Math.abs(neighbourPush(4, GALLERY))).toBeLessThan(0.001);
  });

  it('moves poses continuously as the focus slides between figures', () => {
    let previous = figurePose(3, 0, GALLERY).x;
    for (let focus = 0.05; focus <= 6; focus += 0.05) {
      const x = figurePose(3, focus, GALLERY).x;
      // A discontinuity would jump a whole slot; nothing may move a third of one.
      expect(Math.abs(x - previous)).toBeLessThan(GALLERY.spacing / 3);
      previous = x;
    }
  });

  it('stands every figure on the plinth, whatever its proportions', async () => {
    const figures = await readFigures();
    const geometry = JSON.parse(
      await readFile(new URL('../src/shelf/figures.geometry.json', import.meta.url), 'utf8'),
    );
    const aspects = figures.map(({ slug }) => geometry.figures[slug].aspect);
    const scales = fitScales(aspects, GALLERY);
    for (const [index, { slug }] of figures.entries()) {
      const aspect = aspects[index];
      const scale = scales[index];
      expect(scale, slug).toBeGreaterThan(0);
      // Neither limit may be exceeded: height for the tall, width for the wide.
      expect(scale, slug).toBeLessThanOrEqual(GALLERY.height + 1e-9);
      expect(scale * aspect, slug).toBeLessThanOrEqual(GALLERY.maxWidth + 1e-9);
      // Fitted alone it would be limit-bound; fitted as a set it may be held
      // down by the band instead. Either way it never exceeds its own limit.
      expect(scale, slug).toBeLessThanOrEqual(fitScale(aspect, GALLERY) + 1e-9);
    }
    // The twelve read as one row of comparable objects: nothing may stand
    // more than the band apart, or size starts meaning identity again.
    const spread = (Math.max(...scales) / Math.min(...scales)) - 1;
    expect(spread).toBeLessThanOrEqual(GALLERY.heightSpread + 1e-9);
    // And the levelling only ever shrinks — the collision clearance holds.
    for (const [index, scale] of scales.entries()) {
      expect(scale).toBeLessThanOrEqual(fitScale(aspects[index], GALLERY) + 1e-9);
    }
  });

  it('frames the row by its real tallest, not by the cap', () => {
    const levelled = rowContent(GALLERY, 1.25);
    const capped = rowContent(GALLERY);
    // A shorter set gives a shorter box, so the camera comes closer and the
    // row keeps its size on screen instead of leaving dead air above it.
    expect(levelled.height).toBeLessThan(capped.height);
    expect(levelled.centerY + (levelled.height / 2))
      .toBeCloseTo(GALLERY.baseY + 1.25 + 0.04, 12);
  });

  it('puts the floor one plinth below the feet', () => {
    expect(floorY(GALLERY)).toBeCloseTo(GALLERY.baseY - GALLERY.plinthHeight, 12);
  });
});

describe('framing the vitrine', () => {
  const CANVAS = { canvasWidth: 1440, canvasHeight: 900 };
  // Where a point lands on the canvas, in CSS pixels from the top-left, given
  // a frame. The inverse of the arithmetic under test — a figure standing at
  // the world origin projects to the middle of its band.
  // Panning the camera moves the image the other way, hence both inversions.
  const project = (frame, canvas, worldX, worldY) => {
    const perPixel = frame.worldHeight / canvas.canvasHeight;
    return {
      x: (canvas.canvasWidth / 2) + ((worldX - frame.panX) / perPixel),
      y: (canvas.canvasHeight / 2) - ((worldY - frame.panY) / perPixel),
    };
  };

  it('fills the band it is given, and no more', () => {
    const content = { height: 1.8, width: 1.2, centerY: 0, centerZ: 0 };
    const rect = { x: 0, y: 300, width: 1440, height: 400 };
    const frame = vitrineFrame({ ...CANVAS, rect, content, margin: 1 });
    // The content's height covers exactly the band's height in pixels.
    const perPixel = frame.worldHeight / CANVAS.canvasHeight;
    expect(content.height / perPixel).toBeCloseTo(rect.height, 6);
  });

  it('centres the content in the band, not in the canvas', () => {
    const content = { height: 1.4, width: 1, centerY: 0, centerZ: 0 };
    // A band low and to the left — the shape an open card leaves behind.
    const rect = { x: 0, y: 420, width: 900, height: 380 };
    const frame = vitrineFrame({ ...CANVAS, rect, content, margin: 1 });
    const middle = project(frame, CANVAS, 0, 0);
    expect(middle.x).toBeCloseTo(rect.x + (rect.width / 2), 6);
    expect(middle.y).toBeCloseTo(rect.y + (rect.height / 2), 6);
  });

  it('keeps the whole figure inside the band on every viewport tried', () => {
    const viewports = [
      { canvasWidth: 360, canvasHeight: 640 },
      { canvasWidth: 390, canvasHeight: 844 },
      { canvasWidth: 768, canvasHeight: 1024 },
      { canvasWidth: 1024, canvasHeight: 768 },
      { canvasWidth: 1440, canvasHeight: 900 },
      { canvasWidth: 1920, canvasHeight: 1080 },
    ];
    for (const canvas of viewports) {
      // The worst case: the tallest cast, in the tightest plausible band.
      const content = stageContent(GALLERY.height, GALLERY.maxWidth / GALLERY.height);
      const rect = {
        x: 0,
        y: 90,
        width: canvas.canvasWidth * 0.62,
        height: canvas.canvasHeight * 0.34,
      };
      const frame = vitrineFrame({ ...canvas, rect, content, margin: 1 });
      const head = project(frame, canvas, 0, content.height / 2);
      const feet = project(frame, canvas, 0, -content.height / 2);
      const label = `${canvas.canvasWidth}x${canvas.canvasHeight}`;
      expect(head.y, label).toBeGreaterThanOrEqual(rect.y - 1e-6);
      expect(feet.y, label).toBeLessThanOrEqual(rect.y + rect.height + 1e-6);
      const left = project(frame, canvas, -content.width / 2, 0);
      const right = project(frame, canvas, content.width / 2, 0);
      expect(left.x, label).toBeGreaterThanOrEqual(rect.x - 1e-6);
      expect(right.x, label).toBeLessThanOrEqual(rect.x + rect.width + 1e-6);
    }
  });

  it('stands further back the shallower the band', () => {
    const content = rowContent();
    const frame = (height) => vitrineFrame({
      ...CANVAS, content, margin: 1, rect: { x: 0, y: 0, width: 1440, height },
    });
    expect(frame(300).distance).toBeGreaterThan(frame(600).distance);
    // And never so far that the row becomes specks, nor so close that a
    // figure is in your face — whatever furniture the page grows.
    for (const height of [40, 120, 400, 880, 4000]) {
      const { worldHeight } = frame(height);
      expect(worldHeight).toBeGreaterThanOrEqual(VITRINE.minWorldHeight - 1e-9);
      expect(worldHeight).toBeLessThanOrEqual(VITRINE.maxWorldHeight + 1e-9);
    }
  });

  it('survives a band the page has not measured yet', () => {
    const frame = vitrineFrame({
      canvasWidth: 0,
      canvasHeight: 0,
      rect: { x: 0, y: 0, width: 0, height: 0 },
      content: rowContent(),
      margin: 1,
    });
    expect(Number.isFinite(frame.distance)).toBe(true);
    expect(Number.isFinite(frame.panX)).toBe(true);
    expect(Number.isFinite(frame.panY)).toBe(true);
    expect(frame.distance).toBeGreaterThan(0);
  });

  it('describes the row as the box the twelve actually occupy', () => {
    const row = rowContent();
    const top = row.centerY + (row.height / 2);
    const bottom = row.centerY - (row.height / 2);
    // Nothing sticks out: the tallest head is inside the top, the plinths and
    // their shadows are inside the bottom.
    expect(top).toBeGreaterThanOrEqual(GALLERY.baseY + GALLERY.height);
    expect(bottom).toBeLessThanOrEqual(floorY(GALLERY));
  });

  it('crosses from the row to one figure without a jump', () => {
    const row = rowContent();
    const stage = stageContent(1.6, 0.8);
    expect(lerpContent(row, stage, 0)).toEqual(row);
    expect(lerpContent(row, stage, 1)).toEqual(stage);
    const half = lerpContent(row, stage, 0.5);
    expect(half.height).toBeCloseTo((row.height + stage.height) / 2, 12);
    expect(half.centerZ).toBeCloseTo(VITRINE.stageZ / 2, 12);

    const a = { x: 0, y: 100, width: 800, height: 400 };
    const b = { x: 0, y: 60, width: 500, height: 300 };
    expect(lerpRect(a, b, 0)).toEqual(a);
    expect(lerpRect(a, b, 1)).toEqual(b);
    expect(lerpRect(a, b, 0.25).width).toBeCloseTo(725, 12);
  });
});

describe('the embedded band', () => {
  it('runs from the section top down to its controls', () => {
    expect(embedBand(1280, 520, 430)).toEqual({ x: 0, y: 20, width: 1280, height: 390 });
  });

  it('stops at the section bottom when the controls sit below it', () => {
    const band = embedBand(1280, 520, 9999);
    expect(band.y + band.height).toBeLessThanOrEqual(500);
  });

  it('keeps its floor when the section collapses', () => {
    const band = embedBand(0, 0, 0);
    expect(band.width).toBeGreaterThanOrEqual(140);
    expect(band.height).toBeGreaterThanOrEqual(140);
  });

  it('frames the whole row inside embed-shaped bands', () => {
    // The frame centres the content in the band (proved above); here the
    // claim is that its height in pixels never exceeds the band's.
    for (const [width, height] of [[1440, 420], [768, 380], [390, 300]]) {
      const content = rowContent();
      const rect = embedBand(width, height, height - 96);
      const frame = vitrineFrame({
        canvasWidth: width, canvasHeight: height, rect, content, margin: 1,
      });
      const perPixel = frame.worldHeight / height;
      const bandCenter = rect.y + (rect.height / 2);
      const label = `${width}x${height}`;
      const top = bandCenter - ((content.height / 2) / perPixel);
      const bottom = bandCenter + ((content.height / 2) / perPixel);
      expect(top, label).toBeGreaterThanOrEqual(rect.y - 1e-6);
      expect(bottom, label).toBeLessThanOrEqual(rect.y + rect.height + 1e-6);
      const right = (width / 2) + ((content.width / 2) / perPixel);
      expect(right, label).toBeLessThanOrEqual(rect.x + rect.width + 1e-6);
    }
  });
});

describe('the spotlight', () => {
  it('offers one piece at a time', () => {
    expect(emphasis(0).scale).toBeCloseTo(SPOTLIGHT.focus, 12);
    expect(emphasis(1).scale).toBeCloseTo(SPOTLIGHT.near, 12);
    expect(emphasis(2).scale).toBeCloseTo(SPOTLIGHT.far, 12);
    // Beyond two slots the row has already receded as far as it goes.
    expect(emphasis(6).scale).toBeCloseTo(SPOTLIGHT.far, 12);
    expect(emphasis(-3).scale).toBeCloseTo(SPOTLIGHT.far, 12);
  });

  it('makes focus the loudest thing about a figure’s size', async () => {
    const geometry = JSON.parse(
      await readFile(new URL('../src/shelf/figures.geometry.json', import.meta.url), 'utf8'),
    );
    const scales = fitScales(Object.values(geometry.figures).map((f) => f.aspect), GALLERY);
    const identity = (Math.max(...scales) / Math.min(...scales)) - 1;
    const focus = (emphasis(0).scale / emphasis(1).scale) - 1;
    expect(focus).toBeGreaterThan(identity * 1.5);
  });

  it('recedes smoothly, never popping between slots', () => {
    let previous = emphasis(0).scale;
    for (let distance = 0.02; distance <= 4; distance += 0.02) {
      const { scale, opacity } = emphasis(distance);
      expect(scale).toBeLessThanOrEqual(previous + 1e-9);
      expect(previous - scale).toBeLessThan(0.02);
      expect(opacity).toBeGreaterThanOrEqual(SPOTLIGHT.dim - 1e-9);
      expect(opacity).toBeLessThanOrEqual(1 + 1e-9);
      previous = scale;
    }
  });

  it('dims what it shrinks, and only that', () => {
    expect(emphasis(0).opacity).toBeCloseTo(1, 12);
    expect(emphasis(2).opacity).toBeCloseTo(SPOTLIGHT.dim, 12);
    expect(emphasis(1).opacity).toBeLessThan(1);
    expect(emphasis(1).opacity).toBeGreaterThan(SPOTLIGHT.dim);
  });
});

describe('the spotlight the rectangle wears', () => {
  it('keeps the offered piece whole and takes the room back harder', () => {
    // Full size at the focus either way: above 1 the piece outgrows the box
    // the camera frames, and the head is the first thing to leave.
    expect(SPOTLIGHT_STAGE.focus).toBe(1);
    expect(emphasis(0, SPOTLIGHT_STAGE).scale).toBeCloseTo(1, 12);
    // Everything else recedes further than it does on the shelf.
    for (const distance of [1, 2, 4]) {
      expect(emphasis(distance, SPOTLIGHT_STAGE).scale)
        .toBeLessThan(emphasis(distance, SPOTLIGHT).scale);
      expect(emphasis(distance, SPOTLIGHT_STAGE).opacity)
        .toBeLessThan(emphasis(distance, SPOTLIGHT).opacity);
    }
  });

  it('recedes smoothly there too', () => {
    let previous = emphasis(0, SPOTLIGHT_STAGE).scale;
    for (let distance = 0.02; distance <= 4; distance += 0.02) {
      const { scale, opacity } = emphasis(distance, SPOTLIGHT_STAGE);
      expect(scale).toBeLessThanOrEqual(previous + 1e-9);
      expect(previous - scale).toBeLessThan(0.02);
      expect(opacity).toBeGreaterThanOrEqual(SPOTLIGHT_STAGE.dim - 1e-9);
      previous = scale;
    }
  });

  it('stands the camera closer without changing the lens', () => {
    // The row's own box is short enough that the floor — not the margin — is
    // what decides how large a figure lands, so the floor is the real lever.
    const row = rowContent(GALLERY, GALLERY.height);
    const view = {
      canvasWidth: 720, canvasHeight: 560,
      rect: { x: 0, y: 0, width: 720, height: 560 },
      content: row,
    };
    const shelf = vitrineFrame({ ...view, margin: VITRINE.rowMargin });
    const rectangle = vitrineFrame(
      { ...view, margin: SPOTLIGHT_VITRINE.rowMargin }, SPOTLIGHT_VITRINE,
    );
    expect(row.height * VITRINE.rowMargin).toBeLessThan(VITRINE.minWorldHeight);
    expect(shelf.worldHeight).toBeCloseTo(VITRINE.minWorldHeight, 12);
    expect(rectangle.worldHeight).toBeCloseTo(SPOTLIGHT_VITRINE.minWorldHeight, 12);
    // Same fov, so a smaller world height is simply a nearer camera — and the
    // figure covers proportionally more of the canvas.
    expect(SPOTLIGHT_VITRINE.fov).toBe(VITRINE.fov);
    expect(rectangle.distance).toBeLessThan(shelf.distance);
    expect(shelf.worldHeight / rectangle.worldHeight).toBeGreaterThan(1.15);
  });

  it('keeps the clamp that stops a cramped viewport shouting', () => {
    expect(SPOTLIGHT_VITRINE.maxWorldHeight).toBe(VITRINE.maxWorldHeight);
    const squeezed = vitrineFrame({
      canvasWidth: 400, canvasHeight: 200,
      rect: { x: 0, y: 0, width: 400, height: 40 },
      content: rowContent(GALLERY, GALLERY.height),
      margin: SPOTLIGHT_VITRINE.rowMargin,
    }, SPOTLIGHT_VITRINE);
    expect(squeezed.worldHeight).toBeLessThanOrEqual(SPOTLIGHT_VITRINE.maxWorldHeight);
  });
});

describe('the rail’s wave', () => {
  it('swells most under the cursor and settles either side', () => {
    expect(dockMagnify(0)).toBeCloseTo(1 + DOCK.amplitude, 12);
    let previous = dockMagnify(0);
    for (let distance = 0.1; distance <= 6; distance += 0.1) {
      const mag = dockMagnify(distance);
      expect(mag).toBeLessThan(previous);
      expect(mag).toBeGreaterThanOrEqual(1);
      previous = mag;
    }
    // Far enough along the rail the wave has passed by entirely.
    expect(dockMagnify(6)).toBeCloseTo(1, 3);
  });

  it('keeps the peak 26px disc inside the rail’s vertical paint box', () => {
    expect(dockMagnify(0) * 26).toBeLessThanOrEqual(38);
  });

  it('reads the same either side of the cursor', () => {
    for (const distance of [0.5, 1, 2.5]) {
      expect(dockMagnify(distance)).toBeCloseTo(dockMagnify(-distance), 12);
    }
  });

  it('stands the current sign proud when nothing is hovered', () => {
    expect(DOCK.rest).toBeGreaterThan(0);
    // Resting emphasis is quieter than the wave, so a hover still reads.
    expect(1 + DOCK.rest).toBeLessThan(dockMagnify(0));
  });
});

describe('deep links', () => {
  const slugs = ['aries', 'taurus', 'gemini'];

  it('names a figure from the hash, and nobody otherwise', () => {
    expect(signFromHash('#taurus', slugs)).toBe(1);
    expect(signFromHash('#TAURUS', slugs)).toBe(1);
    expect(signFromHash('taurus', slugs)).toBe(1);
    expect(signFromHash('#ophiuchus', slugs)).toBe(-1);
    expect(signFromHash('', slugs)).toBe(-1);
    expect(signFromHash('#', slugs)).toBe(-1);
    expect(signFromHash(undefined, slugs)).toBe(-1);
  });
});

describe('turning a figure', () => {
  it('returns by the short way, however many turns it was given', () => {
    const full = Math.PI * 2;
    // Just under half a turn unwinds directly.
    expect(shortestTurn(3, 0)).toBeCloseTo(0, 12);
    // Past half, the near side is the next revolution round.
    expect(shortestTurn(3.5, 0)).toBeCloseTo(full, 12);
    expect(shortestTurn(-3.5, 0)).toBeCloseTo(-full, 12);
    // Three turns in, home is three turns away, not thirteen radians back.
    expect(shortestTurn(full * 3 + 0.2, 0)).toBeCloseTo(full * 3, 12);
  });

  it('never asks for more than half a turn', () => {
    for (let from = -20; from <= 20; from += 0.37) {
      expect(Math.abs(from - shortestTurn(from, 0))).toBeLessThanOrEqual(Math.PI + 1e-9);
    }
  });
});

describe('focus arithmetic', () => {
  it('stops at both ends of the row', () => {
    expect(clampFocus(-4, COUNT)).toBe(0);
    expect(clampFocus(99, COUNT)).toBe(COUNT - 1);
    expect(clampFocus(6.5, COUNT)).toBe(6.5);
    expect(clampFocus(3, 1)).toBe(0);
  });

  it('snaps to the nearest figure, never past the ends', () => {
    expect(nearestIndex(4.4, COUNT)).toBe(4);
    expect(nearestIndex(4.6, COUNT)).toBe(5);
    expect(nearestIndex(-2, COUNT)).toBe(0);
    expect(nearestIndex(50, COUNT)).toBe(COUNT - 1);
  });

  it('reads a wheel by its dominant axis', () => {
    expect(wheelToFocusDelta(0, 190)).toBeCloseTo(1, 10);
    expect(wheelToFocusDelta(-380, 10)).toBeCloseTo(-2, 10);
    expect(wheelToFocusDelta(0, 0)).toBe(0);
  });

  it('walks about four figures across a full drag, and inverts direction', () => {
    expect(dragToFocusDelta(-1024, 1024)).toBeCloseTo(4, 10);
    expect(dragToFocusDelta(512, 1024)).toBeCloseTo(-2, 10);
  });

  it('can calm touch dragging without changing the established desktop scale', () => {
    expect(dragToFocusDelta(-390, 390)).toBeCloseTo(4, 10);
    expect(dragToFocusDelta(-390, 390, 3)).toBeCloseTo(3, 10);
    expect(dragToFocusDelta(195, 390, 3)).toBeCloseTo(-1.5, 10);
  });

  it('waits for a clear touch axis before browsing or yielding to page scroll', () => {
    expect(dragIntent(8, 0)).toBe('pending');
    expect(dragIntent(10, 0)).toBe('horizontal');
    expect(dragIntent(0, 10)).toBe('vertical');
    expect(dragIntent(10, 9)).toBe('pending');
    expect(dragIntent(-24, 4)).toBe('horizontal');
    expect(dragIntent(4, -24)).toBe('vertical');
  });

  it('turns release velocity into a bounded, fresh fling', () => {
    expect(flingCarry(0.1, 0)).toBe(0);
    expect(flingCarry(0.5, 81)).toBe(0);
    expect(flingCarry(Number.NaN, 0)).toBe(0);
    expect(flingCarry(0.5, 20)).toBeCloseTo(-0.55, 10);
    expect(flingCarry(-0.5, 20)).toBeCloseTo(0.55, 10);
    expect(flingCarry(4, 20)).toBe(-1.25);
    expect(flingCarry(-4, 20)).toBe(1.25);
  });

  it('draws a generous window around the focus', () => {
    expect(isVisible(0, 0)).toBe(true);
    expect(isVisible(7, 0)).toBe(true);
    expect(isVisible(8, 0)).toBe(false);
  });
});

describe('damping', () => {
  it('closes on the target without overshooting', () => {
    let value = 0;
    for (let i = 0; i < 240; i += 1) value = approach(value, 5, 9, 1 / 60);
    expect(value).toBeGreaterThan(4.999);
    expect(value).toBeLessThan(5);
  });

  it('covers the same ground whether frames are fast or slow', () => {
    let fine = 0;
    for (let i = 0; i < 8; i += 1) fine = approach(fine, 1, 9, 1 / 240);
    const coarse = approach(0, 1, 9, 8 / 240);
    expect(fine).toBeCloseTo(coarse, 12);
  });

  it('does nothing on a zero-length frame', () => {
    expect(approach(0.25, 1, 9, 0)).toBe(0.25);
  });
});

describe('the figure table', () => {
  it('names the figure from the epithet', () => {
    expect(figureOf('The Ram. Where the year begins.')).toBe('The Ram');
    expect(figureOf('The Goat-Fish. The gate of return.')).toBe('The Goat-Fish');
  });

  it('carries the twelve in zodiac order, complete', async () => {
    const figures = await readFigures();
    expect(figures).toHaveLength(12);
    expect(figures[0].name).toBe('Aries');
    expect(figures[11].name).toBe('Pisces');
    for (const [index, figure] of figures.entries()) {
      expect(figure.order).toBe(index + 1);
      for (const field of ['slug', 'lot', 'name', 'glyph', 'hue', 'element',
        'modality', 'ruler', 'archetype', 'dates', 'datesShort', 'star', 'figure']) {
        expect(figure[field], `${figure.slug}.${field}`).toBeTruthy();
      }
      expect(figure.hue).toMatch(/^#[0-9A-F]{6}$/);
      // U+FE0E must survive: without it the browser resolves the sign to the
      // colour emoji font, in the page and on the painted spine alike.
      expect(figure.glyph).toBe(`${figure.glyph[0]}︎`);
    }
  });

  it('never carries an address — those are read from the registry live', async () => {
    const figures = await readFigures();
    const serialised = JSON.stringify(figures);
    expect(serialised).not.toMatch(/[13-9A-HJ-NP-Za-km-z]{32,44}/);
    expect(serialised).not.toMatch(/0x[0-9a-fA-F]{40}/);
  });

  it('states the classification in wing voice', async () => {
    const [aries] = await readFigures();
    expect(classification(aries)).toBe('Cardinal fire · ruled by Mars');
  });
});
