/**
 * Node entry point. The ONLY thing here that is not in the shared core is how
 * the bytes are obtained: everything numerical, every validation and the
 * integrity policy live in `./index.mjs` and `./core/`.
 *
 * Two loaders:
 *
 *   openPackFile        read the whole artifact into memory. Simple, fast,
 *                       and what a server or a script normally wants.
 *   openPackFileStream  leave the artifact on disk, hold one descriptor, and
 *                       read one record at a time. For a process that cannot
 *                       afford the pack in its heap. The digest is streamed
 *                       rather than hashed in one buffer, but the verdict is
 *                       reached by the same `applyIntegrityPolicy` the
 *                       browser uses, so the two cannot drift.
 */
import { openSync, closeSync, fstatSync, readSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { openPackFromBytes, openPackFromSource } from './index.mjs';
import { fail, wrapFsError } from './core/errors.mjs';
import { LIMITS } from './core/container.mjs';
import { checkRange } from './core/source.mjs';

export * from './index.mjs';

/** Read the artifact into memory, then open it. */
export async function openPackFile(path, options = {}) {
  let bytes;
  try {
    bytes = new Uint8Array(readFileSync(path).buffer);
  } catch (error) {
    throw wrapFsError(error, 'cannot read the pack');
  }
  return openPackFromBytes(bytes, options);
}

/**
 * A byte source backed by an open file descriptor.
 *
 * `window()` reads into a reused scratch buffer, so its DataView is valid
 * only until the next call — the core is written to consume each window
 * immediately. `bytes()` always returns a fresh copy, because the parser
 * does hold those across other reads.
 */
export function fileSource(path) {
  let fd;
  try {
    fd = openSync(path, 'r');
  } catch (error) {
    throw wrapFsError(error, 'cannot open the pack');
  }
  let byteLength;
  try {
    byteLength = fstatSync(fd).size;
  } catch (error) {
    closeSync(fd);
    throw wrapFsError(error, 'cannot size the pack');
  }
  if (byteLength > LIMITS.maxFileBytes) {
    closeSync(fd);
    fail('too-large', `pack is ${byteLength} bytes; the limit is ${LIMITS.maxFileBytes}`);
  }

  let scratch = new Uint8Array(65536);
  let closed = false;
  let sealedStat = null;

  // A file verified once and then read record by record is open to being
  // swapped underneath. The fingerprint taken at the moment of verification
  // is re-checked on every read, so a replaced or rewritten artifact is
  // refused rather than silently mixed with verified bytes. It is a cheap
  // integrity guard against accident and casual tampering, not a
  // cryptographic one against a determined local attacker -- for that, use
  // `openPackFile`, which verifies a private copy.
  const fingerprint = () => {
    const st = fstatSync(fd);
    return `${st.size}:${st.mtimeMs}:${st.ino}:${st.dev}`;
  };
  const guard = () => {
    if (sealedStat === null) return;
    let now;
    try { now = fingerprint(); } catch (error) { throw wrapFsError(error, 'cannot re-check the pack'); }
    if (now !== sealedStat) fail('mutated', 'the pack file changed on disk after it was verified');
  };

  const readInto = (target, offset, length) => {
    if (closed) fail('disposed', 'this pack source has been released');
    guard();
    let got = 0;
    while (got < length) {
      let n;
      try {
        n = readSync(fd, target, got, length - got, offset + got);
      } catch (error) {
        throw wrapFsError(error, 'cannot read the pack');
      }
      if (n <= 0) fail('truncated', `the pack ended after ${offset + got} bytes; ${length} were needed at ${offset}`);
      got += n;
    }
  };

  return {
    kind: 'file',
    get byteLength() { return byteLength; },
    window(offset, length) {
      checkRange(byteLength, offset, length);
      if (length > scratch.byteLength) scratch = new Uint8Array(Math.min(length, LIMITS.maxHeaderBytes));
      if (length > scratch.byteLength) fail('too-large', `a ${length}-byte window exceeds the read buffer limit`);
      readInto(scratch, offset, length);
      return new DataView(scratch.buffer, 0, length);
    },
    bytes(offset, length) {
      checkRange(byteLength, offset, length);
      const out = new Uint8Array(length);
      readInto(out, offset, length);
      return out;
    },
    async digest(offset, length) {
      checkRange(byteLength, offset, length);
      const hash = createHash('sha256');
      const chunk = new Uint8Array(1 << 20);
      let done = 0;
      while (done < length) {
        const want = Math.min(chunk.byteLength, length - done);
        readInto(chunk, offset + done, want);
        hash.update(chunk.subarray(0, want));
        done += want;
      }
      return hash.digest('hex');
    },
    seal() {
      sealedStat = fingerprint();
    },
    release() {
      if (closed) return;
      closed = true;
      try { closeSync(fd); } catch { /* the descriptor is going away either way */ }
      scratch = new Uint8Array(0);
    },
  };
}

/**
 * Open the artifact without reading it into memory. The descriptor is
 * released by `runtime.dispose()`, and also if opening fails at any point.
 */
export async function openPackFileStream(path, options = {}) {
  return openPackFromSource(fileSource(path), options);
}
