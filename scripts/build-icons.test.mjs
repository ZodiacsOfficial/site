import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { SIGN_ORDER } from './sign-data.mjs';

const OUTPUT_SIZES = [48, 128, 400];
const FORMATS = ['avif', 'webp'];
const ALPHA_THRESHOLD = 8;

async function visibleGeometry(path) {
  const { data, info } = await sharp(path)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let left = info.width;
  let top = info.height;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const alpha = data[(y * info.width + x) * info.channels + 3];
      if (alpha <= ALPHA_THRESHOLD) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }

  return {
    canvasWidth: info.width,
    canvasHeight: info.height,
    width: right - left + 1,
    height: bottom - top + 1,
    centerX: (left + right) / 2,
    centerY: (top + bottom) / 2,
  };
}

async function alphaPlane(path) {
  const { data, info } = await sharp(path)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const alpha = Buffer.alloc(info.width * info.height);
  for (let index = 0; index < alpha.length; index += 1) {
    alpha[index] = data[index * info.channels + 3];
  }
  return alpha;
}

describe('zodiac icon derivatives', () => {
  it('keeps the SDK source PNGs at their original resolution', async () => {
    for (const sign of SIGN_ORDER) {
      const metadata = await sharp(
        `public/assets/sdk/zodiac-icons/circle/${sign}.png`,
      ).metadata();
      expect(metadata.format).toBe('png');
      expect(metadata.width).toBe(1024);
      expect(metadata.height).toBe(1024);
      expect(metadata.hasAlpha).toBe(true);
    }
  });

  it('centers every generated disc on one shared visible diameter', async () => {
    for (const size of OUTPUT_SIZES) {
      for (const format of FORMATS) {
        const geometries = await Promise.all(SIGN_ORDER.map((sign) => (
          visibleGeometry(`public/assets/zodiac-icons/${size}/${sign}.${format}`)
        )));
        const widths = geometries.map((geometry) => geometry.width);
        const heights = geometries.map((geometry) => geometry.height);

        expect(Math.max(...widths) - Math.min(...widths)).toBeLessThanOrEqual(1);
        expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(1);

        for (const geometry of geometries) {
          expect(geometry.canvasWidth).toBe(size);
          expect(geometry.canvasHeight).toBe(size);
          expect(Math.abs(geometry.width - geometry.height)).toBeLessThanOrEqual(1);
          expect(Math.abs(geometry.centerX - (size - 1) / 2)).toBeLessThanOrEqual(0.5);
          expect(Math.abs(geometry.centerY - (size - 1) / 2)).toBeLessThanOrEqual(0.5);
          expect(geometry.width).toBeGreaterThan(size * 0.9);
          expect(geometry.width).toBeLessThan(size);
        }
      }
    }
  });

  it('keeps the alpha plane lossless across AVIF and WebP outputs', async () => {
    for (const size of OUTPUT_SIZES) {
      for (const sign of SIGN_ORDER) {
        const [avifAlpha, webpAlpha] = await Promise.all([
          alphaPlane(`public/assets/zodiac-icons/${size}/${sign}.avif`),
          alphaPlane(`public/assets/zodiac-icons/${size}/${sign}.webp`),
        ]);
        expect(avifAlpha.equals(webpAlpha)).toBe(true);
      }
    }
  });
});
