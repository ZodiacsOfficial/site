import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildPwaIcons, composeWheelIcon } from './build-pwa-icons.mjs';
import { PWA_MANIFEST_EN } from '../src/strings/pwa.en.mjs';

describe('PWA icon compositor', () => {
  it('renders the canonical wheel at manifest resolution', async () => {
    const image = await composeWheelIcon(192);
    const metadata = await sharp(image).metadata();
    expect(metadata).toMatchObject({ width: 192, height: 192, format: 'png' });
  });

  it('keeps maskable artwork inside its safe wheel radius', async () => {
    const image = await composeWheelIcon(512, { maskable: true });
    expect((await sharp(image).metadata()).width).toBe(512);
  });

  it('writes install metadata from the English catalogue', async () => {
    await buildPwaIcons();
    const manifest = JSON.parse(await readFile(resolve('public/site.webmanifest'), 'utf8'));
    expect(manifest.name).toBe(PWA_MANIFEST_EN.name);
    expect(manifest.description).toBe(PWA_MANIFEST_EN.description);
    expect(manifest.icons).toHaveLength(3);
    expect(manifest.icons.at(-1)?.purpose).toBe('maskable');
  });
});
