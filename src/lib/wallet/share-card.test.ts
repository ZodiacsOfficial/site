import { describe, expect, it } from 'vitest';
import {
  WALLET_SHARE_CARD_BRAND_LAYOUT,
  walletCardAddress,
  walletCardPlacements,
} from './share-card';

describe('wallet share-card privacy surface', () => {
  it('renders the wallet-specific big three without inventing a rising sign', () => {
    expect(walletCardPlacements([
      { body: 'Sun', lon: 12.5 },
      { body: 'Moon', lon: 48.25 },
      { body: 'Mercury', lon: 181.5 },
      { body: 'Venus', lon: 220 },
    ])).toEqual([
      { body: 'Sun', slug: 'aries', sign: 'Aries', degree: 12.5 },
      { body: 'Moon', slug: 'taurus', sign: 'Taurus', degree: 18.25 },
      { body: 'Mercury', slug: 'libra', sign: 'Libra', degree: 1.5 },
    ]);
  });

  it('allows only the truncated public address onto the card', () => {
    const full = 'GhFiFrExPY3proVF96oth1gESWA5QPQzdtb8cy8b1YZv';
    expect(walletCardAddress(full)).toBe('GhFiFrE…8b1YZv');
    expect(walletCardAddress(full)).not.toBe(full);
  });

  it('reserves the standard portrait footer for the canonical logo lockup', () => {
    expect(WALLET_SHARE_CARD_BRAND_LAYOUT).toMatchObject({
      wordmarkX: 1014,
      centerY: 1290,
      iconSize: 44,
      fontSize: 22,
      gap: 0,
    });
  });
});
