import { afterEach, describe, expect, it, vi } from 'vitest';
import handler, {
  isAllowedSiteRequest,
  parseSubscription,
  parseUnsubscribe,
} from '../../api/push/subscribe.js';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.unstubAllGlobals();
});

function responseRecorder() {
  return {
    statusCode: 0,
    headers: new Map<string, string>(),
    body: '',
    setHeader(name: string, value: string) { this.headers.set(name, value); },
    end(value: string) { this.body = value; },
  };
}

describe('push subscription API input', () => {
  it('accepts the minimum browser subscription and normalizes language', () => {
    expect(parseSubscription({
      endpoint: 'https://updates.push.services.mozilla.com/wpush/v2/example',
      keys: { p256dh: 'public_key-123', auth: 'auth_key-456' },
      lang: 'es',
    })).toEqual({
      endpoint: 'https://updates.push.services.mozilla.com/wpush/v2/example',
      keys: { p256dh: 'public_key-123', auth: 'auth_key-456' },
      lang: 'es',
    });
    expect(parseSubscription({
      endpoint: 'https://updates.push.services.mozilla.com/wpush/v2/portuguese',
      keys: { p256dh: 'public_key-123', auth: 'auth_key-456' },
      lang: 'pt-BR',
    })?.lang).toBe('pt');
    expect(parseSubscription({
      endpoint: 'https://updates.push.services.mozilla.com/wpush/v2/portuguese',
      keys: { p256dh: 'public_key-123', auth: 'auth_key-456' },
      lang: 'pt',
    })?.lang).toBe('pt');
    expect(parseSubscription({
      endpoint: 'https://updates.push.services.mozilla.com/wpush/v2/french',
      keys: { p256dh: 'public_key-123', auth: 'auth_key-456' },
      lang: 'fr-FR',
    })?.lang).toBe('fr');
    expect(parseSubscription({
      endpoint: 'https://updates.push.services.mozilla.com/wpush/v2/italian',
      keys: { p256dh: 'public_key-123', auth: 'auth_key-456' },
      lang: 'it-IT',
    })?.lang).toBe('it');
  });

  it('rejects insecure endpoints and incomplete keys', () => {
    expect(parseSubscription({ endpoint: 'http://push.test/x', keys: { p256dh: 'a', auth: 'b' } })).toBeNull();
    expect(parseSubscription({ endpoint: 'https://push.test/x', keys: { p256dh: 'a' } })).toBeNull();
    expect(parseUnsubscribe({ endpoint: 'javascript:alert(1)' })).toBeNull();
  });

  it('allows the exact serving production or preview origin only', () => {
    const request = (origin: string, host = 'zodiacs.org') => ({ headers: { origin, host } });
    expect(isAllowedSiteRequest(request('https://zodiacs.org'))).toBe(true);
    expect(isAllowedSiteRequest(request('https://zodiacs-preview.vercel.app', 'zodiacs-preview.vercel.app'))).toBe(true);
    expect(isAllowedSiteRequest(request('https://attacker.test'))).toBe(false);
    expect(isAllowedSiteRequest(request('http://zodiacs.org'))).toBe(false);
    expect(isAllowedSiteRequest({ headers: { host: 'zodiacs.org' } })).toBe(false);
  });

  it('round-trips subscribe and unsubscribe through mocked service-role PostgREST calls', async () => {
    process.env.PUSH_ENABLED = '1';
    process.env.PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    vi.stubGlobal('fetch', fetchMock);
    const base = { headers: { origin: 'https://zodiacs.org', host: 'zodiacs.org' } };
    const subscription = {
      endpoint: 'https://push.test/subscription',
      keys: { p256dh: 'public-key', auth: 'auth-key' },
      lang: 'en',
    };

    const subscribeResponse = responseRecorder();
    await handler({ ...base, method: 'POST', body: subscription }, subscribeResponse);
    expect(subscribeResponse.statusCode).toBe(200);
    expect(fetchMock).toHaveBeenNthCalledWith(1,
      'https://project.supabase.co/rest/v1/push_subscriptions?on_conflict=endpoint',
      expect.objectContaining({ method: 'POST' }),
    );

    const unsubscribeResponse = responseRecorder();
    await handler({ ...base, method: 'DELETE', body: { endpoint: subscription.endpoint } }, unsubscribeResponse);
    expect(unsubscribeResponse.statusCode).toBe(200);
    expect(fetchMock).toHaveBeenNthCalledWith(2,
      'https://project.supabase.co/rest/v1/push_subscriptions?endpoint=eq.https%3A%2F%2Fpush.test%2Fsubscription',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
