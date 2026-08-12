import { describe, expect, it } from 'vitest';
import { REVIEW_AGAIN_BPS, createTradePanel } from '../src/trade/panel.mjs';
import { TradeError } from '../src/trade/ultra.mjs';
import { USDC_MINT } from '../src/trade/panel-model.mjs';

const ARIES = { name: 'Aries', slug: 'aries', mint: 'GhFiFrExPY3proVF96oth1gESWA5QPQzdtb8cy8b1YZv' };

function order(overrides = {}) {
  return {
    inputMint: USDC_MINT,
    outputMint: ARIES.mint,
    inAmount: 25_000_000n,
    outAmount: 362_586_000_000n,
    priceImpactPct: 0.013,
    feeBps: 10,
    outUsdValue: 25.32,
    requestId: 'rid-1',
    transaction: null,
    routeLabels: ['Raydium CP'],
    ...overrides,
  };
}

/** Runs timers immediately so the debounce does not need real time. */
function harness(overrides = {}) {
  const calls = { fetch: [], execute: [], signed: [], connected: 0 };
  const baseFetch = overrides.fetchOrder || (async () => order());
  const baseExecute = overrides.executeOrder
    || (async () => ({ signature: 'sig-1', status: 'Success' }));
  const baseWallet = overrides.wallet || {
    getAddress: () => 'Wa11etAddress',
    connect: async () => 'Wa11etAddress',
    signTransaction: async (tx) => 'signed:' + tx,
  };
  const deps = {
    fetchOrder: async (args) => { calls.fetch.push(args); return baseFetch(args); },
    executeOrder: async (args) => { calls.execute.push(args); return baseExecute(args); },
    wallet: {
      getAddress: () => baseWallet.getAddress(),
      connect: async () => { calls.connected += 1; return baseWallet.connect(); },
      signTransaction: async (tx) => { calls.signed.push(tx); return baseWallet.signTransaction(tx); },
    },
    onChange: overrides.onChange,
    now: overrides.now,
    fetchLiquidity: overrides.fetchLiquidity,
    setTimeout: (fn) => { fn(); return 1; },
    clearTimeout: () => {},
  };
  const panel = createTradePanel({ sign: ARIES, deps });
  return { panel, calls, deps };
}

describe('quoting', () => {
  it('asks for a price without sending an address', async () => {
    const { panel, calls } = harness();
    await panel.refreshQuote();
    expect(calls.fetch).toHaveLength(1);
    expect(calls.fetch[0].taker).toBeUndefined();
    expect(calls.fetch[0].inputMint).toBe(USDC_MINT);
    expect(panel.state.state).toBe('ready');
  });

  it('discards a quote that a newer amount has overtaken', async () => {
    let resolveFirst;
    let call = 0;
    const { panel } = harness({
      fetchOrder: async () => {
        call += 1;
        if (call === 1) return new Promise((r) => { resolveFirst = () => r(order({ outAmount: 1n })); });
        return order();
      },
    });
    const stale = panel.refreshQuote();
    const fresh = panel.refreshQuote();
    resolveFirst();
    await Promise.all([stale, fresh]);
    // The slow first answer must not overwrite the newer one.
    expect(panel.state.quote.outAmount).toBe(362_586_000_000n);
  });

  it('refuses an amount it cannot honour exactly', async () => {
    const { panel } = harness();
    panel.setAmount('0.0000001');
    await panel.refreshQuote();
    expect(panel.state.state).toBe('error');
    expect(panel.state.error).toBe('invalid_amount');
  });

  it('timestamps the quote and adds indexed depth without making it a trade dependency', async () => {
    const { panel } = harness({ now: () => 25_000, fetchLiquidity: async () => 42_500 });
    await panel.refreshQuote();
    await panel.refreshMarketContext();
    expect(panel.state.quotedAt).toBe(25_000);
    expect(panel.state.indexedLiquidityUsd).toBe(42_500);
    expect(panel.view().details.map((item) => item.label)).toEqual([
      'Official mint', 'Quote age', 'Indexed liquidity',
    ]);
  });
});

describe('reviewing in the wallet', () => {
  it('fetches a signable order for the address, then signs and executes', async () => {
    const { panel, calls } = harness({
      fetchOrder: async (args) => order({ transaction: args.taker ? 'AQAB' : null }),
    });
    await panel.refreshQuote();
    await panel.review();

    const signable = calls.fetch.at(-1);
    expect(signable.taker).toBe('Wa11etAddress');
    expect(calls.signed).toEqual(['AQAB']);
    expect(calls.execute[0]).toMatchObject({ signedTransaction: 'signed:AQAB', requestId: 'rid-1' });
    expect(calls.execute[0].signal).toBeInstanceOf(AbortSignal);
    expect(panel.state.state).toBe('done');
    expect(panel.state.signature).toBe('sig-1');
  });

  it('locks the amount and route while a wallet approval is in flight', async () => {
    const { panel } = harness({
      fetchOrder: async (args) => order({ transaction: args.taker ? 'AQAB' : null }),
    });
    await panel.refreshQuote();
    const reviewing = panel.review();
    panel.setAmount('250');
    panel.setPayMethod('usdc');
    expect(panel.state.amount).toBe('25');
    expect(panel.state.payMethod).toBe('card');
    await reviewing;
  });

  it('connects only when no address is already available', async () => {
    const { panel, calls } = harness({
      fetchOrder: async (args) => order({ transaction: args.taker ? 'AQAB' : null }),
      wallet: {
        getAddress: () => null,
        connect: async () => 'FreshAddress',
        signTransaction: async (tx) => 'signed:' + tx,
      },
    });
    await panel.review();
    expect(calls.fetch.at(-1).taker).toBe('FreshAddress');
  });

  it('never executes an order the guard rejected', async () => {
    const { panel, calls } = harness({
      // The venue answers for a different token than the one on screen.
      fetchOrder: async (args) => order({
        outputMint: args.taker ? 'EjkkxYpfSwS6TAtKKuiJuNMMngYvumc1t1v9ZX1WJKMp' : ARIES.mint,
        transaction: args.taker ? 'AQAB' : null,
      }),
    });
    await panel.refreshQuote();
    await panel.review();
    expect(panel.state.state).toBe('error');
    expect(panel.state.error).toBe('order_mismatch');
    expect(calls.signed).toHaveLength(0);
    expect(calls.execute).toHaveLength(0);
  });

  it('refuses to sign an order with no transaction attached', async () => {
    const { panel, calls } = harness({ fetchOrder: async () => order({ transaction: null }) });
    await panel.refreshQuote();
    await panel.review();
    expect(panel.state.state).toBe('error');
    expect(calls.signed).toHaveLength(0);
  });

  it('cannot continue an old sign after its panel is destroyed', async () => {
    let releaseConnect;
    const { panel, calls } = harness({
      wallet: {
        getAddress: () => null,
        connect: () => new Promise((resolve) => { releaseConnect = resolve; }),
        signTransaction: async (tx) => 'signed:' + tx,
      },
      fetchOrder: async () => order({ transaction: 'AQAB' }),
    });
    const reviewing = panel.review();
    await Promise.resolve();
    panel.destroy();
    releaseConnect('OldSignAddress');
    await reviewing;
    expect(calls.fetch).toHaveLength(0);
    expect(calls.signed).toHaveLength(0);
    expect(calls.execute).toHaveLength(0);
  });

  it('does not abort the venue answer after a signed submission has started', async () => {
    let releaseExecute;
    const { panel, calls } = harness({
      fetchOrder: async () => order({ transaction: 'AQAB' }),
      executeOrder: () => new Promise((resolve) => { releaseExecute = resolve; }),
    });
    const reviewing = panel.review();
    while (calls.execute.length === 0) await Promise.resolve();
    panel.destroy();
    expect(calls.execute[0].signal.aborted).toBe(false);
    releaseExecute({ signature: 'sig-1', status: 'Success' });
    await reviewing;
  });
});

describe('the price moving between quote and signature', () => {
  it('shows the new figure instead of pushing a worse trade into the wallet', async () => {
    const dropped = (362_586_000_000n * BigInt(10_000 - REVIEW_AGAIN_BPS - 50)) / 10_000n;
    const { panel, calls } = harness({
      fetchOrder: async (args) => (args.taker
        ? order({ outAmount: dropped, transaction: 'AQAB' })
        : order()),
    });
    await panel.refreshQuote();
    await panel.review();

    expect(calls.signed).toHaveLength(0);
    expect(panel.state.state).toBe('ready');
    expect(panel.state.awaitingReview).toBe(true);
    expect(panel.state.quote.outAmount).toBe(dropped);
    expect(panel.view().reviewNotice).toMatch(/Nothing was sent to your wallet/i);
    expect(panel.view().actionLabel).toBe('Review refreshed quote');
    // A second press, now against the figure actually on screen, goes through.
    await panel.review();
    expect(calls.signed).toHaveLength(1);
    expect(panel.state.state).toBe('done');
  });

  it('lets ordinary drift through untouched', async () => {
    const slight = (362_586_000_000n * 9_990n) / 10_000n;   // 0.10% — well inside
    const { panel, calls } = harness({
      fetchOrder: async (args) => (args.taker ? order({ outAmount: slight, transaction: 'AQAB' }) : order()),
    });
    await panel.refreshQuote();
    await panel.review();
    expect(calls.signed).toHaveLength(1);
    expect(panel.state.state).toBe('done');
  });
});

describe('when things go wrong', () => {
  it('returns quietly to the quote when a wallet prompt is dismissed', async () => {
    const { panel } = harness({
      fetchOrder: async (args) => order({ transaction: args.taker ? 'AQAB' : null }),
      wallet: {
        getAddress: () => 'Wa11etAddress',
        connect: async () => 'Wa11etAddress',
        signTransaction: async () => { throw Object.assign(new Error('user rejected'), { name: 'WalletDismissed' }); },
      },
    });
    await panel.refreshQuote();
    await panel.review();
    // Dismissing a prompt is a choice, not an error worth shouting about.
    expect(panel.state.state).toBe('ready');
    expect(panel.state.error).toBeNull();
  });

  it('surfaces a venue failure as its code', async () => {
    const { panel } = harness({
      fetchOrder: async () => { throw new TradeError('no_route', 'no route'); },
    });
    await panel.refreshQuote();
    expect(panel.state.state).toBe('error');
    expect(panel.view().error).toContain('No price right now');
  });

  it('never tells a failed display quote that a trade may have gone through', async () => {
    const { panel } = harness({
      fetchOrder: async () => { throw new TradeError('network', 'offline'); },
    });
    await panel.refreshQuote();
    expect(panel.view().error).toContain('Nothing was sent to your wallet');
    expect(panel.view().error).not.toContain('may still have gone through');
  });

  it('stops emitting once destroyed', async () => {
    const seen = [];
    const { panel } = harness({ onChange: (v) => seen.push(v.state) });
    panel.destroy();
    await panel.refreshQuote();
    expect(seen).not.toContain('ready');
  });

  it('keeps a valid quote ready when an operating hook throws', async () => {
    const { panel } = harness({ onChange: () => { throw new Error('telemetry blocked'); } });
    await expect(panel.refreshQuote()).resolves.toBeUndefined();
    expect(panel.state.state).toBe('ready');
  });
});
