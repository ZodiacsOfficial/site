import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { SIGN_ORDER } from './sign-data.mjs';
import {
  ASTROFOLIO_IDENTITY_BASE,
  ASTROFOLIO_IDENTITY_VERSION,
  TERMINAL_OG_V6_PATH,
  astrofolioOgCopy,
} from './build-astrofolio-identity.mjs';
import { seasonsFromRegistry } from './astrofolio-season.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, `public/assets/astrofolio/${ASTROFOLIO_IDENTITY_VERSION}`);
const failures = [];
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');

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
  const { data, info } = await sharp(bytes).removeAlpha().raw().toBuffer({ resolveWithObject: true });
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
  if (manifest.schema !== 'zodiacs.astrofolio-identity.v1') failures.push('family manifest: schema drift');
  if (manifest.version !== ASTROFOLIO_IDENTITY_VERSION) failures.push('family manifest: version drift');
  if (manifest.background !== '#060709') failures.push('family manifest: background drift');
  if (manifest.cropSafeArea !== 0.8) failures.push('family manifest: crop-safe area drift');
  if (manifest.terminalOg !== TERMINAL_OG_V6_PATH) failures.push('family manifest: Terminal OG path drift');
  if (JSON.stringify(manifest.seasons.map(({ sign }) => sign)) !== JSON.stringify(SIGN_ORDER)) {
    failures.push('family manifest: seasonal sign order drift');
  }
  if (manifest.seasons.length !== 12) failures.push('family manifest: expected 12 seasons');

  const ogHashes = new Set();
  const avatarHashes = new Set();
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
    if (record.base !== `${ASTROFOLIO_IDENTITY_BASE}/${season.sign}`) failures.push(`${season.sign}: public base drift`);
    const exactFiles = [
      'apple-touch-icon-180.png', 'astrofolio.webmanifest', 'avatar-1024.png',
      'favicon-16.png', 'favicon-32.png', 'favicon-96.png', 'favicon.svg',
      'icon-192.png', 'icon-512.png', 'maskable-512.png', 'og-1200x630.png',
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
    };
    for (const [name, expected] of Object.entries(specs)) {
      const bytes = await image(resolve(directory, name), expected, `${season.sign}/${name}`);
      if (bytes && record.sha256?.[name] !== digest(bytes)) failures.push(`${season.sign}/${name}: digest drift`);
      if (bytes && name === 'avatar-1024.png') {
        avatarHashes.add(digest(bytes));
        await verifyBrightContentCropSafety(bytes, `${season.sign}/${name}`);
      }
      if (bytes && name === 'og-1200x630.png') ogHashes.add(digest(bytes));
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
  if (ogHashes.size !== 12) failures.push(`Astrofolio OG: expected 12 byte-distinct cards, found ${ogHashes.size}`);
}

const terminalPath = resolve(root, 'public', TERMINAL_OG_V6_PATH.replace(/^\//, ''));
const terminal = await image(terminalPath, { width: 1200, height: 630, format: 'png' }, 'Terminal v6 OG');
if (terminal && manifest?.terminalOgSha256 !== digest(terminal)) failures.push('Terminal v6 OG: digest drift');
try {
  const svgSource = await readFile(resolve(root, 'scripts/build-astrofolio-identity.mjs'), 'utf8');
  if (!svgSource.includes('>Terminal</text>')) failures.push('Terminal v6 OG: exact visible title is not locked');
  if (svgSource.includes('>Zodiac Terminal</text>')) failures.push('Terminal v6 OG: banned legacy title returned');
  if (!svgSource.includes('eb-garamond-latin-500-normal.woff2')) failures.push('Astrofolio OG: editorial wordmark font is not locked');
  if (!svgSource.includes('${copy.status} · ${copy.sequence}')) failures.push('Astrofolio OG: visible season status is not locked');
  if (!svgSource.includes('${copy.dateRange} · ${copy.timeZone}')) failures.push('Astrofolio OG: visible UTC date range is not locked');
} catch {
  failures.push('Terminal v6 OG: generator missing');
}

if (failures.length) {
  console.error(`verify-astrofolio-identity: ${failures.length} failure(s)`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('verify-astrofolio-identity: OK — 12 deterministic seasonal packages + distinct Terminal v6 card');
}
