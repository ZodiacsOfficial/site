import type {
  PendingChartOperationV1,
  PendingConsentOperationV1,
} from './types';

export type ChartOperationSemanticsV1 = Omit<PendingChartOperationV1, 'version' | 'mutationId'>;
export type ConsentOperationSemanticsV1 =
  | Omit<Extract<PendingConsentOperationV1, { decision: 'grant' }>, 'version' | 'mutationId'>
  | Omit<Extract<PendingConsentOperationV1, { decision: 'withdraw' }>, 'version' | 'mutationId'>;

export function samePendingChartOperation(
  pending: PendingChartOperationV1 | null,
  semantics: ChartOperationSemanticsV1,
): pending is PendingChartOperationV1 {
  return pending !== null
    && pending.operation === semantics.operation
    && pending.chartId === semantics.chartId
    && pending.baseRevision === semantics.baseRevision
    && pending.semanticFingerprint === semantics.semanticFingerprint;
}

export function samePendingConsentOperation(
  pending: PendingConsentOperationV1 | null,
  semantics: ConsentOperationSemanticsV1,
): pending is PendingConsentOperationV1 {
  if (pending === null
    || pending.operation !== semantics.operation
    || pending.decision !== semantics.decision
    || pending.semanticFingerprint !== semantics.semanticFingerprint) return false;
  return pending.decision === 'withdraw'
    || (semantics.decision === 'grant' && pending.policyVersion === semantics.policyVersion);
}
