import { readFile, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = async (path) => JSON.parse(await readFile(resolve(root, path), 'utf8'));

describe('sky.json lunations share the monthly catalogs\' apparent-longitude instants', () => {
  it('every sky.json lunation matches its transits-YYYY-MM.json record within 2 s, and vice versa', async () => {
    const sky = await readJson('src/data/sky.json');
    const names = (await readdir(resolve(root, 'src/data'))).filter((name) => /^transits-\d{4}-\d{2}\.json$/.test(name));
    const monthly = (await Promise.all(names.map((name) => readJson(`src/data/${name}`))))
      .flatMap((month) => month.lunations.map(({ type, at }) => ({ type, at })))
      .filter(({ at }) => at >= sky.from && at < sky.to);
    const covered = new Set(names.map((name) => name.slice(9, 16)));
    const inCoveredMonth = sky.moons.filter(({ at }) => covered.has(at.slice(0, 7)));
    expect(inCoveredMonth.length).toBeGreaterThan(0);
    for (const moon of inCoveredMonth) {
      const deltas = monthly.filter((record) => record.type === moon.type)
        .map((record) => Math.abs(Date.parse(record.at) - Date.parse(moon.at)));
      expect(Math.min(...deltas), `${moon.type} ${moon.at}`).toBeLessThanOrEqual(2_000);
    }
    expect(monthly).toHaveLength(inCoveredMonth.length);
  });

  it('puts the 2027-01-07 new moon within 5 s of JPL Horizons', async () => {
    // Horizons apparent ecliptic longitudes a minute apart (evidence README);
    // the new moon is where Moon − Sun crosses zero, by linear interpolation.
    const rows = async (body) => (await readFile(resolve(root,
      `docs/platform/evidence/lunations-2026-09-23/horizons/${body}-newmoon-2027-01-07.txt`), 'utf8'))
      .split('$$SOE')[1].split('$$EOE')[0].trim().split('\n')
      .map((line) => {
        const [when, , , lon] = line.split(',').map((field) => field.trim());
        return { at: Date.parse(`${when.replace(/^(\d{4})-(\w{3})-(\d{2})/, '$2 $3 $1')} UTC`), lon: Number(lon) };
      });
    const moon = await rows('moon');
    const sun = await rows('sun');
    const gap = moon.map((row, index) => ({ at: row.at, d: ((row.lon - sun[index].lon + 540) % 360) - 180 }));
    const cross = gap.findIndex((row, index) => index > 0 && gap[index - 1].d < 0 && row.d >= 0);
    const [before, after] = [gap[cross - 1], gap[cross]];
    const horizons = before.at + (after.at - before.at) * (-before.d / (after.d - before.d));
    expect(Math.abs(horizons - Date.parse('2027-01-07T20:24:23.225Z'))).toBeLessThan(500);
    const sky = await readJson('src/data/sky.json');
    const newMoon = sky.moons.find((row) => row.type === 'new' && row.at.startsWith('2027-01-07'));
    expect(Math.abs(Date.parse(newMoon.at) - horizons)).toBeLessThanOrEqual(5_000);
  });
});

