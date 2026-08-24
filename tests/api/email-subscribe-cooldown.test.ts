import { describe, expect, it } from 'vitest';
import { weeklyRecipientOnCooldown } from '../../api/email/subscribe.js';

describe('weekly capture recipient cooldown', () => {
  it('holds a recipient for ten minutes and releases afterwards', () => {
    const base = 1_756_000_000_000;
    expect(weeklyRecipientOnCooldown('reader@example.com', base)).toBe(false);
    expect(weeklyRecipientOnCooldown('reader@example.com', base + 60_000)).toBe(true);
    expect(weeklyRecipientOnCooldown('reader@example.com', base + 9 * 60_000)).toBe(true);
    expect(weeklyRecipientOnCooldown('reader@example.com', base + 10 * 60_000 + 1)).toBe(false);
  });

  it('normalizes case and whitespace so variants share one window', () => {
    const base = 1_756_100_000_000;
    expect(weeklyRecipientOnCooldown('Case@Example.com', base)).toBe(false);
    expect(weeklyRecipientOnCooldown('  case@example.com ', base + 1_000)).toBe(true);
  });

  it('keeps distinct recipients independent and the map bounded', () => {
    const base = 1_756_200_000_000;
    for (let i = 0; i < 6_000; i += 1) {
      expect(weeklyRecipientOnCooldown(`bulk-${i}@example.com`, base + i)).toBe(false);
    }
    // The insertion-order bound evicted the oldest entries, so an early
    // recipient re-enters cleanly while a recent one is still held.
    expect(weeklyRecipientOnCooldown('bulk-0@example.com', base + 6_001)).toBe(false);
    expect(weeklyRecipientOnCooldown('bulk-5999@example.com', base + 6_002)).toBe(true);
  });
});
