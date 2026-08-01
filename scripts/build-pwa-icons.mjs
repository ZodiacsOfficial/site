import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { SIGN_ORDER } from './sign-data.mjs';
import { PWA_MANIFEST_EN } from '../src/strings/pwa.en.mjs';
import { BRAND_ICON_BASE, BRAND_ICON_PATHS } from '../src/lib/brand-icons.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDirectory = resolve(root, 'public/assets/zodiac-icons/128');
const faviconColors = [
  '#DE8E79', '#B9D4BE', '#B29DD0', '#B6D4E4', '#E0A9B4', '#B7D9B0',
  '#D3A9DE', '#B9DCE8', '#E0B080', '#C0DEA8', '#AE8FC9', '#A9D4C4',
];

export async function composeWheelIcon(size, { maskable = false } = {}) {
  const logicalSize = 512;
  // Keep every sign comfortably inside the common 80% safe circle even when
  // a browser or launcher applies its own circular/squircle crop. The prior
  // any-purpose ring sat almost exactly on that boundary, leaving no room for
  // platform variation.
  const discSize = maskable ? 62 : 64;
  const radius = maskable ? 132 : 140;
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
  const wheel = await sharp({
    create: { width: logicalSize, height: logicalSize, channels: 4, background: '#060709' },
  })
    .composite(inputs)
    .png()
    .toBuffer();

  // Sharp applies resize operations before composites in the same pipeline.
  // Flatten the canonical 512px wheel first so smaller PWA and Apple assets
  // scale the complete ring instead of clipping composites at 512px offsets.
  return sharp(wheel)
    .resize(size, size, { kernel: 'lanczos3' })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

export function composeFaviconSvg() {
  const center = 32;
  const ringRadius = 19.25;
  const dotRadius = 3;
  const dots = faviconColors.map((fill, index) => {
    const angle = -Math.PI / 2 + index * Math.PI / 6;
    const cx = (center + Math.cos(angle) * ringRadius).toFixed(3);
    const cy = (center + Math.sin(angle) * ringRadius).toFixed(3);
    return `<circle cx="${cx}" cy="${cy}" r="${dotRadius}" fill="${fill}"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#060709"/>${dots}</svg>`;
}

export async function composeFavicon(size) {
  return sharp(Buffer.from(composeFaviconSvg()))
    .resize(size, size, { kernel: 'lanczos3' })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

/** Build a standards-compatible ICO whose image payloads are PNG buffers. */
export function composeFaviconIco(images) {
  const directorySize = 6 + images.length * 16;
  const header = Buffer.alloc(directorySize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  let offset = directorySize;
  images.forEach(({ size, image }, index) => {
    const entry = 6 + index * 16;
    header.writeUInt8(size >= 256 ? 0 : size, entry);
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1);
    header.writeUInt8(0, entry + 2);
    header.writeUInt8(0, entry + 3);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(image.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += image.length;
  });

  return Buffer.concat([header, ...images.map(({ image }) => image)]);
}

export async function buildPwaIcons({ rootDirectory = root } = {}) {
  const publicPath = (path) => resolve(rootDirectory, 'public', path.replace(/^\//, ''));
  const outputDirectory = resolve(rootDirectory, 'public', BRAND_ICON_BASE.replace(/^\//, ''));
  await Promise.all([
    mkdir(outputDirectory, { recursive: true }),
    mkdir(resolve(rootDirectory, 'public/assets/app-icons'), { recursive: true }),
  ]);
  const faviconSvg = Buffer.from(composeFaviconSvg());
  const [favicon16, favicon32, favicon48, favicon, icon192, icon512, maskable512, apple] = await Promise.all([
    composeFavicon(16),
    composeFavicon(32),
    composeFavicon(48),
    composeFavicon(96),
    composeWheelIcon(192),
    composeWheelIcon(512),
    composeWheelIcon(512, { maskable: true }),
    composeWheelIcon(180),
  ]);
  const faviconIco = composeFaviconIco([
    { size: 16, image: favicon16 },
    { size: 32, image: favicon32 },
    { size: 48, image: favicon48 },
  ]);
  const outputs = [
    [BRAND_ICON_PATHS.faviconSvg, faviconSvg],
    [BRAND_ICON_PATHS.favicon16, favicon16],
    [BRAND_ICON_PATHS.favicon32, favicon32],
    [BRAND_ICON_PATHS.favicon, favicon],
    [BRAND_ICON_PATHS.icon192, icon192],
    [BRAND_ICON_PATHS.icon512, icon512],
    [BRAND_ICON_PATHS.maskable512, maskable512],
    [BRAND_ICON_PATHS.appleTouch, apple],
    // Root and unversioned copies are compatibility fallbacks. All authored
    // references use the versioned paths above so stale immutable caches are
    // bypassed, while older manifests still receive the safer geometry.
    ['/favicon.ico', faviconIco],
    ['/apple-touch-icon.png', apple],
    ['/assets/app-icons/icon-192.png', icon192],
    ['/assets/app-icons/icon-512.png', icon512],
    ['/assets/app-icons/maskable-512.png', maskable512],
  ];
  await Promise.all([
    ...outputs.map(([path, image]) => writeFile(publicPath(path), image)),
    writeFile(resolve(rootDirectory, 'public/site.webmanifest'), `${JSON.stringify({
      name: PWA_MANIFEST_EN.name,
      short_name: PWA_MANIFEST_EN.shortName,
      description: PWA_MANIFEST_EN.description,
      start_url: '/',
      scope: '/',
      display: 'standalone',
      background_color: '#060709',
      theme_color: '#060709',
      icons: [
        { src: BRAND_ICON_PATHS.icon192, sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: BRAND_ICON_PATHS.icon512, sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: BRAND_ICON_PATHS.maskable512, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    }, null, 2)}\n`, 'utf8'),
  ]);
  return outputs.length;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`PWA icons: ${await buildPwaIcons()} cache-busted twelve-sign wheel assets written.`);
}
