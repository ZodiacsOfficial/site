import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import {
  ASTROFOLIO_IDENTITY_VERSION,
  buildAstrofolioIdentity,
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
  it('replays byte-for-byte from canonical sources', async () => {
    const temporaryRoot = await mkdtemp(resolve(tmpdir(), 'astrofolio-identity-'));
    tempDirectories.push(temporaryRoot);
    const outputDirectory = resolve(temporaryRoot, 'identity');
    const terminalOutput = resolve(temporaryRoot, 'terminal.png');
    const replay = await buildAstrofolioIdentity({ rootDirectory: root, outputDirectory, terminalOutput });
    const committed = JSON.parse(await readFile(
      resolve(root, `public/assets/astrofolio/${ASTROFOLIO_IDENTITY_VERSION}/manifest.json`),
      'utf8',
    ));
    expect(replay).toEqual(committed);
    expect(digest(await readFile(terminalOutput))).toBe(committed.terminalOgSha256);
    for (const season of replay.seasons) {
      for (const [name, sha256] of Object.entries(season.sha256)) {
        expect(digest(await readFile(resolve(outputDirectory, season.sign, name))), `${season.sign}/${name}`)
          .toBe(sha256);
      }
    }
  }, 30_000);

  it('keeps one installed-app identity while seasonal artwork rotates', async () => {
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
    }
  });
});
