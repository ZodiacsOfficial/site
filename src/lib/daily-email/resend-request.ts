export const DAILY_EMAIL_USER_AGENT = 'Zodiacs.org-daily-email/1.0 (+https://zodiacs.org)';
export const RESEND_MIN_INTERVAL_MS = 250;
export const RESEND_MAX_RETRIES = 3;
export const RESEND_MAX_RETRY_AFTER_MS = 10_000;

export type ResendRequest = (input: string | URL, init?: RequestInit) => Promise<Response>;

interface RateLimitedRequestOptions {
  minIntervalMs?: number;
  maxRetries?: number;
  maxRetryAfterMs?: number;
  now?: () => number;
  sleep?: (milliseconds: number) => Promise<void>;
}
const defaultSleep = (milliseconds: number) => new Promise<void>((resolve) => {
  setTimeout(resolve, milliseconds);
});

function retryAfterMs(response: Response, now: number, maximum: number): number {
  const raw = response.headers.get('retry-after')?.trim();
  if (!raw) return Math.min(1_000, maximum);
  const seconds = Number(raw);
  const requested = Number.isFinite(seconds) && seconds >= 0
    ? seconds * 1_000
    : Date.parse(raw) - now;
  if (!Number.isFinite(requested) || requested < 0) return Math.min(1_000, maximum);
  return Math.min(Math.max(0, Math.ceil(requested)), maximum);
}

/**
 * A single serialized queue stays below Resend's team-wide request rate and
 * retries only explicit 429 responses. Retry-After is honored with a hard cap
 * so a workflow can never hang indefinitely.
 */
export function createRateLimitedResendRequest(
  fetchImpl: typeof fetch,
  options: RateLimitedRequestOptions = {},
): ResendRequest {
  const minIntervalMs = options.minIntervalMs ?? RESEND_MIN_INTERVAL_MS;
  const maxRetries = options.maxRetries ?? RESEND_MAX_RETRIES;
  const maximum = options.maxRetryAfterMs ?? RESEND_MAX_RETRY_AFTER_MS;
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? defaultSleep;
  let nextRequestAt = 0;
  let queue: Promise<void> = Promise.resolve();

  const execute = async (input: string | URL, init?: RequestInit): Promise<Response> => {
    for (let attempt = 0; ; attempt += 1) {
      const pacingDelay = Math.max(0, nextRequestAt - now());
      if (pacingDelay > 0) await sleep(pacingDelay);
      const headers = new Headers(init?.headers);
      headers.set('User-Agent', DAILY_EMAIL_USER_AGENT);
      const response = await fetchImpl(input, { ...init, headers });
      nextRequestAt = now() + minIntervalMs;
      if (response.status !== 429 || attempt >= maxRetries) return response;
      const retryDelay = Math.max(minIntervalMs, retryAfterMs(response, now(), maximum));
      try {
        await response.arrayBuffer();
      } catch {
        // Draining is best-effort; the bounded retry still applies.
      }
      await sleep(retryDelay);
      nextRequestAt = now();
    }
  };

  return (input, init) => {
    const request = queue.then(() => execute(input, init));
    queue = request.then(() => undefined, () => undefined);
    return request;
  };
}
