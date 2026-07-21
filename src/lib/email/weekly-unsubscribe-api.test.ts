import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import unsubscribeHandler from '../../../api/unsubscribe';

const ORIGINAL_ENV = { ...process.env };
const USER_ID = '110e8400-e29b-41d4-a716-446655440000';
const SECRET = 'test-secret-that-is-at-least-thirty-two-characters';

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.unstubAllGlobals();
});

function configure(): string {
  Object.assign(process.env, {
    PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'service_test',
    DIGEST_UNSUBSCRIBE_SECRET: SECRET,
  });
  return createHmac('sha256', SECRET)
    .update(`zodiacs-weekly-digest-unsubscribe:${USER_ID}`)
    .digest('base64url');
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
  it('keeps GET read-only and uses the Phase 3 confirmation frame', async () => {
    const signature = configure();
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    const response = responseRecorder();

    await unsubscribeHandler({
      method: 'GET',
      query: { u: USER_ID, sig: signature },
    }, response);

    expect(response.statusCode).toBe(200);
    expect(fetcher).not.toHaveBeenCalled();
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
    expect(response.body).toContain('<h1>Unsubscribe?</h1>');
    expect(response.body).toContain('This stops the weekly digest for this address. One click, effective immediately.');
    expect(response.body).toContain('Confirm unsubscribe');
    expect(response.body).toContain('/assets/zodiac-icons/48/aries.webp');
    expect(response.body).not.toContain('Turn off the weekly digest?');
  });

  it('revokes only on POST and offers a direct return to the digest setting', async () => {
    const signature = configure();
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetcher);
    const response = responseRecorder();

    await unsubscribeHandler({
      method: 'POST',
      query: { u: USER_ID, sig: signature },
    }, response);

    expect(response.statusCode).toBe(200);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(String(fetcher.mock.calls[0]?.[0])).toBe(
      `https://project.supabase.co/rest/v1/profiles?user_id=eq.${USER_ID}`,
    );
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
      method: 'PATCH',
      body: expect.stringContaining('"digest_opt_in":false'),
    });
    expect(response.body).toContain('<h1>Done — you’re unsubscribed.</h1>');
    expect(response.body).toContain('No more weekly digest. If you change your mind, restart it from your profile.');
    expect(response.body).toContain('href="/profile/#weekly-digest"');
    expect(response.body).toContain('Restart the weekly digest');
    expect(response.body).not.toContain('You are unsubscribed.');
  });
});
