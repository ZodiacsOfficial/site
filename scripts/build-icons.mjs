/*
 * Generates the responsive pastel sign-icon derivatives used by the new
 * site's <SignIcon> component:
 *
 *   public/assets/zodiac-icons/{48,128,400}/{sign}.{avif,webp}
 *
 * Sources are the SDK-public 1024×1024 PNGs at
 * public/assets/sdk/zodiac-icons/circle/ — those stay byte-identical.
 * Source discs do not all share the same visible alpha bounds. Before
 * resizing, measure each disc, crop a square around its visible center, and
 * place it on one common circular canvas. That keeps every derivative
 * centered with the same visible diameter without changing the source PNGs.
 *
 *   npm run data:icons
 */
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';
import { SIGN_ORDER } from './sign-data.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = resolve(root, 'public/assets/sdk/zodiac-icons/circle');
const outBase = resolve(root, 'public/assets/zodiac-icons');

const SIZES = [48, 128, 400];
const SOURCE_SIZE = 1024;
const VISIBLE_DIAMETER = 946;
const ALPHA_THRESHOLD = 8;
const EDGE_BLEED = 4;

function alphaBounds(data, info) {
  const alphaChannel = info.channels - 1;
  let left = info.width;
  let top = info.height;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const alpha = data[(y * info.width + x) * info.channels + alphaChannel];
      if (alpha <= ALPHA_THRESHOLD) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }

  if (right < left || bottom < top) {
    throw new Error('Icon source has no visible alpha pixels.');
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

async function normalizedDisc(src) {
  const { data, info } = await sharp(src)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const bounds = alphaBounds(data, info);
  const side = Math.max(bounds.width, bounds.height);
  const centerX = (bounds.left + bounds.right) / 2;
  const centerY = (bounds.top + bounds.bottom) / 2;
  const left = Math.max(0, Math.min(info.width - side, Math.round(centerX - side / 2)));
  const top = Math.max(0, Math.min(info.height - side, Math.round(centerY - side / 2)));
  const contentDiameter = Math.ceil(
    VISIBLE_DIAMETER * side / Math.min(bounds.width, bounds.height),
  ) + EDGE_BLEED;
  const contentInset = Math.floor((contentDiameter - VISIBLE_DIAMETER) / 2);

  const fitted = await sharp(src)
    .extract({ left, top, width: side, height: side })
    .resize(contentDiameter, contentDiameter, {
      fit: 'fill',
      kernel: 'lanczos3',
    })
    .extract({
      left: contentInset,
      top: contentInset,
      width: VISIBLE_DIAMETER,
      height: VISIBLE_DIAMETER,
    })
    .composite([{
      input: Buffer.from(
        `<svg width="${VISIBLE_DIAMETER}" height="${VISIBLE_DIAMETER}" viewBox="0 0 ${VISIBLE_DIAMETER} ${VISIBLE_DIAMETER}"><circle cx="${VISIBLE_DIAMETER / 2}" cy="${VISIBLE_DIAMETER / 2}" r="${VISIBLE_DIAMETER / 2}" fill="#fff"/></svg>`,
      ),
      blend: 'dest-in',
    }])
    .png()
    .toBuffer();

  const inset = Math.floor((SOURCE_SIZE - VISIBLE_DIAMETER) / 2);
  return sharp({
    create: {
      width: SOURCE_SIZE,
      height: SOURCE_SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: fitted, left: inset, top: inset }])
    .png()
    .toBuffer();
}

let written = 0;
for (const size of SIZES) {
  await mkdir(resolve(outBase, String(size)), { recursive: true });
}

for (const slug of SIGN_ORDER) {
  const src = resolve(srcDir, `${slug}.png`);
  const base = sharp(await normalizedDisc(src));

  for (const size of SIZES) {
    const resized = base.clone().resize(size, size, { kernel: 'lanczos3' });
    const avifOut = resolve(outBase, String(size), `${slug}.avif`);
    const webpOut = resolve(outBase, String(size), `${slug}.webp`);
    await resized.clone().avif({
      lossless: true,
      effort: 6,
      chromaSubsampling: '4:4:4',
    }).toFile(avifOut);
    await resized.clone().webp({
      quality: 86,
      alphaQuality: 100,
      smartSubsample: true,
    }).toFile(webpOut);
    written += 2;
  }
  console.log(`icons: ${slug} → ${SIZES.join('/')}px avif+webp`);
}

console.log(`Done — ${written} derivative files under public/assets/zodiac-icons/.`);
