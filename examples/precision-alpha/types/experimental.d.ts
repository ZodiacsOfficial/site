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
  modes: readonly ['validated-retarded-geometric', 'validated-retarded-aberrated'];
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
  }>;
  readonly defaults: Readonly<Record<string, number>>;

  /**
   * `validated-retarded-geometric`: reception light-time only. The
   * observer's own motion does not enter the direction.
   *
   * Throws a `disposed` PrecisionError once the handle or its runtime is
   * gone; every other failure comes back inside the result.
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
   * Detach this handle. Idempotent, and it does NOT dispose the runtime --
   * the caller opened that and may still be using the released modes on it.
   */
  dispose(): void;
}

/** Attach the experimental modes to an open runtime. */
export function experimental(runtime: unknown): ExperimentalSearches;

export const RETARDED_CONTRACT: Readonly<Record<string, unknown>>;
export const ABERRATED_CONTRACT: Readonly<Record<string, unknown>>;
export const RETARDED_DEFAULTS: Readonly<Record<string, number>>;
