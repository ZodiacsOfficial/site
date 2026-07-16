import { describe, expect, it, vi } from 'vitest';
import {
  checkAuraPlatformRateLimit,
  handleAuraHoldings,
  type AuraHoldingsDependencies,
} from '../../api/aura-holdings.js';

const BASE_ADDRESS = '0x0000000000000000000000000000000000000001';
const SOLANA_ADDRESS = '11111111111111111111111111111111';
const ENV = {
  NODE_ENV: 'production',
  PUBLIC_REGISTRY_AURA_ENABLED: '1',
  SOLANA_RPC_URL: 'https://solana-rpc.test/private-key',
  BASE_RPC_URL: 'https://base-rpc.test/private-key',
};

function request(body: unknown = { address: BASE_ADDRESS }) {
  return {
    method: 'POST',
    headers: { origin: 'https://zodiacs.org', host: 'zodiacs.org' },
    body,
  };
}

function responseRecorder() {
  return {
    statusCode: 0,
    headers: new Map<string, string>(),
    body: '',
    setHeader(name: string, value: string) { this.headers.set(name, value); },
    end(value: string) { this.body = value; },
  };
}

async function invoke(
  req: any = request(),
  dependencies: AuraHoldingsDependencies = {},
) {
  const response = responseRecorder();
  await handleAuraHoldings(req, response, { env: ENV, ...dependencies });
  return response;
}

describe('Aura holdings endpoint', () => {
  it('returns Base holdings without echoing the address or provider URL', async () => {
    const resolveHeldSigns = vi.fn().mockResolvedValue([
      'pisces', 'aries', 'aries', 'not-a-sign', 'taurus',
    ]);
    const response = await invoke(request(JSON.stringify({ address: BASE_ADDRESS })), {
      resolveHeldSigns,
      now: () => Date.parse('2026-07-16T00:00:00.000Z'),
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      chain: 'base',
      heldSigns: ['aries', 'taurus', 'pisces'],
      checkedAt: '2026-07-16T00:00:00.000Z',
    });
    expect(response.body).not.toContain(BASE_ADDRESS);
    expect(response.body).not.toContain('base-rpc.test');
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(resolveHeldSigns).toHaveBeenCalledWith(
      'base', BASE_ADDRESS, ENV, expect.any(Function), expect.any(AbortSignal),
    );
  });

  it('returns successful empty Solana holdings as an empty list', async () => {
    const response = await invoke(request({ address: SOLANA_ADDRESS }), {
      resolveHeldSigns: vi.fn().mockResolvedValue([]),
      now: () => 0,
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      chain: 'solana', heldSigns: [], checkedAt: '1970-01-01T00:00:00.000Z',
    });
  });

  it.each([
    ['malformed address', request({ address: 'invalid' })],
    ['malformed JSON', request('{')],
    ['missing address', request({ other: BASE_ADDRESS })],
    ['oversized parsed body', request({ address: BASE_ADDRESS, padding: 'x'.repeat(300) })],
    ['oversized raw body', request(JSON.stringify({ address: BASE_ADDRESS, padding: 'é'.repeat(120) }))],
  ])('rejects %s with the stable invalid-address response', async (_label, req) => {
    const resolveHeldSigns = vi.fn();
    const response = await invoke(req, { resolveHeldSigns });
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({ error: 'invalid_address' });
    expect(resolveHeldSigns).not.toHaveBeenCalled();
  });

  it('enforces a declared body cap before parsing', async () => {
    const req = request();
    req.headers = { ...req.headers, 'content-length': '257' };
    const resolveHeldSigns = vi.fn();
    const response = await invoke(req, { resolveHeldSigns });
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({ error: 'invalid_address' });
    expect(resolveHeldSigns).not.toHaveBeenCalled();
  });

  it('rejects cross-origin requests', async () => {
    const req = request();
    req.headers = { origin: 'https://attacker.test', host: 'zodiacs.org' };
    const resolveHeldSigns = vi.fn();
    const response = await invoke(req, { resolveHeldSigns });
    expect(response.statusCode).toBe(403);
    expect(JSON.parse(response.body)).toEqual({ error: 'forbidden' });
    expect(resolveHeldSigns).not.toHaveBeenCalled();
  });

  it('rejects a same-host origin on a different port', async () => {
    const req = request();
    req.headers = { origin: 'https://zodiacs.org:8443', host: 'zodiacs.org' };
    const response = await invoke(req, { resolveHeldSigns: vi.fn() });
    expect(response.statusCode).toBe(403);
    expect(JSON.parse(response.body)).toEqual({ error: 'forbidden' });
  });

  it('is disabled unless the independent flag and at least one RPC are configured', async () => {
    const resolveHeldSigns = vi.fn();
    const response = await invoke(request(), {
      env: { BASE_RPC_URL: 'https://base-rpc.test' },
      resolveHeldSigns,
    });
    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body)).toEqual({ error: 'disabled' });
    expect(resolveHeldSigns).not.toHaveBeenCalled();
  });

  it('returns unavailable when the detected chain has no holdings RPC', async () => {
    const response = await invoke(request(), {
      env: {
        NODE_ENV: 'production',
        PUBLIC_REGISTRY_AURA_ENABLED: '1',
        SOLANA_RPC_URL: 'https://solana-rpc.test',
      },
      resolveHeldSigns: vi.fn(),
    });
    expect(response.statusCode).toBe(503);
    expect(JSON.parse(response.body)).toEqual({ error: 'unavailable' });
  });

  it('uses an injected platform rate-limit hook before any lookup', async () => {
    const resolveHeldSigns = vi.fn();
    const response = await invoke(request(), {
      rateLimit: vi.fn().mockResolvedValue({ rateLimited: true }),
      resolveHeldSigns,
    });
    expect(response.statusCode).toBe(429);
    expect(JSON.parse(response.body)).toEqual({ error: 'rate_limited' });
    expect(resolveHeldSigns).not.toHaveBeenCalled();
  });

  it('accepts a platform hook attached to the request', async () => {
    const req = { ...request(), rateLimit: vi.fn().mockResolvedValue(true) };
    const response = await invoke(req, { resolveHeldSigns: vi.fn() });
    expect(response.statusCode).toBe(429);
    expect(JSON.parse(response.body)).toEqual({ error: 'rate_limited' });
    expect(req.rateLimit).toHaveBeenCalledOnce();
  });

  it('fails closed when the platform rate-limit hook is unavailable', async () => {
    const response = await invoke(request(), {
      rateLimit: vi.fn().mockRejectedValue(new Error('limiter unavailable')),
      resolveHeldSigns: vi.fn(),
    });
    expect(response.statusCode).toBe(503);
    expect(JSON.parse(response.body)).toEqual({ error: 'unavailable' });
  });

  it('fails closed when the platform rate-limit rule is not configured', async () => {
    const response = await invoke(request(), {
      rateLimit: vi.fn().mockResolvedValue({ rateLimited: false, error: 'not-found' }),
      resolveHeldSigns: vi.fn(),
    });
    expect(response.statusCode).toBe(503);
    expect(JSON.parse(response.body)).toEqual({ error: 'unavailable' });
  });

  it('uses the Vercel Firewall counter without forwarding the address', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const firewallFetch = vi.fn(async () => new Response(null, { status: 429 }));
    vi.stubGlobal('fetch', firewallFetch);
    try {
      await expect(checkAuraPlatformRateLimit({
        headers: { host: 'zodiacs.org', 'x-real-ip': '203.0.113.8' },
      })).resolves.toMatchObject({ rateLimited: true });
      expect(String(firewallFetch.mock.calls[0]?.[0])).toContain('/registry-aura-holdings-v1');
      expect(JSON.stringify(firewallFetch.mock.calls)).not.toContain(BASE_ADDRESS);
    } finally {
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
    }
  });

  it.each([
    ['provider failure', vi.fn().mockResolvedValue(undefined)],
    ['provider exception', vi.fn().mockRejectedValue(new Error('provider unavailable'))],
  ])('returns unavailable for %s', async (_label, resolveHeldSigns) => {
    const response = await invoke(request(), { resolveHeldSigns });
    expect(response.statusCode).toBe(503);
    expect(JSON.parse(response.body)).toEqual({ error: 'unavailable' });
    expect(response.body).not.toContain(BASE_ADDRESS);
  });

  it('maps a partial Base RPC batch to unavailable end to end', async () => {
    const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => {
      const calls = JSON.parse(String(init?.body)) as { id: number }[];
      return {
        ok: true,
        json: async () => calls.slice(0, -1).map(({ id }) => ({ id, result: '0x0' })),
      } as Response;
    });
    vi.stubGlobal('fetch', fetcher);
    try {
      const response = await invoke(request());
      expect(response.statusCode).toBe(503);
      expect(JSON.parse(response.body)).toEqual({ error: 'unavailable' });
      expect(response.body).not.toContain(BASE_ADDRESS);
      expect(response.body).not.toContain('base-rpc.test');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('aborts and returns unavailable when the provider times out', async () => {
    let observedSignal: AbortSignal | undefined;
    const resolveHeldSigns = vi.fn((
      _chain,
      _address,
      _env,
      _fetcher,
      signal?: AbortSignal,
    ) => new Promise<undefined>((resolve) => {
      observedSignal = signal;
      signal?.addEventListener('abort', () => resolve(undefined), { once: true });
    }));
    const response = await invoke(request(), { resolveHeldSigns, timeoutMs: 5 });
    expect(response.statusCode).toBe(503);
    expect(JSON.parse(response.body)).toEqual({ error: 'unavailable' });
    expect(observedSignal?.aborted).toBe(true);
  });

  it('rejects unsupported methods and advertises POST', async () => {
    const req = { ...request(), method: 'GET' };
    const response = await invoke(req, { resolveHeldSigns: vi.fn() });
    expect(response.statusCode).toBe(405);
    expect(JSON.parse(response.body)).toEqual({ error: 'method' });
    expect(response.headers.get('Allow')).toBe('POST');
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });
});
