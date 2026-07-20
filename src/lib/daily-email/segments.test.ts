import { describe, expect, it, vi } from 'vitest';
import { SIGN_SLUGS } from '../signs';
import {
  listResendSegmentContacts,
  loadSunSignRecipients,
  parseSignSegmentMap,
} from './segments';

const SEGMENTS = Object.fromEntries(SIGN_SLUGS.map((sign) => [sign, `segment_${sign}`]));

describe('Resend daily sign segments', () => {
  it('requires exactly twelve unique segment IDs', () => {
    expect(parseSignSegmentMap(JSON.stringify(SEGMENTS))).toEqual(SEGMENTS);
    expect(() => parseSignSegmentMap(JSON.stringify({ aries: 'segment_aries' }))).toThrow(/twelve/u);
    expect(() => parseSignSegmentMap(JSON.stringify({ ...SEGMENTS, taurus: SEGMENTS.aries })))
      .toThrow(/own Resend segment/u);
  });

  it('paginates with the final contact ID as cursor', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        object: 'list', has_more: true, data: [{ id: 'contact_0001', email: 'one@example.com' }],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        object: 'list', has_more: false, data: [{ id: 'contact_0002', email: 'two@example.com' }],
      }), { status: 200 }));
    await expect(listResendSegmentContacts(fetcher, 're_test', 'segment_aries'))
      .resolves.toHaveLength(2);
    expect(String(fetcher.mock.calls[1][0])).toContain('after=contact_0001');
  });

  it('omits unsubscribed contacts and holds addresses found in two sign segments', async () => {
    const fetcher = vi.fn(async (input: URL | RequestInfo) => {
      const path = new URL(String(input)).pathname;
      const sign = SIGN_SLUGS.find((candidate) => path.includes(`segment_${candidate}`));
      const data = sign === 'aries'
        ? [
          { id: 'contact_aries_1', email: ' ARIES@example.com ', unsubscribed: false },
          { id: 'contact_shared_1', email: 'shared@example.com', unsubscribed: false },
          { id: 'contact_optout_1', email: 'out@example.com', unsubscribed: true },
        ]
        : sign === 'taurus'
          ? [{ id: 'contact_shared_1', email: 'shared@example.com', unsubscribed: false }]
          : [];
      return new Response(JSON.stringify({ object: 'list', has_more: false, data }), { status: 200 });
    });
    const result = await loadSunSignRecipients({
      fetchImpl: fetcher as unknown as typeof fetch,
      apiKey: 're_test',
      segments: SEGMENTS,
      request: fetcher as unknown as typeof fetch,
    });
    expect(result.recipients).toEqual([{
      tier: 'sun_sign', email: 'aries@example.com', sign: 'aries',
      contactId: 'contact_aries_1', timezone: 'UTC',
    }]);
    expect(result.ambiguous).toEqual(['shared@example.com']);
    expect(fetcher).toHaveBeenCalledTimes(12);
  });
});
