import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import {
  CABINET_MATERIALS,
  CABINET_MATERIAL_ALPHA_THRESHOLD,
  CABINET_MATERIAL_CONTENT_SIZE,
  CABINET_MATERIAL_SAFE_INSET,
  CABINET_MATERIAL_SIZE,
  alphaBounds,
} from './build-cabinet-materials.mjs';
import { SIGN_ORDER } from './sign-data.mjs';

const FORMATS = ['avif', 'webp'];
const BASE = 'public/assets/cabinet-materials';

async function imageGeometry(path) {
  const { data, info } = await sharp(path)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return {
    info,
    bounds: alphaBounds(data, info),
  };
}

async function alphaPlane(path) {
  const { data, info } = await sharp(path)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const alpha = Buffer.alloc(info.width * info.height);
  for (let index = 0; index < alpha.length; index += 1) {
    alpha[index] = data[(index * info.channels) + 3];
  }
  return alpha;
}

async function averageVisibleColor(path) {
  const { data, info } = await sharp(path)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const totals = [0, 0, 0];
  let count = 0;

  for (let offset = 0; offset < data.length; offset += info.channels) {
    if (data[offset + 3] <= CABINET_MATERIAL_ALPHA_THRESHOLD) continue;
    totals[0] += data[offset];
    totals[1] += data[offset + 1];
    totals[2] += data[offset + 2];
    count += 1;
  }

  return totals.map((total) => total / count);
}

describe('cabinet material derivatives', () => {
  it('publishes a deterministic manifest for the complete family', async () => {
    const manifest = JSON.parse(await readFile(`${BASE}/manifest.json`, 'utf8'));
    expect(manifest).toEqual({
      version: 1,
      size: 256,
      safeInset: 36,
      materials: ['bronze', 'silver', 'gold'],
      signs: SIGN_ORDER,
    });
  });

  it('keeps all material artwork centered inside the 14% safe inset', async () => {
    for (const material of CABINET_MATERIALS) {
      for (const format of FORMATS) {
        for (const sign of SIGN_ORDER) {
          const { info, bounds } = await imageGeometry(
            `${BASE}/${material}/${sign}.${format}`,
          );
          expect(info.width).toBe(CABINET_MATERIAL_SIZE);
          expect(info.height).toBe(CABINET_MATERIAL_SIZE);
          expect(info.channels).toBe(4);
          expect(bounds.left).toBeGreaterThanOrEqual(CABINET_MATERIAL_SAFE_INSET);
          expect(bounds.top).toBeGreaterThanOrEqual(CABINET_MATERIAL_SAFE_INSET);
          expect(bounds.right).toBeLessThan(
            CABINET_MATERIAL_SIZE - CABINET_MATERIAL_SAFE_INSET,
          );
          expect(bounds.bottom).toBeLessThan(
            CABINET_MATERIAL_SIZE - CABINET_MATERIAL_SAFE_INSET,
          );
          expect(Math.max(bounds.width, bounds.height)).toBeLessThanOrEqual(
            CABINET_MATERIAL_CONTENT_SIZE,
          );
          expect(Math.max(bounds.width, bounds.height)).toBeGreaterThanOrEqual(
            CABINET_MATERIAL_CONTENT_SIZE - 1,
          );
          expect(
            Math.abs(((bounds.left + bounds.right) / 2) - ((info.width - 1) / 2)),
          ).toBeLessThanOrEqual(0.5);
          expect(
            Math.abs(((bounds.top + bounds.bottom) / 2) - ((info.height - 1) / 2)),
          ).toBeLessThanOrEqual(0.5);
        }
      }
    }
  });

  it('preserves one silhouette across every material and output format', async () => {
    for (const sign of SIGN_ORDER) {
      const reference = await alphaPlane(`${BASE}/gold/${sign}.avif`);
      for (const material of CABINET_MATERIALS) {
        for (const format of FORMATS) {
          const candidate = await alphaPlane(`${BASE}/${material}/${sign}.${format}`);
          expect(candidate.equals(reference)).toBe(true);
        }
      }
    }
  });

  it('renders Bronze warm and Silver neutral without flattening Gold', async () => {
    for (const sign of SIGN_ORDER) {
      const [bronze, silver, gold] = await Promise.all(
        CABINET_MATERIALS.map((material) => (
          averageVisibleColor(`${BASE}/${material}/${sign}.webp`)
        )),
      );
      expect(bronze[0]).toBeGreaterThan(bronze[1]);
      expect(bronze[1]).toBeGreaterThan(bronze[2]);
      expect(Math.max(...silver) - Math.min(...silver)).toBeLessThan(20);
      expect(gold[0]).toBeGreaterThan(gold[2]);
    }
  });
});
