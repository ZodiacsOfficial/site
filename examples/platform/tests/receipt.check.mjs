import test from 'node:test';
import assert from 'node:assert/strict';
import { natalChart } from '@zodiacs/engine';
import {
  createNatalEnvelope, NATAL_ENVELOPE_LIMITS, natalReplayInput,
  parseNatalEnvelope, redactNatalEnvelope, serializeNatalEnvelope,
} from '@zodiacs/engine/receipt';
import { calculate, importNatalFile } from '../src/calculate.mjs';
import candidate from '../candidate.json' with { type: 'json' };

const input = { birthInstant: '2001-12-21T09:00:00Z', birthDate: '2001-12-21', timeKnown: 'known',
  latitude: '78.2232', longitude: '15.6267', houseSystem: 'placidus' };
const secret = 'SYNTHETIC-SECRET-DO-NOT-EMIT';
const file = (json, name = 'synthetic.json') => new File([json], name, { type: 'application/json' });
const fresh = () => calculate(input).envelope;
const read = (envelope) => importNatalFile(file(serializeNatalEnvelope(envelope)));

test('fresh natal calculation adds the draft without dropping existing result or metadata', () => {
  const result = calculate(input);
  const envelope = result.envelope;
  assert.deepEqual(envelope.result, {
    bodies: result.bodies, angles: result.angles, houses: result.houses, aspects: result.aspects,
  });
  assert.equal(result.receipt.requestedHouseSystem, 'placidus');
  assert.equal(envelope.receipt.houses.requested, 'placidus');
  assert.equal(envelope.receipt.houses.actual, 'whole');
  assert.deepEqual(envelope.receipt.resultFlags, ['polar-fallback']);
  assert.equal(envelope.receipt.sourceInstant, input.birthInstant);
  assert.equal(envelope.receipt.reference, 'supplied-instant');
  assert.equal(envelope.receipt.localResolution, null);
  assert.deepEqual(envelope.receipt.provenance, {
    artifact: { distributionCommit: candidate.artifactCommit, distributionRepository: candidate.artifactRepository,
      packageVersion: candidate.version, sha256: candidate.sha256 },
    ephemeris: { name: candidate.ephemeris.name, version: candidate.ephemeris.version },
    source: { commit: candidate.sourceCommit, repository: candidate.sourceRepository },
    status: 'claimed',
  });
  assert.equal(Object.hasOwn(envelope.receipt.provenance, 'runtime'), false);
  assert.deepEqual(envelope.receipt.provenance.ephemeris, { name: 'astronomy-engine', version: '2.1.19' });
});

test('the existing unknown-date calculation explicitly declares UTC noon without inventing source spelling', () => {
  const envelope = calculate({ ...input, timeKnown: 'unknown' }).envelope;
  assert.equal(envelope.receipt.instant, '2001-12-21T12:00:00.000Z');
  assert.equal(envelope.receipt.reference, 'utc-noon');
  assert.equal(envelope.receipt.sourceInstant, null);
  assert.equal(envelope.receipt.timeKnown, false);
  assert.equal(envelope.receipt.houses.actual, null);
  assert.equal(envelope.receipt.houses.absenceReason, 'unknown-time');
  assert.deepEqual(envelope.receipt.resultFlags, ['no-time']);
  assert.equal(envelope.result.angles, null);
  assert.equal(envelope.result.houses, null);
});

test('offset-equivalent fresh results retain the exact captured source spelling', () => {
  const utc = fresh();
  const offset = calculate({ ...input, birthInstant: '2001-12-21T14:30:00+05:30' }).envelope;
  assert.deepEqual(offset.result, utc.result);
  assert.equal(offset.receipt.instant, utc.receipt.instant);
  assert.equal(offset.receipt.sourceInstant, '2001-12-21T14:30:00+05:30');
});

test('transits retain their existing snapshot contract without a misleading natal-only envelope', () => {
  const result = calculate({ ...input, transitInstant: '2026-09-07T12:00:00Z' }, 'transits');
  assert.equal(Object.hasOwn(result, 'envelope'), false);
  assert.equal(result.receipt.transitUtc, '2026-09-07T12:00:00.000Z');
  assert.equal(result.positions.length, 12);
});

test('local file round trip preserves requested houses, full precision, and unknown optional JSON', async () => {
  const envelope = fresh();
  envelope.extensions = { note: secret, nested: { text: '<img src=x onerror=alert(1)>', number: 0.12345678912345678 } };
  const imported = await read(envelope);
  assert.equal(imported.ok, true);
  assert.deepEqual(imported.envelope, envelope);
  assert.equal(natalReplayInput(imported.envelope).houseSystem, 'placidus');
  assert.equal(serializeNatalEnvelope(imported.envelope), serializeNatalEnvelope(envelope));
  assert.deepEqual(parseNatalEnvelope(serializeNatalEnvelope(imported.envelope)), imported);
});

test('unknown 08:30 is imported and re-exported without passing through the noon-only birth form', async () => {
  const sourceInstant = '2001-12-21T08:30:00-00:00';
  const envelope = createNatalEnvelope(natalChart({ utc: sourceInstant, timeKnown: false,
    latitude: 78.2232, longitude: 15.6267, houseSystem: 'placidus' }), { sourceInstant });
  const imported = await read(envelope);
  assert.equal(imported.ok, true);
  assert.equal(imported.envelope.receipt.instant, '2001-12-21T08:30:00.000Z');
  assert.equal(imported.envelope.receipt.reference, 'supplied-instant');
  assert.equal(imported.envelope.receipt.sourceInstant, sourceInstant);
  assert.equal(imported.envelope.result.houses, null);
  assert.equal(serializeNatalEnvelope(imported.envelope), serializeNatalEnvelope(envelope));
});

test('valid known-time receipt without coordinates remains importable even though the birth form requires them', async () => {
  const envelope = createNatalEnvelope(natalChart({ utc: input.birthInstant, timeKnown: true, houseSystem: 'placidus' }));
  const imported = await read(envelope);
  assert.equal(imported.ok, true);
  assert.equal(imported.envelope.receipt.coordinates, null);
  assert.equal(imported.envelope.receipt.houses.absenceReason, 'missing-location');
  assert.deepEqual(imported.envelope.receipt.resultFlags, []);
});

test('imported engine and artifact claims are preserved without upgrading them to this candidate', async () => {
  const envelope = fresh();
  envelope.receipt.engine.version = '0.1.1-rc.1';
  envelope.receipt.provenance.artifact.packageVersion = '0.1.1-rc.1';
  envelope.receipt.provenance.artifact.sha256 = 'a'.repeat(64);
  const imported = await read(envelope);
  assert.equal(imported.ok, true);
  assert.deepEqual(imported.envelope, envelope);
  assert.equal(imported.envelope.receipt.engine.version, '0.1.1-rc.1');
  assert.equal(imported.envelope.receipt.provenance.artifact.sha256, 'a'.repeat(64));
});

test('redaction excludes precise input, results, extensions, and claimed provenance', async () => {
  const envelope = fresh();
  envelope.extensions = { secret };
  envelope.receipt.provenance.runtime = { name: secret };
  const imported = await read(envelope);
  assert.equal(imported.ok, true);
  assert.deepEqual(redactNatalEnvelope(imported.envelope), {
    schema: 'zodiacs.natal-diagnostic.draft-v1', status: 'redacted-not-anonymous', timeKnown: true,
    houses: { absenceReason: null, actual: 'whole', requested: 'placidus' },
    inputFlags: [], resultFlags: ['polar-fallback'],
  });
  assert.equal(JSON.stringify(redactNatalEnvelope(imported.envelope)).includes(secret), false);
});

test('rejects a file over 64 KiB before reading its contents or name', async () => {
  let reads = 0;
  const oversized = { size: NATAL_ENVELOPE_LIMITS.bytes + 1,
    get name() { throw new Error(secret); }, arrayBuffer() { reads += 1; throw new Error(secret); } };
  assert.deepEqual(await importNatalFile(oversized), { ok: false, code: 'size_limit' });
  assert.equal(reads, 0);
});

test('accepts the exact UTF-8 byte limit and checks actual bytes after the read', async () => {
  const json = serializeNatalEnvelope(fresh());
  const padding = ' '.repeat(NATAL_ENVELOPE_LIMITS.bytes - new TextEncoder().encode(json).length);
  const exact = file(json + padding);
  assert.equal(exact.size, NATAL_ENVELOPE_LIMITS.bytes);
  assert.equal((await importNatalFile(exact)).ok, true);
  assert.deepEqual(await importNatalFile({ size: 1, arrayBuffer: async () => new ArrayBuffer(NATAL_ENVELOPE_LIMITS.bytes + 1) }), { ok: false, code: 'size_limit' });
});

test('UTF-8, absent-file, read failures, and filenames never leak supplied text', async () => {
  for (const supplied of [null, file(''), file(new Uint8Array([0xff]), secret),
    { size: 1, arrayBuffer: async () => { throw new Error(secret); } }]) {
    assert.deepEqual(await importNatalFile(supplied), { ok: false, code: 'invalid_file' });
  }
  assert.deepEqual(await importNatalFile(file(`${secret}{`, secret)), { ok: false, code: 'invalid_json' });
});

test('duplicate decoded keys, unknown versions, and required features fail closed', async () => {
  const envelope = fresh();
  const duplicate = `{"schema":"${secret}","sch\\u0065ma":"${envelope.schema}"}`;
  assert.deepEqual(await importNatalFile(file(duplicate)), { ok: false, code: 'invalid_json' });
  const version = { ...envelope, schema: secret };
  assert.deepEqual(await importNatalFile(file(JSON.stringify(version))), { ok: false, code: 'unsupported_version' });
  const required = { ...envelope, requiredFeatures: [secret] };
  assert.deepEqual(await importNatalFile(file(JSON.stringify(required))), { ok: false, code: 'unsupported_feature' });
});

test('hostile keys, excessive depth, and forged derived flags are rejected with fixed codes', async () => {
  const envelope = fresh();
  const json = serializeNatalEnvelope(envelope);
  assert.deepEqual(await importNatalFile(file(json.replace('"requiredFeatures":[]', '"__proto__":{},"requiredFeatures":[]'))), { ok: false, code: 'invalid_shape' });
  assert.deepEqual(await importNatalFile(file('['.repeat(20) + '0' + ']'.repeat(20))), { ok: false, code: 'complexity_limit' });
  envelope.receipt.inputFlags = ['polar-fallback'];
  assert.deepEqual(await importNatalFile(file(JSON.stringify(envelope))), { ok: false, code: 'invalid_value' });
});

test('file parsing and redaction work with fetch, Intl, and storage unavailable', async () => {
  const bytes = file(serializeNatalEnvelope(fresh()));
  const names = ['fetch', 'Intl', 'localStorage', 'sessionStorage', 'indexedDB', 'caches'];
  const saved = new Map(names.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  let attempts = 0;
  try {
    for (const name of names) Object.defineProperty(globalThis, name, { configurable: true,
      get() { attempts += 1; throw new Error('Unexpected unavailable capability'); } });
    const imported = await importNatalFile(bytes);
    assert.equal(imported.ok, true);
    assert.equal(redactNatalEnvelope(imported.envelope).status, 'redacted-not-anonymous');
    assert.equal(serializeNatalEnvelope(imported.envelope).length > 0, true);
    assert.equal(attempts, 0);
  } finally {
    for (const [name, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  }
});
