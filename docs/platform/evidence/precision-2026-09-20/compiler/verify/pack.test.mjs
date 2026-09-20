/**
 * Tests for the compiler and the runtime.
 *
 *   node --test pack.test.mjs
 *
 * These are contract tests, not the measurement. The measurement lives in
 * measure.mjs and its raw JSON; what is asserted here is that the pack means
 * what its header says it means, that angles behave across 0/360, that
 * velocity is the derivative of the position that came with it, and that the
 * two read modes agree exactly.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Pack, PackBackend, openPack, API_BODIES, loadAstronomyEngine } from './runtime.mjs';
import { SpkRef } from './spkref.mjs';
import { RefBackend } from './refbackend.mjs';
import { BODY_SEGS } from './sources.mjs';
import { frameSource } from './compile.mjs';
import { widthForHalf, readField, writeField, MAXINT } from './format.mjs';

const KERNEL = process.env.KERNEL ?? '/tmp/claude-0/swisslab/de440s.bsp';
const PACK = process.env.PACK ?? new URL('./packs/D.zeph', import.meta.url).pathname;
const DAY = 86400;
const A = await loadAstronomyEngine();
const ref = new SpkRef(KERNEL);
const pack = new Pack(PACK);
const back = new PackBackend(pack);
const refBack = new RefBackend(ref, { A });

test('the header records everything needed to reproduce and to trust the pack', () => {
  const h = pack.header;
  for (const k of ['format', 'formatVersion', 'candidate', 'compiler', 'input', 'settings',
    'coverage', 'conventions', 'derived', 'dependencies', 'bodies', 'payloadSha256']) {
    assert.ok(h[k] !== undefined, `header is missing ${k}`);
  }
  assert.match(h.compiler.version, /^\d+\.\d+\.\d+$/);
  assert.match(h.input.sha256, /^[0-9a-f]{64}$/);
  assert.ok(Object.keys(h.compiler.sourceSha256).length >= 5);
  assert.equal(h.conventions.frame.startsWith('ICRF'), true);
  assert.equal(h.conventions.units.position, 'km');
  assert.equal(h.conventions.units.velocity, 'km/s');
  assert.ok(h.dependencies.length >= 2);
  for (const b of h.bodies) assert.ok(b.budgetKm > 0 && b.nrec > 0 && b.ncoef > 2);
});

test('the payload hash in the header matches the bytes on disk', () => {
  const buf = readFileSync(PACK);
  const payloadOffset = buf.readUInt32LE(12);
  const h = createHash('sha256').update(buf.subarray(payloadOffset, pack.header.payloadEndOffset)).digest('hex');
  assert.equal(h, pack.header.payloadSha256);
});

test('field widths round-trip at their declared extremes', () => {
  const buf = Buffer.alloc(16);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.length);
  for (const w of [1, 2, 3, 4, 5, 6]) {
    assert.equal(widthForHalf(MAXINT[w]), w);
    assert.ok(widthForHalf(MAXINT[w] + 1) > w);
    for (const v of [0, 1, -1, MAXINT[w], -MAXINT[w]]) {
      writeField(dv, 0, w, v);
      assert.equal(readField(dv, 0, w), v, `width ${w} value ${v}`);
    }
  }
});

test('every pack body stays inside its declared budget on a sample', () => {
  const p = new Float64Array(3); const q = new Float64Array(6);
  for (const body of BODY_SEGS) {
    if (!pack.bodies.has(body.name)) continue;
    const b = pack.bodies.get(body.name);
    const src = frameSource(ref, body, b.frame);
    let worst = 0;
    for (let i = 0; i < 400; i += 1) {
      const et = b.initEt + (b.nrec * b.intervalSec) * ((i + 0.5) / 400);
      src(et, p); pack.raw(body.name, et, q);
      worst = Math.max(worst, Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]));
    }
    assert.ok(worst <= b.budgetKm, `${body.name}: sampled ${worst} km exceeds budget ${b.budgetKm} km`);
    assert.ok(worst <= b.provenPosKm, `${body.name}: sampled ${worst} km exceeds its own PROVEN bound ${b.provenPosKm} km`);
  }
});

test('velocity is the derivative of the position the pack returns, not an independent guess', () => {
  const a = new Float64Array(6); const b1 = new Float64Array(6); const b2 = new Float64Array(6);
  const c1 = new Float64Array(6); const c2 = new Float64Array(6);
  const h = 120;
  for (const body of API_BODIES) {
    for (const et of [-4.7e9, -1e9, 0, 1e9, 4.7e9]) {
      back.state(body, et, a);
      back.state(body, et - 2 * h, c1); back.state(body, et - h, b1);
      back.state(body, et + h, b2); back.state(body, et + 2 * h, c2);
      for (let k = 0; k < 3; k += 1) {
        const fd = (c1[k] - 8 * b1[k] + 8 * b2[k] - c2[k]) / (12 * h);
        assert.ok(Math.abs(a[k + 3] - fd) < 1e-7, `${body} component ${k}: analytic ${a[k + 3]} vs difference ${fd}`);
      }
    }
  }
});

test('velocity agrees with the raw kernel to better than 1e-4 km/s', () => {
  const a = new Float64Array(6); const b = new Float64Array(6);
  for (const body of API_BODIES) {
    let worst = 0;
    for (let i = 0; i < 300; i += 1) {
      const et = pack.coverage.startEtSecTdb + (pack.coverage.stopEtSecTdb - pack.coverage.startEtSecTdb) * ((i + 0.5) / 300);
      back.state(body, et, a); refBack.state(body, et, b);
      worst = Math.max(worst, Math.hypot(a[3] - b[3], a[4] - b[4], a[5] - b[5]));
    }
    assert.ok(worst < 1e-4, `${body}: ${worst} km/s`);
  }
});

test('the Earth is derived from the Moon by the kernel\'s own mass ratio', () => {
  const e = new Float64Array(6); const m = new Float64Array(6); const emb = new Float64Array(6);
  const et = 12345678;
  back.state('Earth', et, e); back.state('Moon', et, m);
  const b = pack.bodies.get('emb');
  pack.raw('emb', et, emb);
  const k = 1 / pack.emrat;
  for (let i = 0; i < 3; i += 1) {
    // Earth - EMB must be exactly -1/EMRAT times Moon - EMB
    assert.ok(Math.abs((e[i] - emb[i]) + k * (m[i] - emb[i])) < 1e-6, `component ${i}`);
  }
  assert.ok(Math.abs(pack.emrat - 81.3005682214972) < 1e-9);
  assert.ok(pack.header.derived.earth399.worstResidualKm < 1e-9);
  assert.equal(pack.header.derived.mercury199.evidence.maxAbsCoefKm, 0);
  assert.equal(pack.header.derived.venus299.evidence.maxAbsCoefKm, 0);
});

test('longitudes are in [0, 360) and behave across the 0/360 seam', () => {
  // Bracket the Sun's passage through 0 degrees (the March equinox) in several
  // years and check the pack and the raw kernel agree ON BOTH SIDES of the
  // seam, with the difference taken around the circle.
  const circ = (x, y) => { let d = (x - y) % 360; if (d > 180) d -= 360; if (d <= -180) d += 360; return d; };
  let seen = 0;
  for (const year of [1860, 1925, 1999, 2024, 2100, 2149]) {
    let lo = Date.UTC(year, 2, 18); let hi = Date.UTC(year, 2, 23);
    for (let i = 0; i < 44; i += 1) {
      const mid = (lo + hi) / 2;
      const l = refBack.apparentEclipticLongitude('Sun', new Date(mid));
      if (l > 180) lo = mid; else hi = mid;
    }
    for (const off of [-4000, -400, -40, -4, -0.4, 0, 0.4, 4, 40, 400, 4000]) {
      const when = new Date((lo + hi) / 2 + off * 1000);
      const lp = back.apparentEclipticLongitude('Sun', when);
      const lr = refBack.apparentEclipticLongitude('Sun', when);
      assert.ok(lp >= 0 && lp < 360, `longitude out of range: ${lp}`);
      assert.ok(Math.abs(circ(lp, lr)) * 3600 < 0.05, `seam disagreement ${Math.abs(circ(lp, lr)) * 3600}" at ${when.toISOString()}`);
      if (lp > 359 || lp < 1) seen += 1;
    }
  }
  assert.ok(seen >= 12, `expected to straddle the seam, saw ${seen} rows near it`);
  // the same for the Moon, which crosses 0 degrees every month
  let crossings = 0;
  for (let d = 0; d < 1600; d += 1) {
    const when = new Date(Date.UTC(2000, 0, 1) + d * 21600000);   // every six hours
    const lp = back.apparentEclipticLongitude('Moon', when);
    const lr = refBack.apparentEclipticLongitude('Moon', when);
    assert.ok(lp >= 0 && lp < 360);
    assert.ok(Math.abs(circ(lp, lr)) * 3600 < 0.05);
    if (lp < 3 || lp > 357) crossings += 1;
  }
  assert.ok(crossings > 15, `expected many rows near the seam, got ${crossings}`);
});

test('an instant outside the declared coverage is refused, not quietly clamped', () => {
  assert.throws(() => back.apparentEclipticLongitude('Sun', new Date('1700-01-01T00:00:00Z')), RangeError);
  assert.throws(() => back.apparentEclipticLongitude('Sun', new Date('2400-01-01T00:00:00Z')), RangeError);
  assert.equal(pack.covers(pack.coverage.startEtSecTdb), true);
  assert.equal(pack.covers(pack.coverage.stopEtSecTdb), true);
  assert.equal(pack.covers(pack.coverage.startEtSecTdb - 1), false);
});

test('state() refuses to write into the buffer it is using internally', () => {
  assert.throws(() => back.state('Moon', 0, back.scratch), /scratch/);
});

test('the low-memory read mode returns bit-identical numbers', async () => {
  const lazy = await openPack(PACK, { resident: false });
  const eager = await openPack(PACK, { resident: true });
  const a = new Float64Array(6); const b = new Float64Array(6);
  for (const body of API_BODIES) {
    for (let i = 0; i < 120; i += 1) {
      const et = pack.coverage.startEtSecTdb + (pack.coverage.stopEtSecTdb - pack.coverage.startEtSecTdb) * ((i + 0.5) / 120);
      lazy.state(body, et, a); eager.state(body, et, b);
      for (let k = 0; k < 6; k += 1) assert.equal(a[k], b[k], `${body} ${k}`);
    }
  }
  lazy.pack.close();
});

test('a cropped pack refuses outside its own, smaller coverage', async () => {
  const p = new URL('./packs/D-1950-2050.zeph', import.meta.url).pathname;
  let cropped;
  try { cropped = await openPack(p); } catch { return; }   // only if the variant was built
  assert.ok(cropped.pack.coverage.croppedFromKernel === true);
  assert.throws(() => cropped.apparentEclipticLongitude('Sun', new Date('1900-01-01T00:00:00Z')), RangeError);
  assert.ok(Math.abs(cropped.apparentEclipticLongitude('Sun', new Date('2000-01-01T00:00:00Z'))
    - refBack.apparentEclipticLongitude('Sun', new Date('2000-01-01T00:00:00Z'))) * 3600 < 0.05);
});
