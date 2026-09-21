/**
 * How the runtime gets at the pack's bytes, as a three-method contract, so
 * that "the whole file is in memory" and "the file stays on disk" are the
 * only difference between a browser load and a low-memory Node load. The
 * parser, the validator, the integrity policy and the numerical core all read
 * through this and are identical in both.
 *
 *   byteLength                 total size of the artifact
 *   window(offset, length)     a DataView for an immediate read. It MAY be
 *                              backed by a reused scratch buffer, so it is
 *                              valid only until the next call.
 *   bytes(offset, length)      a Uint8Array. May be a copy.
 *   digest(offset, length)     async SHA-256 hex over that range. The
 *                              environment supplies the transport; the policy
 *                              that decides what a digest MEANS stays in
 *                              container.mjs.
 *   release()                  optional; drop any held resource.
 *
 * Every implementation must bounds-check: a source that quietly returns short
 * or out-of-range data would turn the parser's checks into decoration.
 */
import { fail } from './errors.mjs';

function checkRange(byteLength, offset, length) {
  if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(length) || length < 0) {
    fail('bad-geometry', 'a read was requested at a non-integer or negative position');
  }
  const end = offset + length;
  if (!Number.isSafeInteger(end) || end > byteLength) {
    fail('truncated', `a read of ${length} bytes at ${offset} runs past the end of the artifact (${byteLength} bytes)`);
  }
  return end;
}

/**
 * The whole artifact is already in memory.
 *
 * The bytes are COPIED. Validation and the digest would otherwise describe a
 * buffer the caller still holds a reference to and can rewrite afterwards,
 * which would make every check a statement about the past. Windows over the
 * private copy are then zero-copy.
 */
export function memorySource(input) {
  if (!(input instanceof Uint8Array)) fail('bad-header', 'pack bytes must be a Uint8Array');
  const u8 = new Uint8Array(input.byteLength);
  u8.set(input);
  return {
    kind: 'memory',
    byteLength: u8.byteLength,
    window(offset, length) {
      checkRange(u8.byteLength, offset, length);
      return new DataView(u8.buffer, u8.byteOffset + offset, length);
    },
    bytes(offset, length) {
      checkRange(u8.byteLength, offset, length);
      return u8.subarray(offset, offset + length);
    },
    async digest(offset, length) {
      checkRange(u8.byteLength, offset, length);
      return sha256HexOf(u8.subarray(offset, offset + length));
    },
    seal() {},
    release() {},
    copied: true,
  };
}

const hex = (buffer) => Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, '0')).join('');

/** SHA-256 via WebCrypto, which Node 22 and every current browser provide. */
export async function sha256HexOf(view) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) fail('unverified', 'no WebCrypto available to verify this pack');
  // Copy into a plain ArrayBuffer: some hosts refuse a SharedArrayBuffer view.
  const copy = new Uint8Array(view.byteLength);
  copy.set(view);
  return hex(await subtle.digest('SHA-256', copy.buffer));
}

export { checkRange };
