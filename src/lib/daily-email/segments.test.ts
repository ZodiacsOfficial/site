import { describe, expect, it, vi } from 'vitest';
import {
  listResendSegmentContacts,
  loadDailySunContacts,
  parseDailySunSegmentId,
  requireDailySunSegmentId,
} from './segments';

const DAILY_SEGMENT = 'segment_daily_sun';

describe('Resend daily Sun segment', () => {
  it('requires one valid segment distinct from the legacy weekly segment', () => {
    expect(parseDailySunSegmentId(` ${DAILY_SEGMENT} `)).toBe(DAILY_SEGMENT);
    expect(parseDailySunSegmentId('bad id')).toBeNull();
    expect(parseDailySunSegmentId(DAILY_SEGMENT, DAILY_SEGMENT)).toBeNull();
    expect(() => requireDailySunSegmentId(DAILY_SEGMENT, DAILY_SEGMENT))
      .toThrow(/must differ from legacy RESEND_SEGMENT_ID/u);
  });

  it('paginates with the final contact ID as cursor', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        object: 'list', has_more: true, data: [{ id: 'contact_0001', email: 'one@example.com' }],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        object: 'list', has_more: false, data: [{ id: 'contact_0002', email: 'two@example.com' }],
      }), { status: 200 }));
    await expect(listResendSegmentContacts(fetcher, 're_test', DAILY_SEGMENT))
      .resolves.toHaveLength(2);
    expect(String(fetcher.mock.calls[1][0])).toContain('after=contact_0001');
  });

  it('pages one segment, normalizes addresses, and holds duplicate provider identities', async () => {
    const fetcher = vi.fn(async (_input: URL | RequestInfo) => new Response(JSON.stringify({
      object: 'list',
      has_more: false,
      data: [
        { id: 'contact_aries_1', email: ' ARIES@example.com ', unsubscribed: false },
        { id: 'contact_shared_1', email: 'shared@example.com', unsubscribed: false },
        { id: 'contact_shared_2', email: 'SHARED@example.com', unsubscribed: false },
        { id: 'contact_optout_1', email: 'out@example.com', unsubscribed: true },
      ],
    }), { status: 200 }));
    const result = await loadDailySunContacts({
      fetchImpl: fetcher as unknown as typeof fetch,
      apiKey: 're_test',
      segment: DAILY_SEGMENT,
      request: fetcher as unknown as typeof fetch,
    });
    expect(result.contacts).toEqual([{
      email: 'aries@example.com', contactId: 'contact_aries_1',
    }]);
    expect(result.duplicates).toEqual(['shared@example.com']);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(String(fetcher.mock.calls[0]?.[0])).toContain(`/segments/${DAILY_SEGMENT}/contacts`);
  });
});
