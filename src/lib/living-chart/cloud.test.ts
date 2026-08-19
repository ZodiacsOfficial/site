import { describe, expect, it, vi } from 'vitest';
import {
  collectLivingChartSnapshotPages,
  parseLivingChartCloudConsentMutationResult,
  parseLivingChartCloudDeleteResult,
} from './cloud';

const CHART_ID = '43000000-0000-4000-8000-000000000001';

function momentId(index: number): string {
  return `44000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
}

function row(index: number) {
  return {
    moment_id: momentId(index),
    consent_epoch: 2,
    revision: 1,
    payload: {
      schema: 'zodiacs.living-chart.cloud-moment.v1',
      primaryChartId: CHART_ID,
      occurredAt: '2026-08-18T10:00:00.000Z',
      timePrecision: 'exact',
      category: 'work',
      forecast: {
        schema: 'zodiacs.living-chart.today-forecast.v1',
        editionDate: '2026-08-18',
        chartId: CHART_ID,
        source: 'personalized',
        generatorVersion: 'today-1',
        capturedAt: '2026-08-18T09:00:00.000Z',
        lines: [{ id: 'contact:mars', text: 'Take one clear step.', receipt: 'Mars square Moon · 0.8°' }],
      },
      reflectionQuestionId: 'reflection:focus.v1',
    },
    created_at: '2026-08-18T10:00:00.000Z',
    updated_at: '2026-08-18T10:00:00.000Z',
    deleted_at: null,
  };
}

function page(moments: unknown[], hasMore: boolean, nextAfter: string | null) {
  return {
    outcome: 'ready',
    purpose: 'living_chart_sync',
    consent_epoch: 2,
    moments,
    has_more: hasMore,
    next_after: nextAfter,
  };
}

describe('Living Chart direct-RLS client wire', () => {
  it('collects a 51-row snapshot across a monotonic cursor', async () => {
    const first = Array.from({ length: 50 }, (_, index) => row(index + 1));
    const fetchPage = vi.fn(async (after: string | null) => after === null
      ? page(first, true, momentId(50))
      : page([row(51)], false, null));

    const result = await collectLivingChartSnapshotPages(2, fetchPage);
    expect(result).toMatchObject({ outcome: 'ready', consentEpoch: 2 });
    expect(result.outcome === 'ready' && result.moments).toHaveLength(51);
    expect(fetchPage).toHaveBeenNthCalledWith(2, momentId(50));
  });

  it('accepts the full 1,000-row server bound in exactly 20 pages', async () => {
    const fetchPage = vi.fn(async (after: string | null) => {
      const start = after === null ? 1 : Number(after.slice(-12)) + 1;
      const moments = Array.from({ length: 50 }, (_, index) => row(start + index));
      const final = start === 951;
      return page(moments, !final, final ? null : momentId(start + 49));
    });

    const result = await collectLivingChartSnapshotPages(2, fetchPage);
    expect(result.outcome === 'ready' && result.moments).toHaveLength(1_000);
    expect(fetchPage).toHaveBeenCalledTimes(20);
  });

  it('rejects a claimed 1,001st row before issuing a 21st page request', async () => {
    const fetchPage = vi.fn(async (after: string | null) => {
      const start = after === null ? 1 : Number(after.slice(-12)) + 1;
      const moments = Array.from({ length: 50 }, (_, index) => row(start + index));
      return page(moments, true, momentId(start + 49));
    });

    await expect(collectLivingChartSnapshotPages(2, fetchPage))
      .rejects.toThrow('living-chart-cloud-snapshot-too-large');
    expect(fetchPage).toHaveBeenCalledTimes(20);
  });

  it('rejects a duplicate/cycling page instead of looping', async () => {
    const fetchPage = vi.fn(async (after: string | null) => after === null
      ? page([row(1)], true, momentId(1))
      : page([row(1)], true, momentId(1)));

    await expect(collectLivingChartSnapshotPages(2, fetchPage))
      .rejects.toThrow(/snapshot-order|snapshot-cursor/u);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it('accepts canonical delete receipts and deletion-wins conflicts', () => {
    expect(parseLivingChartCloudDeleteResult({
      outcome: 'deleted',
      revision: 2,
      updated_at: '2026-08-18T10:00:00.000Z',
    })).toMatchObject({ outcome: 'deleted', revision: 2 });
    expect(parseLivingChartCloudDeleteResult({
      outcome: 'conflict',
      current_revision: 4,
      deleted: true,
    })).toEqual({ outcome: 'conflict', revision: 4, deleted: true });
  });

  it('parses a stale withdrawal as its authoritative converged consent state', () => {
    expect(parseLivingChartCloudConsentMutationResult({
      outcome: 'consent_stale',
      state: 'withdrawn',
      current_consent_epoch: 4,
    })).toEqual({
      outcome: 'stale',
      consent: { state: 'withdrawn', consentEpoch: 4, policyVersion: null },
    });
    expect(parseLivingChartCloudConsentMutationResult({
      outcome: 'consent_epoch_limit_reached',
    })).toEqual({ outcome: 'consent_epoch_limit_reached' });
  });
});
