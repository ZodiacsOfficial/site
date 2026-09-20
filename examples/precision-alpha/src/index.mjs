/**
 * The environment-neutral entry point: everything except how the bytes were
 * obtained. `./browser.mjs` and `./node.mjs` each supply only that, then call
 * `openPackFromBytes`, so there is exactly one copy of the numerical rules,
 * the validation and the integrity policy.
 *
 * There is deliberately no option to skip verification. A pack that does not
 * verify does not open.
 */
import { PrecisionError, fail } from './core/errors.mjs';
import { parseContainer, verifyIntegrity, sha256Hex, LIMITS, MAGIC_V1, MAGIC_V2 } from './core/container.mjs';
import { memorySource } from './core/source.mjs';
import { Ephemeris, BARYCENTRE_NOT_CENTRE } from './core/ephemeris.mjs';
import { Reducer, CONTRACT, CORRECTED, PROTOTYPE, tdbMinusTt } from './core/reduce.mjs';
import { searchLongitudeEvent, SEARCH_DEFAULTS, SEARCH_CONTRACT } from './core/search.mjs';

export { PrecisionError, CONTRACT, CORRECTED, PROTOTYPE, LIMITS, BARYCENTRE_NOT_CENTRE, tdbMinusTt, sha256Hex, SEARCH_DEFAULTS, SEARCH_CONTRACT };
export const CONTAINER_MAGIC = Object.freeze({ unsupported: MAGIC_V1, supported: MAGIC_V2 });

const J2000_JD = 2451545.0;

export class PrecisionRuntime {
  constructor(source, parsed, integrity) {
    this.#assertVerified(integrity);
    this.integrity = Object.freeze({ ...integrity });
    this.source = source;
    this.sourceKind = source.kind ?? 'unknown';
    this.header = parsed.header;
    this.coverage = Object.freeze({
      startEtSecTdb: parsed.header.coverage.startEtSecTdb,
      stopEtSecTdb: parsed.header.coverage.stopEtSecTdb,
    });
    this.bodies = Object.freeze(CONTRACT.bodies.slice());
    this.ephemeris = new Ephemeris(source, parsed);
    this.reducer = new Reducer(this.ephemeris);
    this.disposed = false;
  }

  #assertVerified(integrity) {
    if (!integrity.selfConsistent) {
      fail('corrupt', 'the pack does not match the digest it carries');
    }
    if (integrity.matchesExpected === false) {
      fail('mutated', 'the pack does not match the digest the caller supplied out of band');
    }
  }

  #live() {
    if (this.disposed) fail('disposed', 'this runtime has been disposed');
  }

  /** Apparent geocentric place. `ttDays` is TT days past J2000. */
  apparent(body, ttDays, options) {
    this.#live();
    return this.reducer.apparent(body, ttDays, options);
  }

  /** Same, taking a Julian Date in TT. */
  apparentAtJdTt(body, jdTt, options) {
    return this.apparent(body, jdTt - J2000_JD, options);
  }

  /** Bounded search for one longitude event. See `./core/search.mjs`. */
  search(spec) {
    this.#live();
    return searchLongitudeEvent(this.reducer, spec);
  }

  /**
   * Release the pack's buffers. Idempotent. Every later call throws a typed
   * `disposed` error rather than reading freed state.
   */
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.ephemeris = null;
    this.reducer = null;
    if (typeof this.source?.release === 'function') this.source.release();
    this.source = null;
  }
}

/**
 * Parse, validate and verify `bytes`, then open a runtime over them.
 *
 * @param {Uint8Array} bytes
 * @param {{expectDigest?: string|null, source?: object}} options
 *   `expectDigest` is a SHA-256 hex digest the caller obtained OUT OF BAND.
 *   It is the only input that can speak to where the pack came from; the
 *   digest inside the artifact cannot.
 */
export async function openPackFromBytes(bytes, { expectDigest = null } = {}) {
  return openPackFromSource(memorySource(bytes), { expectDigest });
}

/**
 * The single open path. `./browser.mjs` and `./node.mjs` differ only in which
 * source they build; parse, validate, verify and open all happen here.
 */
export async function openPackFromSource(source, { expectDigest = null } = {}) {
  if (expectDigest !== null && !/^[0-9a-f]{64}$/.test(expectDigest)) {
    if (typeof source?.release === 'function') source.release();
    fail('unsupported-option', 'expectDigest must be a 64-character lowercase hex SHA-256');
  }
  try {
    const parsed = parseContainer(source);
    const integrity = await verifyIntegrity(source, parsed, { expectDigest });
    // From here on the bytes are the verified ones, and the source is asked
    // to hold itself to that.
    if (typeof source.seal === 'function') source.seal();
    return new PrecisionRuntime(source, parsed, integrity);
  } catch (error) {
    // Nothing opened, so nothing is left holding a file handle or a buffer.
    if (typeof source?.release === 'function') source.release();
    throw error;
  }
}
