import { readFile } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import {
  assertDailyEmailSendInterlocks,
  dailyRecipientUnsubscribeClaim,
  canaryRecipient,
  parseDailyEmailArgs,
  recipientHashPrefix,
  requireResendCapabilities,
  runDailyEmail,
  selectDailyEmailNearbyEvents,
} from './send-daily-email';
import { futurePublishedEvents } from '../src/lib/events/publication';

describe('daily email CLI', () => {
  it('parses every bounded operator mode and rejects ambiguous instants', () => {
    expect(parseDailyEmailArgs([
      '--fixture', '--dry-run', '--at', '2026-07-20T07:13:00+00:00',
      '--limit', '12', '--to', ' Test@Example.com ',
    ])).toMatchObject({
      fixture: true, dryRun: true, limit: 12, to: 'test@example.com',
      at: new Date('2026-07-20T07:13:00Z'),
    });
    expect(() => parseDailyEmailArgs(['--at', '2026-07-20'])).toThrow(/ISO instant/u);
    // The canary forces limit one and refuses a command-line recipient.
    expect(parseDailyEmailArgs(['--canary', '--dry-run', '--limit', '50'])).toMatchObject({
      canary: true, dryRun: true, limit: 1, to: null,
    });
    expect(() => parseDailyEmailArgs(['--canary', '--to', 'someone@example.com']))
      .toThrow(/DAILY_EMAIL_CANARY_TO/u);
    expect(canaryRecipient('  Owner@Example.com ', 'DAILY_EMAIL_CANARY_TO')).toBe('owner@example.com');
    expect(() => canaryRecipient('', 'DAILY_EMAIL_CANARY_TO')).toThrow(/DAILY_EMAIL_CANARY_TO/u);
    expect(recipientHashPrefix('Owner@Example.com')).toBe(recipientHashPrefix('owner@example.com'));
    expect(recipientHashPrefix('owner@example.com')).toMatch(/^[0-9a-f]{12}$/u);
    expect(() => parseDailyEmailArgs(['--limit', '0'])).toThrow(/1 to 10000/u);
    expect(() => parseDailyEmailArgs(['--unknown'])).toThrow(/Unknown option/u);
  });

  it('runs the always-safe fixture smoke with no network or credentials', async () => {
    const fetcher = vi.fn();
    const report = await runDailyEmail({
      options: parseDailyEmailArgs(['--fixture', '--dry-run', '--limit', '2']),
      env: {},
      fetchImpl: fetcher as unknown as typeof fetch,
      log: vi.fn(),
    });
    expect(report).toEqual({
      considered: 2, reserved: 0, sent: 0, failed: 0, duplicate: 0, dryRun: 2,
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('keeps the first future event for Sun mail but skips ambiguous aspects for chart mail', () => {
    const selection = selectDailyEmailNearbyEvents(futurePublishedEvents(
      '2026-07-21',
      { days: 9, limit: Number.MAX_SAFE_INTEGER },
    ));
    expect(selection.sunSign?.id).toBe('neptune-sextile-pluto-2026-07-24');
    expect(selection.sunSign?.signs).toEqual(['aries', 'aquarius']);
    expect(selection.chart?.id).toBe('full-moon-2026-07-29');
    expect(selection.chart?.signs).toEqual(['aquarius']);
  });

  it('fails closed before network when real delivery is not enabled', async () => {
    const fetcher = vi.fn();
    await expect(runDailyEmail({
      options: parseDailyEmailArgs([]),
      env: { DAILY_EMAIL_RECIPIENT_HASH_SECRET: 'recipient-hash-secret-that-is-long-enough' },
      fetchImpl: fetcher as unknown as typeof fetch,
      log: vi.fn(),
    })).rejects.toThrow(/disabled/u);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('requires an independent explicit approval only for real all-recipient sends', () => {
    expect(assertDailyEmailSendInterlocks({
      DAILY_EMAIL_ENABLED: '1',
      DAILY_EMAIL_COHORT: 'test',
    })).toBe('test');
    expect(() => assertDailyEmailSendInterlocks({
      DAILY_EMAIL_ENABLED: '1',
      DAILY_EMAIL_COHORT: 'all',
    })).toThrow(/DAILY_EMAIL_ALL_APPROVED/u);
    expect(() => assertDailyEmailSendInterlocks({
      DAILY_EMAIL_ENABLED: '1',
      DAILY_EMAIL_COHORT: 'all',
      DAILY_EMAIL_ALL_APPROVED: 'true',
    })).toThrow(/must equal 1/u);
    expect(assertDailyEmailSendInterlocks({
      DAILY_EMAIL_ENABLED: '1',
      DAILY_EMAIL_COHORT: 'all',
      DAILY_EMAIL_ALL_APPROVED: '1',
    })).toBe('all');
  });

  it('requires distinct sending and contacts capabilities', () => {
    expect(requireResendCapabilities({
      RESEND_API_KEY: 're_sending_test',
      RESEND_CONTACTS_API_KEY: 're_contacts_test',
    })).toEqual({ sendingKey: 're_sending_test', contactsKey: 're_contacts_test' });
    expect(() => requireResendCapabilities({ RESEND_API_KEY: 're_sending_test' }))
      .toThrow(/RESEND_CONTACTS_API_KEY is required/u);
    expect(() => requireResendCapabilities({
      RESEND_API_KEY: 're_same',
      RESEND_CONTACTS_API_KEY: 're_same',
    })).toThrow(/must be distinct capability keys/u);
  });

  it('never permits a fake fixture identity to become a real delivery', async () => {
    await expect(runDailyEmail({
      options: parseDailyEmailArgs(['--fixture']),
      env: {},
      fetchImpl: vi.fn() as unknown as typeof fetch,
      log: vi.fn(),
    })).rejects.toThrow(/requires --dry-run/u);
  });

  it('binds both tier unsubscribe claims to the same opaque recipient hash', () => {
    const secret = 'recipient-hash-secret-that-is-long-enough';
    const sun = dailyRecipientUnsubscribeClaim({
      tier: 'sun_sign', email: 'same@example.com', sign: 'aries',
      contactId: 'contact_same_1', timezone: 'UTC',
    }, secret);
    const chart = dailyRecipientUnsubscribeClaim({
      tier: 'chart', email: 'SAME@example.com', userId: '10000000-0000-4000-8000-000000000002',
      chartId: '10000000-0000-4000-8000-000000000001',
      chart: {
        id: '10000000-0000-4000-8000-000000000001', name: 'Chart',
        createdAt: '2026-07-01T00:00:00Z', updatedAt: '2026-07-01T00:00:00Z',
        birth: { date: '1990-01-01', time: null, timeKnown: false, place: null },
        summary: {
          engineVersion: 'fixture', utcISO: '1990-01-01T12:00:00Z', houseSystem: 'whole',
          bodies: [{ body: 'Sun', lon: 1, retrograde: false }], angles: null, flags: [],
        },
      },
      timezone: 'UTC',
    }, secret);
    expect(chart.recipientHash).toBe(sun.recipientHash);
    expect(chart).toEqual({
      kind: 'chart',
      userId: '10000000-0000-4000-8000-000000000002',
      recipientHash: sun.recipientHash,
    });
  });

  it('pins the hourly minute-13 workflow, smoke, live gate, and feature flag', async () => {
    const workflow = await readFile(new URL('../.github/workflows/daily-email.yml', import.meta.url), 'utf8');
    expect(workflow).toContain('cron: "13 * * * *"');
    expect(workflow).toContain('scripts/send-daily-email.ts --fixture --dry-run');
    expect(workflow).toContain('npm run editorial:daily:verify-live');
    expect(workflow).toContain("vars.DAILY_EMAIL_ENABLED == '1'");
    expect(workflow).toContain('Enforce test-list-only release state');
    expect(workflow).toContain('DAILY_EMAIL_COHORT: test');
    expect(workflow).not.toContain('inputs.cohort');
    expect(workflow).not.toMatch(/^\s+- all\s*$/mu);
    expect(workflow).toContain('RESEND_DAILY_SEGMENT_ID');
    expect(workflow).toContain('RESEND_SEGMENT_ID');
    expect(workflow).toContain('RESEND_CONTACTS_API_KEY');
    expect(workflow).not.toContain('RESEND_DAILY_SIGN_SEGMENTS_JSON');
    expect(workflow).toContain('DAILY_EMAIL_COHORT');
  });
});
