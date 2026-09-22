/**
 * Type declarations for @zodiacs/precision-alpha.
 *
 * Hand-written, and deliberately strict about the search result: the shape
 * below makes it awkward to read a completeness claim that was never made.
 * `established` is the only Boolean that means "proved", and an exact total
 * only exists on the branch where it is true.
 */

export type PrecisionErrorCode =
  | 'not-a-pack' | 'unsupported-version' | 'too-large' | 'truncated' | 'bad-header'
  | 'bad-geometry' | 'corrupt' | 'unverified' | 'mutated'
  | 'unknown-body' | 'out-of-coverage' | 'bad-instant' | 'unsupported-option'
  | 'budget-exhausted' | 'enclosure-too-weak' | 'unresolved' | 'cancelled'
  | 'disposed';
// `cancelled` and `budget-exhausted` are listed because they exist as
// codes, not because a search throws them: both end a search as a RESULT
// carrying that execution status. See MIGRATION.md.

export class PrecisionError extends Error {
  readonly name: 'PrecisionError';
  readonly code: PrecisionErrorCode;
  readonly detail?: unknown;
  toJSON(): { name: string; code: PrecisionErrorCode; message: string; detail?: unknown };
}

export type Body =
  | 'Sun' | 'Moon' | 'Mercury' | 'Venus' | 'Mars' | 'Jupiter'
  | 'Saturn' | 'Uranus' | 'Neptune' | 'Pluto';

// ---------------------------------------------------------------- places

export interface ApparentPlace {
  body: Body;
  /** True for Mars outward: the kernel has no body centre for them. */
  isSystemBarycentre: boolean;
  /** Apparent geocentric ecliptic longitude of date, degrees, [0, 360). */
  lon: number;
  /** Apparent geocentric ecliptic latitude of date, degrees. */
  lat: number;
  /** Geometric geocentric distance, km. */
  distKm: number;
  lightTimeSec: number;
  lightTimeIters: number;
  lightTimeConverged: boolean;
  deflectionLimiterBound: boolean;
  emissionEt: number;
  dpsiArcsec: number;
  depsArcsec: number;
  geometric: [number, number, number];
}

export interface ReductionOptions {
  nutation?: '2000b' | 'ae' | 'none';
  bias?: boolean;
  aberration?: 'full' | 'first' | 'none';
  deflection?: 'sun' | 'none';
  timescale?: 'tdb' | 'tt';
  observerVelocity?: 'analytic' | 'central60' | 'central600';
  lightTimeIters?: number;
  lightTimeTolSec?: number;
  deflectionLimit?: number;
}

export const CORRECTED: Readonly<Required<ReductionOptions>>;
export const PROTOTYPE: Readonly<Required<ReductionOptions>>;

// ---------------------------------------------------------------- search

export type Support = 'none' | 'conditional' | 'proven';
export type ExecutionStatus = 'finished' | 'budget-exhausted' | 'cancelled' | 'refused';

/**
 * One event, in the time scale its MODE works in.
 *
 * The released modes take and return TT days; the experimental
 * (`@zodiacs/precision-alpha/experimental`) ones take and return TDB
 * seconds, because SPK coefficients are indexed by TDB and those
 * operations do no time-scale conversion. An event therefore carries one
 * pair or the other, never both, which is why both pairs are optional
 * here. `result.request` and `result.interval.units` say which a given
 * result is in; do not read `ttDays` off an experimental event, and do not
 * read `tdbSec` off a released one.
 *
 * `ttDaysIfTdbIsTt` on an experimental event is exactly what its name
 * says: the TDB seconds divided out into days, NOT a converted TT. It is
 * there so a reader can see roughly where in the window an event sits
 * without being handed a conversion the operation did not make.
 */
export interface SearchEvent {
  /** Released modes. */
  ttDays?: number;
  jdTt?: number;
  /** The event is somewhere in here. Not a point estimate. */
  bracketTtDays?: [number, number];
  /** Experimental modes. */
  tdbSec?: number;
  jdTdb?: number;
  bracketTdbSec?: [number, number];
  /** TDB seconds as days. NOT a TT conversion; see above. */
  ttDaysIfTdbIsTt?: number;
  lightTimeSec?: { lo: number; hi: number };
  distanceKm?: [number, number];
  bracketWidthSec: number;
  direction: string | null;
  transversal?: boolean;
  atIntervalEdge?: boolean;
  kind?: string;
  halfPlaneMarginKm?: number;
}

export interface Assumption {
  id: string;
  what: string;
  status: 'unverified' | 'established';
  basis: string;
  value?: unknown;
  wouldBeSettledBy?: string;
}

export interface UnresolvedInterval {
  fromTtDays: number;
  toTtDays: number;
  /** Experimental modes report the same span in the scale they work in. */
  fromTdbSec?: number;
  toTdbSec?: number;
  cells?: number;
  why: string;
  /**
   * True when `why` was taken from a sample of the cells in this span
   * rather than from all of them. A reason, not a proof about every cell.
   */
  reasonsAreSampled?: boolean;
  turningPoint?: { ttDays: number; value: number; locatedBy: string } | null;
}

/**
 * A span the operation DECLINED to answer for -- not one it failed to
 * decide. Only modes with a restricted domain produce these, and today
 * that is `validated-retarded-aberrated-deflected-of-date` alone.
 *
 * The difference from `UnresolvedInterval` is the whole point: an
 * unresolved span might be settled by a smaller cell or a bigger budget,
 * an excluded one never will be, because the profile has no answer there
 * at any resolution. Any crossing inside an excluded span is neither found
 * nor ruled out, so an event list is exhaustive only over
 * `interval.decidedTdbSec`.
 */
export interface ExcludedInterval extends UnresolvedInterval {
  fromTdbSec: number;
  toTdbSec: number;
}

interface SearchResultBase {
  readonly contract: 'zodiacs-precision-search/2';
  readonly mode:
    | 'empirical-apparent'
    | 'validated-geometric'
    | 'validated-retarded-geometric'
    | 'validated-retarded-aberrated'
    | 'validated-retarded-aberrated-of-date'
    | 'validated-retarded-aberrated-deflected-of-date';
  readonly request: Record<string, unknown>;
  readonly events: readonly SearchEvent[];
  /**
   * What was asked for against what was actually decided.
   *
   * Only the fields every mode reports are required. The rest depend on
   * the mode's time scale and on whether it has a restricted domain, and
   * they are optional because they are genuinely absent otherwise -- a
   * required field that some results do not carry is a declaration that
   * lies about half its results.
   */
  readonly interval: {
    requestedTtDays: [number, number];
    requestedSpanDays: number;
    processedSpanDays: number;
    processedFraction: number;
    subdivisionFloorSec: number;
    units: string;
    /** Released modes. */
    processedTtDays?: [number, number][];
    pieces?: number;
    piecesAre?: string;
    /** Experimental modes, which work in TDB seconds. */
    requestedTdbSec?: [number, number];
    processedTdbSec?: [number, number][];
    cells?: number;
    /**
     * Restricted-domain modes: the spans the event list IS exhaustive
     * over. When `accounting.excluded` is non-empty this is strictly
     * smaller than the request, and `events` is a lower bound over the
     * rest.
     */
    decidedTdbSec?: readonly (readonly [number, number])[];
    decidedFraction?: number | null;
  };
  readonly execution: {
    status: ExecutionStatus;
    /** Whether the run FINISHED. Not whether it proved anything. */
    finished: boolean;
    evaluations: number;
    maxEvaluations: number;
    reason: string | null;
  };
  readonly accounting: {
    allIntervalsAccountedFor: boolean;
    unresolved: readonly UnresolvedInterval[];
    note: string;
    unresolvedCells?: number;
    /**
     * Spans a restricted-domain mode declined to answer for. Empty or
     * absent on every mode without one. Read this before reading `events`:
     * a non-empty `excluded` makes the event list a LOWER BOUND over the
     * request, and treating it as a total turns "we did not look there"
     * into "there is nothing there".
     */
    excluded?: readonly ExcludedInterval[];
    excludedCells?: number;
    excludedNote?: string;
  };
  readonly assumptions: readonly Assumption[];
  readonly uncertainty: Record<string, unknown>;
  readonly diagnostics: Record<string, unknown>;
}

/** Completeness was PROVED. Only the validated mode reaches this. */
export interface ProvenSearchResult extends SearchResultBase {
  readonly completeness: { established: true; support: 'proven'; statement: string; conditionalOn: readonly [] };
  readonly eventCount: {
    found: number;
    isExactTotal: true;
    lowerBound: number;
    upperBound: number;
    support: 'proven';
    conditionalTotal: null;
    conditionalPossibleTotals: null;
  };
}

/** Completeness was not established. Every empirical result is one of these. */
export interface UnprovenSearchResult extends SearchResultBase {
  readonly completeness: {
    established: false;
    support: 'none' | 'conditional';
    statement: string;
    /** Non-empty exactly when support is 'conditional'. */
    conditionalOn: readonly string[];
  };
  readonly eventCount: {
    found: number;
    isExactTotal: false;
    lowerBound: number;
    upperBound: number | null;
    support: 'none' | 'conditional';
    /** Only meaningful when support is 'conditional', and only then. */
    conditionalTotal: number | null;
    conditionalPossibleTotals: number[] | null;
  };
}

export type SearchResult = ProvenSearchResult | UnprovenSearchResult;

/**
 * Narrow a result to the proved branch.
 *
 * Use these rather than `if (r.completeness.established)`. TypeScript
 * discriminates a union on a DIRECT property, not a nested one, so the
 * plain check reads `established` as `boolean` and narrows nothing: a
 * consumer compiled against this package found `r.eventCount.isExactTotal`
 * still typed `boolean` inside the true branch. These guards narrow, and
 * they are real functions, so a JavaScript caller gets the same answer.
 */
export function isProven(r: SearchResult): r is ProvenSearchResult;
export function isUnproven(r: SearchResult): r is UnprovenSearchResult;
/** The run reached the end of its interval. Says nothing about proving. */
export function isFinished(r: SearchResult): boolean;

export interface ApparentSearchSpec {
  kind: 'longitude' | 'aspect';
  body: Body;
  other?: Body;
  targetDeg: number;
  fromTtDays: number;
  toTtDays: number;
  /** Required. There is no default allowance, on purpose. */
  epsilonDeg: number;
  options?: ReductionOptions;
  /**
   * Polled on every evaluation. An abort ENDS the search and comes back as
   * a result with `execution.status === 'cancelled'`; it does not throw.
   */
  signal?: { aborted: boolean };
  robustness?: boolean;
  minWidthMs?: number;
  stepMs?: number;
  maxEvaluations?: number;
  boundInflation?: number;
  probeSamples?: number;
  maxGridSpacingMs?: number;
  maxSlopeSamples?: number;
  roundoffDeg?: number;
  /** The fastest the angle can move. Declared, checked against the step, never discoverable by sampling. */
  maxRateDegPerDay?: number;
}

export interface GeometricSearchSpec {
  body: Body;
  targetDeg: number;
  fromTtDays: number;
  toTtDays: number;
  /**
   * Polled on every evaluation. An abort comes back as a result with
   * `execution.status === 'cancelled'`, carrying the events already
   * isolated; it does not throw.
   */
  signal?: { aborted: boolean };
  minWidthSec?: number;
  maxEvaluations?: number;
  maxCells?: number;
}

// --------------------------------------------------------------- runtime

export interface IntegrityReport {
  readonly computedDigest: string;
  readonly storedDigest: string;
  readonly selfConsistent: boolean;
  readonly expectedDigest: string | null;
  /** null when no out-of-band digest was supplied. */
  readonly matchesExpected: boolean | null;
  /** Always says authenticity is not established. A stored digest cannot attest to a source. */
  readonly authenticity: string;
}

export class PrecisionRuntime {
  readonly integrity: IntegrityReport;
  readonly sourceKind: 'memory' | 'file' | string;
  readonly header: Record<string, unknown>;
  readonly coverage: { startEtSecTdb: number; stopEtSecTdb: number };
  readonly bodies: readonly Body[];
  disposed: boolean;

  /** Apparent geocentric place. `ttDays` is TT days past J2000. */
  apparent(body: Body, ttDays: number, options?: ReductionOptions): ApparentPlace;
  apparentAtJdTt(body: Body, jdTt: number, options?: ReductionOptions): ApparentPlace;
  /** Empirical apparent-longitude search. Never establishes completeness. */
  search(spec: ApparentSearchSpec): UnprovenSearchResult;
  /** Validated geometric-longitude search in the fixed J2000 ecliptic. Can establish completeness. */
  searchGeometric(spec: GeometricSearchSpec): SearchResult;
  /** Idempotent. Every later call throws a `disposed` PrecisionError. */
  dispose(): void;
}

export function openPackFromBytes(bytes: Uint8Array, options?: { expectDigest?: string | null }): Promise<PrecisionRuntime>;
export function openPackFromSource(source: unknown, options?: { expectDigest?: string | null }): Promise<PrecisionRuntime>;
export function sha256Hex(bytes: Uint8Array): Promise<string>;
export function tdbMinusTt(jdTt: number): number;

export const BARYCENTRE_NOT_CENTRE: readonly Body[];
export const CONTRACT: Readonly<Record<string, unknown>>;
export const SEARCH_CONTRACT: Readonly<Record<string, unknown>>;
export const GEOMETRIC_CONTRACT: Readonly<Record<string, unknown>>;
export const SEARCH_DEFAULTS: Readonly<Record<string, number>>;
export const VALIDATED_DEFAULTS: Readonly<Record<string, number>>;
export const SEARCH_RESULT_CONTRACT: 'zodiacs-precision-search/2';
export const LIMITS: Readonly<Record<string, number>>;
