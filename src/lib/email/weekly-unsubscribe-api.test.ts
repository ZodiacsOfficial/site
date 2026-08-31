import { afterEach, describe, expect, it, vi } from 'vitest';
import unsubscribeHandler from '../../../api/unsubscribe';

const ORIGINAL_ENV = { ...process.env };
const TOKEN = 'A'.repeat(43);

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function configure(): void {
  Object.assign(process.env, {
    PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
    PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
  });
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

describe('weekly digest unsubscribe page', () => {
  it('returns the designed disabled response when Preview has no public Supabase configuration', async () => {
    delete process.env.PUBLIC_SUPABASE_URL;
    delete process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    delete process.env.PUBLIC_SUPABASE_ANON_KEY;
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    const response = responseRecorder();

    await unsubscribeHandler({ method: 'GET', query: { token: TOKEN } }, response);

    expect(response.statusCode).toBe(503);
    expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
    expect(response.body).toBe('Unsubscribe is temporarily unavailable.');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('keeps GET read-only and uses the Phase 3 confirmation frame', async () => {
    configure();
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    const response = responseRecorder();

    await unsubscribeHandler({
      method: 'GET',
      query: { token: TOKEN },
    }, response);

    expect(response.statusCode).toBe(200);
    expect(fetcher).not.toHaveBeenCalled();
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
    expect(response.body).toContain('<h1>Unsubscribe?</h1>');
    expect(response.body).toContain('This turns off the weekly digest preference for this address now. A message already in flight may still arrive.');
    expect(response.body).toContain('Confirm unsubscribe');
    expect(response.body).toContain('/assets/zodiac-icons/48/aries.webp');
    expect(response.body).not.toContain('Turn off the weekly digest?');
  });

  it('revokes only on POST and offers a direct return to the digest setting', async () => {
    configure();
    const deadline = new AbortController().signal;
    const timeout = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(deadline);
    const fetcher = vi.fn().mockResolvedValue(new Response('true', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetcher);
    const response = responseRecorder();

    await unsubscribeHandler({
      method: 'POST',
      query: { token: TOKEN },
    }, response);

    expect(response.statusCode).toBe(200);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(String(fetcher.mock.calls[0]?.[0])).toBe(
      'https://project.supabase.co/rest/v1/rpc/weekly_digest_unsubscribe_v1',
    );
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ candidate_token: TOKEN }),
      signal: deadline,
    });
    expect(timeout).toHaveBeenCalledWith(5_000);
    const headers = new Headers(fetcher.mock.calls[0]?.[1]?.headers);
    expect(headers.get('apikey')).toBe('sb_publishable_test');
    expect(headers.get('authorization')).toBeNull();
    expect(response.body).toContain('<h1>Done — you’re unsubscribed.</h1>');
    expect(response.body).toContain('Your weekly digest preference is off. A message already in flight may still arrive. You can restart it from your profile.');
    expect(response.body).toContain('href="/profile/#weekly-digest"');
    expect(response.body).toContain('Restart the weekly digest');
    expect(response.body).not.toContain('You are unsubscribed.');
  });

  it('rejects malformed tokens before any database request', async () => {
    configure();
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    const response = responseRecorder();

    await unsubscribeHandler({ method: 'POST', query: { token: 'too-short' } }, response);

    expect(response.statusCode).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('fails closed when the RPC is unavailable', async () => {
    configure();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('unavailable', { status: 503 })));
    const response = responseRecorder();

    await unsubscribeHandler({ method: 'POST', query: { token: TOKEN } }, response);

    expect(response.statusCode).toBe(503);
    expect(response.body).toBe('Unsubscribe is temporarily unavailable.');
  });

  it('fails closed when the bounded RPC request aborts', async () => {
    configure();
    const deadline = AbortSignal.abort();
    vi.spyOn(AbortSignal, 'timeout').mockReturnValue(deadline);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(
      Object.assign(new Error('deadline'), { name: 'AbortError' }),
    ));
    const response = responseRecorder();

    await unsubscribeHandler({ method: 'POST', query: { token: TOKEN } }, response);

    expect(response.statusCode).toBe(503);
    expect(response.body).toBe('Unsubscribe is temporarily unavailable.');
  });
});
