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
 *   validated-retarded-geometric                    light-time only
 *   validated-retarded-aberrated                    + the observer's motion
 *   validated-retarded-aberrated-of-date            + the frame of date
 *   validated-retarded-aberrated-deflected-of-date  + solar deflection
 *
 * NONE is an apparent place. The Shapiro delay and everything topocentric
 * are absent from all four; gravitational deflection from the first three;
 * precession, nutation and the IAU 2006 frame bias from the first two.
 * Every result lists what it omits by name under `notApplied`. Do not read
 * any of them against an almanac and call a difference an error -- they
 * answer different questions, and `request.operation` on the result says
 * which.
 *
 * ## The fourth one can refuse, and the first three cannot
 *
 * `searchRetardedAberratedDeflectedOfDate` is the first mode here with a
 * RESTRICTED DOMAIN. Inside five degrees of the Sun it declines to answer
 * rather than guessing, so a window crossing a solar conjunction comes
 * back with `accounting.excluded` non-empty, `completeness.established`
 * false, and an event list that is a LOWER BOUND over the request rather
 * than a total.
 *
 * That is not a failure and the result does not present it as one, but a
 * consumer that reads `events` without reading `accounting.excluded` will
 * silently treat "we did not look there" as "there is nothing there".
 * `interval.decidedTdbSec` gives the spans the list IS exhaustive over.
 * Measured over 300-day windows on the ten contract bodies, twelve of
 * eighteen finished cases had an excluded span of 10 to 39 days;
 * `DEFLECTION-RESULTS.md` has the numbers and the verdict that came with
 * them.
 *
 * ## The frames are not the same frame
 *
 * The first two report a longitude in the ecliptic of the ICRS equator, a
 * FIXED direction. The third reports one measured from the true equinox
 * OF DATE. Those differ by precession since J2000 -- about a quarter of a
 * degree over a couple of decades -- so a crossing a body reaches in one
 * frame may sit outside the requested window in the other. That is a
 * frame difference, not an accuracy difference, and `result.request.frame`
 * names which frame the answer is in.
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
  searchOfDateLongitude,
  searchDeflectedLongitude,
  RETARDED_CONTRACT,
  ABERRATED_CONTRACT,
  OF_DATE_CONTRACT,
  DEFLECTED_CONTRACT,
  OF_DATE_MODEL_RANGE_TDB_SEC,
  RETARDED_DEFAULTS,
} from './core/retarded-search.mjs';
import { MIN_ELONGATION_RAD } from './core/deflection.mjs';
import {
  partitionDomain, partitionKey, PARTITION_CONTRACT, PARTITION_CONTRACT_ID, PARTITION_DEFAULTS,
} from './core/domain-partition.mjs';
import { searchDeflectedOverPartition } from './core/partitioned-search.mjs';

export {
  RETARDED_CONTRACT, ABERRATED_CONTRACT, OF_DATE_CONTRACT, DEFLECTED_CONTRACT,
  OF_DATE_MODEL_RANGE_TDB_SEC, RETARDED_DEFAULTS,
  PARTITION_CONTRACT, PARTITION_CONTRACT_ID, PARTITION_DEFAULTS, partitionKey,
};

/** What this subpath promises, which is deliberately not much. */
export const EXPERIMENTAL = Object.freeze({
  modes: Object.freeze([
    'validated-retarded-geometric',
    'validated-retarded-aberrated',
    'validated-retarded-aberrated-of-date',
    'validated-retarded-aberrated-deflected-of-date',
  ]),
  stability: 'experimental: names, options and result fields may change in any release, including a patch one',
  timeScale: 'TDB seconds past J2000, in and out',
  /**
   * Which modes can decline part of a request, and what to read when one
   * does. Named here rather than left to the per-method documentation
   * because it changes how a caller must treat `events`, and a caller that
   * gets that wrong gets a wrong answer rather than an error.
   */
  restrictedDomain: Object.freeze({
    modes: Object.freeze(['validated-retarded-aberrated-deflected-of-date']),
    floor: 'solar elongation below 5 degrees',
    behaviour: 'the spans inside the floor are not searched. They arrive in accounting.excluded, completeness.established is false, and eventCount.isExactTotal is false: events is then a LOWER BOUND over the request, exhaustive only over interval.decidedTdbSec.',
  }),
  /**
   * The bare contract string, taken from the module that defines it rather
   * than retyped here: a consumer compares this with `===`, so prose does
   * not belong in it and a second copy of the literal would be a second
   * thing to keep in step.
   */
  resultContract: SEARCH_RESULT_CONTRACT,
  resultContractNote: 'the same result contract the released modes return, so a consumer already narrowing with isProven narrows these the same way',
  /**
   * The partitioned path, and what makes it a DIFFERENT contract rather
   * than a faster version of the same one.
   *
   * `searchRetardedAberratedDeflectedOfDate` returns the search result
   * contract above. `...OverPlan` does not: it returns
   * `zodiacs-partitioned-search/1`, whose completeness is stated over the
   * spans it names rather than over the request, and whose events carry
   * an `eligibility` and a `positionFrom` the other has no field for. A
   * consumer cannot swap one for the other and read the same fields, and
   * that is deliberate -- the two answer questions of different size.
   */
  partitioned: Object.freeze({
    planContract: PARTITION_CONTRACT_ID,
    searchContract: 'zodiacs-partitioned-search/1',
    whatItIsFor: 'separating WHERE the profile can answer from WHAT it answers there, so the first can be computed once and reused across target longitudes',
    independentOfTargetLongitude: 'structurally: planDeflectedDomain never receives one',
    migration: Object.freeze({
      from: 'searchRetardedAberratedDeflectedOfDate',
      whatIsRefused: 'a plan for a different pack, observer, body, window, profile, tolerance or numerical policy; a plan that did not finish; and a plan this runtime did not derive. The last two are accepted with acceptPartialPlan and acceptImportedPlan, and the result then records it.',
      fieldsThatMove: Object.freeze([
        'completeness.established -> completeness.overRequest (same meaning, and false wherever the profile declined any part of the request)',
        'eventCount.isExactTotal -> eventCount.isExactTotalOverRequest, with isExactTotalOverAdmissible as the smaller, separate claim',
        'accounting.excluded -> accounting.excluded, unchanged in meaning; accounting.boundary and accounting.unprocessed are NEW and are neither excluded nor searched-and-empty',
        'interval.decidedTdbSec -> completeness.admissibleSpans for the proved-admissible part; a boundary span is not decided and is not excluded',
      ]),
      newPerEventFields: Object.freeze([
        'eligibility: established | not-established | boundary-ambiguous. The third is a safety net for a crossing whose BRACKET reaches into a boundary span; it cannot fire for a plan this runtime derived, and is declared so a consumer handles it rather than relying on it.',
        'positionFrom: which rung located this crossing. A boundary-span event was located WITHOUT the solar term.',
      ]),
      whatDoesNotChange: 'the profile, its five-degree floor, the deflection model, the budgets and the tolerances. This is the same question asked in a different order, not a different question.',
    }),
  }),
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
    contracts: Object.freeze({
      retarded: RETARDED_CONTRACT,
      aberrated: ABERRATED_CONTRACT,
      ofDate: OF_DATE_CONTRACT,
      deflected: DEFLECTED_CONTRACT,
      partition: PARTITION_CONTRACT,
    }),
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
     * Light-time, the observer's motion, AND the frame of date.
     *
     * Same spec, and the same TDB seconds -- the TT the frame needs is
     * derived inside, by the declared model, and reported on the result as
     * `uncertainty.timeScale.conversionApproximation`.
     *
     * `targetDeg` here is measured from the TRUE EQUINOX OF DATE, which is
     * not the origin the other two use. Passing the same number to two of
     * these methods asks two different questions.
     *
     * The frame MODELS claim 1900-2100 (`OF_DATE_MODEL_RANGE_TDB_SEC`).
     * Outside that the search still returns proven enclosures about the
     * model as implemented, and `diagnostics.frameOfDate` says which side
     * of the line the window is on.
     */
    searchRetardedAberratedOfDate(spec) {
      return searchOfDateLongitude(live(), spec);
    },

    /**
     * Light-time, SOLAR DEFLECTION, the observer's motion, and the frame
     * of date. Same spec, same TDB seconds, same origin as the of-date
     * mode -- the true equinox of date.
     *
     * The one mode here that can decline. Read `accounting.excluded`
     * before reading `events`:
     *
     *   const r = x.searchRetardedAberratedDeflectedOfDate(spec);
     *   if (r.accounting.excluded.length > 0) {
     *     // r.events is a LOWER BOUND over the request.
     *     // r.interval.decidedTdbSec is what it is exhaustive over.
     *   }
     *
     * The profile supports solar elongations of at least five degrees,
     * tested on an enclosure so the floor holds at every instant of a cell
     * rather than at sampled ones. Inside it the first-order model's own
     * omitted second-order term grows past what the correction is worth,
     * the limiter threshold and the solar disc are both nearby, and a
     * finite answer there is not an observable direction.
     * `DEFLECTION-PROFILE.md` section 7 sets that floor against four
     * boundaries which are NOT the same boundary.
     *
     * Requires a pack containing the Sun. Refuses with `unknown-body` on
     * the first cell if there is none, rather than once per cell.
     *
     * The Sun as target is answered, and NOT deflected: a body does not
     * deflect its own light. `diagnostics.deflection.appliedToThisBody` is
     * false there and `notAppliedBecause` says why, because otherwise a
     * reader would have only the mode's name to go on.
     *
     * Cost, measured: one to four times the of-date mode where the window
     * holds no conjunction, and 47 to 831 times where it does. The
     * deflection arithmetic is nearly free; isolating the domain boundary
     * is not.
     */
    searchRetardedAberratedDeflectedOfDate(spec) {
      return searchDeflectedLongitude(live(), spec);
    },

    /**
     * WHERE the deflection profile can answer over a window, without
     * asking WHAT it answers there.
     *
     * `{body, fromTdbSec, toTdbSec, packDigest?, signal?}` plus the
     * tuning in `PARTITION_DEFAULTS`. It never takes a target longitude,
     * which is why one plan answers many of them.
     *
     * The result carries `admissible`, `excluded`, `boundary` and
     * `unprocessed` span lists that tile the request exactly, and a `key`
     * identifying the pack, observer, body, profile, window and numerical
     * policy it is a proof about. Pass `packDigest` -- without one the
     * plan records `identityStrength: 'structure-only'`, which cannot tell
     * two packs of the same shape apart.
     */
    planDeflectedDomain(spec) {
      return partitionDomain(live(), spec);
    },

    /**
     * The deflected search, run over a domain plan instead of
     * rediscovering the domain.
     *
     * Same spec as `searchRetardedAberratedDeflectedOfDate` plus an
     * optional `plan` and `packDigest`. Without a plan one is built for
     * this request and charged to this request's budget.
     *
     *   const plan = x.planDeflectedDomain({body, fromTdbSec, toTdbSec, packDigest});
     *   for (const targetDeg of longitudes) {
     *     const r = x.searchRetardedAberratedDeflectedOfDateOverPlan({
     *       body, targetDeg, fromTdbSec, toTdbSec, plan, packDigest,
     *     });
     *   }
     *
     * A plan built for a different pack, observer, body, window, profile
     * or tolerance is REFUSED rather than silently recomputed: it is a
     * proof about a different statement. So is a plan that did not
     * finish, and so is a plan this runtime did not derive -- a matching
     * key is a fingerprint, not a signature. `acceptPartialPlan` and
     * `acceptImportedPlan` take those on your authority instead, and the
     * result says which of them it rests on.
     *
     * The result is NOT the search result contract. Read
     * `EXPERIMENTAL.partitioned.migration` before treating it as one.
     */
    searchRetardedAberratedDeflectedOfDateOverPlan(spec) {
      return searchDeflectedOverPartition(live(), spec);
    },

    /**
     * The supported-domain floor, radians of solar elongation, so a caller
     * can decide whether to ask before asking rather than reading a
     * refusal afterwards.
     */
    get deflectionMinElongationRad() { return MIN_ELONGATION_RAD; },

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
