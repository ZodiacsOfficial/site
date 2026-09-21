/**
 * Browser entry point. The only thing here that is not in the shared core is
 * how the bytes are obtained.
 *
 * There are no Node shims: no `fs`, no `Buffer`, no `require`, no polyfill
 * import. The digest is computed by `crypto.subtle`, which is the same call
 * the Node in-memory path makes. There is no option to skip verification —
 * a pack that does not verify does not open, in the demo or anywhere else.
 *
 * `crypto.subtle` is only exposed on a secure context (https, or localhost).
 * That is a real constraint rather than a bug, and the failure says so.
 */
import { openPackFromBytes } from './index.mjs';
import { PrecisionError, fail } from './core/errors.mjs';

export * from './index.mjs';

/** True when this environment can verify a pack at all. */
export function canVerify() {
  return typeof globalThis.crypto?.subtle?.digest === 'function';
}

function requireSecureContext() {
  if (canVerify()) return;
  fail('unverified',
    'crypto.subtle is unavailable, so this pack cannot be verified. Browsers expose it only on a secure context: serve the page over https, or from localhost.');
}

/**
 * Fetch and open a pack.
 *
 * @param {string|URL|Request} input
 * @param {{expectDigest?: string|null, fetchImpl?: Function, signal?: AbortSignal}} options
 */
export async function openPackFromUrl(input, { expectDigest = null, fetchImpl, signal } = {}) {
  requireSecureContext();
  const doFetch = fetchImpl ?? globalThis.fetch;
  if (typeof doFetch !== 'function') fail('unsupported-option', 'no fetch available in this environment');
  let response;
  try {
    response = await doFetch(input, signal ? { signal } : undefined);
  } catch (error) {
    if (error?.name === 'AbortError') throw new PrecisionError('cancelled', 'the pack download was cancelled');
    // The network error's own message can name an internal host; it is not
    // repeated here.
    throw new PrecisionError('truncated', 'the pack could not be downloaded');
  }
  return openPackFromResponse(response, { expectDigest });
}

/** Open a pack from a `Response` the caller already has. */
export async function openPackFromResponse(response, { expectDigest = null } = {}) {
  requireSecureContext();
  if (!response || typeof response.arrayBuffer !== 'function') {
    fail('unsupported-option', 'openPackFromResponse needs a Response');
  }
  if (response.ok === false) {
    fail('truncated', `the pack could not be downloaded (HTTP ${response.status})`);
  }
  let buffer;
  try {
    buffer = await response.arrayBuffer();
  } catch {
    throw new PrecisionError('truncated', 'the pack download did not complete');
  }
  return openPackFromBytes(new Uint8Array(buffer), { expectDigest });
}

/** Open a pack the user picked with a file input or a drop. */
export async function openPackFromBlob(blob, { expectDigest = null } = {}) {
  requireSecureContext();
  if (!blob || typeof blob.arrayBuffer !== 'function') fail('unsupported-option', 'openPackFromBlob needs a Blob or File');
  return openPackFromBytes(new Uint8Array(await blob.arrayBuffer()), { expectDigest });
}
