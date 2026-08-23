import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { SIGN_ORDER } from './sign-data.mjs';
import {
  ASTROFOLIO_OG_MOTIF_GEOMETRY,
  ASTROFOLIO_OG_BASE,
  ASTROFOLIO_OG_VERSION,
  ASTROFOLIO_IDENTITY_BASE,
  ASTROFOLIO_IDENTITY_VERSION,
  TERMINAL_OG_V6_PATH,
  astrofolioOgCopy,
  astrofolioOgIdentitySources,
} from './build-astrofolio-identity.mjs';
import { seasonsFromRegistry } from './astrofolio-season.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, `public/assets/astrofolio/${ASTROFOLIO_IDENTITY_VERSION}`);
const ogOutput = resolve(root, `public/assets/og/astrofolio/${ASTROFOLIO_OG_VERSION}`);
const failures = [];
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const HISTORICAL_V2_MANIFEST_SHA256 = '3a8022db544394d6676518ce664150f68478eab6a6a345ce37cb006a5316c981';

async function image(path, expected, label) {
  let bytes;
  try {
    bytes = await readFile(path);
  } catch {
    failures.push(`${label}: missing`);
    return null;
  }
  const metadata = await sharp(bytes).metadata();
  if (metadata.format !== expected.format || metadata.width !== expected.width || metadata.height !== expected.height) {
    failures.push(`${label}: expected ${expected.width}x${expected.height} ${expected.format}; received ${metadata.width ?? '?'}x${metadata.height ?? '?'} ${metadata.format ?? 'unknown'}`);
  }
  return bytes;
}

async function verifyBrightContentCropSafety(bytes, label) {
  const { data, info } = await sharp(bytes)
    .flatten({ background: '#060709' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const center = info.width / 2;
  const safeRadius = info.width * 0.4;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (Math.hypot(x + 0.5 - center, y + 0.5 - center) <= safeRadius) continue;
      const offset = (y * info.width + x) * info.channels;
      const luminance = data[offset] * 0.2126 + data[offset + 1] * 0.7152 + data[offset + 2] * 0.0722;
      if (luminance > 58) {
        failures.push(`${label}: visible identity art escapes the 80% crop-safe circle`);
        return;
      }
    }
  }
}

async function verifyTransparentCircularFade(bytes, label) {
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const alphaAt = (x, y) => data[(y * info.width + x) * info.channels + 3];
  const lastX = info.width - 1;
  const lastY = info.height - 1;
  const cornerAlpha = [
    alphaAt(0, 0), alphaAt(lastX, 0), alphaAt(0, lastY), alphaAt(lastX, lastY),
  ];
  if (cornerAlpha.some((alpha) => alpha > 3)) {
    failures.push(`${label}: corners must remain transparent for circular integration`);
  }
  if (alphaAt(Math.floor(info.width / 2), Math.floor(info.height / 2)) < 220) {
    failures.push(`${label}: center is unexpectedly transparent`);
  }
  const center = info.width / 2;
  let featheredPixels = 0;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const normalizedRadius = Math.hypot(x + 0.5 - center, y + 0.5 - center) / info.width;
      if (normalizedRadius < 0.43 || normalizedRadius > 0.495) continue;
      const alpha = alphaAt(x, y);
      if (alpha > 3 && alpha < 245) featheredPixels += 1;
    }
  }
  if (featheredPixels < info.width) {
    failures.push(`${label}: outer edge does not contain a visible alpha fade`);
  }
}

async function verifyTransparentRingField(bytes, label) {
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const center = info.width / 2;
  const quietRadius = info.width * 0.19;
  let opaquePixels = 0;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (Math.hypot(x + 0.5 - center, y + 0.5 - center) > quietRadius) continue;
      const offset = (y * info.width + x) * info.channels;
      if (data[offset + 3] > 3) opaquePixels += 1;
    }
  }
  if (opaquePixels > 0) failures.push(`${label}: inner field must remain fully transparent`);
}

async function verifyOgSculpture(bytes, label) {
  const { data, info } = await sharp(bytes).raw().toBuffer({ resolveWithObject: true });
  let goldPixels = 0;
  for (let y = 180; y < 450; y += 1) {
    for (let x = 760; x < 1030; x += 1) {
      if (Math.hypot(
        x - ASTROFOLIO_OG_MOTIF_GEOMETRY.centerX,
        y - ASTROFOLIO_OG_MOTIF_GEOMETRY.centerY,
      ) > 142) continue;
      const offset = (y * info.width + x) * info.channels;
      const red = data[offset];
      const green = data[offset + 1];
      const blue = data[offset + 2];
      if (red > 95 && green > 55 && red > green * 1.12 && green > blue * 1.18) {
        goldPixels += 1;
      }
    }
  }
  if (goldPixels < 8_000) failures.push(`${label}: seasonal gold sculpture is missing from the OG ring`);

  let visibleOrbitSamples = 0;
  const discRadius = 334 * ASTROFOLIO_OG_MOTIF_GEOMETRY.size / 1024;
  for (let index = 0; index < 12; index += 1) {
    const angle = -Math.PI / 2 + (index + 0.5) * Math.PI / 6;
    const x = Math.round(ASTROFOLIO_OG_MOTIF_GEOMETRY.centerX + Math.cos(angle) * discRadius);
    const y = Math.round(ASTROFOLIO_OG_MOTIF_GEOMETRY.centerY + Math.sin(angle) * discRadius);
    const offset = (y * info.width + x) * info.channels;
    const luminance = data[offset] * 0.2126 + data[offset + 1] * 0.7152 + data[offset + 2] * 0.0722;
    if (luminance > 28) visibleOrbitSamples += 1;
  }
  if (visibleOrbitSamples > 0) failures.push(`${label}: connecting orbit circle returned`);
}

let manifest;
let registry;
try {
  [manifest, registry] = await Promise.all([
    readFile(resolve(output, 'manifest.json'), 'utf8').then(JSON.parse),
    readFile(resolve(root, 'public/registry/zodiacs.registry.json'), 'utf8').then(JSON.parse),
  ]);
} catch (error) {
  failures.push(`family inputs: ${error instanceof Error ? error.message : 'invalid'}`);
}

if (manifest && registry) {
  const registrySeasons = seasonsFromRegistry(registry);
  if (manifest.schema !== 'zodiacs.astrofolio-identity.v2') failures.push('family manifest: schema drift');
  if (manifest.version !== ASTROFOLIO_IDENTITY_VERSION) failures.push('family manifest: version drift');
  if (manifest.background !== '#060709') failures.push('family manifest: background drift');
  if (manifest.ogSculptureSource !== '/assets/sculptures/1024/{sign}.webp') failures.push('family manifest: OG sculpture source drift');
  if (manifest.cropSafeArea !== 0.8) failures.push('family manifest: crop-safe area drift');
  if (manifest.onPageSeal !== 'season-seal-192.png') failures.push('family manifest: on-page seal drift');
  if (manifest.onPageRing !== 'zodiac-ring-192.png') failures.push('family manifest: transparent ring drift');
  const ringPath = resolve(output, 'zodiac-ring-192.png');
  const ring = await image(ringPath, { width: 192, height: 192, format: 'png' }, 'Astrofolio transparent ring');
  if (ring && manifest.onPageRingSha256 !== digest(ring)) failures.push('Astrofolio transparent ring: digest drift');
  if (ring) {
    const { data, info } = await sharp(ring).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const alphaAt = (x, y) => data[(y * info.width + x) * info.channels + 3];
    if (alphaAt(0, 0) > 3 || alphaAt(96, 96) > 3) failures.push('Astrofolio transparent ring: black plate returned');
  }
  if (manifest.terminalOg !== TERMINAL_OG_V6_PATH) failures.push('family manifest: Terminal OG path drift');
  if (JSON.stringify(manifest.seasons.map(({ sign }) => sign)) !== JSON.stringify(SIGN_ORDER)) {
    failures.push('family manifest: seasonal sign order drift');
  }
  if (manifest.seasons.length !== 12) failures.push('family manifest: expected 12 seasons');

  const ogHashes = new Set();
  const avatarHashes = new Set();
  const sealHashes = new Set();
  for (const season of registrySeasons) {
    const record = manifest.seasons.find(({ sign }) => sign === season.sign);
    const directory = resolve(output, season.sign);
    if (!record) {
      failures.push(`${season.sign}: missing family record`);
      continue;
    }
    if (record.dateRange !== season.dateRange) failures.push(`${season.sign}: Registry date-range drift`);
    const expectedOgCopy = astrofolioOgCopy(season, SIGN_ORDER.indexOf(season.sign));
    if (JSON.stringify(record.ogCopy) !== JSON.stringify(expectedOgCopy)) {
      failures.push(`${season.sign}: seasonal OG copy drift`);
    }
    const expectedOgSources = astrofolioOgIdentitySources(season);
    if (JSON.stringify(record.ogSources) !== JSON.stringify(expectedOgSources)) {
      failures.push(`${season.sign}: Registry-backed OG name, hue, date, icon, or sculpture drift`);
    }
    if (record.base !== `${ASTROFOLIO_IDENTITY_BASE}/${season.sign}`) failures.push(`${season.sign}: public base drift`);
    const expectedArtwork = {
      avatar: `${ASTROFOLIO_IDENTITY_BASE}/${season.sign}/avatar-1024.png`,
      seasonSeal: `${ASTROFOLIO_IDENTITY_BASE}/${season.sign}/season-seal-192.png`,
      og: `${ASTROFOLIO_IDENTITY_BASE}/${season.sign}/og-1200x630.png`,
    };
    if (JSON.stringify(record.artwork) !== JSON.stringify(expectedArtwork)) failures.push(`${season.sign}: artwork routes drift`);
    const exactFiles = [
      'apple-touch-icon-180.png', 'astrofolio.webmanifest', 'avatar-1024.png',
      'favicon-16.png', 'favicon-32.png', 'favicon-96.png', 'favicon.svg',
      'icon-192.png', 'icon-512.png', 'maskable-512.png', 'og-1200x630.png',
      'season-seal-192.png',
    ];
    const found = (await readdir(directory)).sort();
    if (JSON.stringify(found) !== JSON.stringify(exactFiles)) failures.push(`${season.sign}: file inventory drift`);

    const specs = {
      'avatar-1024.png': { width: 1024, height: 1024, format: 'png' },
      'favicon.svg': { width: 64, height: 64, format: 'svg' },
      'favicon-16.png': { width: 16, height: 16, format: 'png' },
      'favicon-32.png': { width: 32, height: 32, format: 'png' },
      'favicon-96.png': { width: 96, height: 96, format: 'png' },
      'apple-touch-icon-180.png': { width: 180, height: 180, format: 'png' },
      'icon-192.png': { width: 192, height: 192, format: 'png' },
      'icon-512.png': { width: 512, height: 512, format: 'png' },
      'maskable-512.png': { width: 512, height: 512, format: 'png' },
      'og-1200x630.png': { width: 1200, height: 630, format: 'png' },
      'season-seal-192.png': { width: 192, height: 192, format: 'png' },
    };
    for (const [name, expected] of Object.entries(specs)) {
      const bytes = await image(resolve(directory, name), expected, `${season.sign}/${name}`);
      if (bytes && record.sha256?.[name] !== digest(bytes)) failures.push(`${season.sign}/${name}: digest drift`);
      if (bytes && name === 'avatar-1024.png') {
        avatarHashes.add(digest(bytes));
        await verifyBrightContentCropSafety(bytes, `${season.sign}/${name}`);
        await verifyTransparentRingField(bytes, `${season.sign}/${name}`);
      }
      if (bytes && ['icon-192.png', 'icon-512.png', 'maskable-512.png'].includes(name)) {
        await verifyBrightContentCropSafety(bytes, `${season.sign}/${name}`);
      }
      if (bytes && name === 'og-1200x630.png') {
        ogHashes.add(digest(bytes));
        await verifyOgSculpture(bytes, `${season.sign}/${name}`);
      }
      if (bytes && name === 'season-seal-192.png') {
        sealHashes.add(digest(bytes));
        await verifyTransparentCircularFade(bytes, `${season.sign}/${name}`);
      }
    }

    try {
      const appManifest = JSON.parse(await readFile(resolve(directory, 'astrofolio.webmanifest'), 'utf8'));
      if (appManifest.name !== 'Astrofolio') failures.push(`${season.sign}: manifest name drift`);
      if (appManifest.id !== '/astrofolio/') failures.push(`${season.sign}: manifest id drift`);
      if (appManifest.start_url !== '/astrofolio/') failures.push(`${season.sign}: manifest start_url drift`);
      if (appManifest.scope !== '/astrofolio/') failures.push(`${season.sign}: manifest scope drift`);
      if (appManifest.description !== 'The Twelve Official Zodiacs') failures.push(`${season.sign}: manifest caption drift`);
      if (appManifest.icons.length !== 3 || appManifest.icons.at(-1)?.purpose !== 'maskable') failures.push(`${season.sign}: manifest icons drift`);
    } catch (error) {
      failures.push(`${season.sign}: ${error instanceof Error ? error.message : 'invalid web manifest'}`);
    }
  }
  if (avatarHashes.size !== 12) failures.push(`avatars: expected 12 byte-distinct images, found ${avatarHashes.size}`);
  if (sealHashes.size !== 12) failures.push(`season seals: expected 12 byte-distinct images, found ${sealHashes.size}`);
  if (ogHashes.size !== 12) failures.push(`Astrofolio OG: expected 12 byte-distinct cards, found ${ogHashes.size}`);
}

try {
  const historicalV2Manifest = await readFile(resolve(output, 'manifest.json'));
  if (digest(historicalV2Manifest) !== HISTORICAL_V2_MANIFEST_SHA256) {
    failures.push('historical v2 identity: immutable manifest drift');
  }
} catch {
  // The family-input check above reports the missing manifest.
}

let ogManifest;
try {
  ogManifest = JSON.parse(await readFile(resolve(ogOutput, 'manifest.json'), 'utf8'));
} catch (error) {
  failures.push(`Astrofolio v4 OG manifest: ${error instanceof Error ? error.message : 'missing or invalid'}`);
}

if (ogManifest && registry) {
  const registrySeasons = seasonsFromRegistry(registry);
  if (ogManifest.schema !== 'zodiacs.astrofolio-og.v4') failures.push('Astrofolio v4 OG manifest: schema drift');
  if (ogManifest.version !== ASTROFOLIO_OG_VERSION) failures.push('Astrofolio v4 OG manifest: version drift');
  if (ogManifest.base !== ASTROFOLIO_OG_BASE) failures.push('Astrofolio v4 OG manifest: base drift');
  if (ogManifest.type !== 'image/png') failures.push('Astrofolio v4 OG manifest: MIME type drift');
  if (ogManifest.width !== 1200 || ogManifest.height !== 630) failures.push('Astrofolio v4 OG manifest: dimensions drift');
  if (ogManifest.identityBase !== ASTROFOLIO_IDENTITY_BASE) failures.push('Astrofolio v4 OG manifest: identity base drift');
  if (JSON.stringify(ogManifest.motifGeometry) !== JSON.stringify(ASTROFOLIO_OG_MOTIF_GEOMETRY)) {
    failures.push('Astrofolio v4 OG manifest: motif geometry drift');
  }
  if (JSON.stringify(ogManifest.seasons.map(({ sign }) => sign)) !== JSON.stringify(SIGN_ORDER)) {
    failures.push('Astrofolio v4 OG manifest: seasonal sign order drift');
  }

  const expectedFiles = [...SIGN_ORDER.map((sign) => `${sign}.png`), 'manifest.json'].sort();
  try {
    const found = (await readdir(ogOutput)).sort();
    if (JSON.stringify(found) !== JSON.stringify(expectedFiles)) {
      failures.push(`Astrofolio v4 OG: expected exactly ${expectedFiles.length} files; found ${found.length}`);
    }
  } catch {
    failures.push('Astrofolio v4 OG: output directory missing');
  }

  const hashes = new Set();
  for (const season of registrySeasons) {
    const record = ogManifest.seasons.find(({ sign }) => sign === season.sign);
    if (!record) {
      failures.push(`${season.sign}: missing Astrofolio v4 OG record`);
      continue;
    }
    if (record.displayName !== season.displayName || record.dateRange !== season.dateRange) {
      failures.push(`${season.sign}: Astrofolio v4 OG Registry metadata drift`);
    }
    if (JSON.stringify(record.ogCopy) !== JSON.stringify(astrofolioOgCopy(season, SIGN_ORDER.indexOf(season.sign)))) {
      failures.push(`${season.sign}: Astrofolio v4 OG copy drift`);
    }
    if (JSON.stringify(record.ogSources) !== JSON.stringify(astrofolioOgIdentitySources(season))) {
      failures.push(`${season.sign}: Astrofolio v4 OG sources drift`);
    }
    const expectedRoute = `${ASTROFOLIO_OG_BASE}/${season.sign}.png`;
    if (record.artwork?.og !== expectedRoute) failures.push(`${season.sign}: Astrofolio v4 OG artwork route drift`);
    const bytes = await image(
      resolve(ogOutput, `${season.sign}.png`),
      { width: 1200, height: 630, format: 'png' },
      `Astrofolio v4 OG/${season.sign}.png`,
    );
    if (!bytes) continue;
    const sha256 = digest(bytes);
    if (record.sha256 !== sha256) failures.push(`${season.sign}: Astrofolio v4 OG digest drift`);
    hashes.add(sha256);
    await verifyOgSculpture(bytes, `Astrofolio v4 OG/${season.sign}.png`);
  }
  if (hashes.size !== 12) failures.push(`Astrofolio v4 OG: expected 12 byte-distinct cards, found ${hashes.size}`);
}

try {
  const historical = JSON.parse(await readFile(resolve(root, 'public/assets/astrofolio/v1/manifest.json'), 'utf8'));
  if (historical.version !== 'v1' || historical.schema !== 'zodiacs.astrofolio-identity.v1') {
    failures.push('historical v1 identity: immutable manifest drift');
  }
} catch {
  failures.push('historical v1 identity: immutable package missing');
}

const terminalPath = resolve(root, 'public', TERMINAL_OG_V6_PATH.replace(/^\//, ''));
const terminal = await image(terminalPath, { width: 1200, height: 630, format: 'png' }, 'Terminal v6 OG');
if (terminal && manifest?.terminalOgSha256 !== digest(terminal)) failures.push('Terminal v6 OG: digest drift');
try {
  const svgSource = await readFile(resolve(root, 'scripts/build-astrofolio-identity.mjs'), 'utf8');
  if (!svgSource.includes('>Terminal</text>')) failures.push('Terminal v6 OG: exact visible title is not locked');
  if (svgSource.includes('>Zodiac Terminal</text>')) failures.push('Terminal v6 OG: banned legacy title returned');
  if (!svgSource.includes('eb-garamond-latin-500-normal.woff2')) failures.push('Astrofolio OG: editorial wordmark font is not locked');
  if (!svgSource.includes('font-size="97"') || !svgSource.includes('font-style="italic" letter-spacing="-1.1">${copy.title}')) failures.push('Astrofolio OG: editorial italic wordmark is not locked');
  if (!svgSource.includes('composeOgSocialSeasonLockup') || !svgSource.includes("renderOgEditorialWord(fonts.serifItalic, 'Season'") || !svgSource.includes('seasonLeft = signMeta.width + layout.gap')) failures.push('Astrofolio OG: tight text-only sign and Season lockup is not locked');
  if (!svgSource.includes("copy.dateRange.replace(' – ', ' — ')") || !svgSource.includes('${dateRange} · ${copy.timeZone}')) failures.push('Astrofolio OG: visible UTC date range is not locked');
  if (svgSource.includes('${copy.status} · ${copy.sequence}') || svgSource.includes('ONE SEASON · ONE OFFICIAL RECORD')) failures.push('Astrofolio OG: retired microcopy returned');
  if (!svgSource.includes("'season-seal-192.png': seasonSeal")) failures.push('Astrofolio identity: transparent on-page seal is not locked');
  if (!svgSource.includes('normalizeOgSculpture') || !svgSource.includes('input: sculpture') || !svgSource.includes('composeAstrofolioOg(rootDirectory, fonts')) failures.push('Astrofolio OG: seasonal sculpture is not isolated to the social-card composition');
  if (!svgSource.includes('buildAstrofolioOgFamily') || !svgSource.includes('public/assets/og/astrofolio/${ASTROFOLIO_OG_VERSION}')) failures.push('Astrofolio OG: dedicated immutable v4 family is not locked');
  if (!svgSource.includes('composeOgSocialZodiacDiscs') || !svgSource.includes('withSelectedHalo: true') || !svgSource.includes("selectedHaloStyle: 'single'")) failures.push('Astrofolio OG: twelve-disc motif with one centered active-sign ring is not locked');
  if (!svgSource.includes('selectedCenterX = selectedDisc.left + discSize / 2') || !svgSource.includes('Math.round(selectedCenterX - selectedHaloSize / 2)')) failures.push('Astrofolio OG: active-sign ring center is not derived from the icon center');
  if (!svgSource.includes('>ZODIACS.ORG</text>')) failures.push('Astrofolio OG: site footer is not locked');
  if (ASTROFOLIO_OG_MOTIF_GEOMETRY.size !== 636 || ASTROFOLIO_OG_MOTIF_GEOMETRY.centerX !== 877 || ASTROFOLIO_OG_MOTIF_GEOMETRY.sculptureBox !== 334) failures.push('Astrofolio OG: enlarged left-shifted motif geometry drift');
  if (svgSource.includes('avatarTitleSvg') || svgSource.includes('classicAvatarTitleBandSvg') || svgSource.includes('ringBackdropSvg')) failures.push('Astrofolio avatar: filled field or seasonal title returned');
  if (!svgSource.includes("'zodiac-ring-192.png'")) failures.push('Astrofolio identity: sculpture-free transparent ring is not locked');
} catch {
  failures.push('Terminal v6 OG: generator missing');
}

if (failures.length) {
  console.error(`verify-astrofolio-identity: ${failures.length} failure(s)`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('verify-astrofolio-identity: OK — immutable v2 identity + 12 deterministic v4 social cards + distinct Terminal v6 card');
}
