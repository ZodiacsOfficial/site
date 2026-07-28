import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

import {
  GALLERY,
  angleStep,
  approach,
  clampFocus,
  dragToFocusDelta,
  figurePose,
  fitScale,
  floorY,
  isVisible,
  nearestIndex,
  neighbourPush,
  shortestTurn,
  wheelToFocusDelta,
} from '../src/shelf/layout.mjs';
import { figureOf, readFigures, classification } from '../src/shelf/figures.mjs';

const COUNT = 12;

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
    for (const { slug } of figures) {
      const { aspect } = geometry.figures[slug];
      const scale = fitScale(aspect, GALLERY);
      expect(scale, slug).toBeGreaterThan(0);
      // Neither limit may be exceeded: height for the tall, width for the wide.
      expect(scale, slug).toBeLessThanOrEqual(GALLERY.height + 1e-9);
      expect(scale * aspect, slug).toBeLessThanOrEqual(GALLERY.maxWidth + 1e-9);
      // And one of the two is always the binding limit — nothing sits small.
      const binding = Math.abs(scale - GALLERY.height) < 1e-9
        || Math.abs(scale * aspect - GALLERY.maxWidth) < 1e-9;
      expect(binding, slug).toBe(true);
    }
  });

  it('puts the floor one plinth below the feet', () => {
    expect(floorY(GALLERY)).toBeCloseTo(GALLERY.baseY - GALLERY.plinthHeight, 12);
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
