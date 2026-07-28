import { describe, expect, it } from 'vitest';

import {
  SHELF,
  angleStep,
  approach,
  clampFocus,
  dragToFocusDelta,
  isVisible,
  nearestIndex,
  neighbourPush,
  volumePose,
  wheelToFocusDelta,
} from '../src/shelf/layout.mjs';
import { figureOf, readVolumes, classification } from '../src/shelf/volumes.mjs';

const COUNT = 12;

describe('shelf geometry', () => {
  it('sets the focused volume at the origin, square to the camera', () => {
    for (let i = 0; i < COUNT; i += 1) {
      const pose = volumePose(i, i, SHELF);
      expect(pose.x).toBeCloseTo(0, 10);
      expect(pose.rotationY).toBeCloseTo(0, 10);
      // The focused volume steps forward out of the row.
      expect(pose.z).toBeCloseTo(SHELF.focusOut, 10);
      expect(pose.y).toBeCloseTo(SHELF.baseY + SHELF.focusLift, 10);
      expect(pose.prominence).toBe(1);
    }
  });

  it('orders the twelve left to right without collisions', () => {
    const xs = Array.from({ length: COUNT }, (_, i) => volumePose(i, 5, SHELF).x);
    for (let i = 1; i < COUNT; i += 1) {
      expect(xs[i]).toBeGreaterThan(xs[i - 1]);
      // Every gap clears the spine, so no two volumes ever intersect.
      expect(xs[i] - xs[i - 1]).toBeGreaterThan(SHELF.thickness);
    }
  });

  it('curves the ends away from the viewer', () => {
    const first = volumePose(0, 5.5, SHELF);
    const last = volumePose(11, 5.5, SHELF);
    expect(first.rotationY).toBeLessThan(0);
    expect(last.rotationY).toBeGreaterThan(0);
    // Symmetric about a focus placed midway between the two middle volumes.
    expect(first.rotationY).toBeCloseTo(-last.rotationY, 10);
    expect(first.z).toBeLessThan(0);
    expect(first.z).toBeCloseTo(last.z, 10);
    expect(first.y).toBeCloseTo(SHELF.baseY, 10);
  });

  it('keeps the arc gentle enough to read as a shelf', () => {
    const span = Math.abs(volumePose(11, 5.5, SHELF).rotationY) * 2;
    expect(span).toBeLessThan(Math.PI / 4);
    expect(angleStep(SHELF)).toBeCloseTo(SHELF.spacing / SHELF.radius, 12);
  });

  it('eases the neighbours apart and leaves the focus alone', () => {
    expect(neighbourPush(0, SHELF)).toBe(0);
    expect(neighbourPush(1, SHELF)).toBeCloseTo(SHELF.neighbourEase, 10);
    expect(neighbourPush(-1, SHELF)).toBeCloseTo(-SHELF.neighbourEase, 10);
    // The push decays with distance rather than shifting the whole shelf.
    expect(Math.abs(neighbourPush(4, SHELF))).toBeLessThan(0.001);
  });

  it('moves poses continuously as the focus slides between volumes', () => {
    let previous = volumePose(3, 0, SHELF).x;
    for (let focus = 0.05; focus <= 6; focus += 0.05) {
      const x = volumePose(3, focus, SHELF).x;
      expect(Math.abs(x - previous)).toBeLessThan(0.2);
      previous = x;
    }
  });
});

describe('focus arithmetic', () => {
  it('stops at both ends of the shelf', () => {
    expect(clampFocus(-4, COUNT)).toBe(0);
    expect(clampFocus(99, COUNT)).toBe(COUNT - 1);
    expect(clampFocus(6.5, COUNT)).toBe(6.5);
    expect(clampFocus(3, 1)).toBe(0);
  });

  it('snaps to the nearest volume, never past the ends', () => {
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

  it('walks about six volumes across a full drag, and inverts direction', () => {
    expect(dragToFocusDelta(-1024, 1024)).toBeCloseTo(6, 10);
    expect(dragToFocusDelta(512, 1024)).toBeCloseTo(-3, 10);
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

describe('the volume table', () => {
  it('names the figure from the epithet', () => {
    expect(figureOf('The Ram. Where the year begins.')).toBe('The Ram');
    expect(figureOf('The Goat-Fish. The gate of return.')).toBe('The Goat-Fish');
  });

  it('carries the twelve in zodiac order, complete', async () => {
    const volumes = await readVolumes();
    expect(volumes).toHaveLength(12);
    expect(volumes[0].name).toBe('Aries');
    expect(volumes[11].name).toBe('Pisces');
    for (const [index, volume] of volumes.entries()) {
      expect(volume.order).toBe(index + 1);
      for (const field of ['slug', 'lot', 'name', 'glyph', 'hue', 'element',
        'modality', 'ruler', 'archetype', 'dates', 'datesShort', 'star', 'figure']) {
        expect(volume[field], `${volume.slug}.${field}`).toBeTruthy();
      }
      expect(volume.hue).toMatch(/^#[0-9A-F]{6}$/);
      // U+FE0E must survive: without it the browser resolves the sign to the
      // colour emoji font, in the page and on the painted spine alike.
      expect(volume.glyph).toBe(`${volume.glyph[0]}︎`);
    }
  });

  it('never carries an address — those are read from the registry live', async () => {
    const volumes = await readVolumes();
    const serialised = JSON.stringify(volumes);
    expect(serialised).not.toMatch(/[13-9A-HJ-NP-Za-km-z]{32,44}/);
    expect(serialised).not.toMatch(/0x[0-9a-fA-F]{40}/);
  });

  it('states the classification in wing voice', async () => {
    const [aries] = await readVolumes();
    expect(classification(aries)).toBe('Cardinal fire · ruled by Mars');
  });
});
