/**
 * Run the cross-runtime cases in Node, on the bytes in `pack.bin`.
 *
 *   node node-run.mjs
 *
 * Digests the file it reads before opening it, so this run is on the same
 * footing as the browser ones: the bytes are verified where they are used.
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { openPackFromBytes } from '../../../../../examples/precision-alpha/src/index.mjs';
import { experimental } from '../../../../../examples/precision-alpha/src/experimental.mjs';
import { runCases } from './cases.mjs';

const HERE = new URL('.', import.meta.url).pathname;
const bytes = new Uint8Array(readFileSync(`${HERE}pack.bin`));
const expected = JSON.parse(readFileSync(`${HERE}pack.json`, 'utf8'));
const digest = createHash('sha256').update(bytes).digest('hex');

const rt = await openPackFromBytes(bytes);
const x = experimental(rt);
const started = Date.now();
const rows = runCases(x);
const ms = Date.now() - started;
x.dispose();
rt.dispose();

process.stdout.write(`${JSON.stringify({
  runtime: `node ${process.version}`,
  digestSeen: digest,
  digestExpected: expected.sha256,
  digestMatches: digest === expected.sha256,
  bytes: bytes.byteLength,
  ms,
  rows,
}, null, 2)}\n`);
