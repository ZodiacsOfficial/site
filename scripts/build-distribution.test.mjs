import { describe, expect, it } from 'vitest';
import {
  DISTRIBUTION_COMMITMENT,
  DISTRIBUTION_SCHEMA,
  carryForwardSign,
  distributionOutput,
  percentage,
  shouldWriteSnapshot,
} from './build-distribution.mjs';

const sample = (overrides = {}) => ({
  capturedAt: '2026-08-22T06:31:00.000Z',
  captureMode: 'observed',
  commitment: DISTRIBUTION_COMMITMENT,
  supplySlot: 100,
  largestAccountsSlot: 101,
  supply: '1000',
  accountsSampled: 20,
  top1Pct: 10,
  top10Pct: 25,
  top20Pct: 40,
  ...overrides,
});

describe('distribution snapshot contract', () => {
  it('rounds raw integer shares half-up without Number precision loss', () => {
    expect(percentage(1n, 3n)).toBe(33.33);
    expect(percentage(2n, 3n)).toBe(66.67);
    expect(percentage(1n, 8n)).toBe(12.5);
    expect(percentage(0n, 10n)).toBe(0);
    expect(percentage(1n, 0n)).toBeNull();
  });

  it('migrates a legacy document date while preserving the observation age', () => {
    expect(carryForwardSign({
      supply: '999',
      accountsSampled: 20,
      top1Pct: 10,
      top10Pct: 25,
      top20Pct: 40,
    }, '2026-08-03')).toEqual({
      capturedAt: '2026-08-03T00:00:00.000Z',
      captureMode: 'carried-forward',
      commitment: 'finalized',
      supplySlot: null,
      largestAccountsSlot: null,
      supply: '999',
      accountsSampled: 20,
      top1Pct: 10,
      top10Pct: 25,
      top20Pct: 40,
    });

    expect(carryForwardSign(sample({
      supplySlot: null,
      largestAccountsSlot: null,
    }))).toMatchObject({
      captureMode: 'carried-forward',
      supplySlot: null,
      largestAccountsSlot: null,
    });
  });

  it('reports mixed coverage and uses the oldest included observation conservatively', () => {
    const out = distributionOutput({
      aries: sample(),
      taurus: sample({
        capturedAt: '2026-08-03T00:00:00.000Z',
        captureMode: 'carried-forward',
      }),
    }, {
      generatedAt: '2026-08-22T06:35:00.000Z',
      observedCount: 1,
      expectedCount: 12,
    });

    expect(out.schema).toBe(DISTRIBUTION_SCHEMA);
    expect(out.capturedAt).toBe('2026-08-03');
    expect(out.coverage).toEqual({
      expected: 12,
      observedInRun: 1,
      carriedForward: 1,
      missing: 10,
    });
    expect(out.method).toContain('Token accounts are not verified people or unique wallet owners');
    expect(out.method).not.toContain('wallet concentration is lower');
  });

  it('does not authorize a rewrite when every RPC read failed', () => {
    expect(shouldWriteSnapshot(0)).toBe(false);
    expect(shouldWriteSnapshot(1)).toBe(true);
  });
});
