/*
 * Builds what the Gallery needs to stand the twelve Gold Sculptures up:
 *
 *   src/shelf/figures.geometry.json          traced silhouettes, scene units
 *   public/assets/sculptures/512/{sign}.webp  row texture
 *   public/assets/sculptures/1024/{sign}.webp hero texture, loaded on view
 *   public/assets/sculptures/manifest.json
 *
 * The originals under public/assets/nuggets/ are never touched or renamed —
 * see public/assets/README.md. Everything here is a derivative in its own
 * folder.
 *
 *   npm run data:figure-assets
 *
 * Two different determinism rules apply to the two outputs, which is why this
 * builder is NOT in the legacy-drift CI job:
 *
 *   - The geometry is traced from an unresized raw decode using only plain
 *     arithmetic, so it re-derives identically anywhere. scripts/shelf-figures
 *     .test.mjs regenerates it and compares against the committed file.
 *   - The webp encodes come out of libvips and are not byte-stable across
 *     platforms, exactly like the cabinet materials. They are committed and
 *     guarded by invariants (size, alpha bounds), never by bytes.
 *
 * Nothing in the geometry path may resize. Resampling is where platforms
 * disagree.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

import { SIGN_ORDER } from './sign-data.mjs';
import { alphaField, figureShapes, normaliseFigure, pointCount, MASK_THRESHOLD } from '../src/shelf/contour.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDirectory = resolve(root, 'public/assets/nuggets');
const textureDirectory = resolve(root, 'public/assets/sculptures');
const geometryFile = resolve(root, 'src/shelf/figures.geometry.json');

/** Hero tier. The row tier is exactly half, so one UV box serves both. */
export const HERO_SIZE = 1024;
export const ROW_SIZE = 512;
/** Multiple of four, so halving the hero layout stays on whole pixels. */
export const HERO_CONTENT = 904;
/** Below this the pixel is canvas, not cast — matches the cabinet builder. */
export const VISIBLE_ALPHA = 8;
/** How far the artwork's colour is pushed into the transparent margin. */
export const BLEED_PASSES = 5;

/**
 * Signs whose cast has members thin enough to sever at the default threshold.
 * Libra hangs its pans on chains a few pixels wide, and those links are the
 * whole point of the figure.
 */
export const THRESHOLD_OVERRIDES = { libra: 40 };

export const thresholdFor = (sign) => THRESHOLD_OVERRIDES[sign] ?? MASK_THRESHOLD;

async function decode(file) {
  return sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}

/** Bounds of everything not fully transparent. */
export function visibleBounds(data, { width, height, channels }) {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(((y * width) + x) * channels) + channels - 1] <= VISIBLE_ALPHA) continue;
      if (x < left) left = x;
      if (y < top) top = y;
      if (x > right) right = x;
      if (y > bottom) bottom = y;
    }
  }
  if (right < left || bottom < top) throw new Error('sculpture source is empty');
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

/** Average colour of the cast, used for the extruded sides. */
export function castColour(data, { width, height, channels }, threshold) {
  let red = 0;
  let green = 0;
  let blue = 0;
  let counted = 0;
  for (let i = 0; i < width * height; i += 1) {
    const offset = i * channels;
    if (data[offset + channels - 1] < threshold) continue;
    red += data[offset];
    green += data[offset + 1];
    blue += data[offset + 2];
    counted += 1;
  }
  const hex = (value) => Math.round(value / counted).toString(16).padStart(2, '0');
  return `#${hex(red)}${hex(green)}${hex(blue)}`;
}

/**
 * Push the artwork's colour outward into the transparent margin, leaving alpha
 * alone. Without this the resampler mixes cast gold with whatever sits in the
 * transparent pixels, and the silhouette picks up a dark rim against the void.
 */
export function bleedColour(data, width, height, passes = BLEED_PASSES) {
  const known = new Uint8Array(width * height);
  for (let i = 0; i < known.length; i += 1) known[i] = data[(i * 4) + 3] > 0 ? 1 : 0;

  for (let pass = 0; pass < passes; pass += 1) {
    const grown = [];
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = (y * width) + x;
        if (known[index]) continue;
        let red = 0;
        let green = 0;
        let blue = 0;
        let counted = 0;
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const nx = x + dx;
            const ny = y + dy;
            if ((dx === 0 && dy === 0) || nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            const neighbour = (ny * width) + nx;
            if (!known[neighbour]) continue;
            red += data[neighbour * 4];
            green += data[(neighbour * 4) + 1];
            blue += data[(neighbour * 4) + 2];
            counted += 1;
          }
        }
        if (counted) grown.push([index, red / counted, green / counted, blue / counted]);
      }
    }
    if (!grown.length) break;
    for (const [index, red, green, blue] of grown) {
      data[index * 4] = Math.round(red);
      data[(index * 4) + 1] = Math.round(green);
      data[(index * 4) + 2] = Math.round(blue);
      known[index] = 1;
    }
  }
  return data;
}

/** Draw box for the hero tier: even quarters, so the row tier halves cleanly. */
export function heroLayout(bounds) {
  const scale = Math.min(HERO_CONTENT / bounds.width, HERO_CONTENT / bounds.height);
  const quad = (value) => Math.max(4, Math.round((value * scale) / 4) * 4);
  const drawWidth = quad(bounds.width);
  const drawHeight = quad(bounds.height);
  return {
    drawWidth,
    drawHeight,
    left: (HERO_SIZE - drawWidth) / 2,
    top: (HERO_SIZE - drawHeight) / 2,
  };
}

/**
 * Where the traced outline lands on the texture, in UV. The silhouette is
 * traced at the cast threshold while the texture is fitted to every visible
 * pixel, so the two boxes differ by the width of the soft margin; this maps
 * one onto the other exactly.
 */
export function textureBox(bounds, layout, contour) {
  const toX = (x) => layout.left + (((x - bounds.left) * layout.drawWidth) / bounds.width);
  const toY = (y) => layout.top + (((y - bounds.top) * layout.drawHeight) / bounds.height);
  const round = (value) => Number(value.toFixed(6));
  return {
    u0: round(toX(contour.left) / HERO_SIZE),
    u1: round(toX(contour.left + contour.width) / HERO_SIZE),
    v0: round(1 - (toY(contour.top + contour.height) / HERO_SIZE)),
    v1: round(1 - (toY(contour.top) / HERO_SIZE)),
  };
}

async function writeTextures(figurePng, sign) {
  const layers = [
    { size: HERO_SIZE, quality: 80, alphaQuality: 92 },
    { size: ROW_SIZE, quality: 76, alphaQuality: 88 },
  ];
  let bytes = 0;
  for (const { size, quality, alphaQuality } of layers) {
    const directory = resolve(textureDirectory, String(size));
    await mkdir(directory, { recursive: true });
    const image = size === HERO_SIZE
      ? sharp(figurePng)
      : sharp(figurePng).resize({ width: size, height: size, kernel: 'lanczos3' });
    const info = await image
      .webp({ quality, alphaQuality, effort: 6 })
      .toFile(resolve(directory, `${sign}.webp`));
    bytes += info.size;
  }
  return bytes;
}

/** One sign: trace the silhouette, then bake the two texture tiers. */
export async function buildFigure(sign) {
  const file = resolve(sourceDirectory, `${sign}.png`);
  const { data, info } = await decode(file);
  const threshold = thresholdFor(sign);

  const field = alphaField(data, info.width, info.height, info.channels);
  const traced = normaliseFigure(figureShapes(field, info.width, info.height, { threshold }));

  const bounds = visibleBounds(data, info);
  const layout = heroLayout(bounds);

  // Bleed on the cropped cast, then fit it into the hero square.
  const cropped = await sharp(file)
    .extract({ left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const bled = bleedColour(cropped.data, cropped.info.width, cropped.info.height);
  const drawn = await sharp(bled, {
    raw: { width: cropped.info.width, height: cropped.info.height, channels: 4 },
  })
    .resize({ width: layout.drawWidth, height: layout.drawHeight, kernel: 'lanczos3' })
    .png()
    .toBuffer();
  const figurePng = await sharp({
    create: {
      width: HERO_SIZE,
      height: HERO_SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: drawn, left: layout.left, top: layout.top }])
    .png()
    .toBuffer();

  const bytes = await writeTextures(figurePng, sign);

  return {
    record: {
      sign,
      aspect: traced.aspect,
      edgeColor: castColour(data, info, threshold),
      textureBox: textureBox(bounds, layout, traced.source),
      shapes: traced.shapes,
    },
    stats: {
      points: pointCount(traced),
      shapes: traced.shapes.length,
      holes: traced.shapes.reduce((total, shape) => total + shape.holes.length, 0),
      threshold,
      bytes,
    },
  };
}

export async function buildFigureAssets() {
  const figures = {};
  let totalPoints = 0;
  let totalBytes = 0;

  for (const sign of SIGN_ORDER) {
    const { record, stats } = await buildFigure(sign);
    figures[sign] = record;
    totalPoints += stats.points;
    totalBytes += stats.bytes;
    process.stdout.write(
      `sculptures: ${sign.padEnd(11)} ${String(stats.points).padStart(4)} pts · `
      + `${stats.shapes} shape${stats.shapes === 1 ? '' : 's'}, ${stats.holes} holes · `
      + `alpha ≥ ${stats.threshold} · ${(stats.bytes / 1024).toFixed(0)} KB\n`,
    );
  }

  const geometry = {
    version: 1,
    generator: 'scripts/build-figure-assets.mjs',
    quant: 4096,
    heroSize: HERO_SIZE,
    rowSize: ROW_SIZE,
    figures,
  };
  await writeFile(geometryFile, `${JSON.stringify(geometry)}\n`);

  await writeFile(
    resolve(textureDirectory, 'manifest.json'),
    `${JSON.stringify({
      version: 1,
      source: 'public/assets/nuggets',
      sizes: [ROW_SIZE, HERO_SIZE],
      signs: SIGN_ORDER,
    }, null, 2)}\n`,
  );

  const geometryBytes = (await readFile(geometryFile)).length;
  process.stdout.write(
    `sculptures: ${totalPoints} points total, geometry ${(geometryBytes / 1024).toFixed(0)} KB, `
    + `textures ${(totalBytes / 1024 / 1024).toFixed(2)} MB\n`,
  );
  return geometry;
}

const invoked = process.argv[1] ? resolve(process.argv[1]) : '';
if (invoked === fileURLToPath(import.meta.url)) {
  await buildFigureAssets();
}
