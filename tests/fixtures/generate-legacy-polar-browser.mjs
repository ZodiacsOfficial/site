/**
 * Freeze migration inputs from the archived 0.1.0 package, independently of
 * whichever @zodiacs/engine is installed. Browser drives only read the JSON.
 * Run with --write to regenerate, or --check (default) to verify reproducibility.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const mode = process.argv[2] ?? '--check';
assert.ok(['--check', '--write'].includes(mode), 'Use --check or --write');
const archive = new URL('../../vendor/zodiacs-engine-0.1.0.tgz', import.meta.url);
const target = new URL('./legacy-polar-browser.json', import.meta.url);
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const artifactSHA256 = hash(await readFile(archive));
assert.equal(artifactSHA256, '8da3e0f2eb3818fe2c5833e05331be61da9b605ffa118a8462182821412e7cbe');
const astronomyEntry = fileURLToPath(import.meta.resolve('astronomy-engine'));
const astronomyRoot = dirname(dirname(astronomyEntry));
const astronomyPackage = JSON.parse(await readFile(join(astronomyRoot, 'package.json'), 'utf8'));
assert.equal(astronomyPackage.version, '2.1.19');
const scratch = await mkdtemp(join(tmpdir(), 'zodiacs-legacy-polar-'));

try {
  execFileSync('tar', ['-xzf', fileURLToPath(archive), '-C', scratch]);
  await mkdir(join(scratch, 'node_modules'));
  await symlink(astronomyRoot, join(scratch, 'node_modules/astronomy-engine'), 'dir');
  const { computeChart } = await import(pathToFileURL(join(scratch, 'package/dist/internal.js')).href);
  const cases = [];
  for (let minutes = 0; minutes < 1440; minutes += 15) {
    const utc = new Date(Date.UTC(2001, 11, 21, 0, minutes));
    const result = computeChart({ utc, latitude: 78.2232, longitude: 15.6267, houseSystem: 'placidus', timeKnown: true });
    assert.equal(result.engineVersion, '0.1.0');
    cases.push({ minutes, summary: {
      engineVersion: result.engineVersion, utcISO: utc.toISOString(),
      houseSystem: result.houses.system,
      bodies: result.bodies.map(({ body, lon, retrograde }) => ({ body, lon, retrograde })),
      angles: { asc: result.angles.asc, mc: result.angles.mc }, flags: [...result.flags],
    } });
  }
  const hourly = JSON.parse(await readFile(new URL('../../src/lib/engine/fixtures/legacy-polar-saved.json', import.meta.url), 'utf8'));
  assert.equal(hourly.artifactSHA256, artifactSHA256);
  for (const row of hourly.cases.filter(({ latitude }) => latitude === 78.2232)) {
    assert.deepEqual(cases.find(({ minutes }) => minutes === row.hour * 60).summary, row.summary);
  }
  const output = JSON.stringify({
    purpose: 'Frozen synthetic browser migration inputs from archived 0.1.0; not an independent numerical reference.',
    artifact: 'vendor/zodiacs-engine-0.1.0.tgz', artifactSHA256,
    generator: 'tests/fixtures/generate-legacy-polar-browser.mjs',
    ephemeris: { name: astronomyPackage.name, version: astronomyPackage.version, esmSHA256: hash(await readFile(astronomyEntry)) },
    input: { date: '2001-12-21', latitude: 78.2232, longitude: 15.6267, houseSystem: 'placidus', timeKnown: true, stepMinutes: 15 },
    cases,
  }, null, 2) + '\n';
  if (mode === '--write') await writeFile(target, output);
  else assert.equal(await readFile(target, 'utf8'), output);
  console.log(`${mode}: 96 frozen 0.1.0 cases; all 24 north-polar hourly records match the original corpus`);
} finally {
  await rm(scratch, { recursive: true, force: true });
}
