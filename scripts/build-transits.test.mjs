import { execFile } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let temporaryRoot;

afterEach(async () => {
  if (temporaryRoot) await rm(temporaryRoot, { force: true, recursive: true });
  temporaryRoot = undefined;
});

describe('Phase 1 transit fact generation', () => {
  it('regenerates every committed monthly catalog from the site engine', async () => {
    temporaryRoot = await mkdtemp(join(tmpdir(), 'zodiacs-transit-parity-'));
    const filenames = (await readdir(resolve(repositoryRoot, 'src/data')))
      .filter((name) => /^transits-\d{4}-(?:0[1-9]|1[0-2])\.json$/u.test(name))
      .sort();
    expect(filenames).toEqual(expect.arrayContaining([
      'transits-2026-07.json',
      'transits-2026-08.json',
    ]));

    for (const filename of filenames) {
      const month = filename.slice('transits-'.length, -'.json'.length);
      const firstOutput = join(temporaryRoot, 'first', filename);
      const secondOutput = join(temporaryRoot, 'second', filename);
      for (const output of [firstOutput, secondOutput]) {
        await execFileAsync(process.execPath, [
          'scripts/build-transits.mjs',
          month,
          '--output',
          output,
        ], { cwd: repositoryRoot });
      }

      const [first, second, committed] = await Promise.all([
        readFile(firstOutput, 'utf8'),
        readFile(secondOutput, 'utf8'),
        readFile(resolve(repositoryRoot, 'src/data', filename), 'utf8'),
      ]);
      expect(first, `${filename} must regenerate byte-for-byte`).toBe(second);
      expect(JSON.parse(first), filename).toEqual(JSON.parse(committed));
    }
  });

  it('pins event coverage and exact source-of-truth vectors for both Phase 1 months', async () => {
    const july = JSON.parse(await readFile(
      resolve(repositoryRoot, 'src/data/transits-2026-07.json'),
      'utf8',
    ));
    const august = JSON.parse(await readFile(
      resolve(repositoryRoot, 'src/data/transits-2026-08.json'),
      'utf8',
    ));

    expect({
      ingresses: july.ingresses.length,
      lunations: july.lunations.length,
      stations: july.stations.length,
      aspects: july.aspects.length,
    }).toEqual({ ingresses: 2, lunations: 2, stations: 3, aspects: 16 });
    expect(july.lunations.map(({ type, at, sign }) => ({ type, at, sign }))).toEqual([
      { type: 'new', at: '2026-07-14T09:43:29.938Z', sign: 'cancer' },
      { type: 'full', at: '2026-07-29T14:35:36.043Z', sign: 'aquarius' },
    ]);
    expect(july.stations.map(({ planet, at, type }) => ({ planet, at, type }))).toEqual([
      { planet: 'Neptune', at: '2026-07-07T11:21:04.854Z', type: 'retrograde' },
      { planet: 'Mercury', at: '2026-07-23T22:56:18.734Z', type: 'direct' },
      { planet: 'Saturn', at: '2026-07-26T19:57:36.929Z', type: 'retrograde' },
    ]);

    expect({
      ingresses: august.ingresses.length,
      lunations: august.lunations.length,
      stations: august.stations.length,
      aspects: august.aspects.length,
    }).toEqual({ ingresses: 5, lunations: 2, stations: 0, aspects: 15 });
    expect(august.lunations.map(({ type, at, sign }) => ({ type, at, sign }))).toEqual([
      { type: 'new', at: '2026-08-12T17:36:35.369Z', sign: 'leo' },
      { type: 'full', at: '2026-08-28T04:18:24.894Z', sign: 'pisces' },
    ]);
  });

  it('preserves both Mercury ingresses when a retrograde turn returns across a cusp the same day', async () => {
    temporaryRoot = await mkdtemp(join(tmpdir(), 'zodiacs-transit-double-ingress-'));
    const output = join(temporaryRoot, 'transits-1970-01.json');
    await execFileAsync(process.execPath, [
      'scripts/build-transits.mjs',
      '1970-01',
      '--output',
      output,
    ], { cwd: repositoryRoot });

    const generated = JSON.parse(await readFile(output, 'utf8'));
    expect(generated.ingresses.filter(({ planet }) => planet === 'Mercury')).toEqual([
      {
        planet: 'Mercury',
        at: '1970-01-04T03:39:51.492Z',
        sign: 'aquarius',
        retrograde: false,
      },
      {
        planet: 'Mercury',
        at: '1970-01-04T12:44:14.275Z',
        sign: 'capricorn',
        retrograde: true,
      },
    ]);
  });
});
