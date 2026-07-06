/*
 * Generates the responsive pastel sign-icon derivatives used by the new
 * site's <SignIcon> component:
 *
 *   public/assets/zodiac-icons/{48,128,400}/{sign}.{avif,webp}
 *
 * Sources are the SDK-public 1024×1024 PNGs at
 * public/assets/sdk/zodiac-icons/circle/ — those stay byte-identical.
 * The resize reads from a 4px-inset center crop, which erodes the faint
 * anti-aliased edge ring some discs carry so small sizes stay clean.
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
const INSET = 4;

let written = 0;
for (const size of SIZES) {
  await mkdir(resolve(outBase, String(size)), { recursive: true });
}

for (const slug of SIGN_ORDER) {
  const src = resolve(srcDir, `${slug}.png`);
  const base = sharp(src).extract({
    left: INSET,
    top: INSET,
    width: 1024 - INSET * 2,
    height: 1024 - INSET * 2,
  });

  for (const size of SIZES) {
    const resized = base.clone().resize(size, size, { kernel: 'lanczos3' });
    const avifOut = resolve(outBase, String(size), `${slug}.avif`);
    const webpOut = resolve(outBase, String(size), `${slug}.webp`);
    await resized.clone().avif({ quality: 60, effort: 6 }).toFile(avifOut);
    await resized.clone().webp({ quality: 84, alphaQuality: 90 }).toFile(webpOut);
    written += 2;
  }
  console.log(`icons: ${slug} → ${SIZES.join('/')}px avif+webp`);
}

console.log(`Done — ${written} derivative files under public/assets/zodiac-icons/.`);
