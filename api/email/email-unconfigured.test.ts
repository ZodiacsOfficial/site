import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UI } from '../../src/lib/i18n/ui/server';

const ORIGINAL_ENV = { ...process.env };

function responseRecorder() {
  return {
    statusCode: 0,
    headers: new Map<string, string>(),
    body: '',
    setHeader(name: string, value: string) { this.headers.set(name, value); },
    end(value: string) { this.body = value; },
  };
}

function requestHeaders(accept: string) {
  return {
    origin: 'https://zodiacs.org',
    host: 'zodiacs.org',
    accept,
  };
}

beforeEach(() => {
  process.env = {};
  vi.resetModules();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.unstubAllGlobals();
});

describe('unconfigured email endpoints', () => {
  it('imports both handlers without reading required environment at module scope', async () => {
    const [subscribe, confirm] = await Promise.all([
      import('./subscribe'),
      import('./confirm'),
    ]);

    expect(subscribe.default).toBeTypeOf('function');
    expect(confirm.default).toBeTypeOf('function');
  });

  it('returns the designed JSON 503 from subscribe without contacting a provider', async () => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    const { default: handler } = await import('./subscribe');
    const response = responseRecorder();

    await handler({
      method: 'POST',
      headers: requestHeaders('application/json'),
      body: { email: 'person@example.com', sign: 'aries', locale: 'es' },
    }, response);

    expect(response.statusCode).toBe(503);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('Content-Type')).toBe('application/json; charset=utf-8');
    expect(JSON.parse(response.body)).toEqual({ error: 'disabled' });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('returns the localized HTML 503 from a subscribe form post', async () => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    const { default: handler } = await import('./subscribe');
    const response = responseRecorder();

    await handler({
      method: 'POST',
      headers: requestHeaders('text/html'),
      body: new URLSearchParams({
        email: 'person@example.com',
        locale: 'pt-BR',
      }).toString(),
    }, response);

    expect(response.statusCode).toBe(503);
    expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
    expect(response.headers.get('Referrer-Policy')).toBe('no-referrer');
    expect(response.body).toContain('<html lang="pt-BR">');
    expect(response.body).toContain(UI.pt.emailCaptureErrorTitle);
    expect(response.body).toContain(UI.pt.emailCaptureError);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('does not let a filled honeypot bypass the unconfigured 503', async () => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    const { default: handler } = await import('./subscribe');
    const response = responseRecorder();

    await handler({
      method: 'POST',
      headers: requestHeaders('application/json'),
      body: { email: 'bot@example.com', locale: 'it', website: 'filled-by-bot' },
    }, response);

    expect(response.statusCode).toBe(503);
    expect(JSON.parse(response.body)).toEqual({ error: 'disabled' });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('returns the designed JSON 503 from confirm', async () => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    const { default: handler } = await import('./confirm');
    const response = responseRecorder();

    await handler({
      method: 'GET',
      headers: requestHeaders('application/json'),
      query: { token: 'unavailable-without-configuration' },
    }, response);

    expect(response.statusCode).toBe(503);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('Content-Type')).toBe('application/json; charset=utf-8');
    expect(JSON.parse(response.body)).toEqual({ error: 'disabled' });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('returns the existing status page as a 503 from a confirm form post', async () => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    const { default: handler } = await import('./confirm');
    const response = responseRecorder();

    await handler({
      method: 'POST',
      headers: requestHeaders('text/html'),
      body: new URLSearchParams({ token: 'unavailable-without-configuration' }).toString(),
    }, response);

    expect(response.statusCode).toBe(503);
    expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
    expect(response.body).toContain('<html lang="en">');
    expect(response.body).toContain(UI.en.emailCaptureErrorTitle);
    expect(response.body).toContain(UI.en.emailCaptureError.replaceAll("'", '&#39;'));
    expect(fetcher).not.toHaveBeenCalled();
  });
});
