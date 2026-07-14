import { describe, expect, it } from 'vitest';
import { formatWalletUtc } from './WalletChart';

describe('wallet chart timestamp receipt', () => {
  it('formats a fixed UTC instant without combining incompatible Intl options', () => {
    const receipt = formatWalletUtc('2024-03-21T12:00:00.000Z');
    expect(receipt).toContain('2024');
    expect(receipt).toContain('UTC');
  });
});
