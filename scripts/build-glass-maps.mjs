/*
 * Displacement maps for the homepage glass chrome (nav pill + hero
 * ghost CTA). Each map encodes a capsule-shaped lens: R carries x
 * displacement, G carries y, 128 = neutral. feDisplacementMap reads
 * them inside the inline SVG filters in index.astro; the maps ship as
 * data URIs in src/data/glass-maps.json.
 *
 * The profile: zero displacement through the interior, bending sharply
 * inward near the rim — refraction at the edge of a lens, not frosted
 * soup. Pure function of the parameters below; regenerate only when
 * tuning the optics.
 *
 *   node scripts/build-glass-maps.mjs
 */
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outFile = resolve(root, 'src/data/glass-maps.json');

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

/**
 * Capsule lens map. Coordinates are aspect-corrected so the pill is a
 * width-A × height-1 capsule; falloff is the rim band (in heights)
 * where bending happens, exponent shapes how hard it rises at the rim.
 */
function capsuleMap({ w, h, falloff, exponent }) {
  const A = w / h;
  const halfLen = A / 2 - 0.5;
  const buf = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const px = ((x + 0.5) / w - 0.5) * A;
      const py = (y + 0.5) / h - 0.5;
      const qx = Math.max(Math.abs(px) - halfLen, 0);
      const d = Math.hypot(qx, py) - 0.5;            // capsule SDF, <0 inside
      const edge = clamp(1 + d / falloff, 0, 1);     // 1 at the rim
      const g = edge ** exponent;
      const len = Math.hypot(px, py) || 1;
      const dxUv = clamp((-px / len) * (g / A), -1, 1);
      const dyUv = clamp((-py / len) * g, -1, 1);
      const i = (y * w + x) * 4;
      buf[i] = Math.round(127.5 + 127.5 * dxUv);
      buf[i + 1] = Math.round(127.5 + 127.5 * dyUv);
      buf[i + 2] = 128;
      buf[i + 3] = 255;
    }
  }
  return buf;
}

async function toDataUri({ w, h, ...params }) {
  const png = await sharp(capsuleMap({ w, h, ...params }), {
    raw: { width: w, height: h, channels: 4 },
  }).png({ compressionLevel: 9 }).toBuffer();
  return `data:image/png;base64,${png.toString('base64')}`;
}

const maps = {
  // Ghost CTA ≈ 230×52 → aspect ~4.4
  cta: await toDataUri({ w: 128, h: 32, falloff: 0.32, exponent: 2.2 }),
  // Nav pill ≈ 420×52 → aspect ~8
  nav: await toDataUri({ w: 256, h: 32, falloff: 0.30, exponent: 2.4 }),
};

await writeFile(outFile, `${JSON.stringify(maps, null, 2)}\n`);
console.log(`✓ src/data/glass-maps.json (cta ${maps.cta.length} chars, nav ${maps.nav.length} chars)`);
