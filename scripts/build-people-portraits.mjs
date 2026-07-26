/**
 * Fetch and normalize the 17 reviewed Wikimedia Commons portraits for the
 * Phase 5 pilot. Network access is explicit and manual; normal builds run
 * only the offline --check path.
 *
 *   node scripts/build-people-portraits.mjs
 *   node scripts/build-people-portraits.mjs --thumbnails
 *   node scripts/build-people-portraits.mjs --check
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'public/assets/people');
const manifestPath = resolve(out, 'licences.json');
const people = JSON.parse(await readFile(resolve(root, 'src/data/people.json'), 'utf8')).people;
const available = people.filter((person) => person.portrait.available);
const absent = people.filter((person) => !person.portrait.available);
const checkOnly = process.argv.includes('--check');
const thumbnailsOnly = process.argv.includes('--thumbnails');

async function thumbnailFrom(bytes) {
  return sharp(bytes)
    .resize({ width: 192, withoutEnlargement: true })
    .webp({ quality: 78, effort: 6 })
    .toBuffer();
}

async function checkManifest() {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const failures = [];
  if (manifest.schema !== 'zodiacs.phase5.people-portraits.v1') {
    failures.push('unsupported licence manifest schema');
  }
  if (manifest.portraits.length !== available.length) {
    failures.push(`expected ${available.length} portrait records, found ${manifest.portraits.length}`);
  }
  if (manifest.noPortrait.length !== absent.length) {
    failures.push(`expected ${absent.length} no-portrait records, found ${manifest.noPortrait.length}`);
  }
  for (const person of available) {
    const entry = manifest.portraits.find((portrait) => portrait.slug === person.slug);
    if (!entry) {
      failures.push(`${person.slug}: missing licence record`);
      continue;
    }
    const bytes = await readFile(resolve(root, 'public', entry.localPath.replace(/^\//u, ''))).catch(() => null);
    if (!bytes) {
      failures.push(`${person.slug}: missing local portrait`);
      continue;
    }
    const digest = createHash('sha256').update(bytes).digest('hex');
    const metadata = await sharp(bytes).metadata();
    if (digest !== entry.sha256) failures.push(`${person.slug}: digest drift`);
    if (metadata.format !== 'webp') failures.push(`${person.slug}: portrait is not WebP`);
    if (!metadata.width || metadata.width > 640 || !metadata.height) {
      failures.push(`${person.slug}: invalid ${metadata.width ?? '?'}x${metadata.height ?? '?'} dimensions`);
    }
    const thumbnail = await readFile(
      resolve(root, 'public', entry.thumbnailPath?.replace(/^\//u, '') ?? ''),
    ).catch(() => null);
    if (!thumbnail) {
      failures.push(`${person.slug}: missing local portrait thumbnail`);
    } else {
      const thumbnailDigest = createHash('sha256').update(thumbnail).digest('hex');
      const thumbnailMetadata = await sharp(thumbnail).metadata();
      if (thumbnailDigest !== entry.thumbnailSha256) failures.push(`${person.slug}: thumbnail digest drift`);
      if (thumbnailMetadata.format !== 'webp') failures.push(`${person.slug}: thumbnail is not WebP`);
      if (!thumbnailMetadata.width || thumbnailMetadata.width > 192 || !thumbnailMetadata.height) {
        failures.push(
          `${person.slug}: invalid ${thumbnailMetadata.width ?? '?'}x${thumbnailMetadata.height ?? '?'} thumbnail dimensions`,
        );
      }
    }
    if (entry.renderedAttribution !== person.portrait.renderedAttribution) {
      failures.push(`${person.slug}: rendered attribution drift`);
    }
    if (entry.filePage !== person.portrait.filePage) failures.push(`${person.slug}: source drift`);
    if (entry.licence !== person.portrait.licence) failures.push(`${person.slug}: licence drift`);
  }
  for (const person of absent) {
    const entry = manifest.noPortrait.find((item) => item.slug === person.slug);
    if (!entry || entry.reason !== person.portrait.reason) {
      failures.push(`${person.slug}: no-portrait decision drift`);
    }
  }
  if (failures.length) {
    console.error(`people-portraits: ${failures.length} failure(s)`);
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }
  console.log(`people-portraits: OK — ${available.length} credited files, ${absent.length} deliberate no-portrait states`);
}

if (checkOnly) {
  await checkManifest();
  process.exit(0);
}

await mkdir(out, { recursive: true });

if (thumbnailsOnly) {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  for (const entry of manifest.portraits) {
    const full = await readFile(resolve(root, 'public', entry.localPath.replace(/^\//u, '')));
    const thumbnail = await thumbnailFrom(full);
    const thumbnailPath = `/assets/people/${entry.slug}-192.webp`;
    await writeFile(resolve(root, 'public', thumbnailPath.replace(/^\//u, '')), thumbnail);
    const metadata = await sharp(thumbnail).metadata();
    entry.thumbnailPath = thumbnailPath;
    entry.thumbnailWidth = metadata.width;
    entry.thumbnailHeight = metadata.height;
    entry.thumbnailSha256 = createHash('sha256').update(thumbnail).digest('hex');
  }
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await checkManifest();
  process.exit(0);
}

const portraitRecords = [];

for (const person of available) {
  const endpoint = new URL('https://commons.wikimedia.org/w/api.php');
  endpoint.search = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    prop: 'imageinfo',
    iiprop: 'url',
    iiurlwidth: '960',
    titles: person.portrait.file,
  }).toString();
  const response = await fetch(endpoint, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Zodiacs.org Phase 5 portrait archive (admin@zodiacs.org)',
    },
  });
  if (!response.ok) throw new Error(`${person.slug}: Commons API ${response.status}`);
  const payload = await response.json();
  const imageInfo = payload.query?.pages?.[0]?.imageinfo?.[0];
  const sourceMediaUrl = imageInfo?.thumburl ?? imageInfo?.url;
  if (!sourceMediaUrl || new URL(sourceMediaUrl).hostname !== 'upload.wikimedia.org') {
    throw new Error(`${person.slug}: Commons returned no trusted media URL`);
  }
  const media = await fetch(sourceMediaUrl, {
    headers: { 'User-Agent': 'Zodiacs.org Phase 5 portrait archive (admin@zodiacs.org)' },
  });
  if (!media.ok) throw new Error(`${person.slug}: portrait download ${media.status}`);
  const input = Buffer.from(await media.arrayBuffer());
  const output = await sharp(input)
    .rotate()
    .resize({ width: 640, withoutEnlargement: true })
    .webp({ quality: 82, effort: 6 })
    .toBuffer();
  const localPath = `public/assets/people/${person.slug}.webp`;
  await writeFile(resolve(root, localPath), output);
  const thumbnail = await thumbnailFrom(output);
  const thumbnailPath = `public/assets/people/${person.slug}-192.webp`;
  await writeFile(resolve(root, thumbnailPath), thumbnail);
  const metadata = await sharp(output).metadata();
  const thumbnailMetadata = await sharp(thumbnail).metadata();
  portraitRecords.push({
    slug: person.slug,
    localPath: `/assets/people/${person.slug}.webp`,
    sourceFile: person.portrait.file,
    filePage: person.portrait.filePage,
    sourceMediaUrl,
    creator: person.portrait.creator,
    licence: person.portrait.licence,
    licenceUrl: person.portrait.licenceUrl,
    renderedAttribution: person.portrait.renderedAttribution,
    width: metadata.width,
    height: metadata.height,
    sha256: createHash('sha256').update(output).digest('hex'),
    thumbnailPath: `/assets/people/${person.slug}-192.webp`,
    thumbnailWidth: thumbnailMetadata.width,
    thumbnailHeight: thumbnailMetadata.height,
    thumbnailSha256: createHash('sha256').update(thumbnail).digest('hex'),
  });
  console.log(`${person.slug}: ${metadata.width}x${metadata.height} · ${(output.length / 1024).toFixed(0)} KiB`);
}

await writeFile(manifestPath, `${JSON.stringify({
  schema: 'zodiacs.phase5.people-portraits.v1',
  source: 'Wikimedia Commons files reviewed in docs/phase5/people-pilot/manifest.json',
  portraits: portraitRecords.sort((a, b) => a.slug.localeCompare(b.slug)),
  noPortrait: absent.map((person) => ({
    slug: person.slug,
    reason: person.portrait.reason,
    sourceFile: person.portrait.file ?? null,
  })).sort((a, b) => a.slug.localeCompare(b.slug)),
}, null, 2)}\n`, 'utf8');

await checkManifest();
