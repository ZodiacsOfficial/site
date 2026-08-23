/**
 * Builds the immutable Registry catalogue OG family.
 *
 * The established v2 cards remain byte-stable as the editorial text plate.
 * This versioned family replaces only their icon-only art field with each
 * sign's canonical high-resolution pastel disc and normalized gold sculpture.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { SIGN_ORDER } from './sign-data.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const REGISTRY_OG_VERSION = 'v3';
export const REGISTRY_OG_BASE = `/assets/og/registry/${REGISTRY_OG_VERSION}`;
export const REGISTRY_OG_GEOMETRY = Object.freeze({
  width: 1200,
  height: 630,
  footerRuleY: 546,
  sculptureBox: Object.freeze({ left: 640, top: 38, width: 500, height: 492 }),
  seal: Object.freeze({ left: 1012, top: 397, iconSize: 118, ringSize: 138 }),
});

const VOID = '#060709';
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const sourcePath = (rootDirectory, template, sign) => resolve(
  rootDirectory,
  'public',
  template.replace('{sign}', sign).replace(/^\//, ''),
);

function rightFieldSvg() {
  const { width, height } = REGISTRY_OG_GEOMETRY;
  return Buffer.from(`<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="seam" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="${VOID}" stop-opacity="0"/>
        <stop offset="1" stop-color="${VOID}" stop-opacity="1"/>
      </linearGradient>
      <radialGradient id="gold" cx="50%" cy="46%" r="52%">
        <stop offset="0" stop-color="#A96D27" stop-opacity=".18"/>
        <stop offset=".42" stop-color="#704018" stop-opacity=".075"/>
        <stop offset="1" stop-color="${VOID}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect x="660" y="0" width="540" height="630" fill="${VOID}"/>
    <rect x="590" y="0" width="110" height="630" fill="url(#seam)"/>
    <ellipse cx="895" cy="288" rx="292" ry="285" fill="url(#gold)"/>
  </svg>`);
}

function sealRingSvg() {
  const size = REGISTRY_OG_GEOMETRY.seal.ringSize;
  const center = size / 2;
  return Buffer.from(`<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${center}" cy="${center}" r="65" fill="${VOID}" fill-opacity=".72" stroke="#D5A45F" stroke-width="2"/>
    <circle cx="${center}" cy="${center}" r="68" fill="none" stroke="#EEF1F7" stroke-opacity=".14" stroke-width="1"/>
  </svg>`);
}

function footerRuleSvg() {
  const { width, height, footerRuleY } = REGISTRY_OG_GEOMETRY;
  return Buffer.from(`<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <line x1="88" y1="${footerRuleY}" x2="1112" y2="${footerRuleY}" stroke="#C6CCDA" stroke-opacity=".10" stroke-width="1"/>
  </svg>`);
}

async function normalizeSculpture(bytes) {
  const { width, height } = REGISTRY_OG_GEOMETRY.sculptureBox;
  return sharp(bytes)
    .ensureAlpha()
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 6 })
    .resize(width, height, {
      fit: 'inside',
      withoutEnlargement: false,
      kernel: sharp.kernel.lanczos3,
    })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer({ resolveWithObject: true });
}

async function renderRegistryCard(rootDirectory, sign) {
  const baseCardFile = sourcePath(rootDirectory, '/assets/og/v2/registry/{sign}.png', sign);
  const iconFile = sourcePath(rootDirectory, '/assets/sdk/zodiac-icons/circle/{sign}.png', sign);
  const sculptureFile = sourcePath(rootDirectory, '/assets/sculptures/1024/{sign}.webp', sign);
  const [baseCard, iconSource, sculptureSource] = await Promise.all([
    readFile(baseCardFile),
    readFile(iconFile),
    readFile(sculptureFile),
  ]);
  const sculpture = await normalizeSculpture(sculptureSource);
  const { sculptureBox, seal } = REGISTRY_OG_GEOMETRY;
  const sculptureLeft = sculptureBox.left + Math.round((sculptureBox.width - sculpture.info.width) / 2);
  const sculptureTop = sculptureBox.top + Math.round((sculptureBox.height - sculpture.info.height) / 2);
  const ringLeft = seal.left - Math.round((seal.ringSize - seal.iconSize) / 2);
  const ringTop = seal.top - Math.round((seal.ringSize - seal.iconSize) / 2);
  const icon = await sharp(iconSource)
    .resize(seal.iconSize, seal.iconSize, { fit: 'contain', kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
  const bytes = await sharp(baseCard)
    .composite([
      { input: rightFieldSvg(), left: 0, top: 0 },
      { input: sculpture.data, left: sculptureLeft, top: sculptureTop },
      { input: sealRingSvg(), left: ringLeft, top: ringTop },
      { input: icon, left: seal.left, top: seal.top },
      { input: footerRuleSvg(), left: 0, top: 0 },
    ])
    .png({ palette: true, colours: 256, dither: 0.45, compressionLevel: 9, effort: 10 })
    .toBuffer();

  return {
    bytes,
    sourceSha256: {
      baseCard: hash(baseCard),
      icon: hash(iconSource),
      sculpture: hash(sculptureSource),
    },
  };
}

export async function buildRegistryOgFamily({
  rootDirectory = root,
  outputDirectory = resolve(rootDirectory, `public/assets/og/registry/${REGISTRY_OG_VERSION}`),
} = {}) {
  await mkdir(outputDirectory, { recursive: true });
  const cards = [];

  for (const sign of SIGN_ORDER) {
    const rendered = await renderRegistryCard(rootDirectory, sign);
    const filename = `${sign}.png`;
    await writeFile(resolve(outputDirectory, filename), rendered.bytes);
    cards.push({
      sign,
      image: `${REGISTRY_OG_BASE}/${filename}`,
      sha256: hash(rendered.bytes),
      sourceSha256: rendered.sourceSha256,
    });
  }

  const manifest = {
    schema: 'zodiacs.registry-og.v3',
    version: REGISTRY_OG_VERSION,
    base: REGISTRY_OG_BASE,
    type: 'image/png',
    width: REGISTRY_OG_GEOMETRY.width,
    height: REGISTRY_OG_GEOMETRY.height,
    baseCardSource: '/assets/og/v2/registry/{sign}.png',
    iconSource: '/assets/sdk/zodiac-icons/circle/{sign}.png',
    sculptureSource: '/assets/sculptures/1024/{sign}.webp',
    geometry: REGISTRY_OG_GEOMETRY,
    cards,
  };
  await writeFile(resolve(outputDirectory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifest = await buildRegistryOgFamily();
  console.log(`Registry OG: ${manifest.cards.length} ${manifest.version} catalogue cards written.`);
}
