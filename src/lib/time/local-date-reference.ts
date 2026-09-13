import { localDateContainsUtc } from './localToUtc';
import {
  createNativeTemporalTransitionProvider,
  resolveLocalDateIntervals,
  type CompleteTransitionProvider,
  type LocalDateIntervalsResult,
} from './local-date-intervals';

type TransitionObservation =
  | { readonly kind: 'offset'; readonly instant: number; readonly offset: number }
  | { readonly kind: 'next-transition'; readonly after: number; readonly next: number | null };

/** Ephemeral enumeration evidence under the provider's completeness contract.
 * Observations detect inconsistencies; they do not prove a provider trustworthy
 * or certify historical accuracy of its timezone data. Never serialize into a
 * natal/contact receipt or infer astronomical sign stability from this record.
 */
export interface LocalDateCoverageEvidence {
  readonly provider: 'host-temporal' | 'explicit-complete-provider';
  readonly contract: 'complete-transitions-v1';
  readonly observations: readonly TransitionObservation[];
}

export interface LocalDateReferenceAssessment {
  readonly referenceStatus: 'member' | 'outside-date' | 'unresolved';
  readonly coverage: LocalDateIntervalsResult;
  readonly evidence: LocalDateCoverageEvidence | null;
}

/**
 * Adjudicate the caller's unchanged reference instant. Production callers use
 * only the host Temporal adapter; an explicit provider is a trusted integration
 * boundary, never data accepted from forms, storage, receipts or the network.
 * Ordinary, shortened, repeated and disconnected dates use their actual union
 * of half-open intervals. Empty dates have no reference. Missing/failed complete
 * coverage may still admit an Intl-verified point, with coverage unresolved.
 * No alternative instant, endpoint samples or full-date sign verdict is made.
 */
export function assessLocalDateReference(
  date: string,
  utc: Date,
  timeZone: string,
  provider?: CompleteTransitionProvider | null,
): LocalDateReferenceAssessment {
  let coverage: LocalDateIntervalsResult;
  let evidence: LocalDateCoverageEvidence | null = null;
  try {
    const source = provider === undefined ? createNativeTemporalTransitionProvider() : provider;
    const observations: TransitionObservation[] = [];
    // Keep invalid/absent providers on the resolver's normal fail-closed path.
    const tracked = source?.completeness === 'complete-transitions-v1' ? {
      completeness: source.completeness,
      offsetMilliseconds(zone: string, instant: number) {
        const offset = source.offsetMilliseconds(zone, instant);
        observations.push(Object.freeze({ kind: 'offset' as const, instant, offset }));
        return offset;
      },
      nextTransitionMilliseconds(zone: string, after: number) {
        const next = source.nextTransitionMilliseconds(zone, after);
        observations.push(Object.freeze({ kind: 'next-transition' as const, after, next }));
        return next;
      },
    } : source;
    coverage = resolveLocalDateIntervals(date, timeZone, tracked);
    if (coverage.status !== 'unresolved') {
      evidence = Object.freeze({
        provider: provider === undefined ? 'host-temporal' : 'explicit-complete-provider',
        contract: 'complete-transitions-v1',
        observations: Object.freeze(observations),
      });
    }
  } catch {
    coverage = Object.freeze({ status: 'unresolved', reason: 'provider-failed' });
  }

  // Contradictory/malformed transition evidence is different from unavailable
  // evidence. Do not admit a point simply because the contradiction was found
  // by the interval resolver rather than by the final membership comparison.
  if (coverage.status === 'unresolved' && coverage.reason === 'provider-violation') {
    return Object.freeze({ referenceStatus: 'unresolved', coverage, evidence: null });
  }

  try {
    // Always retain the existing independent Intl membership witness. Reading
    // the Date's internal value preserves cross-realm Dates and avoids getters.
    const member = localDateContainsUtc(date, utc, timeZone);
    const instant = Date.prototype.getTime.call(utc);
    if (coverage.status !== 'unresolved') {
      const covered = coverage.intervals.some(({ start, endExclusive }) => start <= instant && instant < endExclusive);
      if (covered !== member) {
        return Object.freeze({ referenceStatus: 'unresolved',
          coverage: Object.freeze({ status: 'unresolved', reason: 'provider-violation' }), evidence: null });
      }
    }
    return Object.freeze({ referenceStatus: member ? 'member' : 'outside-date', coverage, evidence });
  } catch {
    return Object.freeze({ referenceStatus: 'unresolved',
      coverage: Object.freeze({ status: 'unresolved', reason: 'provider-failed' }), evidence: null });
  }
}
