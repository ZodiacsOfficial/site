/**
 * The pack is untrusted input.
 *
 * Every fixture here is a few kilobytes. A header that CLAIMS twenty million
 * records is refused on the claim; the file is never grown and no allocation
 * of that size is ever attempted, because proving a resource-exhaustion risk
 * by actually exhausting the resource is not a test, it is the bug.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildPack, withHeader, readHeader, seal, MAGIC_V2 } from './_pack.mjs';
import { parseContainer, parseContainerBytes, verifyIntegrity, LIMITS, MAGIC_V1 } from '../../src/core/container.mjs';
import { memorySource } from '../../src/core/source.mjs';
import { openPackFromBytes } from '../../src/index.mjs';
import { openPackFile, openPackFileStream } from '../../src/node.mjs';

const NCOEF = 4;
const NREC = 4;
const INTERVAL = 86400;
const INIT = 0;
const coeffs = (r) => Array.from({ length: 3 * NCOEF }, (_, i) => (i + 1) * (r + 1) * 1.5);

const good = () => buildPack({
  bodies: [
    { name: 'sun', frame: 'native', ncoef: NCOEF, nrec: NREC, initEt: INIT, intervalSec: INTERVAL, coeffs },
    { name: 'emb', frame: 'ssb', ncoef: NCOEF, nrec: NREC, initEt: INIT, intervalSec: INTERVAL, coeffs },
    { name: 'moon', frame: 'ssb', ncoef: NCOEF, nrec: NREC, initEt: INIT, intervalSec: INTERVAL, coeffs },
  ],
  derived: { earth399: { emrat: 81.30056822149722, from: 'moon' } },
});

const codeOf = (fn) => {
  try { fn(); } catch (error) {
    assert.equal(error.name, 'PrecisionError', `expected a typed error, got ${error.name}: ${error.message}`);
    return error.code;
  }
  return null;
};
const rejects = (bytes) => codeOf(() => parseContainerBytes(bytes));

test('the good fixture is accepted, so every refusal below is about the edit', () => {
  const parsed = parseContainerBytes(good());
  assert.equal(parsed.magic, MAGIC_V2);
  assert.equal(parsed.bodies.size, 3);
  assert.equal(parsed.trailingBytes, 0);
});

// ---------------------------------------------------------------- B1

test('B1 magic: a file that is not a pack is refused before anything is read', () => {
  const b = good();
  b.set(new TextEncoder().encode('NOTAPACK'), 0);
  assert.equal(rejects(seal(b)), 'not-a-pack');
});

test('B1 version: a v1 pack is refused by name, because its digest misses the header', () => {
  const b = good();
  b.set(new TextEncoder().encode(MAGIC_V1), 0);
  assert.equal(rejects(seal(b)), 'unsupported-version');
});

test('B1 header cap: a declared header larger than the cap is refused, not allocated', () => {
  const b = good();
  new DataView(b.buffer).setUint32(8, LIMITS.maxHeaderBytes + 1, true);
  assert.equal(rejects(seal(b)), 'bad-header');
  assert.ok(b.byteLength < 8192, 'the fixture stayed small: nothing was grown to prove this');
});

test('B1 header cap: a zero-length header is refused', () => {
  const b = good();
  new DataView(b.buffer).setUint32(8, 0, true);
  assert.equal(rejects(seal(b)), 'bad-header');
});

test('B1 header longer than the file is refused', () => {
  const b = good();
  new DataView(b.buffer).setUint32(8, b.byteLength, true);
  assert.equal(rejects(seal(b)), 'truncated');
});

test('B1 size cap: an oversized artifact is refused on its length alone, unread', () => {
  // A source that reports a size past the cap and refuses to hand over a
  // single byte. If the parser reads before it checks, this throws the
  // wrong error and the test fails.
  const tripwire = {
    kind: 'tripwire',
    byteLength: LIMITS.maxFileBytes + 1,
    window() { throw new Error('the parser read bytes before checking the size cap'); },
    bytes() { throw new Error('the parser read bytes before checking the size cap'); },
  };
  assert.equal(codeOf(() => parseContainer(tripwire)), 'too-large');
});

test('B1 a file too short to be a pack is refused', () => {
  assert.equal(rejects(new Uint8Array(40)), 'truncated');
});

// ---------------------------------------------------------------- B2

for (const [what, mutate, want] of [
  ['ncoef is a float', (h) => { h.bodies[0].ncoef = 4.5; }, 'bad-header'],
  ['ncoef is negative', (h) => { h.bodies[0].ncoef = -4; }, 'bad-header'],
  ['ncoef is past the cap', (h) => { h.bodies[0].ncoef = LIMITS.maxCoefficients + 1; }, 'bad-header'],
  ['ncoef is 1', (h) => { h.bodies[0].ncoef = 1; }, 'bad-header'],
  ['nrec is zero', (h) => { h.bodies[0].nrec = 0; }, 'bad-header'],
  ['nrec claims twenty million', (h) => { h.bodies[0].nrec = LIMITS.maxRecords + 1; }, 'bad-header'],
  ['nrec is not an integer', (h) => { h.bodies[0].nrec = 3.7; }, 'bad-header'],
  ['offset is negative', (h) => { h.bodies[0].offset = -1; }, 'bad-header'],
  ['offset is NaN', (h) => { h.bodies[0].offset = null; }, 'bad-header'],
  ['initEt is not finite', (h) => { h.bodies[0].initEt = 'soon'; }, 'bad-header'],
  ['intervalSec is zero', (h) => { h.bodies[0].intervalSec = 0; }, 'bad-header'],
  ['intervalSec is negative', (h) => { h.bodies[0].intervalSec = -86400; }, 'bad-header'],
  ['intervalSec is absurd', (h) => { h.bodies[0].intervalSec = 1e18; }, 'bad-header'],
  ['stride is zero', (h) => { h.bodies[0].layout.stride = 0; }, 'bad-header'],
  ['stride is a float', (h) => { h.bodies[0].layout.stride = 96.5; }, 'bad-header'],
  ['the extent would overflow exact integers', (h) => { h.bodies[0].nrec = 9e15; h.bodies[0].layout.stride = 9e15; }, 'bad-header'],
  ['payloadEndOffset is not an integer', (h) => { h.payloadEndOffset = 1.5; }, 'bad-header'],
  ['payloadEndOffset is negative', (h) => { h.payloadEndOffset = -1; }, 'bad-header'],
]) {
  test(`B2 ${what} is refused`, () => {
    assert.equal(rejects(withHeader(good(), mutate)), want);
  });
}

test('B2 the overflow guard is what catches the huge extent, and nothing is allocated', () => {
  const before = process.memoryUsage().heapTotal;
  const b = withHeader(good(), (h) => { h.bodies[0].nrec = 4503599627370496; h.bodies[0].layout.stride = 4096; });
  assert.equal(rejects(b), 'bad-header');
  assert.ok(b.byteLength < 8192);
  assert.ok(process.memoryUsage().heapTotal - before < 64 * 1024 * 1024, 'the refusal did not allocate');
});

// ---------------------------------------------------------------- B3

test('B3 a body whose records run past the payload is refused', () => {
  assert.equal(rejects(withHeader(good(), (h) => { h.bodies[0].nrec = 4000; })), 'truncated');
});

test('B3 a body starting before the payload is refused', () => {
  assert.equal(rejects(withHeader(good(), (h) => { h.bodies[0].offset = 4; })), 'bad-geometry');
});

test('B3 overlapping bodies are refused', () => {
  assert.equal(rejects(withHeader(good(), (h) => { h.bodies[1].offset = h.bodies[0].offset + 8; })), 'bad-geometry');
});

test('B3 a field that runs past its own stride is refused', () => {
  const q = buildPack({
    bodies: [{ name: 'sun', frame: 'native', ncoef: NCOEF, nrec: NREC, initEt: INIT, intervalSec: INTERVAL, enc: 'q', q: 1e-3, coeffs }],
    derived: {},
  });
  assert.equal(rejects(withHeader(q, (h) => { h.bodies[0].layout.fieldOffset[2] = h.bodies[0].layout.stride; })), 'bad-geometry');
});

test('B3 an unsupported field width is refused', () => {
  const q = buildPack({
    bodies: [{ name: 'sun', frame: 'native', ncoef: NCOEF, nrec: NREC, initEt: INIT, intervalSec: INTERVAL, enc: 'q', q: 1e-3, coeffs }],
    derived: {},
  });
  assert.equal(rejects(withHeader(q, (h) => { h.bodies[0].layout.widths[0] = 7; })), 'bad-header');
});

test('B3 a widths array of the wrong length is refused', () => {
  const q = buildPack({
    bodies: [{ name: 'sun', frame: 'native', ncoef: NCOEF, nrec: NREC, initEt: INIT, intervalSec: INTERVAL, enc: 'q', q: 1e-3, coeffs }],
    derived: {},
  });
  assert.equal(rejects(withHeader(q, (h) => { h.bodies[0].layout.widths.pop(); })), 'bad-header');
});

test('B3 the mid-point table may not run into the records', () => {
  const q = buildPack({
    bodies: [{ name: 'sun', frame: 'native', ncoef: NCOEF, nrec: NREC, initEt: INIT, intervalSec: INTERVAL, enc: 'q', q: 1e-3, coeffs }],
    derived: {},
  });
  assert.equal(rejects(withHeader(q, (h) => { h.bodies[0].layout.recordsOffset = 8; })), 'bad-geometry');
});

test('B3 trailing data is counted and reported, not ignored', () => {
  const b = buildPack({
    bodies: [{ name: 'sun', frame: 'native', ncoef: NCOEF, nrec: NREC, initEt: INIT, intervalSec: INTERVAL, coeffs }],
    derived: {},
    trailingBytes: 64,
  });
  const parsed = parseContainerBytes(b);
  assert.equal(parsed.trailingBytes, 64);
});

test('B3 a payload that claims more bytes than precede the trailer is refused', () => {
  assert.equal(rejects(withHeader(good(), (h) => { h.payloadEndOffset += 1000; })), 'truncated');
});

// ---------------------------------------------------------------- B4

test('B4 an implausible EMRAT is refused, because it would displace the observer', () => {
  assert.equal(rejects(withHeader(good(), (h) => { h.derived.earth399.emrat = 8130; })), 'bad-header');
  assert.equal(rejects(withHeader(good(), (h) => { h.derived.earth399.emrat = 0; })), 'bad-header');
  assert.equal(rejects(withHeader(good(), (h) => { h.derived.earth399.emrat = Infinity; })), 'bad-header');
});

test('B4 a derived body depending on a body the pack lacks is refused', () => {
  assert.equal(rejects(withHeader(good(), (h) => { h.derived.earth399.from = 'phobos'; })), 'bad-header');
});

test('B4 coverage must be monotonic and finite', () => {
  assert.equal(rejects(withHeader(good(), (h) => { h.coverage.stopEtSecTdb = h.coverage.startEtSecTdb; })), 'bad-header');
  assert.equal(rejects(withHeader(good(), (h) => { h.coverage.stopEtSecTdb = h.coverage.startEtSecTdb - 1; })), 'bad-header');
  assert.equal(rejects(withHeader(good(), (h) => { h.coverage.startEtSecTdb = 'yesterday'; })), 'bad-header');
  assert.equal(rejects(withHeader(good(), (h) => { delete h.coverage; })), 'bad-header');
});

test('B4 a body that does not span the coverage it is listed under is refused', () => {
  assert.equal(rejects(withHeader(good(), (h) => { h.bodies[0].initEt += 2 * INTERVAL; })), 'bad-geometry');
  assert.equal(rejects(withHeader(good(), (h) => { h.bodies[0].nrec = 2; })), 'bad-geometry');
});

test('B4 duplicate body names are refused', () => {
  assert.equal(rejects(withHeader(good(), (h) => { h.bodies[1].name = h.bodies[0].name; })), 'bad-header');
});

test('B4 an unusable body name is refused', () => {
  assert.equal(rejects(withHeader(good(), (h) => { h.bodies[0].name = ''; })), 'bad-header');
  assert.equal(rejects(withHeader(good(), (h) => { h.bodies[0].name = 'x'.repeat(65); })), 'bad-header');
  assert.equal(rejects(withHeader(good(), (h) => { h.bodies[0].name = 42; })), 'bad-header');
});

test('B4 an unsupported frame or encoding is refused', () => {
  assert.equal(rejects(withHeader(good(), (h) => { h.bodies[0].frame = 'galactic'; })), 'bad-header');
  assert.equal(rejects(withHeader(good(), (h) => { h.bodies[0].layout.enc = 'f32'; })), 'bad-header');
});

test('B4 a non-positive quantum is refused', () => {
  const q = buildPack({
    bodies: [{ name: 'sun', frame: 'native', ncoef: NCOEF, nrec: NREC, initEt: INIT, intervalSec: INTERVAL, enc: 'q', q: 1e-3, coeffs }],
    derived: {},
  });
  assert.equal(rejects(withHeader(q, (h) => { h.bodies[0].layout.q = 0; })), 'bad-header');
  assert.equal(rejects(withHeader(q, (h) => { h.bodies[0].layout.q = -1e-3; })), 'bad-header');
});

/** Replace the header bytes wholesale, keeping the pack's shape otherwise. */
function withRawHeader(bytes, text) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const headerLen = dv.getUint32(8, true);
  const json = new TextEncoder().encode(text);
  const out = new Uint8Array(bytes.byteLength + json.byteLength - headerLen);
  const odv = new DataView(out.buffer);
  out.set(bytes.subarray(0, 16), 0);
  odv.setUint32(8, json.byteLength, true);
  odv.setUint32(12, dv.getUint32(12, true) + json.byteLength - headerLen, true);
  out.set(json, 16);
  out.set(bytes.subarray(16 + headerLen), 16 + json.byteLength);
  return seal(out);
}

test('B4 a header that is not valid JSON is refused', () => {
  // Note the shape of the wrong version of this test: putting a brace INSIDE
  // a JSON string is perfectly legal JSON, and the parser was right to
  // accept it. Breaking the structure is what has to be tested.
  assert.equal(rejects(withRawHeader(good(), '{"bodies": [')), 'bad-header');
  assert.equal(rejects(withRawHeader(good(), '{"a": 1,,}')), 'bad-header');
  assert.equal(rejects(withRawHeader(good(), '')), 'bad-header');
});

test('B4 a header that is valid JSON but not an object is refused', () => {
  assert.equal(rejects(withRawHeader(good(), '[1,2,3]')), 'bad-header');
  assert.equal(rejects(withRawHeader(good(), '"just a string"')), 'bad-header');
  assert.equal(rejects(withRawHeader(good(), 'null')), 'bad-header');
  assert.equal(rejects(withRawHeader(good(), '42')), 'bad-header');
});

test('B4 a header declaring no bodies is refused', () => {
  assert.equal(rejects(withHeader(good(), (h) => { h.bodies = []; })), 'bad-header');
  assert.equal(rejects(withHeader(good(), (h) => { delete h.bodies; })), 'bad-header');
});

// ---------------------------------------------------------------- B5

test('B5 a payload bit flip fails verification', async () => {
  const b = good();
  const parsed = parseContainerBytes(b);
  b[parsed.payloadOffset + 3] ^= 0x01;
  const r = await verifyIntegrity(memorySource(b), parseContainerBytes(b));
  assert.equal(r.selfConsistent, false);
});

test('B5 a HEADER edit fails verification, which is the whole reason for v2', async () => {
  // Same edit that verified clean under the v1 payload-only digest.
  const b = withHeader(good(), (h) => { h.bodies[0].intervalSec = INTERVAL * 2; }, { reseal: false });
  const parsed = parseContainerBytes(b);
  const r = await verifyIntegrity(memorySource(b), parsed);
  assert.equal(r.selfConsistent, false, 'a header edit must not verify');
  await assert.rejects(openPackFromBytes(b), (e) => e.code === 'corrupt');
});

test('B5 truncation past the trailer fails', () => {
  const b = good();
  assert.equal(rejects(b.subarray(0, b.byteLength - 8)), 'truncated');
});

// ---------------------------------------------------------------- B6

test('B6 validity, integrity and authenticity are three separate answers', async () => {
  const b = good();
  const parsed = parseContainerBytes(b);               // 1. structural validity
  const r = await verifyIntegrity(memorySource(b), parsed);
  assert.equal(r.selfConsistent, true);                // 2. integrity
  assert.equal(r.matchesExpected, null, 'no expected digest was given, so there is no verdict to give');
  assert.match(r.authenticity, /not established/);     // 3. authenticity
  assert.ok(!('authentic' in r), 'nothing here may be called authentic');
});

test('B6 an out-of-band digest is the only thing that speaks to provenance', async () => {
  const b = good();
  const rt = await openPackFromBytes(b);
  const digest = rt.integrity.computedDigest;
  rt.dispose();
  const ok = await openPackFromBytes(b, { expectDigest: digest });
  assert.equal(ok.integrity.matchesExpected, true);
  ok.dispose();
  await assert.rejects(openPackFromBytes(b, { expectDigest: 'a'.repeat(64) }), (e) => e.code === 'mutated');
  await assert.rejects(openPackFromBytes(b, { expectDigest: 'NOTHEX' }), (e) => e.code === 'unsupported-option');
});

test('B6 the digest stored in the artifact is never presented as provenance', async () => {
  const rt = await openPackFromBytes(good());
  assert.equal(rt.integrity.storedDigest, rt.integrity.computedDigest);
  assert.match(rt.integrity.authenticity, /cannot attest to its source/);
  rt.dispose();
});

// ---------------------------------------------------------------- B8

test('B8 the runtime keeps its own copy of what it verified', async () => {
  const b = good();
  const rt = await openPackFromBytes(b);
  const out = new Float64Array(6);
  rt.ephemeris.raw('sun', INTERVAL, out);
  const before = out[0];
  b.fill(0);
  rt.ephemeris.raw('sun', INTERVAL, new Float64Array(6));
  const after = new Float64Array(6);
  rt.ephemeris.raw('sun', INTERVAL, after);
  assert.equal(after[0], before, 'the caller rewrote its buffer and the runtime followed it');
  rt.dispose();
});

// ---------------------------------------------------------------- B9

test('B9 every refusal is a typed error with a code from the list', () => {
  for (const mutate of [
    (h) => { h.bodies[0].ncoef = -1; },
    (h) => { h.coverage.stopEtSecTdb = 0; },
    (h) => { h.bodies[1].offset = h.bodies[0].offset; },
  ]) {
    const code = rejects(withHeader(good(), mutate));
    assert.ok(typeof code === 'string' && code.length > 0);
  }
});

test('B9 a missing file names no absolute path and closes nothing it did not open', async () => {
  const before = readdirSync('/proc/self/fd').length;
  await assert.rejects(openPackFile('/definitely/not/here/secret-project/pack.zeph'), (e) => {
    assert.equal(e.name, 'PrecisionError');
    assert.equal(e.message.includes('/definitely/not/here'), false, `the error leaked a path: ${e.message}`);
    assert.equal(e.message.includes('secret-project'), false);
    return true;
  });
  await assert.rejects(openPackFileStream('/definitely/not/here/secret-project/pack.zeph'), (e) => e.name === 'PrecisionError');
  assert.ok(readdirSync('/proc/self/fd').length <= before + 1, 'a descriptor was left open by a failed open');
});

test('B9 a failed open releases the descriptor it did open', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'packtest-'));
  try {
    const bad = join(dir, 'bad.zeph');
    writeFileSync(bad, Buffer.from(withHeader(good(), (h) => { h.bodies[0].nrec = 9999; })));
    const before = readdirSync('/proc/self/fd').length;
    for (let i = 0; i < 20; i += 1) {
      await assert.rejects(openPackFileStream(bad), (e) => e.code === 'truncated');
    }
    const after = readdirSync('/proc/self/fd').length;
    assert.ok(after <= before + 1, `twenty failed opens leaked ${after - before} descriptors`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('B9 a disposed runtime throws instead of reading released state', async () => {
  const rt = await openPackFromBytes(good());
  rt.dispose();
  rt.dispose();     // idempotent
  assert.throws(() => rt.apparent('Sun', 0), (e) => e.code === 'disposed');
  assert.throws(() => rt.search({ kind: 'longitude', body: 'Sun', targetDeg: 0, fromTtDays: 0, toTtDays: 1, epsilonDeg: 1 }), (e) => e.code === 'disposed');
});
