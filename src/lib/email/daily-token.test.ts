import { describe, expect, it } from 'vitest';
import {
  createDailyChartOptInToken,
  DAILY_CHART_OPT_IN_TTL_MS,
  isIanaTimezone,
  verifyDailyChartOptInToken,
} from './daily-chart-token';
import {
  hasDailyChartEmailProvider,
  hasDailyEmailRevocation,
  hasDailySunEmailProvider,
  hasDailySunStateAccess,
  dailySunSegmentId,
} from './daily-config';
import {
  createDailyUnsubscribeToken,
  dailyUnsubscribeUrl,
  verifyDailyUnsubscribeToken,
} from './daily-unsubscribe-token';
import { createDailySunOptInToken, DAILY_SUN_OPT_IN_TTL_MS, verifyDailySunOptInToken } from './daily-sun-token';
import { dailyRecipientHash } from '../daily-email/identity';

const SECRET = 'test-secret-that-is-at-least-thirty-two-characters';
const USER_ID = '110e8400-e29b-41d4-a716-446655440000';
const CHART_ID = '220e8400-e29b-41d4-a716-446655440000';
const RECIPIENT_HASH = dailyRecipientHash('person@example.com', SECRET);
const DAILY_SEGMENT = 'segment_daily_sun';

describe('daily chart confirmation token', () => {
  it('round-trips an expiring chart selection without storing an email', () => {
    const now = Date.UTC(2026, 6, 20);
    const token = createDailyChartOptInToken({
      userId: USER_ID,
      chartId: CHART_ID,
      recipientHash: RECIPIENT_HASH,
      timezone: 'America/New_York',
    }, SECRET, now);
    expect(token).not.toContain('@');
    expect(verifyDailyChartOptInToken(token, SECRET, now + 1_000)).toEqual({
      userId: USER_ID,
      chartId: CHART_ID,
      recipientHash: RECIPIENT_HASH,
      timezone: 'America/New_York',
      expiresAt: now + DAILY_CHART_OPT_IN_TTL_MS,
    });
    expect(verifyDailyChartOptInToken(`${token}x`, SECRET, now)).toBeNull();
    expect(verifyDailyChartOptInToken(token, SECRET, now + DAILY_CHART_OPT_IN_TTL_MS)).toBeNull();
  });

  it('rejects aliases, malformed zones, and invalid identifiers', () => {
    expect(isIanaTimezone('UTC')).toBe(true);
    expect(isIanaTimezone(' Not/A_Zone ')).toBe(false);
    expect(() => createDailyChartOptInToken({
      userId: 'not-a-user', chartId: CHART_ID, recipientHash: RECIPIENT_HASH, timezone: 'UTC',
    }, SECRET)).toThrow('Invalid daily chart opt-in claim');
  });
});

describe('daily sun confirmation token', () => {
  it('seals recipient identity with a unique nonce and purpose-specific authenticated encryption', () => {
    const now = Date.UTC(2026, 6, 20);
    const token = createDailySunOptInToken({ email: 'Person@Example.com', sign: 'libra' }, SECRET, now);
    const second = createDailySunOptInToken({ email: 'Person@Example.com', sign: 'libra' }, SECRET, now);
    expect(token).not.toBe(second);
    expect(token).toMatch(/^v2\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u);
    expect(token).not.toContain('person');
    expect(token.split('.').slice(1).map((part) => Buffer.from(part, 'base64url').toString('utf8')).join(''))
      .not.toContain('person@example.com');
    expect(verifyDailySunOptInToken(token, SECRET, now + 1_000)).toEqual({
      email: 'person@example.com',
      sign: 'libra',
      expiresAt: now + DAILY_SUN_OPT_IN_TTL_MS,
    });
    expect(verifyDailySunOptInToken(`${token}x`, SECRET, now)).toBeNull();
    expect(verifyDailySunOptInToken(token, `${SECRET}-wrong`, now)).toBeNull();
    expect(verifyDailySunOptInToken(token, SECRET, now + DAILY_SUN_OPT_IN_TTL_MS)).toBeNull();
  });
});

describe('daily unsubscribe token', () => {
  it('round-trips stable sun and chart claims and rejects tampering', () => {
    const sun = createDailyUnsubscribeToken({
      kind: 'sun', contactId: 'contact_12345678', recipientHash: RECIPIENT_HASH,
    }, SECRET);
    const chart = createDailyUnsubscribeToken({
      kind: 'chart', userId: USER_ID, recipientHash: RECIPIENT_HASH,
    }, SECRET);
    expect(verifyDailyUnsubscribeToken(sun, SECRET)).toEqual({
      kind: 'sun', contactId: 'contact_12345678', recipientHash: RECIPIENT_HASH,
    });
    expect(verifyDailyUnsubscribeToken(chart, SECRET)).toEqual({
      kind: 'chart', userId: USER_ID, recipientHash: RECIPIENT_HASH,
    });
    expect(verifyDailyUnsubscribeToken(`${sun}x`, SECRET)).toBeNull();
    expect(dailyUnsubscribeUrl('https://zodiacs.org/anything', {
      kind: 'chart', userId: USER_ID, recipientHash: RECIPIENT_HASH,
    }, SECRET))
      .toMatch(/^https:\/\/zodiacs\.org\/api\/email\/unsubscribe\?token=/);
  });
});

describe('daily email configuration', () => {
  const base = {
    DAILY_EMAIL_ENABLED: '1',
    EMAIL_PROVIDER: 'resend',
    RESEND_API_KEY: 're_sending_test',
    RESEND_CONTACTS_API_KEY: 're_contacts_test',
    RESEND_FROM_EMAIL: 'Zodiacs.org <hello@zodiacs.org>',
    EMAIL_CONFIRM_SECRET: SECRET,
    DAILY_EMAIL_UNSUBSCRIBE_SECRET: SECRET,
    DAILY_EMAIL_RECIPIENT_HASH_SECRET: SECRET,
    RESEND_DAILY_SEGMENT_ID: DAILY_SEGMENT,
    PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'service-test',
  };

  it('requires one dedicated daily segment distinct from the legacy weekly segment', () => {
    expect(dailySunSegmentId(base)).toBe(DAILY_SEGMENT);
    expect(hasDailySunStateAccess(base)).toBe(true);
    expect(hasDailySunEmailProvider(base)).toBe(true);
    expect(hasDailySunEmailProvider({ ...base, DAILY_EMAIL_ENABLED: '0' })).toBe(false);
    expect(hasDailySunEmailProvider({ ...base, SUPABASE_SERVICE_ROLE_KEY: '' })).toBe(false);
    expect(hasDailySunEmailProvider({ ...base, RESEND_CONTACTS_API_KEY: '' })).toBe(false);
    expect(hasDailySunEmailProvider({ ...base, RESEND_CONTACTS_API_KEY: base.RESEND_API_KEY })).toBe(false);
    expect(dailySunSegmentId({ ...base, RESEND_DAILY_SEGMENT_ID: 'bad id' })).toBeNull();
    expect(dailySunSegmentId({ ...base, RESEND_SEGMENT_ID: DAILY_SEGMENT })).toBeNull();
    expect(hasDailySunEmailProvider({ ...base, RESEND_SEGMENT_ID: DAILY_SEGMENT })).toBe(false);
  });

  it('keeps chart email disabled until the server Supabase contract is complete', () => {
    expect(hasDailyChartEmailProvider(base)).toBe(false);
    expect(hasDailyChartEmailProvider({
      ...base,
      PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
      PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
      SUPABASE_SERVICE_ROLE_KEY: 'service-test',
    })).toBe(true);
  });

  it('keeps permanent unsubscribe available without enrollment or provider routing', () => {
    const revocationOnly = {
      DAILY_EMAIL_ENABLED: '0',
      DAILY_EMAIL_UNSUBSCRIBE_SECRET: SECRET,
      DAILY_EMAIL_RECIPIENT_HASH_SECRET: SECRET,
      PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-test',
    };
    expect(hasDailyEmailRevocation(revocationOnly)).toBe(true);
    expect(hasDailyEmailRevocation({ ...revocationOnly, SUPABASE_SERVICE_ROLE_KEY: '' })).toBe(false);
  });
});
