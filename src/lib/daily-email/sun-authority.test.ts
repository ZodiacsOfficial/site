import { describe, expect, it, vi } from 'vitest';
import { dailyRecipientHash } from './identity';
import { loadAuthorizedSunRecipients } from './sun-authority';
import type { SunSignRecipient } from './types';

const HASH_SECRET = 'recipient-hash-secret-that-is-long-enough';
const SUPABASE_URL = 'https://project.supabase.co';
const SERVICE_KEY = 'service_test';

function recipient(email: string, sign: string): SunSignRecipient {
  return {
    tier: 'sun_sign',
    email,
    sign,
    contactId: `contact_${sign}_${email.charCodeAt(0)}`,
    timezone: 'UTC',
  };
}

describe('daily Sun delivery authority', () => {
  it('accepts only an exact confirmed recipient-hash/sign pair from the database', async () => {
    const candidates = [
      recipient('segment-only@example.com', 'aries'),
      recipient('confirmed@example.com', 'taurus'),
      recipient('wrong-sign@example.com', 'gemini'),
      recipient('revoked@example.com', 'cancer'),
      recipient('pending@example.com', 'leo'),
    ];
    const hash = (email: string) => dailyRecipientHash(email, HASH_SECRET);
    const fetcher = vi.fn(async (input: URL | RequestInfo, _init?: RequestInit) => {
      const url = new URL(String(input));
      expect(url.pathname).toBe('/rest/v1/daily_sun_preferences');
      expect(url.href).not.toContain('@');
      expect(url.href).not.toContain('example.com');
      return new Response(JSON.stringify([
        {
          recipient_hash: hash('confirmed@example.com'),
          sign: 'taurus',
          confirmation_state: 'confirmed',
          confirmed_at: '2026-07-20T00:00:00.000Z',
        },
        {
          recipient_hash: hash('wrong-sign@example.com'),
          sign: 'libra',
          confirmation_state: 'confirmed',
          confirmed_at: '2026-07-20T00:00:00.000Z',
        },
        {
          recipient_hash: hash('revoked@example.com'),
          sign: 'cancer',
          confirmation_state: 'revoked',
          confirmed_at: null,
        },
        {
          recipient_hash: hash('pending@example.com'),
          sign: 'leo',
          confirmation_state: 'pending',
          confirmed_at: null,
        },
      ]), { status: 200 });
    });

    const result = await loadAuthorizedSunRecipients({
      recipients: candidates,
      fetchImpl: fetcher as unknown as typeof fetch,
      supabaseUrl: SUPABASE_URL,
      serviceKey: SERVICE_KEY,
      hashSecret: HASH_SECRET,
    });

    expect(result).toEqual({ recipients: [candidates[1]], rejected: 4 });
    expect(fetcher).toHaveBeenCalledTimes(1);
    const headers = fetcher.mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(headers).toMatchObject({ apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` });
  });

  it('fails closed when the server-owned preference lookup fails', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('{}', { status: 503 }));
    await expect(loadAuthorizedSunRecipients({
      recipients: [recipient('confirmed@example.com', 'taurus')],
      fetchImpl: fetcher as unknown as typeof fetch,
      supabaseUrl: SUPABASE_URL,
      serviceKey: SERVICE_KEY,
      hashSecret: HASH_SECRET,
    })).rejects.toThrow(/consent authority lookup failed \(503\)/u);
  });

  it('fails closed on a malformed database response', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    await expect(loadAuthorizedSunRecipients({
      recipients: [recipient('confirmed@example.com', 'taurus')],
      fetchImpl: fetcher as unknown as typeof fetch,
      supabaseUrl: SUPABASE_URL,
      serviceKey: SERVICE_KEY,
      hashSecret: HASH_SECRET,
    })).rejects.toThrow(/invalid response/u);
  });
});
