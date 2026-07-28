import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import sharp from 'sharp';

import {
  MASK_THRESHOLD,
  QUANT,
  alphaField,
  classifyRings,
  figureShapes,
  normaliseFigure,
  ringContains,
  signedArea,
  simplifyRing,
  traceContours,
} from '../src/shelf/contour.mjs';
import {
  HERO_SIZE,
  ROW_SIZE,
  castColour,
  heroLayout,
  textureBox,
  thresholdFor,
  visibleBounds,
} from './build-figure-assets.mjs';
import { SIGN_ORDER } from './sign-data.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const geometry = JSON.parse(
  await readFile(resolve(root, 'src/shelf/figures.geometry.json'), 'utf8'),
);

/** A field built from a picture: '#' is metal, '.' is air. */
function field(rows) {
  const width = rows[0].length;
  const data = new Uint8Array(width * rows.length);
  rows.forEach((row, y) => {
    [...row].forEach((cell, x) => { data[(y * width) + x] = cell === '#' ? 255 : 0; });
  });
  return { data, width, height: rows.length };
}

describe('tracing a silhouette', () => {
  it('closes a solid blob into one ring', () => {
    const { data, width, height } = field([
      '......',
      '.####.',
      '.####.',
      '.####.',
      '......',
    ]);
    const rings = traceContours(data, width, height, MASK_THRESHOLD);
    expect(rings).toHaveLength(1);
    // Twelve pixels of metal. The edge sits half a pixel outside each centre,
    // and the interpolation chamfers the four corners, so the enclosed area
    // lands just under the pixel count.
    expect(Math.abs(signedArea(rings[0]))).toBeGreaterThan(11);
    expect(Math.abs(signedArea(rings[0]))).toBeLessThan(12.1);
  });

  it('finds the hole in a ring, and files it under the outline', () => {
    const { data, width, height } = field([
      '.......',
      '.#####.',
      '.#...#.',
      '.#...#.',
      '.#####.',
      '.......',
    ]);
    const rings = traceContours(data, width, height, MASK_THRESHOLD);
    expect(rings).toHaveLength(2);

    const shapes = classifyRings(rings);
    expect(shapes).toHaveLength(1);
    expect(shapes[0].holes).toHaveLength(1);
    // The hole really is inside its outline.
    expect(ringContains(shapes[0].outer, shapes[0].holes[0][0])).toBe(true);
    expect(Math.abs(signedArea(shapes[0].outer)))
      .toBeGreaterThan(Math.abs(signedArea(shapes[0].holes[0])));
  });

  it('keeps separate pieces separate — a figure may be in parts', () => {
    const { data, width, height } = field([
      '.........',
      '.##...##.',
      '.##...##.',
      '.........',
    ]);
    const shapes = classifyRings(traceContours(data, width, height, MASK_THRESHOLD));
    expect(shapes).toHaveLength(2);
    expect(shapes.every((shape) => shape.holes.length === 0)).toBe(true);
  });

  it('reads a piece standing inside a hole as its own outline', () => {
    const { data, width, height } = field([
      '.........',
      '.#######.',
      '.#.....#.',
      '.#.###.#.',
      '.#.###.#.',
      '.#.....#.',
      '.#######.',
      '.........',
    ]);
    const shapes = classifyRings(traceContours(data, width, height, MASK_THRESHOLD));
    expect(shapes).toHaveLength(2);
    const [ring] = shapes.filter((shape) => shape.holes.length === 1);
    const [island] = shapes.filter((shape) => shape.holes.length === 0);
    expect(ring).toBeTruthy();
    expect(island).toBeTruthy();
    // The island sits in the hole, not in the metal.
    expect(ringContains(ring.holes[0], island.outer[0])).toBe(true);
  });

  it('places the edge between the pixels it separates, not on one of them', () => {
    // A soft edge: the crossing should land where alpha reaches the threshold.
    const data = new Uint8Array([0, 0, 64, 192, 255, 255]);
    const rings = traceContours(data, 6, 1, 128);
    const xs = rings.flat().map(([x]) => x);
    // 128 falls midway between 64 (x=2) and 192 (x=3).
    expect(Math.min(...xs)).toBeCloseTo(2.5, 6);
  });

  it('simplifies without collapsing, and does so identically every time', () => {
    const circle = Array.from({ length: 240 }, (_, i) => {
      const angle = (i / 240) * Math.PI * 2;
      return [50 + (40 * Math.cos(angle)), 50 + (40 * Math.sin(angle))];
    });
    const once = simplifyRing(circle, 1.15);
    const twice = simplifyRing(circle, 1.15);
    expect(once).toEqual(twice);
    expect(once.length).toBeLessThan(circle.length);
    expect(once.length).toBeGreaterThanOrEqual(8);
    // The reduced ring still encloses very nearly the same area — chords cut
    // a little off a curve, but only a little.
    const kept = Math.abs(signedArea(once)) / Math.abs(signedArea(circle));
    expect(kept).toBeGreaterThan(0.95);
    expect(kept).toBeLessThanOrEqual(1);
  });
});

describe('the committed geometry', () => {
  it('carries all twelve, in scene units', () => {
    expect(Object.keys(geometry.figures).sort()).toEqual([...SIGN_ORDER].sort());
    expect(geometry.quant).toBe(QUANT);
    expect(geometry.rowSize).toBe(ROW_SIZE);
    expect(geometry.heroSize).toBe(HERO_SIZE);

    for (const sign of SIGN_ORDER) {
      const figure = geometry.figures[sign];
      expect(figure.aspect, sign).toBeGreaterThan(0.2);
      expect(figure.aspect, sign).toBeLessThan(3);
      expect(figure.edgeColor, sign).toMatch(/^#[0-9a-f]{6}$/);
      expect(figure.shapes.length, sign).toBeGreaterThan(0);

      const half = (figure.aspect / 2) * QUANT;
      for (const { outer, holes } of figure.shapes) {
        for (const ring of [outer, ...holes]) {
          expect(ring.length % 2, sign).toBe(0);
          expect(ring.length, sign).toBeGreaterThanOrEqual(6);
          for (let i = 0; i < ring.length; i += 2) {
            expect(Number.isInteger(ring[i]), sign).toBe(true);
            // Height is exactly one, feet on zero, centred across x.
            expect(Math.abs(ring[i]), sign).toBeLessThanOrEqual(half + 1);
            expect(ring[i + 1], sign).toBeGreaterThanOrEqual(-1);
            expect(ring[i + 1], sign).toBeLessThanOrEqual(QUANT + 1);
          }
        }
      }
    }
  });

  it('maps onto the plate it is textured with', () => {
    for (const sign of SIGN_ORDER) {
      const { u0, u1, v0, v1 } = geometry.figures[sign].textureBox;
      expect(u1, sign).toBeGreaterThan(u0);
      expect(v1, sign).toBeGreaterThan(v0);
      for (const value of [u0, u1, v0, v1]) {
        expect(value, sign).toBeGreaterThanOrEqual(0);
        expect(value, sign).toBeLessThanOrEqual(1);
      }
    }
  });

  it('holds every hole inside the outline it belongs to', () => {
    for (const sign of SIGN_ORDER) {
      for (const { outer, holes } of geometry.figures[sign].shapes) {
        const ring = [];
        for (let i = 0; i < outer.length; i += 2) ring.push([outer[i], outer[i + 1]]);
        for (const hole of holes) {
          expect(ringContains(ring, [hole[0], hole[1]]), `${sign} hole`).toBe(true);
        }
      }
    }
  });

  it('still says what the artwork says, and covers what it traced', async () => {
    // Re-derived from the source art. Decoding is bit-exact and the tracing is
    // plain arithmetic on unresized pixels, so this reproduces anywhere — which
    // is what lets the geometry be committed and still be checked.
    const ringArea = (flat) => {
      const ring = [];
      for (let i = 0; i < flat.length; i += 2) ring.push([flat[i], flat[i + 1]]);
      return Math.abs(signedArea(ring));
    };

    for (const sign of SIGN_ORDER) {
      const file = resolve(root, `public/assets/nuggets/${sign}.png`);
      const { data, info } = await sharp(file).ensureAlpha().raw()
        .toBuffer({ resolveWithObject: true });
      const threshold = thresholdFor(sign);
      const traced = normaliseFigure(
        figureShapes(alphaField(data, info.width, info.height, info.channels),
          info.width, info.height, { threshold }),
      );
      const bounds = visibleBounds(data, info);

      expect(geometry.figures[sign], `${sign} is stale — run npm run data:figure-assets`)
        .toEqual({
          sign,
          aspect: traced.aspect,
          edgeColor: castColour(data, info, threshold),
          textureBox: textureBox(bounds, heroLayout(bounds), traced.source),
          shapes: traced.shapes,
        });

      let metal = 0;
      for (let i = 0; i < info.width * info.height; i += 1) {
        if (data[(i * info.channels) + info.channels - 1] >= threshold) metal += 1;
      }

      // Outlines less their holes, carried back from the grid to source pixels.
      const enclosed = traced.shapes.reduce((total, { outer, holes }) => (
        total + ringArea(outer) - holes.reduce((sum, hole) => sum + ringArea(hole), 0)
      ), 0);
      const perUnit = traced.source.height / QUANT;
      const covered = enclosed * perUnit * perUnit;

      // Simplification and the grid lose a sliver of edge; much more than that
      // means a limb, a chain or a bead went missing.
      expect(covered / metal, `${sign} coverage`).toBeGreaterThan(0.94);
      expect(covered / metal, `${sign} coverage`).toBeLessThan(1.06);

      const points = traced.shapes.reduce(
        (total, { outer, holes }) => total + (outer.length / 2)
          + holes.reduce((sum, hole) => sum + (hole.length / 2), 0),
        0,
      );
      expect(points, `${sign} points`).toBeLessThan(1200);
    }
  }, 180_000);
});
