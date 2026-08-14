import { describe, expect, it, vi } from 'vitest';
import {
  GuideQuotaController,
  parseGuideQuotaResult,
  type GuideQuotaReservation,
} from './quota';

const ENV = {
  PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: `sb_secret_${'q'.repeat(48)}`,
};

function reservation(overrides: Partial<GuideQuotaReservation> = {}): GuideQuotaReservation {
  return {
    quotaHash: 'a'.repeat(64),
    principalHash: 'b'.repeat(64),
    conversationId: '11111111-1111-4111-8111-111111111111',
    operationHash: 'c'.repeat(64),
    now: 1_786_566_000_000,
    env: ENV,
    signal: new AbortController().signal,
    ...overrides,
  };
}

function quotaResponse(
  status: 'reserved' | 'operation_replay' | 'visitor_limit' | 'global_limit',
  visitor: number,
  global: number,
): Response {
  return new Response(JSON.stringify({ status, visitor, global }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

describe('Guide durable quota reservation', () => {
  it('parses only the versioned status-bearing result shape', () => {
    expect(parseGuideQuotaResult({ status: 'reserved', visitor: 1, global: 2 })).toEqual({
      status: 'reserved',
      visitor: 1,
      global: 2,
    });
    expect(parseGuideQuotaResult([{ status: 'global_limit', visitor: '0', global: '3000' }]))
      .toEqual({ status: 'global_limit', visitor: 0, global: 3000 });
    expect(parseGuideQuotaResult({ status: 'operation_replay', visitor: 0, global: 0 }))
      .toEqual({ status: 'operation_replay', visitor: 0, global: 0 });
    expect(parseGuideQuotaResult({ visitor: 1, global: 1 })).toBeNull();
    expect(parseGuideQuotaResult({ status: 'reserved', visitor: -1, global: 1 })).toBeNull();
    expect(parseGuideQuotaResult({ status: 'unknown', visitor: 1, global: 1 })).toBeNull();
  });

  it('calls the atomic service-role RPC with only a principal hash and bounded ceiling', async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => (
      quotaResponse('reserved', 1, 1)
    ));
    const controller = new GuideQuotaController(fetcher as typeof fetch);
    const lease = await controller.reserve(reservation());
    lease.release();

    expect(fetcher).toHaveBeenCalledOnce();
    const [url, init] = fetcher.mock.calls[0]!;
    expect(String(url)).toBe('https://example.supabase.co/rest/v1/rpc/guide_quota_reserve_v1');
    expect(init?.headers).toMatchObject({
      apikey: ENV.SUPABASE_SERVICE_ROLE_KEY,
      'cache-control': 'no-store',
      'content-type': 'application/json',
    });
    expect(init?.headers).not.toHaveProperty('authorization');
    expect(JSON.parse(String(init?.body))).toEqual({
      visitor_hash: 'a'.repeat(64),
      operation_hash: 'c'.repeat(64),
      global_limit: 3_000,
    });
  });

  it('fails closed on a durable replay returned to another controller instance', async () => {
    let calls = 0;
    const fetcher = vi.fn(async () => {
      calls += 1;
      return calls === 1
        ? quotaResponse('reserved', 1, 1)
        : quotaResponse('operation_replay', 0, 0);
    });
    const firstInstance = new GuideQuotaController(fetcher as typeof fetch);
    const secondInstance = new GuideQuotaController(fetcher as typeof fetch);

    const first = await firstInstance.reserve(reservation());
    first.release();
    await expect(secondInstance.reserve(reservation())).rejects.toMatchObject({
      code: 'operation_replay',
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('maps database denials without treating an over-cap turn as reserved', async () => {
    for (const [status, expected] of [
      ['visitor_limit', 'rate_limited'],
      ['global_limit', 'temporarily_unavailable'],
    ] as const) {
      const counts = status === 'visitor_limit' ? [30, 30] : [0, 3_000];
      const fetcher = vi.fn(async () => quotaResponse(status, counts[0], counts[1]));
      const controller = new GuideQuotaController(fetcher as typeof fetch);
      await expect(controller.reserve(reservation())).rejects.toMatchObject({ code: expected });
    }
  });

  it('fails closed for missing/malformed RPC responses and impossible reservations', async () => {
    for (const response of [
      new Response('{"code":"PGRST202"}', { status: 404 }),
      new Response('{"visitor":1,"global":1}', { status: 200 }),
      quotaResponse('reserved', 31, 31),
      quotaResponse('reserved', 1, 3_001),
    ]) {
      const controller = new GuideQuotaController(
        vi.fn(async () => response.clone()) as unknown as typeof fetch,
      );
      await expect(controller.reserve(reservation())).rejects.toMatchObject({
        code: 'temporarily_unavailable',
      });
    }
  });

  it('accepts ceilings through 10000 and replaces invalid overrides with 3000', async () => {
    for (const [configured, expected] of [
      ['1', 1],
      ['10000', 10_000],
      ['10001', 3_000],
      ['999999', 3_000],
      ['0', 3_000],
    ] as const) {
      const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => (
        quotaResponse('reserved', 1, 1)
      ));
      const controller = new GuideQuotaController(fetcher as typeof fetch);
      const lease = await controller.reserve(reservation({
        env: { ...ENV, GUIDE_GLOBAL_DAILY_LIMIT: configured },
      }));
      lease.release();
      expect(JSON.parse(String(fetcher.mock.calls[0]![1]?.body)).global_limit).toBe(expected);
    }
  });

  it('retains local burst and same-conversation guards without calling the durable RPC', () => {
    const fetcher = vi.fn();
    const controller = new GuideQuotaController(fetcher as typeof fetch);
    const first = controller.reserveLocal(reservation());
    expect(() => controller.reserveLocal(reservation())).toThrowError(
      expect.objectContaining({ code: 'operation_replay' }),
    );
    first.release();

    for (let index = 1; index < 5; index += 1) {
      controller.reserveLocal(reservation({
        conversationId: `5000000${index}-1111-4111-8111-11111111111${index}`,
        operationHash: String(index).repeat(64),
      })).release();
    }
    expect(() => controller.reserveLocal(reservation({
      conversationId: '50000009-1111-4111-8111-111111111119',
      operationHash: '9'.repeat(64),
    }))).toThrowError(expect.objectContaining({ code: 'rate_limited' }));
    const crisis = controller.reserveLocal(reservation({
      conversationId: '70000009-1111-4111-8111-111111111119',
      operationHash: '8'.repeat(64),
    }), 'crisis');
    crisis.release();
    expect(fetcher).not.toHaveBeenCalled();
  });
});
