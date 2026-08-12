import { Buffer } from 'node:buffer';
import { describe, expect, it } from 'vitest';
import { createAccountDeletionRecoverySecret } from './deletion-recovery';

describe('account deletion recovery secret', () => {
  it('creates canonical unpadded base64url for exactly 32 random bytes', () => {
    const first = createAccountDeletionRecoverySecret();
    const second = createAccountDeletionRecoverySecret();
    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/u);
    expect(first).not.toBe(second);
    expect(Buffer.from(first!, 'base64url')).toHaveLength(32);
    expect(Buffer.from(first!, 'base64url').toString('base64url')).toBe(first);
  });
});
