/**
 * Build the cross-runtime pack ONCE, in Node, and write the bytes.
 *
 *   node make-pack.mjs
 *
 * ## Why the bytes are a file rather than a build step
 *
 * The aberrated work's cross-runtime evidence had each engine BUILD the
 * fixture before searching it, and that turned out not to be a same-bytes
 * comparison at all: the Chebyshev fit reaches `Math.cos` and `Math.acos`,
 * whose results are not specified to the bit, so the three engines'
 * packs had three different digests (`d11e17e1…`, `0d64d6ee…`,
 * `9cb21bac…`). The agreement that was then measured was an agreement
 * about the SEARCH, which is a real thing to measure, but it is not the
 * thing the phrase "identical bytes" claims.
 *
 * So: build once, here, and hand the same file to every runtime. The
 * digest below is recorded, and each runtime re-computes it from the bytes
 * it actually received before searching them. A runtime that reports a
 * different digest has not run this test.
 */
import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { buildSyntheticPack, SYNTHETIC } from '../../../../../examples/precision-alpha/examples/synthetic-pack.mjs';

const HERE = new URL('.', import.meta.url).pathname;
const bytes = await buildSyntheticPack();
const digest = createHash('sha256').update(bytes).digest('hex');

writeFileSync(`${HERE}pack.bin`, bytes);
writeFileSync(`${HERE}pack.json`, `${JSON.stringify({
  builtBy: 'node make-pack.mjs, once',
  node: process.version,
  bytes: bytes.byteLength,
  sha256: digest,
  fixture: SYNTHETIC,
  note: 'Synthetic. Built from polynomials in examples/synthetic-pack.mjs; nothing here is derived from any kernel and nothing is redistributed.',
}, null, 2)}\n`);

process.stdout.write(`${bytes.byteLength} bytes, sha256 ${digest}\n`);
