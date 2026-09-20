#!/usr/bin/env node
/**
 * Convert a ZODEPH01 pack into a sealed ZODEPH02 one.
 *
 *   node tools/seal.mjs <in.zeph> <out.zeph>
 *
 * Two changes and no others: the eight magic bytes, and a 32-byte SHA-256
 * trailer over everything that precedes it. No coefficient is touched, so the
 * compiler's byte-determinism carries through — the sealed file's payload is
 * identical to its input's, which `--check` asserts.
 *
 * Why not just re-hash in place: v1 stored the payload digest *inside the
 * header*, which left interval lengths, coverage, EMRAT, body identities and
 * every scale factor covered by nothing. The trailer sits outside the region
 * it covers, so there is no circularity and the header is protected.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { sha256Hex, MAGIC_V1, MAGIC_V2, TRAILER_BYTES } from '../src/core/container.mjs';

const [, , input, output] = process.argv;
if (!input || !output) {
  console.error('usage: node tools/seal.mjs <in.zeph> <out.zeph>');
  process.exit(2);
}

const src = new Uint8Array(await readFile(input));
const magic = String.fromCharCode(...src.subarray(0, 8));
if (magic === MAGIC_V2) { console.error('already sealed'); process.exit(2); }
if (magic !== MAGIC_V1) { console.error(`not a pack: ${JSON.stringify(magic)}`); process.exit(2); }

const body = new Uint8Array(src.length);
body.set(src);
for (let i = 0; i < 8; i += 1) body[i] = MAGIC_V2.charCodeAt(i);

const digest = await sha256Hex(body);
const trailer = new Uint8Array(TRAILER_BYTES);
for (let i = 0; i < TRAILER_BYTES; i += 1) trailer[i] = parseInt(digest.slice(i * 2, i * 2 + 2), 16);

const sealed = new Uint8Array(body.length + TRAILER_BYTES);
sealed.set(body); sealed.set(trailer, body.length);
await writeFile(output, sealed);

// The payload must be untouched. Asserted, not assumed.
const payloadOffset = new DataView(src.buffer, src.byteOffset, src.length).getUint32(12, true);
const before = await sha256Hex(src.subarray(payloadOffset));
const after = await sha256Hex(sealed.subarray(payloadOffset, sealed.length - TRAILER_BYTES));
if (before !== after) { console.error('REFUSING: sealing changed the payload'); process.exit(1); }

console.log(`sealed ${src.length} -> ${sealed.length} bytes`);
console.log(`whole-artifact sha256 ${digest}`);
console.log(`payload unchanged, sha256 ${before}`);
