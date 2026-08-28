import { describe, expect, it } from 'vitest';
import {
  createDigestUnsubscribeCapability,
  hashDigestUnsubscribeCapability,
  isDigestUnsubscribeCapability,
} from './digest-unsubscribe';

describe('digest unsubscribe capabilities', () => {
  it('creates a 256-bit base64url capability and stores only its digest', () => {
    const capability = createDigestUnsubscribeCapability();
    expect(capability).toMatch(/^[A-Za-z0-9_-]{43}$/u);
    expect(isDigestUnsubscribeCapability(capability)).toBe(true);
    expect(hashDigestUnsubscribeCapability(capability)).toMatch(/^[a-f0-9]{64}$/u);
    expect(hashDigestUnsubscribeCapability(capability)).not.toContain(capability);
  });

  it('rejects malformed capability input before hashing', () => {
    for (const capability of ['', 'short', 'A'.repeat(44), '!!!not-base64url!!!']) {
      expect(isDigestUnsubscribeCapability(capability)).toBe(false);
      expect(() => hashDigestUnsubscribeCapability(capability))
        .toThrow('Invalid weekly digest unsubscribe capability.');
    }
  });
});
