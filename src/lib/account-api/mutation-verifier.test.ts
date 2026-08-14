import { Buffer } from 'node:buffer';
import { describe, expect, it } from 'vitest';
import {
  AccountMutationVerifierFailure,
  accountMutationRequestVerifiers,
} from './mutation-verifier.js';

function env(active = 2) {
  return {
    ACCOUNT_SYNC_V2_FINGERPRINT_KEYS: JSON.stringify({
      1: Buffer.alloc(32, 0x11).toString('base64'),
      2: Buffer.alloc(32, 0x22).toString('base64'),
    }),
    ACCOUNT_SYNC_V2_ACTIVE_FINGERPRINT_KEY_VERSION: String(active),
  };
}

describe('server-only account mutation verifier', () => {
  it('returns active-first versioned HMACs and keeps retained keys rotation-compatible', () => {
    const first = accountMutationRequestVerifiers('private semantic preimage', env(1));
    const rotated = accountMutationRequestVerifiers('private semantic preimage', env(2));
    expect(first).toHaveLength(2);
    expect(first[0]).toMatch(/^1:[0-9a-f]{64}$/u);
    expect(rotated[0]).toMatch(/^2:[0-9a-f]{64}$/u);
    expect(rotated).toContain(first[0]);
    expect(first).toContain(rotated[0]);
    expect(first.join('\n')).not.toContain('private semantic preimage');
  });

  it('changes when semantics change and fails closed on a missing or malformed keyring', () => {
    expect(accountMutationRequestVerifiers('a', env())[0])
      .not.toBe(accountMutationRequestVerifiers('b', env())[0]);
    expect(() => accountMutationRequestVerifiers('a', {}))
      .toThrow(AccountMutationVerifierFailure);
    expect(() => accountMutationRequestVerifiers('a', {
      ...env(),
      ACCOUNT_SYNC_V2_FINGERPRINT_KEYS: JSON.stringify({ 2: 'not-a-key' }),
    })).toThrow(AccountMutationVerifierFailure);
  });
});
