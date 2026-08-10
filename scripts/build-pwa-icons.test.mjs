import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  buildPwaIcons,
  composeFavicon,
  composeFaviconIco,
  composeFaviconSvg,
  composeWheelIcon,
} from './build-pwa-icons.mjs';
import { SIGN_ORDER } from './sign-data.mjs';
import { PWA_MANIFEST_EN } from '../src/strings/pwa.en.mjs';
import { BRAND_ICON_PATHS, BRAND_ICON_VERSION } from '../src/lib/brand-icons.mjs';

async function visibleMask(image) {
  const { data, info } = await sharp(image).raw().toBuffer({ resolveWithObject: true });
  const mask = new Uint8Array(info.width * info.height);
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const offset = (y * info.width + x) * info.channels;
      const differsFromBackground = (
        Math.abs(data[offset] - 6)
        + Math.abs(data[offset + 1] - 7)
        + Math.abs(data[offset + 2] - 9)
      ) > 18;
      const visibleAlpha = info.channels < 4 || data[offset + 3] > 128;
      mask[y * info.width + x] = visibleAlpha && differsFromBackground ? 1 : 0;
    }
  }
  return { mask, width: info.width, height: info.height };
}

async function visibleBounds(image) {
  const { mask, width, height } = await visibleMask(image);
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!mask[y * width + x]) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  return { minX, minY, maxX, maxY, width, height };
}

async function visibleComponentsAndRadius(image) {
  const { mask, width, height } = await visibleMask(image);
  const seen = new Uint8Array(mask.length);
  const centerX = (width - 1) / 2;
  const centerY = (height - 1) / 2;
  let components = 0;
  let maxRadius = 0;

  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || seen[start]) continue;
    components += 1;
    const queue = [start];
    seen[start] = 1;
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const index = queue[cursor];
      const x = index % width;
      const y = Math.floor(index / width);
      maxRadius = Math.max(maxRadius, Math.hypot(x - centerX, y - centerY));
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        const next = ny * width + nx;
        if (mask[next] && !seen[next]) {
          seen[next] = 1;
          queue.push(next);
        }
      }
    }
  }
  return { components, maxRadius, width };
}

async function visibleSignCount(image, { maskable = false } = {}) {
  const { mask, width, height } = await visibleMask(image);
  const centerX = (width - 1) / 2;
  const centerY = (height - 1) / 2;
  const ringRadius = width * (maskable ? 132 : 140) / 512;
  const probeRadius = Math.max(1.75, width * 0.055);
  let visibleSigns = 0;

  for (let index = 0; index < 12; index += 1) {
    const angle = -Math.PI / 2 + index * Math.PI / 6;
    const expectedX = centerX + Math.cos(angle) * ringRadius;
    const expectedY = centerY + Math.sin(angle) * ringRadius;
    let found = false;
    for (let y = 0; y < height && !found; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (Math.hypot(x - expectedX, y - expectedY) <= probeRadius && mask[y * width + x]) {
          found = true;
          break;
        }
      }
    }
    if (found) visibleSigns += 1;
  }

  return visibleSigns;
}

async function visibleFaviconDotCount(image) {
  const { mask, width, height } = await visibleMask(image);
  const centerX = (width - 1) / 2;
  const centerY = (height - 1) / 2;
  const ringRadius = width * 19 / 64;
  const probeRadius = Math.max(1, width * 0.04);
  let visibleDots = 0;

  for (let index = 0; index < 12; index += 1) {
    const angle = -Math.PI / 2 + index * Math.PI / 6;
    const expectedX = centerX + Math.cos(angle) * ringRadius;
    const expectedY = centerY + Math.sin(angle) * ringRadius;
    let found = false;
    for (let y = 0; y < height && !found; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (Math.hypot(x - expectedX, y - expectedY) <= probeRadius && mask[y * width + x]) {
          found = true;
          break;
        }
      }
    }
    if (found) visibleDots += 1;
  }

  return visibleDots;
}

async function pixelDifference(leftImage, rightImage) {
  const [left, right] = await Promise.all([
    sharp(leftImage).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(rightImage).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  ]);
  expect(left.info).toMatchObject({
    width: right.info.width,
    height: right.info.height,
    channels: right.info.channels,
  });
  let totalDelta = 0;
  let maxDelta = 0;
  let changedChannels = 0;
  for (let index = 0; index < left.data.length; index += 1) {
    const delta = Math.abs(left.data[index] - right.data[index]);
    totalDelta += delta;
    maxDelta = Math.max(maxDelta, delta);
    if (delta > 0) changedChannels += 1;
  }
  return {
    meanDelta: totalDelta / left.data.length,
    maxDelta,
    changedRatio: changedChannels / left.data.length,
  };
}

function icoPngFrames(icon) {
  const count = icon.readUInt16LE(4);
  return Array.from({ length: count }, (_, index) => {
    const entry = 6 + index * 16;
    const length = icon.readUInt32LE(entry + 8);
    const offset = icon.readUInt32LE(entry + 12);
    return icon.subarray(offset, offset + length);
  });
}

async function expectEquivalentPixels(leftImage, rightImage) {
  const difference = await pixelDifference(leftImage, rightImage);
  // PNG compression is platform-dependent. Decoded output should be exact in
  // practice, with a tiny allowance for architecture-specific resize math.
  expect(difference.meanDelta).toBeLessThanOrEqual(0.1);
  expect(difference.maxDelta).toBeLessThanOrEqual(8);
  expect(difference.changedRatio).toBeLessThanOrEqual(0.01);
}

describe('PWA icon compositor', () => {
  it('pins authored icon references to the immutable v3 asset set', () => {
    expect(BRAND_ICON_VERSION).toBe('v3');
    expect(Object.values(BRAND_ICON_PATHS).every((path) => path.includes('/app-icons/v3/'))).toBe(true);
  });

  it('renders the canonical wheel at manifest resolution', async () => {
    const image = await composeWheelIcon(192);
    const metadata = await sharp(image).metadata();
    expect(metadata).toMatchObject({ width: 192, height: 192, format: 'png' });
  });

  it.each([
    { size: 180, maskable: false },
    { size: 192, maskable: false },
    { size: 512, maskable: false },
    { size: 512, maskable: true },
  ])('keeps the complete wheel centered at $size px (maskable: $maskable)', async ({ size, maskable }) => {
    const bounds = await visibleBounds(await composeWheelIcon(size, { maskable }));
    const rightMargin = size - 1 - bounds.maxX;
    const bottomMargin = size - 1 - bounds.maxY;

    expect(Math.abs(bounds.minX - rightMargin)).toBeLessThanOrEqual(2);
    expect(Math.abs(bounds.minY - bottomMargin)).toBeLessThanOrEqual(2);
  });

  it('keeps maskable artwork inside its safe wheel radius', async () => {
    const image = await composeWheelIcon(512, { maskable: true });
    expect((await sharp(image).metadata()).width).toBe(512);
  });

  it.each([
    { size: 180, maskable: false, safeRadius: 0.35, expectedComponents: 12 },
    { size: 192, maskable: false, safeRadius: 0.35, expectedComponents: 12 },
    { size: 512, maskable: false, safeRadius: 0.35, expectedComponents: 12 },
    { size: 512, maskable: true, safeRadius: 0.33, expectedComponents: 12 },
  ])('preserves all twelve signs inside the safe area at $size px', async ({
    size, maskable, safeRadius, expectedComponents,
  }) => {
    const image = await composeWheelIcon(size, { maskable });
    const result = await visibleComponentsAndRadius(image);
    expect(await visibleSignCount(image, { maskable })).toBe(12);
    if (expectedComponents) expect(result.components).toBe(expectedComponents);
    expect(result.maxRadius).toBeLessThanOrEqual(result.width * safeRadius + 1);
  });

  it.each([16, 32, 48, 96])('keeps all twelve favicon dots distinct and inside 35%% at %ipx', async (size) => {
    const image = await composeFavicon(size);
    const result = await visibleComponentsAndRadius(image);
    expect(await visibleFaviconDotCount(image)).toBe(12);
    expect(result.components).toBe(12);
    expect(result.maxRadius).toBeLessThanOrEqual(result.width * 0.35 + 1);
  });

  it('keeps the scalable favicon to exactly twelve color positions', () => {
    expect(composeFaviconSvg().match(/<circle\b/gu)).toHaveLength(12);
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
      expect(manifest.icons.map((icon) => icon.src)).toEqual([
        BRAND_ICON_PATHS.icon192,
        BRAND_ICON_PATHS.icon512,
        BRAND_ICON_PATHS.maskable512,
      ]);
      expect(manifest.icons.every((icon) => icon.src.includes(`/${BRAND_ICON_VERSION}/`))).toBe(true);

      const appleBounds = await visibleBounds(
        await readFile(resolve(rootDirectory, 'public', BRAND_ICON_PATHS.appleTouch.slice(1))),
      );
      expect(appleBounds).toMatchObject({ width: 180, height: 180 });

      const favicon = await sharp(
        await readFile(resolve(rootDirectory, 'public', BRAND_ICON_PATHS.favicon.slice(1))),
      ).metadata();
      expect(favicon).toMatchObject({ width: 96, height: 96, format: 'png' });

      const favicon32 = await sharp(
        await readFile(resolve(rootDirectory, 'public', BRAND_ICON_PATHS.favicon32.slice(1))),
      ).metadata();
      expect(favicon32).toMatchObject({ width: 32, height: 32, format: 'png' });

      const ico = await readFile(resolve(rootDirectory, 'public/favicon.ico'));
      expect(ico.readUInt16LE(0)).toBe(0);
      expect(ico.readUInt16LE(2)).toBe(1);
      expect(ico.readUInt16LE(4)).toBe(3);
      expect([ico.readUInt8(6), ico.readUInt8(22), ico.readUInt8(38)]).toEqual([16, 32, 48]);

      const rasterPublicPaths = [
        BRAND_ICON_PATHS.favicon16,
        BRAND_ICON_PATHS.favicon32,
        BRAND_ICON_PATHS.favicon,
        BRAND_ICON_PATHS.appleTouch,
        BRAND_ICON_PATHS.icon192,
        BRAND_ICON_PATHS.icon512,
        BRAND_ICON_PATHS.maskable512,
        '/apple-touch-icon.png',
        '/assets/app-icons/icon-192.png',
        '/assets/app-icons/icon-512.png',
        '/assets/app-icons/maskable-512.png',
      ];
      for (const path of rasterPublicPaths) {
        await expectEquivalentPixels(
          await readFile(resolve(rootDirectory, 'public', path.slice(1))),
          await readFile(resolve('public', path.slice(1))),
        );
      }
      for (const path of [BRAND_ICON_PATHS.faviconSvg, '/site.webmanifest']) {
        expect(await readFile(resolve(rootDirectory, 'public', path.slice(1))))
          .toEqual(await readFile(resolve('public', path.slice(1))));
      }
      const committedIco = await readFile(resolve('public/favicon.ico'));
      const generatedFrames = icoPngFrames(ico);
      const committedFrames = icoPngFrames(committedIco);
      expect(committedFrames).toHaveLength(generatedFrames.length);
      for (let index = 0; index < generatedFrames.length; index += 1) {
        await expectEquivalentPixels(generatedFrames[index], committedFrames[index]);
      }
    } finally {
      await rm(rootDirectory, { recursive: true, force: true });
    }
  });

  it('writes a valid PNG-backed favicon container', async () => {
    const icon = composeFaviconIco([
      { size: 16, image: await composeFavicon(16) },
      { size: 32, image: await composeFavicon(32) },
      { size: 48, image: await composeFavicon(48) },
    ]);
    expect(icon.subarray(icon.readUInt32LE(18), icon.readUInt32LE(18) + 8))
      .toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  });

  it('keeps every committed static page on the canonical icon set', async () => {
    const pages = [
      'public/archive/index.html',
      'public/thesis/index.html',
      'public/sdk/index.html',
      'public/registry/index.html',
      'public/terminal/index.html',
      ...SIGN_ORDER.map((sign) => `public/registry/${sign}/index.html`),
    ];

    for (const page of pages) {
      const html = await readFile(resolve(page), 'utf8');
      expect(html, page).toContain(`href="${BRAND_ICON_PATHS.faviconSvg}"`);
      expect(html, page).toContain(`href="${BRAND_ICON_PATHS.favicon16}"`);
      expect(html, page).toContain(`href="${BRAND_ICON_PATHS.favicon32}"`);
      expect(html, page).toContain(`href="${BRAND_ICON_PATHS.favicon}"`);
      expect(html, page).toContain(`href="${BRAND_ICON_PATHS.appleTouch}"`);
      expect(html, page).toContain('href="/site.webmanifest"');
      expect(html.match(/<link rel="icon"[^>]+data:image/gu), page).toBeNull();
    }
  });

  it('keeps push notification artwork on the same immutable icon version', async () => {
    const worker = await readFile(resolve('public/sw.js'), 'utf8');
    expect(worker.match(/icon: '([^']+)'/u)?.[1]).toBe(BRAND_ICON_PATHS.icon192);
    expect(worker.match(/badge: '([^']+)'/u)?.[1]).toBe(BRAND_ICON_PATHS.icon192);
    expect(worker).not.toContain('/assets/app-icons/v2/');
  });
});
