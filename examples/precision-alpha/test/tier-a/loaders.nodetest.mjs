/**
 * A3 and A5: the two Node loaders, and the shape of the API.
 *
 * No kernel and no real pack: a synthetic pack is written to a temporary
 * file, so the file-backed path is exercised for real without any data
 * dependency.
 */

/**
 * Named `.nodetest.mjs`, not `.test.mjs`, on purpose: vitest's default glob
 * collects `*.test.mjs` across the whole repository and these are
 * `node:test` suites, not vitest ones. The repository already uses this
 * convention for its research suites. Run them with the package's own
 * `npm test`, or `node --test "test/tier-a/*.nodetest.mjs"`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildPack } from './_pack.mjs';
import { openPackFile, openPackFileStream, fileSource } from '../../src/node.mjs';
import { openPackFromBytes, PrecisionRuntime } from '../../src/index.mjs';
import { CORRECTED } from '../../src/core/reduce.mjs';

const NCOEF = 8;
const NREC = 40;
const INTERVAL = 86400;
const INIT = -20 * INTERVAL;
const coeffs = (r) => {
  const out = [];
  for (let comp = 0; comp < 3; comp += 1) {
    for (let k = 0; k < NCOEF; k += 1) out.push(Math.cos(1 + 5 * comp + 2.5 * k + 0.7 * r) * (k === 0 ? 2e8 : 1e5));
  }
  return out;
};
const bytes = buildPack({
  bodies: [
    { name: 'sun', frame: 'native', ncoef: NCOEF, nrec: NREC, initEt: INIT, intervalSec: INTERVAL, enc: 'q', q: 1e-3, coeffs },
    { name: 'emb', frame: 'ssb', ncoef: NCOEF, nrec: NREC, initEt: INIT, intervalSec: INTERVAL, enc: 'q', q: 1e-3, coeffs: (r) => coeffs(r + 1) },
    { name: 'moon', frame: 'ssb', ncoef: NCOEF, nrec: NREC, initEt: INIT, intervalSec: INTERVAL, coeffs: (r) => coeffs(r + 2) },
    { name: 'marsBary', frame: 'sun', ncoef: NCOEF, nrec: NREC, initEt: INIT, intervalSec: INTERVAL, enc: 'q', q: 1e-3, coeffs: (r) => coeffs(r + 3) },
  ],
  derived: { earth399: { emrat: 81.30056822149722, from: 'moon' } },
});

const dir = mkdtempSync(join(tmpdir(), 'loaders-'));
const path = join(dir, 'synthetic.zeph');
writeFileSync(path, Buffer.from(bytes));
process.on('exit', () => rmSync(dir, { recursive: true, force: true }));

const INSTANTS = [-15.5, -3.25, 0, 0.125, 7.875, 18.5];
// Not 'Earth': the observer is the geocentre, so Earth is not an observable
// body in this contract, and apparent('Earth') is correctly refused.
const BODIES = ['Sun', 'Moon', 'Mars'];

test('A5: the file-backed loader returns bit-identical numbers to the resident one', async () => {
  const resident = await openPackFile(path);
  const backed = await openPackFileStream(path);
  assert.equal(resident.sourceKind, 'memory');
  assert.equal(backed.sourceKind, 'file');
  assert.equal(resident.integrity.computedDigest, backed.integrity.computedDigest,
    'WebCrypto over a buffer and a streamed node:crypto hash must reach the same digest');
  let compared = 0;
  for (const tt of INSTANTS) {
    for (const body of BODIES) {
      const a = resident.apparent(body, tt, CORRECTED);
      const b = backed.apparent(body, tt, CORRECTED);
      for (const k of ['lon', 'lat', 'distKm', 'lightTimeSec']) {
        assert.equal(a[k], b[k], `${body} ${k} at ${tt}`);
      }
      compared += 1;
    }
  }
  assert.ok(compared >= 10);
  resident.dispose();
  backed.dispose();
});

test('A5: the two loaders agree on a whole search, not just a point', async () => {
  const resident = await openPackFile(path);
  const backed = await openPackFileStream(path);
  const spec = { kind: 'longitude', body: 'Mars', targetDeg: 45, fromTtDays: -15, toTtDays: 15, epsilonDeg: 1 / 3600, options: CORRECTED, maxEvaluations: 200000 };
  const a = resident.search(spec);
  const b = backed.search(spec);
  assert.equal(a.execution.status, b.execution.status);
  assert.equal(a.completeness.support, b.completeness.support);
  assert.equal(a.eventCount.found, b.eventCount.found);
  assert.equal(a.execution.evaluations, b.execution.evaluations);
  assert.deepEqual(a.events.map((c) => c.ttDays), b.events.map((c) => c.ttDays));
  resident.dispose();
  backed.dispose();
});

test('A3: opening is async; every calculation afterwards is synchronous', async () => {
  const rt = await openPackFile(path);
  const r = rt.apparent('Sun', 1.5, CORRECTED);
  assert.equal(typeof r.lon, 'number');
  assert.equal(r instanceof Promise, false);
  const s = rt.search({ kind: 'longitude', body: 'Sun', targetDeg: 10, fromTtDays: -10, toTtDays: 10, epsilonDeg: 1 / 3600, options: CORRECTED });
  assert.equal(s instanceof Promise, false);
  rt.dispose();
});

test('A3: the same instant gives the same answer on a second call and across runtimes', async () => {
  const one = await openPackFile(path);
  const two = await openPackFromBytes(bytes);
  for (const tt of INSTANTS) {
    const a = one.apparent('Moon', tt, CORRECTED);
    const b = two.apparent('Moon', tt, CORRECTED);
    assert.equal(a.lon, b.lon);
    assert.equal(a.lat, b.lat);
  }
  one.dispose();
  two.dispose();
});

test('dispose releases the descriptor, and a disposed file-backed source refuses', async () => {
  const backed = await openPackFileStream(path);
  backed.apparent('Sun', 0, CORRECTED);
  backed.dispose();
  assert.throws(() => backed.apparent('Sun', 0, CORRECTED), (e) => e.code === 'disposed');
});

test('a released file source refuses further reads rather than reading a closed descriptor', () => {
  const src = fileSource(path);
  assert.ok(src.byteLength > 0);
  src.bytes(0, 8);
  src.release();
  src.release();
  assert.throws(() => src.bytes(0, 8), (e) => e.code === 'disposed');
  assert.throws(() => src.window(0, 8), (e) => e.code === 'disposed');
});

test('the runtime reports its integrity, and never claims authenticity', async () => {
  const rt = await openPackFile(path);
  assert.equal(rt.integrity.selfConsistent, true);
  assert.equal(rt.integrity.matchesExpected, null);
  assert.match(rt.integrity.authenticity, /not established/);
  assert.ok(Object.isFrozen(rt.integrity));
  assert.ok(rt instanceof PrecisionRuntime);
  rt.dispose();
});
