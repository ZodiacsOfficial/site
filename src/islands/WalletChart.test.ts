import { describe, expect, it } from 'vitest';
import { formatWalletUtc, walletBirthMatchesRequest } from './WalletChart';

describe('wallet chart timestamp receipt', () => {
  it('formats a fixed UTC instant without combining incompatible Intl options', () => {
    const receipt = formatWalletUtc('2024-03-21T12:00:00.000Z');
    expect(receipt).toContain('2024');
    expect(receipt).toContain('UTC');
  });

  it('accepts only a validated response for the exact pasted chain and address', () => {
    const request = {
      chain: 'base' as const,
      address: '0x0000000000000000000000000000000000000001',
    };
    const payload = {
      ...request,
      birthTimestamp: '2024-03-21T12:00:00.000Z',
      source: 'base-explorer',
      heldSigns: [],
    };

    expect(walletBirthMatchesRequest(payload, request)).toBe(true);
    expect(walletBirthMatchesRequest({ ...payload, address: '0x0000000000000000000000000000000000000002' }, request)).toBe(false);
    expect(walletBirthMatchesRequest({ ...payload, chain: 'solana' }, request)).toBe(false);
  });
});
