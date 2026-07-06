/*
 * Rasterizes the brand mark (the twelve pastel dots on the void — the
 * same geometry as the inline favicon in Base.astro) into the PWA and
 * Apple icons:
 *
 *   public/assets/app-icons/icon-192.png
 *   public/assets/app-icons/icon-512.png
 *   public/assets/app-icons/maskable-512.png   (mark inset to the safe zone)
 *   public/apple-touch-icon.png                (180×180, opaque, square)
 *
 *   node scripts/build-app-icons.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'public/assets/app-icons');

// Twelve dots, r=3.4 on a ring of radius 22 in a 64-box — favicon geometry.
const DOTS = [
  ['32', '10', '#DE8E79'], ['43', '12.9', '#B9D4BE'], ['51.1', '21', '#B29DD0'],
  ['54', '32', '#B6D4E4'], ['51.1', '43', '#E0A9B4'], ['43', '51.1', '#B7D9B0'],
  ['32', '54', '#D3A9DE'], ['21', '51.1', '#B9DCE8'], ['12.9', '43', '#E0B080'],
  ['10', '32', '#C0DEA8'], ['12.9', '21', '#AE8FC9'], ['21', '12.9', '#A9D4C4'],
];

const circles = DOTS
  .map(([cx, cy, fill]) => `<circle cx="${cx}" cy="${cy}" r="3.4" fill="${fill}"/>`)
  .join('');

/**
 * rx: corner radius in the 64-box (0 = square edge-to-edge).
 * inset: scales the dot ring toward center — maskable icons lose an
 * outer ~10% to the platform mask, so the mark steps back from it.
 */
function markSvg({ rx, inset }) {
  const g = inset === 0
    ? circles
    : `<g transform="translate(32 32) scale(${1 - inset}) translate(-32 -32)">${circles}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">`
    + `<rect width="64" height="64" rx="${rx}" fill="#060709"/>${g}</svg>`;
}

const JOBS = [
  { file: resolve(outDir, 'icon-192.png'), size: 192, svg: markSvg({ rx: 14, inset: 0 }) },
  { file: resolve(outDir, 'icon-512.png'), size: 512, svg: markSvg({ rx: 14, inset: 0 }) },
  { file: resolve(outDir, 'maskable-512.png'), size: 512, svg: markSvg({ rx: 0, inset: 0.18 }) },
  { file: resolve(root, 'public/apple-touch-icon.png'), size: 180, svg: markSvg({ rx: 0, inset: 0.08 }) },
];

await mkdir(outDir, { recursive: true });
for (const job of JOBS) {
  const png = await sharp(Buffer.from(job.svg), { density: 72 * (job.size / 64) })
    .resize(job.size, job.size)
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(job.file, png);
  console.log(`✓ ${job.file.replace(`${root}/`, '')} (${png.length} bytes)`);
}
