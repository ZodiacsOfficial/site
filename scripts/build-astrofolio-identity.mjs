/**
 * Deterministic seasonal identity assets for the consumer Astrofolio surface.
 *
 * Inputs are the canonical Registry order/date ranges, pastel 128px sign art,
 * and transparent 1024px gold sculptures. Outputs live under a new immutable
 * version so route metadata can move seasons without mutating old social URLs.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { SIGN_ORDER } from './sign-data.mjs';
import { seasonsFromRegistry } from './astrofolio-season.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const ASTROFOLIO_IDENTITY_VERSION = 'v1';
export const ASTROFOLIO_IDENTITY_BASE = `/assets/astrofolio/${ASTROFOLIO_IDENTITY_VERSION}`;
export const TERMINAL_OG_V6_PATH = '/assets/og/v6/terminal.png';

const VOID = '#060709';
const INK = '#F4EFE6';
const PASTELS = [
  '#DE8E79', '#B9D4BE', '#B29DD0', '#B6D4E4', '#E0A9B4', '#B7D9B0',
  '#D3A9DE', '#B9DCE8', '#E0B080', '#C0DEA8', '#AE8FC9', '#A9D4C4',
];

const publicPath = (rootDirectory, path) => resolve(rootDirectory, 'public', path.replace(/^\//, ''));
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
function seasonOrder(sign) {
  const start = SIGN_ORDER.indexOf(sign);
  if (start < 0) throw new Error(`Unknown Astrofolio season: ${sign}`);
  return [...SIGN_ORDER.slice(start), ...SIGN_ORDER.slice(0, start)];
}

async function loadRegistry(rootDirectory) {
  return JSON.parse(await readFile(
    resolve(rootDirectory, 'public/registry/zodiacs.registry.json'),
    'utf8',
  ));
}

async function normalizeSculpture(rootDirectory, sign, box = 500) {
  return sharp(resolve(rootDirectory, `public/assets/sculptures/1024/${sign}.webp`))
    .ensureAlpha()
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 6 })
    .resize({ width: box, height: box, fit: 'inside', kernel: 'lanczos3' })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

function warmHaloSvg(size) {
  const center = size / 2;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs><radialGradient id="h"><stop offset="0" stop-color="#E7B85A" stop-opacity=".19"/><stop offset=".42" stop-color="#C88835" stop-opacity=".085"/><stop offset="1" stop-color="#8B5728" stop-opacity="0"/></radialGradient></defs>
    <circle cx="${center}" cy="${center}" r="350" fill="url(#h)"/>
  </svg>`);
}

async function composeAvatar(rootDirectory, season) {
  const size = 1024;
  const center = size / 2;
  const radius = 334;
  const discSize = 92;
  const ordered = seasonOrder(season);
  const discInputs = await Promise.all(ordered.map(async (sign, index) => {
    const angle = -Math.PI / 2 + index * Math.PI / 6;
    const input = await sharp(resolve(rootDirectory, `public/assets/zodiac-icons/128/${sign}.webp`))
      .resize(discSize, discSize, { kernel: 'lanczos3' })
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toBuffer();
    return {
      input,
      left: Math.round(center + Math.cos(angle) * radius - discSize / 2),
      top: Math.round(center + Math.sin(angle) * radius - discSize / 2),
    };
  }));
  const sculpture = await normalizeSculpture(rootDirectory, season);
  const sculptureMeta = await sharp(sculpture).metadata();
  const seasonHue = PASTELS[SIGN_ORDER.indexOf(season)];
  const selectedHaloSize = 112;
  const selectedHaloInset = (selectedHaloSize - discSize) / 2;
  const selectedDisc = discInputs[0];
  const selectedHalo = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${selectedHaloSize}" height="${selectedHaloSize}" viewBox="0 0 ${selectedHaloSize} ${selectedHaloSize}"><circle cx="56" cy="56" r="51" fill="none" stroke="${seasonHue}" stroke-width="3" opacity=".88"/><circle cx="56" cy="56" r="55" fill="none" stroke="${seasonHue}" stroke-width="1" opacity=".28"/></svg>`);

  return sharp({
    create: { width: size, height: size, channels: 4, background: VOID },
  }).composite([
    { input: warmHaloSvg(size), left: 0, top: 0 },
    {
      input: selectedHalo,
      left: selectedDisc.left - selectedHaloInset,
      top: selectedDisc.top - selectedHaloInset,
    },
    ...discInputs,
    {
      input: sculpture,
      left: Math.round(center - sculptureMeta.width / 2),
      top: Math.round(center - sculptureMeta.height / 2 + 8),
    },
  ]).png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
}

async function faviconGlyphData(rootDirectory, season) {
  const { data, info } = await sharp(
    resolve(rootDirectory, `public/assets/zodiac-icons/128/${season}.webp`),
  ).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let offset = 0; offset < data.length; offset += info.channels) {
    const luminance = data[offset] * 0.2126 + data[offset + 1] * 0.7152 + data[offset + 2] * 0.0722;
    const sourceAlpha = data[offset + 3] ?? 255;
    data[offset] = 8;
    data[offset + 1] = 9;
    data[offset + 2] = 11;
    data[offset + 3] = luminance < 105 ? sourceAlpha : 0;
  }
  return sharp(data, { raw: info })
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 2 })
    .resize({ width: 18, height: 18, fit: 'inside', kernel: 'lanczos3' })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function composeFaviconSvg(rootDirectory, season) {
  const ordered = seasonOrder(season);
  const center = 32;
  const radius = 21;
  const dots = ordered.map((sign, index) => {
    const sourceIndex = SIGN_ORDER.indexOf(sign);
    const angle = -Math.PI / 2 + index * Math.PI / 6;
    const cx = (center + Math.cos(angle) * radius).toFixed(3);
    const cy = (center + Math.sin(angle) * radius).toFixed(3);
    const dotRadius = index === 0 ? 3.3 : 2.65;
    return `<circle cx="${cx}" cy="${cy}" r="${dotRadius}" fill="${PASTELS[sourceIndex]}"/>`;
  }).join('');
  const glyph = await faviconGlyphData(rootDirectory, season);
  const glyphData = glyph.toString('base64');
  const glyphMeta = await sharp(glyph).metadata();
  const glyphX = (32 - glyphMeta.width / 2).toFixed(2);
  const glyphY = (32 - glyphMeta.height / 2).toFixed(2);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${VOID}"/>${dots}<circle cx="32" cy="32" r="11.25" fill="${PASTELS[SIGN_ORDER.indexOf(season)]}"/><image href="data:image/png;base64,${glyphData}" x="${glyphX}" y="${glyphY}" width="${glyphMeta.width}" height="${glyphMeta.height}"/></svg>`;
}

async function rasterizeFavicon(svg, size) {
  return sharp(Buffer.from(svg))
    .resize(size, size, { kernel: size <= 32 ? 'lanczos3' : 'lanczos3' })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

async function loadInstrumentFont(rootDirectory) {
  const path = resolve(
    rootDirectory,
    'node_modules/@fontsource-variable/instrument-sans/files/instrument-sans-latin-wght-normal.woff2',
  );
  return (await readFile(path)).toString('base64');
}

function ogTextSvg(fontData, seasonHue) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <style>@font-face{font-family:Instrument;src:url(data:font/woff2;base64,${fontData}) format('woff2');font-weight:100 900}</style>
    <text x="92" y="284" fill="${INK}" font-family="Instrument,sans-serif" font-size="90" font-weight="560" letter-spacing="-4.4">Astrofolio</text>
    <text x="98" y="336" fill="#B8B3AA" font-family="Instrument,sans-serif" font-size="25" font-weight="430" letter-spacing=".6">The Twelve Official Zodiacs</text>
    <path d="M98 378H332" stroke="${seasonHue}" stroke-opacity=".62" stroke-width="2"/>
  </svg>`);
}

async function composeAstrofolioOg(avatar, fontData, season) {
  const motif = await sharp(avatar)
    .resize(520, 520, { kernel: 'lanczos3' })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
  const atmosphere = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><defs><radialGradient id="a"><stop stop-color="#C88B39" stop-opacity=".09"/><stop offset="1" stop-color="#060709" stop-opacity="0"/></radialGradient></defs><ellipse cx="925" cy="315" rx="315" ry="300" fill="url(#a)"/></svg>`);
  return sharp({ create: { width: 1200, height: 630, channels: 4, background: VOID } })
    .composite([
      { input: atmosphere, left: 0, top: 0 },
      { input: ogTextSvg(fontData, PASTELS[SIGN_ORDER.indexOf(season)]), left: 0, top: 0 },
      { input: motif, left: 660, top: 55 },
    ])
    .png({ compressionLevel: 9, adaptiveFiltering: true, palette: true, colours: 256, dither: 0.55 })
    .toBuffer();
}

function terminalSvg(fontData) {
  const columns = Array.from({ length: 9 }, (_, index) => (
    `<path d="M${708 + index * 48} 108V520" stroke="#FFFFFF" stroke-opacity=".045"/>`
  )).join('');
  const rows = Array.from({ length: 7 }, (_, index) => (
    `<path d="M676 ${142 + index * 54}H1138" stroke="#FFFFFF" stroke-opacity=".065"/>`
  )).join('');
  const ticks = PASTELS.map((color, index) => (
    `<rect x="${690 + index * 36}" y="${455 - (index % 5) * 21}" width="7" height="${26 + (index % 5) * 21}" rx="3.5" fill="${color}" opacity=".86"/>`
  )).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <style>@font-face{font-family:Instrument;src:url(data:font/woff2;base64,${fontData}) format('woff2');font-weight:100 900}</style>
    <rect width="1200" height="630" fill="${VOID}"/>
    <defs><radialGradient id="desk"><stop stop-color="#A9D4C4" stop-opacity=".08"/><stop offset="1" stop-color="#060709" stop-opacity="0"/></radialGradient></defs>
    <ellipse cx="910" cy="300" rx="430" ry="340" fill="url(#desk)"/>
    <text x="88" y="265" fill="${INK}" font-family="Instrument,sans-serif" font-size="82" font-weight="575" letter-spacing="-3.6">Terminal</text>
    <text x="93" y="318" fill="#A9AAA7" font-family="Instrument,sans-serif" font-size="23" font-weight="430" letter-spacing=".55">Market intelligence for the Twelve</text>
    <text x="94" y="394" fill="#A9D4C4" font-family="Instrument,sans-serif" font-size="14" font-weight="620" letter-spacing="3.2">PRO DESK · LIVE MARKETS</text>
    <rect x="652" y="84" width="510" height="468" rx="26" fill="#0A0B0D" stroke="#FFFFFF" stroke-opacity=".10"/>
    <rect x="665" y="97" width="484" height="442" rx="18" fill="#07080A" stroke="#FFFFFF" stroke-opacity=".055"/>
    ${columns}${rows}${ticks}
    <path d="M684 403C737 381 771 410 815 347C857 286 899 337 944 254C982 184 1021 281 1061 219C1086 181 1111 196 1131 163" fill="none" stroke="#A9D4C4" stroke-width="3"/>
    <circle cx="1131" cy="163" r="6" fill="#B9DCE8"/><circle cx="1131" cy="163" r="14" fill="none" stroke="#B9DCE8" stroke-opacity=".25"/>
  </svg>`;
}

async function composeTerminalOg(fontData) {
  return sharp(Buffer.from(terminalSvg(fontData)))
    .png({ compressionLevel: 9, adaptiveFiltering: true, palette: true, colours: 256, dither: 0.45 })
    .toBuffer();
}

function seasonManifest(sign, displayName) {
  const base = `${ASTROFOLIO_IDENTITY_BASE}/${sign}`;
  return `${JSON.stringify({
    id: '/astrofolio/',
    name: 'Astrofolio',
    short_name: 'Astrofolio',
    description: 'The Twelve Official Zodiacs',
    start_url: '/astrofolio/',
    scope: '/astrofolio/',
    display: 'standalone',
    background_color: VOID,
    theme_color: VOID,
    icons: [
      { src: `${base}/icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: `${base}/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: `${base}/maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }, null, 2)}\n`;
}

export async function buildAstrofolioIdentity({
  rootDirectory = root,
  outputDirectory = resolve(rootDirectory, `public/assets/astrofolio/${ASTROFOLIO_IDENTITY_VERSION}`),
  terminalOutput = resolve(rootDirectory, 'public/assets/og/v6/terminal.png'),
} = {}) {
  const registry = await loadRegistry(rootDirectory);
  const seasons = seasonsFromRegistry(registry);
  const fontData = await loadInstrumentFont(rootDirectory);
  const records = [];

  await mkdir(outputDirectory, { recursive: true });
  for (const season of seasons) {
    const signDirectory = resolve(outputDirectory, season.sign);
    await mkdir(signDirectory, { recursive: true });
    const avatar = await composeAvatar(rootDirectory, season.sign);
    const faviconSvg = await composeFaviconSvg(rootDirectory, season.sign);
    const [favicon16, favicon32, favicon96, apple, icon192, icon512, maskable512, og] = await Promise.all([
      rasterizeFavicon(faviconSvg, 16),
      rasterizeFavicon(faviconSvg, 32),
      rasterizeFavicon(faviconSvg, 96),
      sharp(avatar).resize(180, 180, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toBuffer(),
      sharp(avatar).resize(192, 192, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toBuffer(),
      sharp(avatar).resize(512, 512, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toBuffer(),
      sharp(avatar).resize(512, 512, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toBuffer(),
      composeAstrofolioOg(avatar, fontData, season.sign),
    ]);
    const manifest = seasonManifest(season.sign, season.displayName);
    const files = {
      'avatar-1024.png': avatar,
      'favicon.svg': Buffer.from(faviconSvg),
      'favicon-16.png': favicon16,
      'favicon-32.png': favicon32,
      'favicon-96.png': favicon96,
      'apple-touch-icon-180.png': apple,
      'icon-192.png': icon192,
      'icon-512.png': icon512,
      'maskable-512.png': maskable512,
      'astrofolio.webmanifest': Buffer.from(manifest),
      'og-1200x630.png': og,
    };
    await Promise.all(Object.entries(files).map(([name, bytes]) => (
      writeFile(resolve(signDirectory, name), bytes)
    )));
    records.push({
      sign: season.sign,
      displayName: season.displayName,
      dateRange: season.dateRange,
      base: `${ASTROFOLIO_IDENTITY_BASE}/${season.sign}`,
      sha256: Object.fromEntries(Object.entries(files).map(([name, bytes]) => [name, hash(bytes)])),
    });
  }

  const terminal = await composeTerminalOg(fontData);
  await mkdir(dirname(terminalOutput), { recursive: true });
  await writeFile(terminalOutput, terminal);
  const familyManifest = {
    schema: 'zodiacs.astrofolio-identity.v1',
    version: ASTROFOLIO_IDENTITY_VERSION,
    background: VOID,
    iconSource: '/assets/zodiac-icons/128/{sign}.webp',
    sculptureSource: '/assets/sculptures/1024/{sign}.webp',
    cropSafeArea: 0.8,
    terminalOg: TERMINAL_OG_V6_PATH,
    terminalOgSha256: hash(terminal),
    seasons: records,
  };
  await writeFile(resolve(outputDirectory, 'manifest.json'), `${JSON.stringify(familyManifest, null, 2)}\n`);
  return familyManifest;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifest = await buildAstrofolioIdentity();
  console.log(`Astrofolio identity: ${manifest.seasons.length} seasonal packages + Terminal v6 card written.`);
}
