import { describe, expect, it, vi } from 'vitest';
import {
  handleProQuotes,
  PRO_QUOTES_RATE_LIMIT_ID,
} from '../../src/pro/server/quote-gateway.mjs';
import { checkProQuotePlatformRateLimit } from '../../api/registry-pro-quotes.js';

const ENV = {
  NODE_ENV: 'production',
  REGISTRY_PRO_QUOTES_ENABLED: '1',
  JUPITER_API_KEY: 'server-key-1234567890',
};

function request(body: unknown = {
  sign: 'aries', side: 'buy', amount: '25000000', slippageBps: 50,
}) {
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

function quote(provider: 'jupiter' | 'raydium', outputAmount: string) {
  return {
    version: 1,
    provider,
    providerLabel: provider === 'jupiter'
      ? 'Swap V2 Meta-Aggregator · Ultra mode'
      : 'Raydium route',
    capabilities: { quote: true, prepare: false, sign: false, submit: false },
    inputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    outputMint: 'GhFiFrExPY3proVF96oth1gESWA5QPQzdtb8cy8b1YZv',
    inputAmount: '25000000',
    outputAmount,
    minimumOutput: null,
    slippageBps: provider === 'jupiter' ? 26 : 50,
    feeBps: provider === 'jupiter' ? 10 : null,
    platformFeeBps: provider === 'jupiter' ? 10 : null,
    priceImpactPct: provider === 'raydium' ? 0.2 : null,
    route: [provider === 'jupiter' ? 'metis' : 'HRn98YLGigP475eS1GaQYRMbqk1V4dkV6tdKyLhVh2iS'],
    observedAt: '2026-08-10T00:00:00.000Z',
    expiresAt: '2026-08-10T00:00:30.000Z',
    executable: false,
  };
}

async function invoke(req: any = request(), dependencies: Record<string, unknown> = {}) {
  const res = responseRecorder();
  await handleProQuotes(req, res, {
    env: ENV,
    now: () => Date.parse('2026-08-10T00:00:01.000Z'),
    rateLimit: vi.fn().mockResolvedValue(false),
    jupiterQuote: vi.fn().mockResolvedValue(quote('jupiter', '125000000000')),
    raydiumQuote: vi.fn().mockResolvedValue(quote('raydium', '124000000000')),
    ...dependencies,
  });
  return res;
}

describe('Zodiac Markets quote gateway', () => {
  it('returns only normalized quote-only results for the same pair and exact input', async () => {
    const jupiterQuote = vi.fn().mockResolvedValue(quote('jupiter', '125000000000'));
    const raydiumQuote = vi.fn().mockResolvedValue(quote('raydium', '124000000000'));
    const response = await invoke(request(), { jupiterQuote, raydiumQuote });
    expect(response.statusCode).toBe(200);
    const payload = JSON.parse(response.body);
    expect(payload).toMatchObject({
      status: 'complete', sign: 'aries', side: 'buy', highestQuotedOutputProvider: 'jupiter',
    });
    expect(payload.results).toHaveLength(2);
    expect(response.body).not.toMatch(/requestId|transaction|api.?key|server-key/iu);
    expect(payload.results.every((entry: any) => entry.quote.executable === false)).toBe(true);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(jupiterQuote).toHaveBeenCalledWith(expect.objectContaining({
      intent: expect.objectContaining({ amount: '25000000' }),
      apiKey: ENV.JUPITER_API_KEY,
    }));
    expect(raydiumQuote).toHaveBeenCalledWith(expect.objectContaining({
      intent: expect.objectContaining({ amount: '25000000' }),
    }));
    expect(jupiterQuote.mock.calls[0][0].intent).toEqual(raydiumQuote.mock.calls[0][0].intent);
  });

  it('returns a labelled partial answer instead of hiding provider failure', async () => {
    const response = await invoke(request(), {
      raydiumQuote: vi.fn().mockRejectedValue(Object.assign(new Error('pause'), {
        name: 'ProQuoteError', code: 'rate_limited', retryAfterMs: 12_000,
      })),
    });
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toMatchObject({
      status: 'partial',
      results: [
        { provider: 'jupiter', status: 'ready' },
        { provider: 'raydium', status: 'failed' },
      ],
    });
  });

  it('derives the sell direction server-side from the committed Registry', async () => {
    const jupiterQuote = vi.fn().mockResolvedValue(quote('jupiter', '25000000'));
    const raydiumQuote = vi.fn().mockResolvedValue(quote('raydium', '24900000'));
    const response = await invoke(request({
      sign: 'aries', side: 'sell', amount: '125000000000', slippageBps: 50,
    }), { jupiterQuote, raydiumQuote });
    expect(response.statusCode).toBe(200);
    for (const provider of [jupiterQuote, raydiumQuote]) {
      expect(provider).toHaveBeenCalledWith(expect.objectContaining({
        intent: expect.objectContaining({
          inputMint: 'GhFiFrExPY3proVF96oth1gESWA5QPQzdtb8cy8b1YZv',
          outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          amount: '125000000000',
        }),
      }));
    }
  });

  it.each([
    ['cross origin', { ...request(), headers: { origin: 'https://attacker.test', host: 'zodiacs.org' } }, 403, 'forbidden'],
    ['method', { ...request(), method: 'GET' }, 405, 'method'],
    ['bad sign', request({ sign: 'ophiuchus', side: 'buy', amount: '25000000', slippageBps: 50 }), 400, 'invalid_intent'],
    ['wallet field', request({ sign: 'aries', side: 'buy', amount: '25000000', slippageBps: 50, wallet: '11111111111111111111111111111111' }), 400, 'invalid_intent'],
    ['scientific amount', request({ sign: 'aries', side: 'buy', amount: '2.5e7', slippageBps: 50 }), 400, 'invalid_intent'],
  ])('handles %s without forwarding unsafe input', async (_label, req, status, error) => {
    const jupiterQuote = vi.fn().mockResolvedValue(quote('jupiter', '125000000000'));
    const response = await invoke(req, { jupiterQuote });
    expect(response.statusCode).toBe(status);
    if (error) expect(JSON.parse(response.body)).toEqual({ error });
    if (status !== 200) expect(jupiterQuote).not.toHaveBeenCalled();
  });

  it('rejects unknown client fields before deriving the pair from the Registry', async () => {
    const jupiterQuote = vi.fn().mockResolvedValue(quote('jupiter', '125000000000'));
    const response = await invoke(request({
      sign: 'aries', side: 'buy', amount: '25000000', slippageBps: 50,
      wallet: '11111111111111111111111111111111',
      inputMint: 'attacker-controlled',
    }), { jupiterQuote });
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({ error: 'invalid_intent' });
    expect(jupiterQuote).not.toHaveBeenCalled();
  });

  it('stays dark unless both the server flag and Jupiter key exist', async () => {
    for (const env of [
      { JUPITER_API_KEY: ENV.JUPITER_API_KEY },
      { REGISTRY_PRO_QUOTES_ENABLED: '1' },
      { REGISTRY_PRO_QUOTES_ENABLED: 'true', JUPITER_API_KEY: ENV.JUPITER_API_KEY },
    ]) {
      const response = await invoke(request(), { env, jupiterQuote: vi.fn() });
      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.body)).toEqual({ error: 'disabled' });
    }
  });

  it('fails closed when the rate limiter is missing, broken, or denies', async () => {
    const missing = await invoke(request(), { rateLimit: null });
    expect(missing.statusCode).toBe(503);

    const unavailable = await invoke(request(), {
      rateLimit: vi.fn().mockResolvedValue({ error: 'not-found', rateLimited: false }),
    });
    expect(unavailable.statusCode).toBe(503);

    const broken = await invoke(request(), { rateLimit: vi.fn().mockRejectedValue(new Error('down')) });
    expect(broken.statusCode).toBe(503);

    const limited = await invoke(request(), { rateLimit: vi.fn().mockResolvedValue(true) });
    expect(limited.statusCode).toBe(429);
  });

  it('rejects oversized bodies before any provider call', async () => {
    const req = request();
    req.headers = { ...req.headers, 'content-length': '513' };
    const jupiterQuote = vi.fn();
    const response = await invoke(req, { jupiterQuote });
    expect(response.statusCode).toBe(400);
    expect(jupiterQuote).not.toHaveBeenCalled();
  });

  it('uses a dedicated Vercel Firewall counter without forwarding the body', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const firewallFetch = vi.fn(async () => new Response(null, { status: 429 }));
    vi.stubGlobal('fetch', firewallFetch);
    try {
      await expect(checkProQuotePlatformRateLimit({
        headers: { host: 'zodiacs.org', 'x-real-ip': '203.0.113.9' },
      })).resolves.toMatchObject({ rateLimited: true });
      expect(String(firewallFetch.mock.calls[0]?.[0])).toContain(PRO_QUOTES_RATE_LIMIT_ID);
      expect(JSON.stringify(firewallFetch.mock.calls)).not.toContain('25000000');
    } finally {
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
    }
  });
});
