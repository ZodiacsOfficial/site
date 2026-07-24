/*
 * Builds the material editions used by Registry Collection's Cabinet of Twelve:
 *
 *   public/assets/cabinet-materials/{bronze,silver,gold}/{sign}.{avif,webp}
 *
 * The original gold sculptures under public/assets/nuggets/ remain untouched.
 * Every source is measured by its visible alpha bounds, fitted into one 256px
 * square with a 14% safe inset, and then encoded with lossless alpha. Bronze
 * and Silver are deterministic tonal maps of the same normalized silhouette.
 *
 *   npm run data:cabinet-materials
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { SIGN_ORDER } from './sign-data.mjs';

export const CABINET_MATERIALS = ['bronze', 'silver', 'gold'];
export const CABINET_MATERIAL_SIZE = 256;
export const CABINET_MATERIAL_SAFE_INSET = Math.round(CABINET_MATERIAL_SIZE * 0.14);
export const CABINET_MATERIAL_CONTENT_SIZE = (
  CABINET_MATERIAL_SIZE - (CABINET_MATERIAL_SAFE_INSET * 2)
);
export const CABINET_MATERIAL_ALPHA_THRESHOLD = 8;

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDirectory = resolve(root, 'public/assets/nuggets');
const outputDirectory = resolve(root, 'public/assets/cabinet-materials');

const MATERIAL_PALETTES = {
  bronze: [
    [0, [24, 13, 12]],
    [0.28, [74, 38, 25]],
    [0.58, [150, 87, 48]],
    [0.82, [220, 151, 84]],
    [1, [255, 222, 169]],
  ],
  silver: [
    [0, [21, 24, 30]],
    [0.28, [61, 67, 76]],
    [0.58, [130, 139, 151]],
    [0.82, [205, 212, 220]],
    [1, [252, 254, 255]],
  ],
};

export function alphaBounds(data, info, threshold = CABINET_MATERIAL_ALPHA_THRESHOLD) {
  const alphaChannel = info.channels - 1;
  let left = info.width;
  let top = info.height;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const alpha = data[(y * info.width + x) * info.channels + alphaChannel];
      if (alpha <= threshold) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }

  if (right < left || bottom < top) {
    throw new Error('Cabinet sculpture source has no visible alpha pixels.');
  }

  return {
    left,
    top,
    right,
    bottom,
    width: right - left + 1,
    height: bottom - top + 1,
  };
}

function interpolatePalette(palette, value) {
  const clamped = Math.max(0, Math.min(1, value));
  let upperIndex = palette.findIndex(([stop]) => stop >= clamped);
  if (upperIndex <= 0) return palette[0][1];
  if (upperIndex === -1) return palette.at(-1)[1];

  const [lowerStop, lowerColor] = palette[upperIndex - 1];
  const [upperStop, upperColor] = palette[upperIndex];
  const progress = (clamped - lowerStop) / (upperStop - lowerStop);
  return lowerColor.map((channel, index) => (
    Math.round(channel + ((upperColor[index] - channel) * progress))
  ));
}

export async function normalizeCabinetSculpture(source) {
  const sourceRaw = await sharp(source)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const sourceBounds = alphaBounds(sourceRaw.data, sourceRaw.info);

  const resized = await sharp(source)
    .extract({
      left: sourceBounds.left,
      top: sourceBounds.top,
      width: sourceBounds.width,
      height: sourceBounds.height,
    })
    .resize({
      width: CABINET_MATERIAL_CONTENT_SIZE,
      height: CABINET_MATERIAL_CONTENT_SIZE,
      fit: 'inside',
      kernel: 'lanczos3',
    })
    .ensureAlpha()
    .png()
    .toBuffer();

  // Measure once more after interpolation, then discard only the transparent
  // fringe. This centers the actual visible sculpture rather than its source
  // canvas and guarantees the same safe area for every sign.
  const resizedRaw = await sharp(resized)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const resizedBounds = alphaBounds(resizedRaw.data, resizedRaw.info);
  const visible = await sharp(resized)
    .extract({
      left: resizedBounds.left,
      top: resizedBounds.top,
      width: resizedBounds.width,
      height: resizedBounds.height,
    })
    .png()
    .toBuffer();
  const left = Math.floor((CABINET_MATERIAL_SIZE - resizedBounds.width) / 2);
  const top = Math.floor((CABINET_MATERIAL_SIZE - resizedBounds.height) / 2);

  return sharp({
    create: {
      width: CABINET_MATERIAL_SIZE,
      height: CABINET_MATERIAL_SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: visible, left, top }])
    .png()
    .toBuffer();
}

export async function applyCabinetMaterial(normalizedSculpture, material) {
  if (material === 'gold') return normalizedSculpture;
  const palette = MATERIAL_PALETTES[material];
  if (!palette) throw new Error(`Unknown cabinet material: ${material}`);

  const { data, info } = await sharp(normalizedSculpture)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let offset = 0; offset < data.length; offset += info.channels) {
    const alpha = data[offset + 3];
    if (alpha === 0) continue;
    const luminance = (
      (data[offset] * 0.2126)
      + (data[offset + 1] * 0.7152)
      + (data[offset + 2] * 0.0722)
    ) / 255;
    const [red, green, blue] = interpolatePalette(palette, luminance);
    data[offset] = red;
    data[offset + 1] = green;
    data[offset + 2] = blue;
  }

  return sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels,
    },
  })
    .png()
    .toBuffer();
}

async function writeMaterial(buffer, material, sign, baseDirectory) {
  const materialDirectory = resolve(baseDirectory, material);
  await mkdir(materialDirectory, { recursive: true });
  await Promise.all([
    sharp(buffer)
      .avif({
        lossless: true,
        effort: 6,
        chromaSubsampling: '4:4:4',
      })
      .toFile(resolve(materialDirectory, `${sign}.avif`)),
    sharp(buffer)
      .webp({
        lossless: true,
        alphaQuality: 100,
        effort: 6,
      })
      .toFile(resolve(materialDirectory, `${sign}.webp`)),
  ]);
}

export async function buildCabinetMaterials({
  sources = sourceDirectory,
  outputs = outputDirectory,
} = {}) {
  let written = 0;

  for (const sign of SIGN_ORDER) {
    const normalized = await normalizeCabinetSculpture(resolve(sources, `${sign}.png`));
    for (const material of CABINET_MATERIALS) {
      const rendered = await applyCabinetMaterial(normalized, material);
      await writeMaterial(rendered, material, sign, outputs);
      written += 2;
    }
    console.log(`cabinet materials: ${sign} -> bronze/silver/gold avif+webp`);
  }

  const manifest = {
    version: 1,
    size: CABINET_MATERIAL_SIZE,
    safeInset: CABINET_MATERIAL_SAFE_INSET,
    materials: CABINET_MATERIALS,
    signs: SIGN_ORDER,
  };
  await writeFile(
    resolve(outputs, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  console.log(`Done - ${written} files under public/assets/cabinet-materials/.`);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  await buildCabinetMaterials();
}
