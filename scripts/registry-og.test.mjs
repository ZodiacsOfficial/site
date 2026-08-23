import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { SIGN_ORDER } from './sign-data.mjs';
import {
  REGISTRY_OG_BASE,
  REGISTRY_OG_GEOMETRY,
  REGISTRY_OG_VERSION,
} from './build-registry-og.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const family = resolve(root, `public/assets/og/registry/${REGISTRY_OG_VERSION}`);
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

describe('Registry catalogue OG v3', () => {
  it('uses an immutable, cache-busting family and centers the seal ring exactly', () => {
    expect(REGISTRY_OG_VERSION).toBe('v3');
    expect(REGISTRY_OG_BASE).toBe('/assets/og/registry/v3');
    const { seal, sculptureBox, footerRuleY } = REGISTRY_OG_GEOMETRY;
    const ringLeft = seal.left - (seal.ringSize - seal.iconSize) / 2;
    const ringTop = seal.top - (seal.ringSize - seal.iconSize) / 2;
    expect(ringLeft + seal.ringSize / 2).toBe(seal.left + seal.iconSize / 2);
    expect(ringTop + seal.ringSize / 2).toBe(seal.top + seal.iconSize / 2);
    expect(ringTop + seal.ringSize).toBeLessThan(footerRuleY);
    expect(sculptureBox.top + sculptureBox.height).toBeLessThan(footerRuleY);
  });

  it('publishes twelve unique 1200x630 cards with visible gold sculpture pixels', async () => {
    const manifest = JSON.parse(await readFile(resolve(family, 'manifest.json'), 'utf8'));
    expect(manifest.cards.map(({ sign }) => sign)).toEqual(SIGN_ORDER);
    expect(manifest.iconSource).toBe('/assets/sdk/zodiac-icons/circle/{sign}.png');
    expect(manifest.sculptureSource).toBe('/assets/sculptures/1024/{sign}.webp');

    const hashes = new Set();
    for (const sign of SIGN_ORDER) {
      const bytes = await readFile(resolve(family, `${sign}.png`));
      const metadata = await sharp(bytes).metadata();
      expect([metadata.format, metadata.width, metadata.height]).toEqual(['png', 1200, 630]);
      hashes.add(sha256(bytes));

      const region = await sharp(bytes)
        .extract({ left: 640, top: 38, width: 500, height: 492 })
        .removeAlpha()
        .raw()
        .toBuffer();
      let goldPixels = 0;
      for (let offset = 0; offset < region.length; offset += 3) {
        const red = region[offset];
        const green = region[offset + 1];
        const blue = region[offset + 2];
        if (red > 92 && green > 55 && red > green * 1.18 && green > blue * 1.22) goldPixels += 1;
      }
      expect(goldPixels, `${sign} sculpture`).toBeGreaterThan(1200);
    }
    expect(hashes.size).toBe(SIGN_ORDER.length);
  });

  it('wires every Registry page to the matching v3 OG and Twitter card', async () => {
    for (const sign of SIGN_ORDER) {
      const page = await readFile(resolve(root, `public/registry/${sign}/index.html`), 'utf8');
      const url = `https://zodiacs.org${REGISTRY_OG_BASE}/${sign}.png`;
      expect(page).toContain(`<meta property="og:image" content="${url}" />`);
      expect(page).toContain(`<meta name="twitter:image" content="${url}" />`);
      expect(page).not.toContain(`/assets/og/v2/registry/${sign}.png`);
    }
  });
});
