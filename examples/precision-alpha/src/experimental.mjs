/**
 * The experimental entry point: modes that are being validated, not
 * released.
 *
 * ## Why this is a separate import
 *
 * `@zodiacs/precision-alpha` and `/node` and `/browser` carry the modes
 * that have been through a preregistration, a holdout and a review. What
 * is in here has not finished that, and mixing the two behind one runtime
 * object would make the difference a matter of reading documentation. A
 * consumer of this subpath has typed `experimental` and knows it.
 *
 * Nothing in here changes the released surface. `PrecisionRuntime` gains no
 * methods; this wraps one.
 *
 * ## What is in here now
 *
 *   validated-retarded-geometric   light-time only
 *   validated-retarded-aberrated   light-time and the observer's motion
 *
 * Both establish completeness about the stored polynomial model with those
 * corrections applied. Neither is an apparent place: deflection, the
 * Shapiro delay, precession, nutation, the IAU 2006 frame bias and
 * everything topocentric are absent, and every result lists them by name
 * under `notApplied`. Do not read either against an almanac and call a
 * difference an error -- they answer a different question, and
 * `request.operation` on the result says which.
 *
 * ## Units
 *
 * TDB seconds past J2000, in and out. The released `searchGeometric` takes
 * TT days; these do not, because SPK coefficients are indexed by TDB and
 * folding an unbounded TT conversion into an operation whose point is a
 * bound would make the bound about something else. Converting is the
 * caller's decision, made where its error can be stated.
 */
import { fail } from './core/errors.mjs';
import { CONTRACT as SEARCH_RESULT_CONTRACT } from './core/result.mjs';
import {
  searchRetardedLongitude,
  searchAberratedLongitude,
  RETARDED_CONTRACT,
  ABERRATED_CONTRACT,
  RETARDED_DEFAULTS,
} from './core/retarded-search.mjs';

export { RETARDED_CONTRACT, ABERRATED_CONTRACT, RETARDED_DEFAULTS };

/** What this subpath promises, which is deliberately not much. */
export const EXPERIMENTAL = Object.freeze({
  modes: Object.freeze(['validated-retarded-geometric', 'validated-retarded-aberrated']),
  stability: 'experimental: names, options and result fields may change in any release, including a patch one',
  timeScale: 'TDB seconds past J2000, in and out',
  /**
   * The bare contract string, taken from the module that defines it rather
   * than retyped here: a consumer compares this with `===`, so prose does
   * not belong in it and a second copy of the literal would be a second
   * thing to keep in step.
   */
  resultContract: SEARCH_RESULT_CONTRACT,
  resultContractNote: 'the same result contract the released modes return, so a consumer already narrowing with isProven narrows these the same way',
});

/**
 * Attach the experimental modes to an open runtime.
 *
 * @param {import('./index.mjs').PrecisionRuntime} runtime a runtime from
 *   `openPackFile`, `openPackFromBytes` or `openPackFromSource`
 * @returns {ExperimentalSearches}
 */
export function experimental(runtime) {
  if (!runtime || typeof runtime !== 'object' || !('ephemeris' in runtime)) {
    fail('unsupported-option', 'experimental() needs an open PrecisionRuntime');
  }
  let detached = false;

  /**
   * Both the wrapper and the runtime can be finished with, and either one
   * being finished has to stop a search reading freed buffers. The runtime
   * nulls its own `ephemeris` on dispose, so checking the flag AND the
   * reference catches a runtime disposed behind this wrapper's back --
   * which is the ordinary case, since the caller still holds it.
   */
  const live = () => {
    if (detached) fail('disposed', 'this experimental handle has been disposed');
    if (runtime.disposed || !runtime.ephemeris) fail('disposed', 'the runtime behind this handle has been disposed');
    return runtime.ephemeris;
  };

  return {
    get disposed() { return detached || runtime.disposed; },
    contracts: Object.freeze({ retarded: RETARDED_CONTRACT, aberrated: ABERRATED_CONTRACT }),
    defaults: RETARDED_DEFAULTS,

    /** Light-time only. `{body, targetDeg, fromTdbSec, toTdbSec, signal?}`. */
    searchRetarded(spec) {
      return searchRetardedLongitude(live(), spec);
    },

    /** Light-time and the observer's motion. Same spec. */
    searchRetardedAberrated(spec) {
      return searchAberratedLongitude(live(), spec);
    },

    /**
     * Detach this handle. Idempotent, and it does NOT dispose the runtime:
     * the caller opened that and may still be using the released modes on
     * it. Call `runtime.dispose()` for the buffers.
     */
    dispose() {
      detached = true;
    },
  };
}
