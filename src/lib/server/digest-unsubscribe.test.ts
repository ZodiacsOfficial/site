import { describe, expect, it } from 'vitest';
import { signDigestUnsubscribe, verifyDigestUnsubscribe } from './digest-unsubscribe';

const USER = '11111111-1111-4111-8111-111111111111';
const SECRET = 'test-secret-value';

describe('digest unsubscribe signing', () => {
  it('round-trips a signature it produced', () => {
    const sig = signDigestUnsubscribe(USER, SECRET);
    expect(sig).toMatch(/^[A-Za-z0-9_-]+$/); // base64url
    expect(verifyDigestUnsubscribe(USER, sig, SECRET)).toBe(true);
  });

  it('rejects a tampered signature', () => {
    const sig = signDigestUnsubscribe(USER, SECRET);
    const flipped = `${sig.slice(0, -1)}${sig.at(-1) === 'A' ? 'B' : 'A'}`;
    expect(verifyDigestUnsubscribe(USER, flipped, SECRET)).toBe(false);
  });

  it('rejects a signature made with a different secret', () => {
    const sig = signDigestUnsubscribe(USER, 'other-secret');
    expect(verifyDigestUnsubscribe(USER, sig, SECRET)).toBe(false);
  });

  it('rejects a signature bound to a different user', () => {
    const sig = signDigestUnsubscribe(USER, SECRET);
    expect(verifyDigestUnsubscribe('22222222-2222-4222-8222-222222222222', sig, SECRET)).toBe(false);
  });

  it('returns false (never throws) on length-mismatched or junk input', () => {
    expect(verifyDigestUnsubscribe(USER, '', SECRET)).toBe(false);
    expect(verifyDigestUnsubscribe(USER, 'short', SECRET)).toBe(false);
    expect(verifyDigestUnsubscribe(USER, '!!!not base64!!!', SECRET)).toBe(false);
  });
});
