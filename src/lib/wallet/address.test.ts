import { describe, expect, it } from 'vitest';
import {
  isBaseAddress,
  isSolanaAddress,
  parseWalletAddress,
  truncateWalletAddress,
} from './address';

describe('wallet address validation', () => {
  const SOLANA = 'GhFiFrExPY3proVF96oth1gESWA5QPQzdtb8cy8b1YZv';
  const BASE = '0x3ffB5282F5891Dd8c813E64059EdB0607537eC91';

  it('validates the two paste-only public-key formats without a wallet dependency', () => {
    expect(isSolanaAddress(SOLANA)).toBe(true);
    expect(isBaseAddress(BASE)).toBe(true);
    expect(parseWalletAddress(SOLANA)).toEqual({ chain: 'solana', address: SOLANA });
    expect(parseWalletAddress(BASE)).toEqual({ chain: 'base', address: BASE.toLowerCase() });
  });

  it('rejects glyph-confusable, short, and non-address input', () => {
    expect(isSolanaAddress(SOLANA.replace('G', '0'))).toBe(false);
    expect(parseWalletAddress('0x1234')).toBeNull();
    expect(parseWalletAddress('connect wallet')).toBeNull();
    expect(parseWalletAddress(null)).toBeNull();
  });

  it('never exposes a full address on the rendered share surface', () => {
    const shortened = truncateWalletAddress(BASE);
    expect(shortened).toBe('0x3ffB5…37eC91');
    expect(shortened).not.toContain(BASE);
  });
});
