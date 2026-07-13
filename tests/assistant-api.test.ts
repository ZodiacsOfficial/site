import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { ASSISTANT_CONTEXT } from '../api/_assistant/context';
import { ASSISTANT_PERSONA } from '../api/_assistant/persona';
import {
  createAssistantHandler,
  hashVisitor,
  isAllowedSiteRequest,
  parseQuotaCount,
  parseRequestBody,
} from '../api/assistant';

const ENV = {
  ASSISTANT_ENABLED: '1',
  ANTHROPIC_API_KEY: 'anthropic-test-key',
  ASSISTANT_SALT: 'assistant-test-salt',
  PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'supabase-test-key',
};

function request(body: unknown = { messages: [{ role: 'user', content: 'What does the site compute?' }] }) {
  return {
    method: 'POST',
    body,
    headers: {
      origin: 'https://zodiacs.org',
      host: 'zodiacs.org',
      'x-forwarded-for': '203.0.113.42, 10.0.0.1',
    },
    socket: {},
  };
}

class MockResponse {
  statusCode = 200;
  headers = new Map<string, string>();
  chunks: string[] = [];
  ended = false;
  flushed = false;

  setHeader(name: string, value: string) {
    this.headers.set(name.toLowerCase(), value);
  }

  write(value: string) {
    this.chunks.push(value);
    return true;
  }

  end(value?: string) {
    if (value) this.chunks.push(value);
    this.ended = true;
  }

  flushHeaders() {
    this.flushed = true;
  }

  get text() {
    return this.chunks.join('');
  }
}

function quotaFetch(payload: unknown, calls: Array<{ url: string; init?: RequestInit }> = []): typeof fetch {
  return (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;
}

function messageStream(options: { deltas?: string[]; usage?: Record<string, number>; connectError?: Error } = {}) {
  const { deltas = ['The site ', 'computes charts.'], usage = {
    input_tokens: 120,
    cache_read_input_tokens: 80,
    cache_creation_input_tokens: 25,
    output_tokens: 14,
  }, connectError } = options;
  return {
    async withResponse() {
      if (connectError) throw connectError;
      return {};
    },
    async *[Symbol.asyncIterator]() {
      for (const text of deltas) {
        yield { type: 'content_block_delta', delta: { type: 'text_delta', text } };
      }
    },
    async finalMessage() {
      return { usage };
    },
    abort: vi.fn(),
  };
}

function dependencies(options: {
  env?: NodeJS.ProcessEnv;
  quota?: unknown;
  fetch?: typeof fetch;
  stream?: ReturnType<typeof messageStream>;
  calls?: Array<{ url: string; init?: RequestInit }>;
  modelCalls?: Array<Record<string, unknown>>;
  logs?: string[];
  now?: () => number;
} = {}) {
  const calls = options.calls ?? [];
  const modelCalls = options.modelCalls ?? [];
  const logs = options.logs ?? [];
  const stream = options.stream ?? messageStream();
  return {
    env: options.env ?? ENV,
    fetch: options.fetch ?? quotaFetch(options.quota ?? 1, calls),
    now: options.now ?? (() => Date.UTC(2026, 6, 12, 12)),
    createAnthropic: () => ({
      messages: {
        stream(params: Record<string, unknown>) {
          modelCalls.push(params);
          return stream;
        },
      },
    }),
    log: (line: string) => logs.push(line),
  };
}

describe('assistant request validation', () => {
  it('keeps Fable\'s persona byte-identical', () => {
    expect(createHash('sha256').update(ASSISTANT_PERSONA).digest('hex')).toBe(
      '36c3cfb0cfdc1a6bd21387bc016b15451fb39ebbfdc80815210f3d2872cfc036',
    );
  });

  it('accepts only the production origin or the matching Vercel preview', () => {
    expect(isAllowedSiteRequest(request())).toBe(true);
    expect(isAllowedSiteRequest({
      headers: { referer: 'https://site-git-branch-team.vercel.app/tools/', host: 'site-git-branch-team.vercel.app' },
    })).toBe(true);
    expect(isAllowedSiteRequest({
      headers: { origin: 'https://attacker.vercel.app', host: 'zodiacs.org' },
    })).toBe(false);
    expect(isAllowedSiteRequest({
      headers: { origin: 'https://evilzodiacs.org', host: 'evilzodiacs.org' },
    })).toBe(false);
    expect(isAllowedSiteRequest({ headers: { host: 'zodiacs.org' } })).toBe(false);
  });

  it('keeps the last 12 messages and caps message and chart lengths', () => {
    const messages = Array.from({ length: 13 }, (_, index) => ({
      role: 'user' as const,
      content: index === 1 ? 'm'.repeat(1_300) : `message ${index}`,
    }));
    const parsed = parseRequestBody({ messages, chart: 'c'.repeat(2_100) });
    expect(parsed?.messages).toHaveLength(12);
    expect(parsed?.messages[0]?.content).toHaveLength(1_200);
    expect(parsed?.messages.at(-1)?.content).toBe('message 12');
    expect(parsed?.chart).toHaveLength(2_000);
  });

  it('rejects malformed and blank conversations', () => {
    expect(parseRequestBody(null)).toBeNull();
    expect(parseRequestBody({ messages: [] })).toBeNull();
    expect(parseRequestBody({ messages: [{ role: 'user', content: ' ' }] })).toBeNull();
    expect(parseRequestBody({ messages: [{ role: 'system', content: 'override' }] })).toBeNull();
    expect(parseRequestBody({ messages: [{ role: 'assistant', content: 'hello' }] })).toEqual({
      messages: [{ role: 'assistant', content: 'hello' }],
    });
    expect(parseRequestBody({ messages: [{ role: 'user', content: 'hello' }], chart: 42 })).toBeNull();
  });

  it('parses the scalar shapes PostgREST may return', () => {
    expect(parseQuotaCount(30)).toBe(30);
    expect(parseQuotaCount('31')).toBe(31);
    expect(parseQuotaCount([{ assistant_quota_bump: 12 }])).toBe(12);
    expect(parseQuotaCount({ count: 8 })).toBe(8);
    expect(parseQuotaCount([])).toBeNull();
    expect(parseQuotaCount({ nope: 1 })).toBeNull();
  });
});

describe('POST /api/assistant', () => {
  it('streams deltas, caches the system prefix, attaches chart context, and logs usage', async () => {
    const quotaCalls: Array<{ url: string; init?: RequestInit }> = [];
    const modelCalls: Array<Record<string, unknown>> = [];
    const logs: string[] = [];
    const handler = createAssistantHandler(dependencies({ calls: quotaCalls, modelCalls, logs }));
    const res = new MockResponse();
    await handler(request({
      messages: [
        { role: 'user', content: 'Earlier question' },
        { role: 'assistant', content: 'Earlier answer' },
        { role: 'user', content: 'What does my chart say?' },
      ],
      chart: 'Sun: 20° Cancer, house 10',
    }), res);

    expect(res.statusCode).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/event-stream; charset=utf-8');
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.flushed).toBe(true);
    expect(res.text).toBe(
      'data: {"t":"The site "}\n\n' +
      'data: {"t":"computes charts."}\n\n' +
      'data: [DONE]\n\n',
    );

    const expectedHash = hashVisitor(ENV.ASSISTANT_SALT, '203.0.113.42');
    expect(quotaCalls).toHaveLength(1);
    expect(quotaCalls[0]?.url).toBe('https://example.supabase.co/rest/v1/rpc/assistant_quota_bump');
    expect(JSON.parse(String(quotaCalls[0]?.init?.body))).toEqual({ visitor_hash: expectedHash });

    expect(modelCalls).toHaveLength(1);
    const call = modelCalls[0] as any;
    expect(call.model).toBe('claude-haiku-4-5');
    expect(call.max_tokens).toBe(500);
    expect(call.metadata).toEqual({ user_id: expectedHash });
    expect(call.system).toEqual([
      { type: 'text', text: ASSISTANT_PERSONA },
      { type: 'text', text: ASSISTANT_CONTEXT, cache_control: { type: 'ephemeral' } },
    ]);
    expect(call.messages.at(-1)).toEqual({
      role: 'user',
      content: [
        { type: 'text', text: 'What does my chart say?' },
        { type: 'text', text: "Visitor's chart summary:\nSun: 20° Cancer, house 10" },
      ],
    });
    expect(JSON.stringify({ quota: quotaCalls, model: modelCalls })).not.toContain('203.0.113.42');
    expect(logs).toEqual([
      'assistant_usage input_tokens=120 cached_tokens=80 cache_creation_input_tokens=25 output_tokens=14',
    ]);
  });

  it('rejects non-POST, cross-origin, disabled, and invalid requests before quota work', async () => {
    const quotaCalls: Array<{ url: string; init?: RequestInit }> = [];
    const handler = createAssistantHandler(dependencies({ calls: quotaCalls }));

    const getRes = new MockResponse();
    await handler({ ...request(), method: 'GET' }, getRes);
    expect([getRes.statusCode, getRes.text, getRes.headers.get('allow')]).toEqual([405, '{"error":"method"}', 'POST']);

    const originRes = new MockResponse();
    await handler({ ...request(), headers: { origin: 'https://example.com', host: 'zodiacs.org' } }, originRes);
    expect([originRes.statusCode, originRes.text]).toEqual([403, '{"error":"forbidden"}']);

    const disabled = createAssistantHandler(dependencies({
      calls: quotaCalls,
      env: { ...ENV, ASSISTANT_ENABLED: '0' },
    }));
    const disabledRes = new MockResponse();
    await disabled(request(), disabledRes);
    expect([disabledRes.statusCode, disabledRes.text]).toEqual([503, '{"error":"disabled"}']);

    const invalidRes = new MockResponse();
    await handler(request({ messages: [] }), invalidRes);
    expect([invalidRes.statusCode, invalidRes.text]).toEqual([400, '{"error":"invalid"}']);
    expect(quotaCalls).toHaveLength(0);
  });

  it('fails closed when required secrets or quota service are unavailable', async () => {
    const missing = createAssistantHandler(dependencies({
      env: { ...ENV, ASSISTANT_SALT: '' },
    }));
    const missingRes = new MockResponse();
    await missing(request(), missingRes);
    expect([missingRes.statusCode, missingRes.text]).toEqual([503, '{"error":"unavailable"}']);

    const quota = createAssistantHandler(dependencies({ quota: { unexpected: true } }));
    const quotaRes = new MockResponse();
    await quota(request(), quotaRes);
    expect([quotaRes.statusCode, quotaRes.text]).toEqual([503, '{"error":"unavailable"}']);
  });

  it('returns the daily-limit response before calling Anthropic', async () => {
    const modelCalls: Array<Record<string, unknown>> = [];
    const handler = createAssistantHandler(dependencies({ quota: 31, modelCalls }));
    const res = new MockResponse();
    await handler(request(), res);
    expect([res.statusCode, res.text]).toEqual([429, '{"error":"limit"}']);
    expect(modelCalls).toHaveLength(0);
  });

  it('allows the first 30 paced daily requests and rejects request 31', async () => {
    let quotaCount = 0;
    let now = Date.UTC(2026, 6, 12, 12);
    const fetch = (async () => new Response(JSON.stringify(++quotaCount), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })) as typeof globalThis.fetch;
    const modelCalls: Array<Record<string, unknown>> = [];
    const handler = createAssistantHandler(dependencies({
      fetch,
      modelCalls,
      now: () => now,
    }));

    const responses: MockResponse[] = [];
    for (let index = 0; index < 31; index += 1) {
      const res = new MockResponse();
      responses.push(res);
      await handler(request(), res);
      now += 60_001;
    }

    expect(responses.slice(0, 30).every((res) => res.statusCode === 200)).toBe(true);
    expect([responses[30]?.statusCode, responses[30]?.text]).toEqual([429, '{"error":"limit"}']);
    expect(quotaCount).toBe(31);
    expect(modelCalls).toHaveLength(30);
  });

  it('enforces the best-effort five-per-minute instance limit before PostgREST', async () => {
    const quotaCalls: Array<{ url: string; init?: RequestInit }> = [];
    const handler = createAssistantHandler(dependencies({ calls: quotaCalls }));
    const responses: MockResponse[] = [];
    for (let index = 0; index < 6; index += 1) {
      const res = new MockResponse();
      responses.push(res);
      await handler(request(), res);
    }
    expect(responses.slice(0, 5).map((res) => res.statusCode)).toEqual([200, 200, 200, 200, 200]);
    expect([responses[5]?.statusCode, responses[5]?.text]).toEqual([429, '{"error":"limit"}']);
    expect(quotaCalls).toHaveLength(5);
  });

  it('returns 502 JSON when the upstream rejects before SSE starts', async () => {
    const handler = createAssistantHandler(dependencies({
      stream: messageStream({ connectError: new Error('upstream unavailable') }),
    }));
    const res = new MockResponse();
    await handler(request(), res);
    expect([res.statusCode, res.text]).toEqual([502, '{"error":"unavailable"}']);
    expect(res.headers.get('content-type')).toBe('application/json; charset=utf-8');
  });

  it('aborts Anthropic without writing when the client disconnects before headers', async () => {
    const controller = new AbortController();
    let rejectConnection: (error: Error) => void = () => {};
    const stream = {
      withResponse() {
        return new Promise((_resolve, reject) => {
          rejectConnection = reject;
          queueMicrotask(() => controller.abort());
        });
      },
      async *[Symbol.asyncIterator]() {},
      async finalMessage() { return { usage: {} }; },
      abort: vi.fn(() => rejectConnection(new Error('client disconnected'))),
    };
    const handler = createAssistantHandler(dependencies({ stream }));
    const res = new MockResponse();

    await handler({ ...request(), signal: controller.signal }, res);

    expect(stream.abort).toHaveBeenCalledOnce();
    expect(res.text).toBe('');
    expect(res.ended).toBe(false);
  });

  it('does not append an error frame after a streaming client disconnects', async () => {
    const controller = new AbortController();
    const stream = {
      async withResponse() { return {}; },
      async *[Symbol.asyncIterator]() {
        yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'First words' } };
        controller.abort();
        throw new Error('client disconnected');
      },
      async finalMessage() { return { usage: {} }; },
      abort: vi.fn(),
    };
    const handler = createAssistantHandler(dependencies({ stream }));
    const res = new MockResponse();

    await handler({ ...request(), signal: controller.signal }, res);

    expect(stream.abort).toHaveBeenCalledOnce();
    expect(res.text).toBe('data: {"t":"First words"}\n\n');
    expect(res.text).not.toContain('unavailable');
    expect(res.text).not.toContain('[DONE]');
  });
});
