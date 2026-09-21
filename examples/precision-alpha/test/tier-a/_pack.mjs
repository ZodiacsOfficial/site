/**
 * Synthetic packs, built from polynomials whose coefficients are chosen here.
 *
 * Tier A depends on no kernel, no committed pack and no network: every fact
 * it checks about the evaluator is a fact about a polynomial this file wrote
 * down, so a wrong answer is a wrong answer and not a data problem. The
 * hostile fixtures are all small — a few kilobytes — because reproducing a
 * resource-exhaustion risk means showing that the code would ALLOCATE from a
 * bad number, not actually making it do so.
 */
import { createHash } from 'node:crypto';

export const MAGIC_V2 = 'ZODEPH02';
const PROLOGUE = 16;

const enc = new TextEncoder();

/**
 * @param {object} spec
 * @param {Array} spec.bodies  each {name, frame, ncoef, nrec, initEt,
 *   intervalSec, enc: 'f64'|'q', coeffs(record) -> number[3*ncoef], q?}
 * @param {object} [spec.coverage]
 * @param {object} [spec.derived]
 * @param {object} [spec.headerExtra]
 * @param {number} [spec.trailingBytes]
 * @param {string} [spec.magic]
 */
export function buildPack(spec) {
  const bodies = spec.bodies.map((b) => ({ enc: 'f64', ...b }));
  const blobs = bodies.map((b) => encodeBody(b));

  // The header must be written before the offsets are known, and the offsets
  // depend on the header's length. Two passes: size it with placeholders,
  // then rewrite with the real numbers at the same length.
  let headerLen = 0;
  let header;
  for (let pass = 0; pass < 8; pass += 1) {
    const payloadOffset = PROLOGUE + headerLen;
    let cursor = payloadOffset;
    const placed = bodies.map((b, i) => {
      const at = cursor;
      cursor += blobs[i].bytes.byteLength;
      return { ...describe(b, blobs[i]), offset: at };
    });
    header = {
      format: 'zodiacs-ephemeris-pack',
      formatVersion: 1,
      synthetic: true,
      coverage: spec.coverage ?? defaultCoverage(bodies),
      conventions: { chebyshev: 'p(tau) = sum_k c_k T_k(tau), tau = (t - mid)/radius, c_0 NOT halved' },
      ...(spec.derived === null ? {} : { derived: spec.derived ?? {} }),
      bodies: placed,
      payloadEndOffset: cursor,
      ...(spec.headerExtra ?? {}),
    };
    const json = enc.encode(JSON.stringify(header));
    if (json.byteLength === headerLen) break;
    headerLen = json.byteLength;
  }
  return assemble(header, blobs, spec);
}

function assemble(header, blobs, spec) {
  const json = enc.encode(JSON.stringify(header));
  const payloadOffset = PROLOGUE + json.byteLength;
  const payloadBytes = blobs.reduce((n, b) => n + b.bytes.byteLength, 0);
  const trailing = spec.trailingBytes ?? 0;
  const total = payloadOffset + payloadBytes + trailing + 32;
  const out = new Uint8Array(total);
  const dv = new DataView(out.buffer);
  out.set(enc.encode(spec.magic ?? MAGIC_V2), 0);
  dv.setUint32(8, json.byteLength, true);
  dv.setUint32(12, payloadOffset, true);
  out.set(json, PROLOGUE);
  let at = payloadOffset;
  for (const b of blobs) { out.set(b.bytes, at); at += b.bytes.byteLength; }
  return seal(out);
}

/** Recompute the trailer over everything before it. */
export function seal(bytes) {
  const region = bytes.subarray(0, bytes.byteLength - 32);
  const digest = createHash('sha256').update(region).digest();
  bytes.set(digest, bytes.byteLength - 32);
  return bytes;
}

/**
 * Edit the header of an existing pack and re-seal, or leave the seal stale.
 *
 * A JSON edit usually changes the header's LENGTH, which moves the payload.
 * The byte offsets recorded inside the header have to move with it or every
 * fixture would fail for that reason instead of the one it is testing. The
 * shift is applied to a fresh copy BEFORE the caller's mutation runs, so a
 * mutation that sets an absolute offset still wins.
 */
export function withHeader(bytes, mutate, { reseal = true } = {}) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const headerLen = dv.getUint32(8, true);
  const payloadOffset = dv.getUint32(12, true);
  const source = new TextDecoder().decode(bytes.subarray(PROLOGUE, PROLOGUE + headerLen));

  const shift = (h, by) => {
    if (Array.isArray(h.bodies)) for (const b of h.bodies) if (typeof b.offset === 'number') b.offset += by;
    if (typeof h.payloadEndOffset === 'number') h.payloadEndOffset += by;
  };

  let delta = 0;
  let json;
  let header;
  for (let pass = 0; pass < 8; pass += 1) {
    header = JSON.parse(source);
    shift(header, delta);
    mutate(header);
    json = enc.encode(JSON.stringify(header));
    const next = json.byteLength - headerLen;
    if (next === delta) break;
    delta = next;
  }

  const out = new Uint8Array(bytes.byteLength + (json.byteLength - headerLen));
  const odv = new DataView(out.buffer);
  out.set(bytes.subarray(0, PROLOGUE), 0);
  odv.setUint32(8, json.byteLength, true);
  odv.setUint32(12, payloadOffset + (json.byteLength - headerLen), true);
  out.set(json, PROLOGUE);
  out.set(bytes.subarray(PROLOGUE + headerLen), PROLOGUE + json.byteLength);
  return reseal ? seal(out) : out;
}

export function readHeader(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return JSON.parse(new TextDecoder().decode(bytes.subarray(PROLOGUE, PROLOGUE + dv.getUint32(8, true))));
}

function defaultCoverage(bodies) {
  return {
    startEtSecTdb: Math.max(...bodies.map((b) => b.initEt)),
    stopEtSecTdb: Math.min(...bodies.map((b) => b.initEt + b.nrec * b.intervalSec)),
  };
}

function describe(b, blob) {
  return {
    name: b.name,
    frame: b.frame ?? 'ssb',
    initEt: b.initEt,
    intervalSec: b.intervalSec,
    nrec: b.nrec,
    ncoef: b.ncoef,
    layout: blob.layout,
  };
}

function encodeBody(b) {
  const fields = 3 * b.ncoef;
  const records = [];
  for (let r = 0; r < b.nrec; r += 1) {
    const c = b.coeffs(r);
    if (c.length !== fields) throw new Error(`${b.name}: coeffs must return ${fields} numbers`);
    records.push(c);
  }
  if (b.enc === 'f64') {
    const stride = fields * 8;
    const bytes = new Uint8Array(stride * b.nrec);
    const dv = new DataView(bytes.buffer);
    records.forEach((c, r) => c.forEach((v, f) => dv.setFloat64(r * stride + f * 8, v, true)));
    return { bytes, layout: { enc: 'f64', stride, midsOffset: 0, recordsOffset: 0 } };
  }
  // Quantised: per-field midpoint, per-field byte width, value = mid + i*q.
  const q = b.q ?? 1e-6;
  const mids = [];
  const widths = [];
  for (let f = 0; f < fields; f += 1) {
    const col = records.map((c) => c[f]);
    const lo = Math.min(...col); const hi = Math.max(...col);
    const mid = (lo + hi) / 2;
    mids.push(mid);
    const span = Math.max(Math.abs(hi - mid), Math.abs(lo - mid)) / q;
    widths.push(span === 0 ? 0 : span < 127 ? 1 : span < 32767 ? 2 : span < 8388607 ? 3 : span < 2147483647 ? 4 : 8);
  }
  const fieldOffset = [];
  let stride = 0;
  for (let f = 0; f < fields; f += 1) { fieldOffset.push(stride); stride += widths[f] === 0 ? 0 : widths[f]; }
  if (stride === 0) stride = 1;
  const midsOffset = 0;
  const recordsOffset = fields * 8;
  const bytes = new Uint8Array(recordsOffset + stride * b.nrec);
  const dv = new DataView(bytes.buffer);
  mids.forEach((m, f) => dv.setFloat64(midsOffset + f * 8, m, true));
  records.forEach((c, r) => {
    const base = recordsOffset + r * stride;
    for (let f = 0; f < fields; f += 1) {
      const w = widths[f];
      if (w === 0) continue;
      if (w === 8) { dv.setFloat64(base + fieldOffset[f], c[f], true); continue; }
      writeInt(dv, base + fieldOffset[f], w, Math.round((c[f] - mids[f]) / q));
    }
  });
  return { bytes, layout: { enc: 'q', q, stride, midsOffset, recordsOffset, widths, fieldOffset } };
}

function writeInt(dv, at, w, v) {
  switch (w) {
    case 1: dv.setInt8(at, v); return;
    case 2: dv.setInt16(at, v, true); return;
    case 3: dv.setUint16(at, v & 0xffff, true); dv.setInt8(at + 2, Math.floor(v / 65536)); return;
    case 4: dv.setInt32(at, v, true); return;
    case 5: dv.setUint32(at, v >>> 0, true); dv.setInt8(at + 4, Math.floor(v / 4294967296)); return;
    default: throw new Error(`unsupported width ${w}`);
  }
}

/** Chebyshev sum, written the plain recurrence way as an independent check. */
export function chebAt(coeffs, tau) {
  const n = coeffs.length;
  let tkm1 = 1;
  let tk = tau;
  let sum = coeffs[0];
  for (let k = 1; k < n; k += 1) {
    sum += coeffs[k] * tk;
    const next = 2 * tau * tk - tkm1;
    tkm1 = tk;
    tk = next;
  }
  return sum;
}

/** d/dtau of the same sum, via U_{k-1}: T_k' = k * U_{k-1}. */
export function chebDerivAt(coeffs, tau) {
  const n = coeffs.length;
  let ukm1 = 1;      // U_0
  let uk = 2 * tau;  // U_1
  let sum = 0;
  for (let k = 1; k < n; k += 1) {
    sum += coeffs[k] * k * ukm1;
    const next = 2 * tau * uk - ukm1;
    ukm1 = uk;
    uk = next;
  }
  return sum;
}
