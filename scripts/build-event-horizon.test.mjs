import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
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

describe('Phase 2 five-year event horizon', () => {
  it('regenerates the committed sky and eclipse catalogs byte-for-byte', async () => {
    temporaryRoot = await mkdtemp(join(tmpdir(), 'zodiacs-event-horizon-'));
    for (const { script, source } of [
      { script: 'scripts/build-sky.mjs', source: 'src/data/sky.json' },
      { script: 'scripts/build-eclipses.mjs', source: 'src/data/eclipses.json' },
    ]) {
      const committed = await readFile(resolve(repositoryRoot, source), 'utf8');
      const generatedAt = JSON.parse(committed).generatedAt;
      const output = resolve(temporaryRoot, source.split('/').at(-1));
      await execFileAsync(process.execPath, [
        script,
        '--output', output,
        '--generated-at', generatedAt,
      ], { cwd: repositoryRoot });
      expect(await readFile(output, 'utf8'), `${source} must regenerate byte-for-byte`).toBe(committed);
    }
  });

  it('pins the exact inclusive 2026–2030 horizon and preserved anchors', async () => {
    const [sky, eclipses] = await Promise.all([
      readFile(resolve(repositoryRoot, 'src/data/sky.json'), 'utf8').then(JSON.parse),
      readFile(resolve(repositoryRoot, 'src/data/eclipses.json'), 'utf8').then(JSON.parse),
    ]);
    expect({ from: sky.from, to: sky.to, stationBoundaryScanTo: sky.stationBoundaryScanTo }).toEqual({
      from: '2026-01-01T00:00:00.000Z',
      to: '2031-01-01T00:00:00.000Z',
      stationBoundaryScanTo: '2031-04-01T00:00:00.000Z',
    });
    expect(sky.shadowBoundaryScanDays).toBe(730);
    expect(sky.moons).toHaveLength(124);
    expect(sky.retrogrades).toHaveLength(47);
    expect(sky.moons.find((moon) => moon.type === 'full' && moon.at.startsWith('2026-07-29'))).toEqual({
      type: 'full',
      at: '2026-07-29T14:36:19.011Z',
    });
    expect(sky.retrogrades.find((window) => window.planet === 'Mercury'
      && window.from.startsWith('2026-06-29'))).toEqual({
      planet: 'Mercury',
      from: '2026-06-29T17:37:12.860Z',
      to: '2026-07-23T22:56:19.394Z',
      preShadowStart: '2026-06-13T00:54:34.390Z',
      postShadowEnd: '2026-08-07T03:36:54.018Z',
    });

    expect({ from: eclipses.from, to: eclipses.to }).toEqual({
      from: '2026-01-01T00:00:00.000Z',
      to: '2031-01-01T00:00:00.000Z',
    });
    expect(eclipses.eclipses).toHaveLength(24);
    expect(eclipses.eclipses.filter((event) => event.type === 'solar')).toHaveLength(12);
    expect(eclipses.eclipses.filter((event) => event.type === 'lunar')).toHaveLength(12);
    expect(eclipses.eclipses.find((event) => event.peak.startsWith('2026-08-12'))).toMatchObject({
      type: 'solar',
      kind: 'total',
      peak: '2026-08-12T17:45:46.794Z',
      sign: 'leo',
      degree: 20,
    });
  });
});
