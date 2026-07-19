import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { computeDailySnapshot } from './daily-snapshot-lib.mjs';

let temporaryRoot;
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

async function root() {
  temporaryRoot = await mkdtemp(join(tmpdir(), 'zodiacs-daily-snapshot-'));
  await mkdir(join(temporaryRoot, 'src/data'), { recursive: true });
  return temporaryRoot;
}

afterEach(async () => {
  if (temporaryRoot) await rm(temporaryRoot, { force: true, recursive: true });
  temporaryRoot = undefined;
});

describe('daily snapshot source coverage', () => {
  it('marks a missing monthly source unavailable instead of calling it a quiet day', async () => {
    const snapshot = await computeDailySnapshot('2026-06-19', await root());
    expect(snapshot.eventsCoverage).toBe('unavailable');
    expect(snapshot.eventsSource).toBeNull();
    expect(snapshot.events).toEqual([]);
  });

  it('hard-fails malformed JSON in an existing monthly source', async () => {
    const repo = await root();
    await writeFile(join(repo, 'src/data/transits-2026-06.json'), '{not json}\n');
    await expect(computeDailySnapshot('2026-06-19', repo)).rejects.toThrow('invalid JSON');
  });

  it('hard-fails malformed or off-month events in an existing source', async () => {
    const repo = await root();
    await writeFile(join(repo, 'src/data/transits-2026-06.json'), JSON.stringify({
      month: '2026-06',
      ingresses: [{ planet: 'Venus', sign: 'leo', at: '2026-07-01T00:00:00.000Z' }],
      lunations: [],
      stations: [],
      aspects: [],
    }));
    await expect(computeDailySnapshot('2026-06-19', repo)).rejects.toThrow('inside 2026-06');
  });

  it('pins the 29 July 2026 full moon to the committed transit source', async () => {
    const snapshot = await computeDailySnapshot('2026-07-29', repositoryRoot);
    expect(snapshot.moon.phase).toBe('Full Moon');
    expect(snapshot.events).toContainEqual(expect.objectContaining({
      kind: 'lunation',
      type: 'full',
      at: '2026-07-29T14:36:19.011Z',
      sign: 'aquarius',
      degree: expect.closeTo(6.508141588268472, 10),
    }));
  });

  it('pins Mercury as retrograde on 18 July 2026', async () => {
    const snapshot = await computeDailySnapshot('2026-07-18', repositoryRoot);
    expect(snapshot.bodies.find((body) => body.body === 'Mercury')).toMatchObject({
      sign: 'cancer',
      retrograde: true,
    });
  });
});
