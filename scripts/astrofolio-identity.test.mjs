import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pixelmatch from 'pixelmatch';
import sharp from 'sharp';
import { afterAll, describe, expect, it } from 'vitest';
import {
  ASTROFOLIO_OG_BASE,
  ASTROFOLIO_OG_MOTIF_GEOMETRY,
  ASTROFOLIO_OG_VERSION,
  ASTROFOLIO_IDENTITY_VERSION,
  astrofolioOgCopy,
  astrofolioOgIdentitySources,
  astrofolioSeasonTitleLayout,
  buildAstrofolioIdentity,
  buildAstrofolioOgFamily,
} from './build-astrofolio-identity.mjs';
import { resolveAstrofolioSeasonUtc, seasonsFromRegistry } from './astrofolio-season.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const registry = JSON.parse(await readFile(
  resolve(root, 'public/registry/zodiacs.registry.json'),
  'utf8',
));
const seasons = seasonsFromRegistry(registry);
const monthDayIso = (year, value) => {
  const month = Math.floor(value / 100);
  const day = value % 100;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const tempDirectories = [];
const PLATFORM_RENDERED_ARTWORK = new Set([
  'avatar-1024.png',
  'og-1200x630.png',
  'season-seal-192.png',
]);

function semanticIdentityManifest(manifest) {
  const semantic = structuredClone(manifest);
  delete semantic.terminalOgSha256;
  for (const season of semantic.seasons) {
    for (const name of PLATFORM_RENDERED_ARTWORK) delete season.sha256[name];
  }
  return semantic;
}

function semanticOgManifest(manifest) {
  const semantic = structuredClone(manifest);
  for (const season of semantic.seasons) delete season.sha256;
  return semantic;
}

async function expectPixelEquivalent(actualPath, expectedPath, label, {
  maxDifferentPixelRatio = 0.015,
  maxNormalizedMeanAbsoluteError = 0.006,
  crop,
} = {}) {
  const comparisonSize = 256;
  const decodedArtwork = (path) => {
    let pipeline = sharp(path).ensureAlpha();
    if (crop) pipeline = pipeline.extract(crop);
    return pipeline
      .resize({ width: comparisonSize, height: comparisonSize, fit: 'inside', kernel: 'lanczos3' })
      .raw()
      .toBuffer({ resolveWithObject: true });
  };
  const [actual, expected] = await Promise.all([
    decodedArtwork(actualPath),
    decodedArtwork(expectedPath),
  ]);
  expect(actual.info, `${label}: decoded image geometry`).toMatchObject({
    width: expected.info.width,
    height: expected.info.height,
    channels: expected.info.channels,
  });

  const pixelCount = expected.info.width * expected.info.height;
  const differentPixels = pixelmatch(
    expected.data,
    actual.data,
    null,
    expected.info.width,
    expected.info.height,
    { threshold: 0.1, includeAA: false },
  );
  let absoluteChannelError = 0;
  for (let offset = 0; offset < expected.data.length; offset += 1) {
    absoluteChannelError += Math.abs(expected.data[offset] - actual.data[offset]);
  }
  const differentPixelRatio = differentPixels / pixelCount;
  const normalizedMeanAbsoluteError = absoluteChannelError / (expected.data.length * 255);
  expect(
    differentPixelRatio,
    `${label}: ${(differentPixelRatio * 100).toFixed(3)}% perceptually different pixels`,
  ).toBeLessThanOrEqual(maxDifferentPixelRatio);
  expect(
    normalizedMeanAbsoluteError,
    `${label}: ${normalizedMeanAbsoluteError.toFixed(6)} normalized decoded-channel MAE`,
  ).toBeLessThanOrEqual(maxNormalizedMeanAbsoluteError);
}

afterAll(async () => {
  await Promise.all(tempDirectories.map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('Astrofolio UTC season resolver', () => {
  it('is backed by all twelve canonical Registry ranges', () => {
    expect(seasons.map(({ sign, dateRange }) => ({ sign, dateRange }))).toEqual(
      registry.assets.map(({ sign, metadata }) => ({ sign, dateRange: metadata.dateRange })),
    );
  });

  it.each(seasons)('includes both $sign boundaries', (season) => {
    const start = resolveAstrofolioSeasonUtc(`${monthDayIso(2026, season.start)}T00:00:00.000Z`, seasons);
    const end = resolveAstrofolioSeasonUtc(`${monthDayIso(2026, season.end)}T23:59:59.999Z`, seasons);
    expect(start.sign).toBe(season.sign);
    expect(end.sign).toBe(season.sign);
  });

  it('handles Capricorn across the UTC year boundary', () => {
    expect(resolveAstrofolioSeasonUtc('2026-12-31T23:59:59.999Z', seasons).sign).toBe('capricorn');
    expect(resolveAstrofolioSeasonUtc('2027-01-01T00:00:00.000Z', seasons).sign).toBe('capricorn');
    expect(resolveAstrofolioSeasonUtc('2027-01-19T23:59:59.999Z', seasons).sign).toBe('capricorn');
    expect(resolveAstrofolioSeasonUtc('2027-01-20T00:00:00.000Z', seasons).sign).toBe('aquarius');
  });

  it('uses UTC rather than the host locale or input offset', () => {
    expect(resolveAstrofolioSeasonUtc('2026-08-23T00:30:00+07:00', seasons).sign).toBe('leo');
    expect(resolveAstrofolioSeasonUtc('2026-08-23T00:30:00-07:00', seasons).sign).toBe('virgo');
  });

  it('rejects invalid instants and incomplete Registry inputs', () => {
    expect(() => resolveAstrofolioSeasonUtc('not-a-date', seasons)).toThrow('valid date');
    expect(() => resolveAstrofolioSeasonUtc('2026-08-13', seasons.slice(1))).toThrow('12 Registry-derived ranges');
    expect(() => seasonsFromRegistry({ assets: registry.assets.slice(1) })).toThrow('all 12 Registry assets');
  });
});

describe('Astrofolio seasonal identity generator', () => {
  it('publishes the redesign as immutable v2 artwork', async () => {
    expect(ASTROFOLIO_IDENTITY_VERSION).toBe('v2');
    const historical = JSON.parse(await readFile(
      resolve(root, 'public/assets/astrofolio/v1/manifest.json'),
      'utf8',
    ));
    expect(historical).toMatchObject({
      schema: 'zodiacs.astrofolio-identity.v1',
      version: 'v1',
    });
    expect(digest(await readFile(
      resolve(root, 'public/assets/astrofolio/v2/manifest.json'),
    ))).toBe('3a8022db544394d6676518ce664150f68478eab6a6a345ce37cb006a5316c981');
  });

  it('publishes cache-fresh social cards independently from the historical v2 identity', async () => {
    expect(ASTROFOLIO_OG_VERSION).toBe('v4');
    expect(ASTROFOLIO_OG_BASE).toBe('/assets/og/astrofolio/v4');
    const social = JSON.parse(await readFile(
      resolve(root, 'public/assets/og/astrofolio/v4/manifest.json'),
      'utf8',
    ));
    expect(social).toMatchObject({
      schema: 'zodiacs.astrofolio-og.v4',
      version: 'v4',
      base: ASTROFOLIO_OG_BASE,
      type: 'image/png',
      width: 1200,
      height: 630,
    });
    expect(social.seasons).toHaveLength(12);
    for (const season of seasons) {
      const record = social.seasons.find(({ sign }) => sign === season.sign);
      expect(record?.artwork?.og).toBe(`${ASTROFOLIO_OG_BASE}/${season.sign}.png`);
    }
  });

  it('derives legible OG season copy from canonical Registry metadata', () => {
    expect(astrofolioOgCopy(seasons[4], 4)).toEqual({
      title: 'Astrofolio',
      caption: 'The Twelve Official Zodiacs',
      status: 'NOW IN SEASON',
      season: 'Leo',
      sequence: '05 / 12',
      dateRange: 'JUL 23 – AUG 22',
      timeZone: 'UTC',
    });
    expect(astrofolioOgCopy(seasons[8], 8)).toMatchObject({
      season: 'Sagittarius',
      sequence: '09 / 12',
      dateRange: 'NOV 22 – DEC 21',
    });
    expect(astrofolioOgCopy(seasons[11], 11).sequence).toBe('12 / 12');
    expect(() => astrofolioOgCopy(seasons[0], 12)).toThrow('season index');
  });

  it('maps every OG season to its own Registry name, hue, date, icon, and sculpture', () => {
    const expectedHues = [
      '#DE8E79', '#B9D4BE', '#B29DD0', '#B6D4E4', '#E0A9B4', '#B7D9B0',
      '#D3A9DE', '#B9DCE8', '#E0B080', '#C0DEA8', '#AE8FC9', '#A9D4C4',
    ];
    expect(seasons.map(astrofolioOgIdentitySources)).toEqual(seasons.map((season, index) => ({
      sign: season.sign,
      displayName: season.displayName,
      dateRange: season.dateRange,
      hue: expectedHues[index],
      icon: `/assets/zodiac-icons/128/${season.sign}.webp`,
      sculpture: `/assets/sculptures/1024/${season.sign}.webp`,
    })));
    expect(() => astrofolioOgIdentitySources({ sign: 'ophiuchus' })).toThrow('Registry season metadata');
  });

  it('uses the enlarged, left-shifted OG motif geometry', () => {
    expect(ASTROFOLIO_OG_MOTIF_GEOMETRY).toEqual({
      size: 636,
      centerX: 877,
      centerY: 315,
      sculptureBox: 334,
    });
  });

  it('keeps seasonal OG copy secondary for short and long sign names', () => {
    expect(astrofolioSeasonTitleLayout('Leo')).toEqual({
      ogTitleSize: 50,
      ogIconSize: 38,
      ogGap: 12,
    });
    expect(astrofolioSeasonTitleLayout('Sagittarius')).toEqual({
      ogTitleSize: 36,
      ogIconSize: 32,
      ogGap: 10,
    });
    expect(astrofolioSeasonTitleLayout('Capricorn')).toEqual({
      ogTitleSize: 42,
      ogIconSize: 34,
      ogGap: 10,
    });
    expect(astrofolioSeasonTitleLayout('Sagittarius').ogTitleSize)
      .toBeLessThan(astrofolioSeasonTitleLayout('Leo').ogTitleSize);
    expect(() => astrofolioSeasonTitleLayout('')).toThrow('display name');
  });

  it('replays semantically from canonical sources with platform-safe artwork comparison', async () => {
    const temporaryRoot = await mkdtemp(resolve(tmpdir(), 'astrofolio-identity-'));
    tempDirectories.push(temporaryRoot);
    const outputDirectory = resolve(temporaryRoot, 'identity');
    const terminalOutput = resolve(temporaryRoot, 'terminal.png');
    const replay = await buildAstrofolioIdentity({ rootDirectory: root, outputDirectory, terminalOutput });
    const committed = JSON.parse(await readFile(
      resolve(root, `public/assets/astrofolio/${ASTROFOLIO_IDENTITY_VERSION}/manifest.json`),
      'utf8',
    ));
    expect(semanticIdentityManifest(replay)).toEqual(semanticIdentityManifest(committed));
    const committedTerminal = resolve(root, 'public/assets/og/v6/terminal.png');
    expect(digest(await readFile(committedTerminal)), 'committed Terminal OG manifest integrity')
      .toBe(committed.terminalOgSha256);
    await expectPixelEquivalent(terminalOutput, committedTerminal, 'Terminal OG replay', {
      // Satori's text rasterizer moves more anti-aliased edge pixels between
      // macOS and Linux than the image-only seasonal compositions do.
      maxDifferentPixelRatio: 0.03,
      maxNormalizedMeanAbsoluteError: 0.01,
    });
    for (const season of replay.seasons) {
      for (const [name, sha256] of Object.entries(season.sha256)) {
        const replayPath = resolve(outputDirectory, season.sign, name);
        const committedPath = resolve(
          root,
          `public/assets/astrofolio/${ASTROFOLIO_IDENTITY_VERSION}/${season.sign}/${name}`,
        );
        const committedSha256 = committed.seasons
          .find(({ sign }) => sign === season.sign)?.sha256[name];
        expect(digest(await readFile(committedPath)), `${season.sign}/${name}: committed manifest integrity`)
          .toBe(committedSha256);
        if (PLATFORM_RENDERED_ARTWORK.has(name)) {
          await expectPixelEquivalent(replayPath, committedPath, `${season.sign}/${name}`, name === 'og-1200x630.png'
            ? {
                // Compare the user-facing seasonal motif independently from
                // OS-specific anti-aliasing in the left-side wordmark.
                crop: { left: 540, top: 0, width: 660, height: 630 },
              }
            : undefined);
        } else {
          expect(digest(await readFile(replayPath)), `${season.sign}/${name}: byte-exact replay`)
            .toBe(sha256);
        }
      }
    }
  }, 60_000);

  it('replays every v4 social card from the same deterministic seasonal composition', async () => {
    const temporaryRoot = await mkdtemp(resolve(tmpdir(), 'astrofolio-og-'));
    tempDirectories.push(temporaryRoot);
    const outputDirectory = resolve(temporaryRoot, 'v4');
    const replay = await buildAstrofolioOgFamily({ rootDirectory: root, outputDirectory });
    const committed = JSON.parse(await readFile(
      resolve(root, 'public/assets/og/astrofolio/v4/manifest.json'),
      'utf8',
    ));
    expect(semanticOgManifest(replay)).toEqual(semanticOgManifest(committed));
    for (const season of replay.seasons) {
      const committedPath = resolve(root, `public/assets/og/astrofolio/v4/${season.sign}.png`);
      expect(digest(await readFile(committedPath)), `${season.sign}: committed v4 OG integrity`)
        .toBe(committed.seasons.find(({ sign }) => sign === season.sign)?.sha256);
      await expectPixelEquivalent(
        resolve(outputDirectory, `${season.sign}.png`),
        committedPath,
        `${season.sign}: v4 OG replay`,
        {
          crop: { left: 540, top: 0, width: 660, height: 630 },
        },
      );
    }
  }, 60_000);

  it('keeps avatars ring-only while OG cards restore the seasonal gold sculpture', async () => {
    for (const sign of ['leo', 'sagittarius', 'capricorn']) {
      const directory = resolve(root, `public/assets/astrofolio/${ASTROFOLIO_IDENTITY_VERSION}/${sign}`);
      const [avatar, seal, icon, og] = await Promise.all([
        sharp(resolve(directory, 'avatar-1024.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
        sharp(resolve(directory, 'season-seal-192.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
        sharp(resolve(directory, 'icon-192.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
        sharp(resolve(root, `public/assets/og/astrofolio/v4/${sign}.png`)).raw().toBuffer({ resolveWithObject: true }),
      ]);
      const alphaAt = ({ data, info }, x, y) => data[(y * info.width + x) * info.channels + 3];
      expect(alphaAt(avatar, 0, 0), `${sign} avatar corner`).toBe(0);
      expect(alphaAt(avatar, 512, 512), `${sign} avatar center`).toBe(0);
      for (const [x, y] of [[384, 384], [640, 384], [384, 640], [640, 640]]) {
        expect(alphaAt(avatar, x, y), `${sign} avatar inner field ${x},${y}`).toBe(0);
      }
      expect(alphaAt(seal, 0, 0), `${sign} seal corner`).toBe(0);
      expect(alphaAt(seal, 96, 96), `${sign} seal center`).toBeGreaterThan(220);
      expect(alphaAt(icon, 0, 0), `${sign} app icon corner`).toBe(255);

      let goldPixels = 0;
      for (let y = 180; y < 450; y += 1) {
        for (let x = 760; x < 1030; x += 1) {
          if (Math.hypot(x - ASTROFOLIO_OG_MOTIF_GEOMETRY.centerX, y - ASTROFOLIO_OG_MOTIF_GEOMETRY.centerY) > 142) continue;
          const offset = (y * og.info.width + x) * og.info.channels;
          const [red, green, blue] = og.data.subarray(offset, offset + 3);
          if (red > 95 && green > 55 && red > green * 1.12 && green > blue * 1.18) {
            goldPixels += 1;
          }
        }
      }
      expect(goldPixels, `${sign} OG seasonal sculpture`).toBeGreaterThan(8_000);

      let visibleOrbitSamples = 0;
      const discRadius = 334 * ASTROFOLIO_OG_MOTIF_GEOMETRY.size / 1024;
      for (let index = 0; index < 12; index += 1) {
        const angle = -Math.PI / 2 + (index + 0.5) * Math.PI / 6;
        const x = Math.round(ASTROFOLIO_OG_MOTIF_GEOMETRY.centerX + Math.cos(angle) * discRadius);
        const y = Math.round(ASTROFOLIO_OG_MOTIF_GEOMETRY.centerY + Math.sin(angle) * discRadius);
        const offset = (y * og.info.width + x) * og.info.channels;
        const luminance = og.data[offset] * 0.2126 + og.data[offset + 1] * 0.7152 + og.data[offset + 2] * 0.0722;
        if (luminance > 28) visibleOrbitSamples += 1;
      }
      expect(visibleOrbitSamples, `${sign} OG connecting orbit`).toBe(0);
    }
  });

  it('publishes one sculpture-free transparent ring for the on-page lockup', async () => {
    const ring = await sharp(resolve(
      root,
      `public/assets/astrofolio/${ASTROFOLIO_IDENTITY_VERSION}/zodiac-ring-192.png`,
    )).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const alphaAt = (x, y) => ring.data[(y * ring.info.width + x) * ring.info.channels + 3];
    expect(alphaAt(0, 0)).toBe(0);
    expect(alphaAt(96, 96)).toBe(0);
    expect(alphaAt(96, 24)).toBeGreaterThan(200);
  });

  it('keeps one installed-app identity while seasonal artwork rotates', async () => {
    const social = JSON.parse(await readFile(resolve(
      root,
      `public/assets/og/astrofolio/${ASTROFOLIO_OG_VERSION}/manifest.json`,
    ), 'utf8'));
    for (const season of seasons) {
      const manifest = JSON.parse(await readFile(resolve(
        root,
        `public/assets/astrofolio/${ASTROFOLIO_IDENTITY_VERSION}/${season.sign}/astrofolio.webmanifest`,
      ), 'utf8'));
      expect(manifest).toMatchObject({
        id: '/astrofolio/',
        name: 'Astrofolio',
        start_url: '/astrofolio/',
        scope: '/astrofolio/',
      });
      const family = JSON.parse(await readFile(resolve(
        root,
        `public/assets/astrofolio/${ASTROFOLIO_IDENTITY_VERSION}/manifest.json`,
      ), 'utf8'));
      const record = family.seasons.find(({ sign: candidate }) => candidate === season.sign);
      expect(family.ogSculptureSource).toBe('/assets/sculptures/1024/{sign}.webp');
      expect(record?.ogSources).toEqual(astrofolioOgIdentitySources(season));
      expect(record?.artwork?.seasonSeal).toBe(
        `/assets/astrofolio/${ASTROFOLIO_IDENTITY_VERSION}/${season.sign}/season-seal-192.png`,
      );
      expect(social.seasons.find(({ sign }) => sign === season.sign)?.artwork?.og).toBe(
        `${ASTROFOLIO_OG_BASE}/${season.sign}.png`,
      );
    }
  });
});
