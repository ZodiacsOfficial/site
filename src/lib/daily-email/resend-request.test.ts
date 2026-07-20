import { describe, expect, it, vi } from 'vitest';
import {
  DAILY_EMAIL_USER_AGENT,
  createRateLimitedResendRequest,
} from './resend-request';

describe('rate-limited Resend request queue', () => {
  it('adds the required user agent and deterministically paces sequential calls', async () => {
    let time = 1_000;
    const sleep = vi.fn(async (milliseconds: number) => { time += milliseconds; });
    const fetcher = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    const request = createRateLimitedResendRequest(fetcher, {
      now: () => time,
      sleep,
      minIntervalMs: 250,
    });
    await request('https://api.resend.com/segments');
    await request('https://api.resend.com/segments');
    expect(sleep).toHaveBeenCalledWith(250);
    const headers = fetcher.mock.calls[0][1].headers as Headers;
    expect(headers.get('user-agent')).toBe(DAILY_EMAIL_USER_AGENT);
  });

  it('honors Retry-After for bounded 429 retries and then succeeds', async () => {
    let time = 1_000;
    const sleep = vi.fn(async (milliseconds: number) => { time += milliseconds; });
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response('slow down', {
        status: 429,
        headers: { 'Retry-After': '2' },
      }))
      .mockResolvedValueOnce(new Response('{"id":"ok"}', { status: 200 }));
    const request = createRateLimitedResendRequest(fetcher, {
      now: () => time,
      sleep,
      minIntervalMs: 250,
      maxRetries: 2,
    });
    await expect(request('https://api.resend.com/emails')).resolves.toMatchObject({ status: 200 });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(2_000);
  });

  it('stops after the configured retry count', async () => {
    let time = 1_000;
    const sleep = vi.fn(async (milliseconds: number) => { time += milliseconds; });
    const fetcher = vi.fn().mockResolvedValue(new Response('', { status: 429 }));
    const request = createRateLimitedResendRequest(fetcher, {
      now: () => time,
      sleep,
      maxRetries: 1,
    });
    await expect(request('https://api.resend.com/emails')).resolves.toMatchObject({ status: 429 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
