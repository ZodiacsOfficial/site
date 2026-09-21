/**
 * Type declarations for @zodiacs/precision-alpha/experimental.
 *
 * The result shape is the released one -- `SearchResult` from the main
 * entry point, contract `zodiacs-precision-search/2` -- so a consumer
 * already narrowing on `isProven` narrows these the same way. What differs
 * is the SPEC: TDB seconds in, not TT days, because these operations do no
 * time-scale conversion and will not pretend otherwise.
 *
 * Everything here is experimental. The names, the options and the extra
 * diagnostic fields may change in any release.
 */
import type { Body, SearchResult } from './index.js';

export interface RetardedSearchSpec {
  body: Body;
  targetDeg: number;
  /** TDB seconds past J2000. No TT or UTC conversion happens inside. */
  fromTdbSec: number;
  /** TDB seconds past J2000, after `fromTdbSec`. */
  toTdbSec: number;
  /**
   * Polled on every evaluation. An abort comes back as a result with
   * `execution.status === 'cancelled'`, carrying the events already
   * isolated; it does not throw.
   */
  signal?: { aborted: boolean };
  /** Subdivision floor in seconds. Below this a cell stays open. */
  minWidthSec?: number;
  maxEvaluations?: number;
  maxCells?: number;
  /** How many times a candidate light-time interval may be widened. */
  maxTauWidenings?: number;
  /** Below this width a cell whose enclosures failed is reported, not split. */
  enclosureFloorSec?: number;
  tauPadFactor?: number;
  tauPadFloorSec?: number;
}

/**
 * What this subpath promises, which is deliberately not much.
 */
export const EXPERIMENTAL: Readonly<{
  modes: readonly [
    'validated-retarded-geometric',
    'validated-retarded-aberrated',
    'validated-retarded-aberrated-of-date',
  ];
  stability: string;
  timeScale: string;
  /** The bare contract string, comparable with `===`. */
  resultContract: 'zodiacs-precision-search/2';
  resultContractNote: string;
}>;

export interface ExperimentalSearches {
  /** True once this handle, or the runtime behind it, has been disposed. */
  readonly disposed: boolean;
  readonly contracts: Readonly<{
    retarded: Readonly<Record<string, unknown>>;
    aberrated: Readonly<Record<string, unknown>>;
    ofDate: Readonly<Record<string, unknown>>;
  }>;
  readonly defaults: Readonly<Record<string, number>>;

  /**
   * `validated-retarded-geometric`: reception light-time only. The
   * observer's own motion does not enter the direction.
   *
   * ## What throws and what does not
   *
   * A malformed REQUEST throws a `PrecisionError`: `disposed` once the
   * handle or its runtime is gone, `unknown-body` for a body outside the
   * contract, `unsupported-option` for an unknown tuning key or a window
   * that runs backwards, and `out-of-coverage` for a window the pack has
   * no records for at all. Write the call inside a `try`.
   *
   * Everything the SEARCH then runs into comes back inside the result and
   * never throws: a budget spent or a cancelled signal is
   * `execution.status`, and a cell that could not be closed is an entry in
   * `accounting.unresolved` with a reason. That is the distinction -- a
   * request the operation cannot accept, against an answer the operation
   * declines to give.
   */
  searchRetarded(spec: RetardedSearchSpec): SearchResult;

  /**
   * `validated-retarded-aberrated`: reception light-time AND stellar
   * aberration from the observer's velocity at reception.
   *
   * NOT an apparent place. Deflection, the Shapiro delay, precession,
   * nutation, the IAU 2006 frame bias and everything topocentric are
   * absent; `diagnostics.notApplied` on the result lists them by name.
   */
  searchRetardedAberrated(spec: RetardedSearchSpec): SearchResult;

  /**
   * `validated-retarded-aberrated-of-date`: the same corrected direction
   * as `searchRetardedAberrated`, expressed in the **mean ecliptic of date
   * with its origin at the true equinox of date**.
   *
   * `spec.targetDeg` is therefore measured from a DIFFERENT ORIGIN than
   * the other two methods use. They differ by precession since J2000 --
   * roughly a quarter of a degree over a couple of decades -- so passing
   * one number to two of these methods asks two different questions, and a
   * crossing that falls inside the window in one frame can fall outside it
   * in the other. `result.request.frame` names which frame an answer is
   * in.
   *
   * Times stay TDB seconds. The TT the frame needs is derived inside by a
   * declared model, and the result reports that model's contribution
   * separately under `uncertainty.timeScale`, alongside the proven
   * numerical width and the unbounded external term. They are not summed.
   *
   * Still NOT an apparent place: gravitational deflection, the Shapiro
   * delay and everything topocentric remain absent, and
   * `diagnostics.notApplied` lists them.
   */
  searchRetardedAberratedOfDate(spec: RetardedSearchSpec): SearchResult;

  /**
   * Detach this handle. Idempotent, and it does NOT dispose the runtime --
   * the caller opened that and may still be using the released modes on it.
   */
  dispose(): void;
}

/** Attach the experimental modes to an open runtime. */
export function experimental(runtime: unknown): ExperimentalSearches;

export const RETARDED_CONTRACT: Readonly<Record<string, unknown>>;
export const ABERRATED_CONTRACT: Readonly<Record<string, unknown>>;
export const OF_DATE_CONTRACT: Readonly<Record<string, unknown>>;
export const RETARDED_DEFAULTS: Readonly<Record<string, number>>;

/**
 * The range over which the of-date frame MODELS claim to represent the
 * sky: TDB seconds past J2000 for 1900-01-01 to 2100-01-01.
 *
 * Outside it the search still runs and still returns proven enclosures
 * about the model as implemented; what lapses is the claim that the model
 * is the sky. `diagnostics.frameOfDate.requestWithinModelRange` says which
 * side a given window is on.
 */
export const OF_DATE_MODEL_RANGE_TDB_SEC: readonly [number, number];
