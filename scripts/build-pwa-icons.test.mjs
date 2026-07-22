import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { buildPwaIcons, composeWheelIcon } from './build-pwa-icons.mjs';
import { PWA_MANIFEST_EN } from '../src/strings/pwa.en.mjs';

async function visibleBounds(image) {
  const { data, info } = await sharp(image).raw().toBuffer({ resolveWithObject: true });
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const offset = (y * info.width + x) * info.channels;
      const differsFromBackground = (
        Math.abs(data[offset] - 6)
        + Math.abs(data[offset + 1] - 7)
        + Math.abs(data[offset + 2] - 9)
      ) > 18;
      if (!differsFromBackground) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  return { minX, minY, maxX, maxY, width: info.width, height: info.height };
}

describe('PWA icon compositor', () => {
  it('renders the canonical wheel at manifest resolution', async () => {
    const image = await composeWheelIcon(192);
    const metadata = await sharp(image).metadata();
    expect(metadata).toMatchObject({ width: 192, height: 192, format: 'png' });
  });

  it.each([180, 192])('keeps the complete wheel centered at %ipx', async (size) => {
    const bounds = await visibleBounds(await composeWheelIcon(size));
    const rightMargin = size - 1 - bounds.maxX;
    const bottomMargin = size - 1 - bounds.maxY;

    expect(bounds.minX).toBeLessThan(size * 0.2);
    expect(bounds.minY).toBeLessThan(size * 0.2);
    expect(bounds.maxX).toBeGreaterThan(size * 0.8);
    expect(bounds.maxY).toBeGreaterThan(size * 0.8);
    expect(Math.abs(bounds.minX - rightMargin)).toBeLessThanOrEqual(2);
    expect(Math.abs(bounds.minY - bottomMargin)).toBeLessThanOrEqual(2);
  });

  it('keeps maskable artwork inside its safe wheel radius', async () => {
    const image = await composeWheelIcon(512, { maskable: true });
    expect((await sharp(image).metadata()).width).toBe(512);
  });

  it('writes install metadata from the English catalogue', async () => {
    const rootDirectory = await mkdtemp(join(tmpdir(), 'zodiacs-pwa-icons-'));
    try {
      await buildPwaIcons({ rootDirectory });
      const manifest = JSON.parse(await readFile(resolve(rootDirectory, 'public/site.webmanifest'), 'utf8'));
      expect(manifest.name).toBe(PWA_MANIFEST_EN.name);
      expect(manifest.description).toBe(PWA_MANIFEST_EN.description);
      expect(manifest.icons).toHaveLength(3);
      expect(manifest.icons.at(-1)?.purpose).toBe('maskable');

      const appleBounds = await visibleBounds(
        await readFile(resolve(rootDirectory, 'public/apple-touch-icon.png')),
      );
      expect(appleBounds).toMatchObject({ width: 180, height: 180 });
      expect(appleBounds.minX).toBeLessThan(36);
      expect(appleBounds.minY).toBeLessThan(36);
      expect(appleBounds.maxX).toBeGreaterThan(144);
      expect(appleBounds.maxY).toBeGreaterThan(144);
    } finally {
      await rm(rootDirectory, { recursive: true, force: true });
    }
  });
});
