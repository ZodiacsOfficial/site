import { describe, expect, it } from 'vitest';
import {
  samePendingChartOperation,
  samePendingConsentOperation,
} from './pending-operation';
import type { PendingChartOperationV1, PendingConsentOperationV1 } from './types';

const ID = '11111111-1111-4111-8111-111111111111';
const CHART = '22222222-2222-4222-8222-222222222222';
const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);

describe('pending mutation semantic reuse', () => {
  it('reuses a chart UUID only for the exact same operation, base, and payload semantics', () => {
    const pending: PendingChartOperationV1 = {
      version: 1,
      operation: 'put_chart',
      mutationId: ID,
      chartId: CHART,
      baseRevision: 3,
      semanticFingerprint: HASH_A,
    };
    expect(samePendingChartOperation(pending, {
      operation: 'put_chart', chartId: CHART, baseRevision: 3, semanticFingerprint: HASH_A,
    })).toBe(true);
    expect(samePendingChartOperation(pending, {
      operation: 'delete_chart', chartId: CHART, baseRevision: 3, semanticFingerprint: HASH_A,
    })).toBe(false);
    expect(samePendingChartOperation(pending, {
      operation: 'put_chart', chartId: CHART, baseRevision: 4, semanticFingerprint: HASH_A,
    })).toBe(false);
    expect(samePendingChartOperation(pending, {
      operation: 'put_chart', chartId: CHART, baseRevision: 3, semanticFingerprint: HASH_B,
    })).toBe(false);
  });

  it('keeps grant policy semantic and never adds policy semantics to withdrawal', () => {
    const grant: PendingConsentOperationV1 = {
      version: 1,
      operation: 'consent',
      decision: 'grant',
      policyVersion: 'chart-sync-2026-08-12.v1',
      mutationId: ID,
      semanticFingerprint: HASH_A,
    };
    expect(samePendingConsentOperation(grant, {
      operation: 'consent',
      decision: 'grant',
      policyVersion: 'chart-sync-2026-08-12.v1',
      semanticFingerprint: HASH_A,
    })).toBe(true);
    expect(samePendingConsentOperation(grant, {
      operation: 'consent', decision: 'withdraw', semanticFingerprint: HASH_A,
    })).toBe(false);
    const withdraw: PendingConsentOperationV1 = {
      version: 1,
      operation: 'consent',
      decision: 'withdraw',
      mutationId: ID,
      semanticFingerprint: HASH_B,
    };
    expect(samePendingConsentOperation(withdraw, {
      operation: 'consent', decision: 'withdraw', semanticFingerprint: HASH_B,
    })).toBe(true);
  });
});
