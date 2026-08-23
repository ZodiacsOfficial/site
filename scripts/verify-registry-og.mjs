/** Production-build gate for the immutable Registry catalogue OG family. */
import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { SIGN_ORDER } from './sign-data.mjs';
import {
  REGISTRY_OG_BASE,
  REGISTRY_OG_GEOMETRY,
  REGISTRY_OG_VERSION,
} from './build-registry-og.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, `public/assets/og/registry/${REGISTRY_OG_VERSION}`);
const failures = [];
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const sourceFile = (template, sign) => resolve(root, 'public', template.replace('{sign}', sign).replace(/^\//, ''));

let manifest;
try {
  manifest = JSON.parse(await readFile(resolve(out, 'manifest.json'), 'utf8'));
} catch (error) {
  failures.push(`manifest: ${error instanceof Error ? error.message : 'missing or invalid'}`);
}

if (manifest) {
  if (manifest.schema !== 'zodiacs.registry-og.v3') failures.push('manifest: unsupported schema');
  if (manifest.version !== REGISTRY_OG_VERSION) failures.push('manifest: version drifted');
  if (manifest.base !== REGISTRY_OG_BASE) failures.push('manifest: base URL drifted');
  if (manifest.type !== 'image/png') failures.push('manifest: type must be image/png');
  if (manifest.width !== 1200 || manifest.height !== 630) failures.push('manifest: dimensions must be 1200x630');
  if (manifest.baseCardSource !== '/assets/og/v2/registry/{sign}.png') failures.push('manifest: base-card source drifted');
  if (manifest.iconSource !== '/assets/sdk/zodiac-icons/circle/{sign}.png') failures.push('manifest: icon source must be the high-resolution SDK circle art');
  if (manifest.sculptureSource !== '/assets/sculptures/1024/{sign}.webp') failures.push('manifest: sculpture source must be the 1024px tier');
  if (JSON.stringify(manifest.geometry) !== JSON.stringify(REGISTRY_OG_GEOMETRY)) failures.push('manifest: geometry drifted');
  if (JSON.stringify(manifest.cards?.map(({ sign }) => sign)) !== JSON.stringify(SIGN_ORDER)) failures.push('manifest: card order or coverage drifted');
}

const { sculptureBox, seal, footerRuleY } = REGISTRY_OG_GEOMETRY;
const ringLeft = seal.left - (seal.ringSize - seal.iconSize) / 2;
const ringTop = seal.top - (seal.ringSize - seal.iconSize) / 2;
const iconCenter = [seal.left + seal.iconSize / 2, seal.top + seal.iconSize / 2];
const ringCenter = [ringLeft + seal.ringSize / 2, ringTop + seal.ringSize / 2];
if (JSON.stringify(iconCenter) !== JSON.stringify(ringCenter)) failures.push('geometry: seal ring is not centered on the icon');
if (ringTop + seal.ringSize >= footerRuleY) failures.push('geometry: seal ring collides with the footer rule');
if (sculptureBox.top + sculptureBox.height >= footerRuleY) failures.push('geometry: sculpture box collides with the footer rule');

const expectedFiles = SIGN_ORDER.map((sign) => `${sign}.png`).sort();
try {
  const actualFiles = (await readdir(out)).filter((name) => name.endsWith('.png')).sort();
  if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) {
    failures.push(`inventory: expected ${expectedFiles.length} PNGs, found ${actualFiles.length}`);
  }
} catch (error) {
  failures.push(`inventory: ${error instanceof Error ? error.message : 'missing family directory'}`);
}

const cardHashes = new Set();
let familyBytes = 0;
for (const sign of SIGN_ORDER) {
  const record = manifest?.cards?.find((card) => card.sign === sign);
  const imagePath = resolve(out, `${sign}.png`);
  let bytes;
  try {
    bytes = await readFile(imagePath);
  } catch {
    failures.push(`${sign}: missing card`);
    continue;
  }
  familyBytes += (await stat(imagePath)).size;
  const metadata = await sharp(bytes).metadata();
  if (metadata.format !== 'png' || metadata.width !== 1200 || metadata.height !== 630) {
    failures.push(`${sign}: expected a 1200x630 PNG`);
  }
  if (bytes.length > 250 * 1024) failures.push(`${sign}: ${(bytes.length / 1024).toFixed(1)}KiB exceeds the 250KiB card budget`);
  const cardHash = hash(bytes);
  if (cardHashes.has(cardHash)) failures.push(`${sign}: card is byte-identical to another sign`);
  cardHashes.add(cardHash);
  if (!record) failures.push(`${sign}: missing manifest record`);
  else {
    if (record.image !== `${REGISTRY_OG_BASE}/${sign}.png`) failures.push(`${sign}: manifest image URL drifted`);
    if (record.sha256 !== cardHash) failures.push(`${sign}: manifest card hash drifted; rerun node scripts/build-registry-og.mjs`);
  }

  for (const [key, template, expectedFormat] of [
    ['baseCard', '/assets/og/v2/registry/{sign}.png', 'png'],
    ['icon', '/assets/sdk/zodiac-icons/circle/{sign}.png', 'png'],
    ['sculpture', '/assets/sculptures/1024/{sign}.webp', 'webp'],
  ]) {
    try {
      const source = await readFile(sourceFile(template, sign));
      const sourceMetadata = await sharp(source).metadata();
      if (sourceMetadata.format !== expectedFormat) failures.push(`${sign}: ${key} format drifted`);
      if (key !== 'baseCard' && (sourceMetadata.width !== 1024 || sourceMetadata.height !== 1024)) {
        failures.push(`${sign}: ${key} must be the 1024x1024 source`);
      }
      if (record?.sourceSha256?.[key] !== hash(source)) {
        failures.push(`${sign}: ${key} source hash drifted; rerun node scripts/build-registry-og.mjs`);
      }
    } catch {
      failures.push(`${sign}: ${key} source is missing`);
    }
  }

  try {
    const page = await readFile(resolve(root, `public/registry/${sign}/index.html`), 'utf8');
    const absoluteImage = `https://zodiacs.org${REGISTRY_OG_BASE}/${sign}.png`;
    if (!page.includes(`<meta property="og:image" content="${absoluteImage}" />`)) failures.push(`${sign}: Registry OG metadata is stale`);
    if (!page.includes(`<meta name="twitter:image" content="${absoluteImage}" />`)) failures.push(`${sign}: Registry Twitter metadata is stale`);
    if (page.includes(`/assets/og/v2/registry/${sign}.png`)) failures.push(`${sign}: Registry page still references the cached v2 card`);
  } catch {
    failures.push(`${sign}: Registry page is missing`);
  }
}

if (familyBytes > 2.5 * 1024 * 1024) failures.push(`family: ${(familyBytes / 1024 / 1024).toFixed(2)}MiB exceeds the 2.5MiB budget`);

if (failures.length) {
  console.error(`verify-registry-og: ${failures.length} failure(s)`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`verify-registry-og: OK — ${SIGN_ORDER.length} unique catalogue cards, exact high-resolution icon/sculpture sources, centered seals, 1200x630 PNG; ${(familyBytes / 1024 / 1024).toFixed(2)}MiB family`);
