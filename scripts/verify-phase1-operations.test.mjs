import { describe, expect, it } from 'vitest';
import {
  latestConsecutiveEvidence,
  operationReceiptFailures,
  REQUIRED_STEPS,
} from './verify-phase1-operations.mjs';

const entry = (targetDate, valid = true, runId = Number(targetDate.replaceAll('-', ''))) => ({
  targetDate,
  valid,
  runId,
  createdAt: `${targetDate}T03:30:00.000Z`,
});

describe('Phase 1 operation evidence', () => {
  it('requires all generation, live, discovery, and receipt steps', () => {
    expect(REQUIRED_STEPS).toEqual(expect.arrayContaining([
      'Verify publication package',
      'Require exact edition in production',
      'Notify IndexNow',
      'Upload operation receipt',
    ]));
  });

  it('keeps only the latest uninterrupted daily success streak', () => {
    const evidence = [
      entry('2026-07-20'),
      entry('2026-07-21', false),
      entry('2026-07-22'),
      entry('2026-07-23'),
      entry('2026-07-24'),
    ];
    expect(latestConsecutiveEvidence(evidence).map((item) => item.targetDate)).toEqual([
      '2026-07-22',
      '2026-07-23',
      '2026-07-24',
    ]);
  });

  it('does not treat a skipped UTC date as consecutive', () => {
    const evidence = [entry('2026-07-20'), entry('2026-07-22')];
    expect(latestConsecutiveEvidence(evidence)).toEqual([evidence[1]]);
  });

  it('validates the immutable receipt fields rather than trusting its filename', () => {
    const run = {
      id: 42,
      created_at: '2026-07-20T00:15:00.000Z',
      html_url: 'https://github.com/ZodiacsOfficial/site/actions/runs/42',
    };
    const receipt = {
      schema: 'zodiacs.daily-operation-receipt.v1',
      targetDate: '2026-07-20',
      event: 'schedule',
      runId: 42,
      runAttempt: 1,
      runUrl: run.html_url,
      commitSha: 'a'.repeat(40),
      publicationCanonicalSha256: 'b'.repeat(64),
      factsCanonicalSha256: 'c'.repeat(64),
      liveVerification: 'exact-match',
      indexNow: 'accepted',
      completedAt: '2026-07-20T00:20:00.000Z',
    };

    expect(operationReceiptFailures(receipt, run, '2026-07-20')).toEqual([]);
    expect(operationReceiptFailures({ ...receipt, event: 'workflow_dispatch' }, run, '2026-07-20')).toContain(
      'receipt event: expected schedule, received workflow_dispatch',
    );
    expect(operationReceiptFailures({ ...receipt, liveVerification: 'skipped' }, run, '2026-07-20')).toContain(
      'receipt liveVerification: expected exact-match, received skipped',
    );
  });
});
