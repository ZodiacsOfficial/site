import { describe, expect, it } from 'vitest';
import {
  AMOUNT_PRESETS,
  PAY_WAYS,
  afterPurchase,
  closingNote,
  errorCopy,
  impactLine,
  indexedLiquidity,
  money,
  panelView,
  quoteAge,
  shortMint,
  thinPoolWarning,
  venueFeeLine,
} from '../src/trade/panel-model.mjs';

const ARIES = {
  name: 'Aries',
  slug: 'aries',
  mint: 'GhFiFrExPY3proVF96oth1gESWA5QPQzdtb8cy8b1YZv',
};

/** A normalized Ultra order, shaped after a real $25 USDC → ARIES response. */
function quote(overrides = {}) {
  return {
    inAmount: 25_000_000n,
    outAmount: 362_586_000_000n,
    priceImpactPct: 0.013,
    feeBps: 10,
    outUsdValue: 25.32,
    ...overrides,
  };
}

describe('money reads the way a person would say it', () => {
  it('drops to cents below a dollar', () => {
    expect(money(0.025)).toBe('3¢');
    expect(money(0.4)).toBe('40¢');
    expect(money(1)).toBe('$1.00');
    expect(money(25.324)).toBe('$25.32');
  });
});

describe('quote context', () => {
  it('states age and indexed depth without presenting either as execution data', () => {
    expect(quoteAge(1_000, 5_000)).toBe('Just now');
    expect(quoteAge(1_000, 36_000)).toBe('35s ago');
    expect(indexedLiquidity(12_430)).toBe('$12K');
    expect(indexedLiquidity(null)).toBe('');
  });

  it('shortens a mint for scanning while preserving its ends', () => {
    expect(shortMint(ARIES.mint)).toBe('GhFiF…b1YZv');
  });
});

describe('the venue fee is stated in money, not a percentage', () => {
  it('converts basis points against what is being spent', () => {
    // 0.10% of $25 is two and a half cents — the figure a person can judge.
    expect(venueFeeLine('25', 10)).toBe('Jupiter’s fee — about 3¢ on this trade.');
    expect(venueFeeLine('250', 10)).toBe('Jupiter’s fee — about 25¢ on this trade.');
    expect(venueFeeLine('10000', 10)).toBe('Jupiter’s fee — about $10.00 on this trade.');
  });

  it('names Jupiter rather than implying the site charges it', () => {
    expect(venueFeeLine('25', 10)).toContain('Jupiter’s fee');
    expect(venueFeeLine('25', 10)).not.toMatch(/our fee|we charge/i);
  });
});

describe('price impact', () => {
  it('bands a quiet trade apart from one that moves a thin pool', () => {
    expect(impactLine(0.013).band).toBe('low');
    expect(impactLine(0.013).severe).toBe(false);
    expect(impactLine(7.4).band).toBe('severe');
    expect(impactLine(7.4).severe).toBe(true);
    expect(impactLine(-7.4).severe).toBe(true);
  });

  it('states the movement plainly', () => {
    expect(impactLine(0.013).text).toBe('Buying this much moves the price 0.01%.');
  });

  it('tells someone what to do about a thin pool, not just that it is thin', () => {
    const w = thinPoolWarning('Aries', 7.4);
    expect(w).toContain('Not much Aries is for sale');
    expect(w).toContain('Buying less costs you less');
  });
});

describe('the closing note follows the path actually chosen', () => {
  it('does not promise a wallet prompt on the card path', () => {
    const card = closingNote('card');
    expect(card).toContain('never sees your card');
    expect(card).not.toMatch(/your wallet will ask/i);
  });

  it('describes the wallet approval on the USDC path', () => {
    const usdc = closingNote('usdc');
    expect(usdc).toContain('Your wallet will ask you to approve');
  });

  it('always says who does the trade and that it cannot be undone', () => {
    for (const method of ['card', 'usdc']) {
      const note = closingNote(method);
      expect(note).toMatch(/Zodiacs\.org never/);
      expect(note).toMatch(/lose all its value/);
    }
    expect(closingNote('usdc')).toMatch(/Jupiter does the trade, not us/);
  });
});

describe('what happens after you buy', () => {
  it('answers the three things someone actually wonders', () => {
    const after = afterPurchase('Aries');
    expect(after.join(' ')).toContain('in your wallet already');
    expect(after.join(' ')).toContain('nothing to claim and nothing to renew');
    expect(after.join(' ')).toContain('Sell them whenever you like');
    expect(after.join(' ')).toContain('Cabinet of Twelve');
  });
});

describe('errors say what to do next', () => {
  it('never softens a mismatch — nothing reached the wallet', () => {
    const copy = errorCopy('order_mismatch');
    expect(copy).toContain('did not match what you were shown');
    expect(copy).toContain('nothing was sent to your wallet');
    expect(errorCopy('unexpected_fee')).toBe(copy);
  });

  it('keeps a display-quote outage distinct from an unconfirmed submission', () => {
    const quote = errorCopy('network');
    expect(quote).toContain('price could not be reached');
    expect(quote).toContain('Nothing was sent to your wallet');
    expect(quote).not.toContain('may still have gone through');
    // A submitted trade can still land; "failed" would invite paying twice.
    const execute = errorCopy('execute_unconfirmed');
    expect(execute).toMatch(/could not be confirmed/i);
    expect(execute).toContain('it may still have gone through');
    expect(execute).not.toMatch(/\bfailed\b/i);
  });

  it('uses plain words for a missing route', () => {
    expect(errorCopy('no_route')).toBe('No price right now. Try again in a moment, or try a smaller amount.');
    expect(errorCopy('no_route')).not.toMatch(/route|liquidity|pool/i);
  });
});

describe('the ways to pay', () => {
  it('is alphabetical and carries no ranking', () => {
    const names = PAY_WAYS.map((w) => w.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })));
    expect(names).not.toContain('Transak');
    // fomo sits in the list rather than above it: a headline and a paragraph
    // for one company is a ranking, whatever the copy says.
    expect(names).toContain('fomo');
  });

  it('badges Apple Pay only where it was verified', () => {
    expect(PAY_WAYS.filter((w) => w.applePay).map((w) => w.name)).toEqual(['fomo']);
  });

  it('says what each company does in words that survive a glance', () => {
    for (const way of PAY_WAYS) {
      expect(way.note.split(/\s+/).length, way.name).toBeLessThanOrEqual(6);
      expect(way.note, way.name).toMatch(/\.$/);
      expect(way.mark, way.name).toMatch(/^[a-z]+$/);
      expect(way.href, way.name).toMatch(/^https:\/\//);
    }
  });
});

describe('the assembled view', () => {
  it('offers the card path first, because most visitors hold no USDC', () => {
    const v = panelView({ state: 'ready', sign: ARIES, quote: quote() });
    expect(v.methods[0].id).toBe('card');
    expect(v.payMethod).toBe('card');
  });

  it('separates funding from the direct swap and names what is actually bought', () => {
    const funding = panelView({ state: 'ready', sign: ARIES, quote: quote() });
    expect(funding.assetNote).toMatch(/official fungible Aries token/i);
    expect(funding.assetNote).toMatch(/not the sculpture.*physical object.*1-of-1 NFT/i);
    expect(funding.actionIntro).toMatch(/do not complete this Zodiac order/i);
    expect(funding.methods.map((method) => method.eyebrow)).toEqual(['Fund first', 'Direct swap']);

    const direct = panelView({ state: 'ready', payMethod: 'usdc', sign: ARIES, quote: quote() });
    expect(direct.actionIntro).toMatch(/swaps USDC directly/i);
    expect(direct.actionTitle).toBe('Review & approve');
  });

  it('prices in dollars of USDC, never in SOL', () => {
    const v = panelView({ state: 'ready', sign: ARIES, quote: quote() });
    expect(v.payUnit).toBe('USDC');
    expect(JSON.stringify(v)).not.toMatch(/\bSOL\b/);
    // The lowest preset clears the on-ramp minimums a first-timer would hit.
    expect(Number(AMOUNT_PRESETS[0])).toBeGreaterThanOrEqual(25);
  });

  it('shows the amount, its worth, the fee and the impact together', () => {
    const v = panelView({ state: 'ready', sign: ARIES, amount: '25', quote: quote() });
    expect(v.receive).toBe('362,586');
    expect(v.receiveUnit).toBe('Aries');
    expect(v.receiveWorth).toBe('worth about $25.32 right now');
    expect(v.facts).toEqual([
      'Jupiter’s fee — about 3¢ on this trade.',
      'Buying this much moves the price 0.01%.',
    ]);
    expect(v.warning).toBeNull();
  });

  it('surfaces the official mint, quote age and indexed liquidity beside the quote', () => {
    const v = panelView({
      state: 'ready',
      sign: ARIES,
      quote: quote(),
      quotedAt: 1_000,
      nowMs: 26_000,
      indexedLiquidityUsd: 42_500,
    });
    expect(v.details).toEqual([
      expect.objectContaining({ label: 'Official mint', value: 'GhFiF…b1YZv', title: ARIES.mint }),
      { label: 'Quote age', value: '25s ago' },
      { label: 'Indexed liquidity', value: '$43K' },
    ]);
  });

  it('makes the 1% reprice guard visible before another wallet prompt', () => {
    const v = panelView({ state: 'ready', sign: ARIES, quote: quote(), awaitingReview: true });
    expect(v.reviewNotice).toMatch(/more than 1%/i);
    expect(v.reviewNotice).toMatch(/Nothing was sent to your wallet/i);
    expect(v.actionLabel).toBe('Review refreshed quote');
  });

  it('raises the thin-pool warning only when the pool earns it', () => {
    const calm = panelView({ state: 'ready', sign: ARIES, quote: quote() });
    expect(calm.warning).toBeNull();
    const thin = panelView({ state: 'ready', sign: ARIES, quote: quote({ priceImpactPct: 7.4 }) });
    expect(thin.warning).toContain('Not much Aries is for sale');
    expect(thin.impactBand).toBe('severe');
  });

  it('hides the quote while it is being fetched and disables the action', () => {
    const v = panelView({ state: 'quoting', sign: ARIES });
    expect(v.showQuote).toBe(false);
    expect(v.actionDisabled).toBe(true);
    expect(v.actionLabel).toBe('Finding the best price…');
  });

  it('closes the no-wallet dead end wherever a wallet is assumed', () => {
    const v = panelView({ state: 'ready', payMethod: 'usdc', sign: ARIES, quote: quote() });
    expect(v.walletHint).toContain('Phantom and Solflare are free');
  });

  it('replaces the form with the aftercare once the trade lands', () => {
    const v = panelView({ state: 'done', sign: ARIES, quote: quote() });
    expect(v.showAction).toBe(false);
    expect(v.after).toHaveLength(4);
    expect(v.note).toContain('never held your keys or funds');
  });

  it('rejects a state or payment method it does not know', () => {
    expect(() => panelView({ state: 'nope', sign: ARIES })).toThrow(/unknown state/);
    expect(() => panelView({ state: 'ready', payMethod: 'crypto', sign: ARIES })).toThrow(/unknown pay method/);
  });
});
