import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { SIGN_ORDER } from './sign-data.mjs';
import { PWA_MANIFEST_EN } from '../src/strings/pwa.en.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDirectory = resolve(root, 'public/assets/zodiac-icons/128');
const outputDirectory = resolve(root, 'public/assets/app-icons');

export async function composeWheelIcon(size, { maskable = false } = {}) {
  const logicalSize = 512;
  const discSize = maskable ? 62 : 72;
  const radius = maskable ? 132 : 168;
  const center = logicalSize / 2;
  const inputs = await Promise.all(SIGN_ORDER.map(async (slug, index) => {
    const angle = -Math.PI / 2 + index * Math.PI / 6;
    const left = Math.round(center + Math.cos(angle) * radius - discSize / 2);
    const top = Math.round(center + Math.sin(angle) * radius - discSize / 2);
    const input = await sharp(resolve(sourceDirectory, `${slug}.webp`))
      .resize(discSize, discSize, { kernel: 'lanczos3' })
      .png()
      .toBuffer();
    return { input, left, top };
  }));
  return sharp({
    create: { width: logicalSize, height: logicalSize, channels: 4, background: '#060709' },
  })
    .composite(inputs)
    .resize(size, size, { kernel: 'lanczos3' })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

export async function buildPwaIcons() {
  await mkdir(outputDirectory, { recursive: true });
  const [icon192, icon512, maskable512, apple] = await Promise.all([
    composeWheelIcon(192),
    composeWheelIcon(512),
    composeWheelIcon(512, { maskable: true }),
    composeWheelIcon(180),
  ]);
  await Promise.all([
    sharp(icon192).toFile(resolve(outputDirectory, 'icon-192.png')),
    sharp(icon512).toFile(resolve(outputDirectory, 'icon-512.png')),
    sharp(maskable512).toFile(resolve(outputDirectory, 'maskable-512.png')),
    sharp(apple).toFile(resolve(root, 'public/apple-touch-icon.png')),
    writeFile(resolve(root, 'public/site.webmanifest'), `${JSON.stringify({
      name: PWA_MANIFEST_EN.name,
      short_name: PWA_MANIFEST_EN.shortName,
      description: PWA_MANIFEST_EN.description,
      start_url: '/',
      scope: '/',
      display: 'standalone',
      background_color: '#060709',
      theme_color: '#060709',
      icons: [
        { src: '/assets/app-icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/assets/app-icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/assets/app-icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    }, null, 2)}\n`, 'utf8'),
  ]);
  return 4;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`PWA icons: ${await buildPwaIcons()} canonical twelve-icon wheel assets written.`);
}
