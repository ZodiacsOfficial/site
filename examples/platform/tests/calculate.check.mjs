import test from 'node:test';
import assert from 'node:assert/strict';
import { ENGINE_VERSION, natalChart, positions, transits } from '@zodiacs/engine';
import { calculate } from '../src/calculate.mjs';
import candidate from '../candidate.json' with { type: 'json' };

const input = { birthInstant: '2001-12-21T09:00:00Z', birthDate: '2001-12-21', timeKnown: 'known',
  latitude: '78.2232', longitude: '15.6267', houseSystem: 'placidus', transitInstant: '2026-09-07T12:00:00Z' };

test('real candidate returns coherent polar fallback and provenance', () => {
  const result = calculate(input);
  assert.equal(ENGINE_VERSION, '0.1.1-rc.1');
  assert.equal(result.bodies.length, 12);
  assert.ok(Math.abs(result.angles.asc - 23.871984112302016) < 1e-10);
  assert.equal(result.receipt.requestedHouseSystem, 'placidus');
  assert.equal(result.receipt.actualHouseSystem, 'whole');
  assert.equal(result.houses.system, 'whole');
  assert.deepEqual(result.receipt.flags, ['polar-fallback']);
  assert.equal(result.receipt.engine.artifactSHA256, candidate.sha256);
  assert.equal(result.receipt.engine.version, ENGINE_VERSION);
  assert.equal(result.receipt.engine.artifactCommit, '40d3f9647a31afc20db007b7cd5269eb4ef73b6a');
  assert.notEqual(result.receipt.engine.sourceCommit, result.receipt.engine.artifactCommit);
  for (const body of result.bodies) assert.ok(Number.isFinite(body.lon) && body.lon >= 0 && body.lon < 360);
});

test('offset equivalent instants calculate identically and keep entered provenance', () => {
  const utc = calculate(input);
  const offset = calculate({ ...input, birthInstant: '2001-12-21T14:30:00+05:30' });
  assert.deepEqual(offset.bodies, utc.bodies);
  assert.deepEqual(offset.angles, utc.angles);
  assert.equal(offset.receipt.birthUtc, '2001-12-21T09:00:00.000Z');
  assert.equal(offset.receipt.submittedBirthInstant, '2001-12-21T14:30:00+05:30');
});

test('unknown time uses stated UTC noon and suppresses angles and houses', () => {
  const result = calculate({ ...input, timeKnown: 'unknown', birthInstant: 'unused invalid instant' });
  assert.equal(result.receipt.birthUtc, '2001-12-21T12:00:00.000Z');
  assert.equal(result.receipt.birthTimeKnown, false);
  assert.equal(result.receipt.submittedBirthInstant, null);
  assert.deepEqual(result.receipt.flags, ['no-time']);
  assert.equal(result.angles, null);
  assert.equal(result.houses, null);
  assert.equal(result.receipt.actualHouseSystem, null);
  assert.match(result.receipt.unknownTimeConvention, /approximate/);
});

test('transit snapshot uses the actual public API result and explicit instant', () => {
  const result = calculate(input, 'transits');
  const expected = transits(natalChart({ utc: input.birthInstant, latitude: 78.2232, longitude: 15.6267, houseSystem: 'placidus' }), input.transitInstant);
  assert.equal(result.receipt.transitUtc, expected.at.toISOString());
  assert.deepEqual(result.positions, expected.positions);
  assert.deepEqual(result.aspects, expected.aspects);
  assert.ok(result.aspects.length > 0);
  assert.ok(result.aspects.every(({ a, b }) => !['ASC', 'MC'].includes(a) && !['ASC', 'MC'].includes(b)));
});

test('public API rejects impossible calendar dates before rollover and preserves leap days', () => {
  for (const utc of ['2001-02-29T12:00:00Z', '2000-02-30T12:00:00Z', '2001-12-21T24:00:00Z']) {
    assert.throws(() => natalChart({ utc }), RangeError);
    assert.throws(() => positions(utc), RangeError);
    assert.throws(() => calculate({ ...input, birthInstant: utc }), RangeError);
  }
  assert.equal(calculate({ ...input, birthInstant: '2000-02-29T12:00:00Z' }).receipt.birthUtc, '2000-02-29T12:00:00.000Z');
  assert.throws(() => calculate({ ...input, timeKnown: 'unknown', birthDate: '2001-02-29' }), RangeError);
});

for (const value of ['', ' ', '2001-12-21', '2001-12-21T09:00:00', '2001-12-21T09:00:00Z\n', '2001-12-21T09:00:00+25:00']) {
  test(`rejects unresolved or malformed instants: ${JSON.stringify(value)}`, () => {
    assert.throws(() => calculate({ ...input, birthInstant: value }), RangeError);
    assert.throws(() => calculate({ ...input, transitInstant: value }, 'transits'), RangeError);
  });
}

for (const value of ['', ' ', 'NaN', 'Infinity', '0x10', '1e999', '12\n', undefined]) {
  test(`rejects empty/nonfinite or nondecimal coordinates: ${JSON.stringify(value)}`, () => {
    assert.throws(() => calculate({ ...input, latitude: value }), RangeError);
    assert.throws(() => calculate({ ...input, longitude: value }), RangeError);
  });
}

test('rejects out-of-range and unsupported exact-pole inputs and invalid options', () => {
  for (const latitude of ['91', '-91', '90', '-90']) assert.throws(() => calculate({ ...input, latitude }), RangeError);
  for (const longitude of ['181', '-181']) assert.throws(() => calculate({ ...input, longitude }), RangeError);
  assert.throws(() => calculate({ ...input, timeKnown: '' }), RangeError);
  assert.throws(() => calculate({ ...input, houseSystem: 'equal' }), RangeError);
  assert.throws(() => natalChart({ utc: input.birthInstant, latitude: 1 }), RangeError);
});

test('recalculation works with network and persistent storage APIs unavailable', () => {
  const originalFetch = globalThis.fetch;
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  globalThis.fetch = () => { throw new Error('Unexpected network'); };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('Unexpected storage'); } });
  try {
    const first = calculate(input, 'transits');
    const changed = calculate({ ...input, transitInstant: '2026-09-08T12:00:00Z' }, 'transits');
    assert.notDeepEqual(first.positions, changed.positions);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
    else delete globalThis.localStorage;
  }
});
