import { EventEmitter } from 'node:events';
import { describe, expect, it } from 'vitest';
import { createWallet } from '../src/trade/wallet.mjs';

/**
 * A Wallet Standard target, as the spec has it: the page dispatches
 * `wallet-standard:app-ready` carrying an api, and wallets either answer that
 * or announce themselves later with `wallet-standard:register-wallet`.
 */
function browser() {
  const bus = new EventEmitter();
  return {
    addEventListener: (type, fn) => bus.on(type, fn),
    removeEventListener: (type, fn) => bus.off(type, fn),
    dispatchEvent: (event) => { bus.emit(event.type, event); return true; },
    /** A wallet that was already installed when the page loaded. */
    present(...wallets) {
      bus.on('wallet-standard:app-ready', () => {});
      const ready = (api) => { for (const w of wallets) api.register(w); };
      bus.prependListener('wallet-standard:app-ready', (e) => ready(e.detail));
      return this;
    },
    /** A wallet that announces itself after the page has asked. */
    announce(...wallets) {
      bus.emit('wallet-standard:register-wallet', {
        type: 'wallet-standard:register-wallet',
        detail: (api) => { for (const w of wallets) api.register(w); },
      });
      return this;
    },
  };
}

const SIGNED = new Uint8Array([1, 2, 3, 4]);

function wallet(name, {
  accounts = [{ address: `${name}-address`, chains: ['solana:mainnet'] }],
  connect,
  sign,
  features = {},
} = {}) {
  const seen = {};
  const w = {
    name,
    accounts,
    features: {
      'standard:connect': { connect: connect ?? (async () => ({ accounts })) },
      'solana:signTransaction': {
        signTransaction: sign ?? (async (input) => {
          seen.input = input;
          return [{ signedTransaction: SIGNED }];
        }),
      },
      ...features,
    },
  };
  w.seen = seen;
  return w;
}

const b64 = (bytes) => Buffer.from(bytes).toString('base64');

describe('finding a wallet', () => {
  it('takes wallets that were already there and wallets that arrive later', async () => {
    const target = browser().present(wallet('Phantom'));
    const w = createWallet({ target, choose: (all) => all[0] });
    expect(await w.connect()).toBe('Phantom-address');

    const late = browser();
    const w2 = createWallet({ target: late, choose: (all) => all[0] });
    late.announce(wallet('Solflare'));
    expect(await w2.connect()).toBe('Solflare-address');
  });

  it('says so plainly when there is no wallet to talk to', async () => {
    const w = createWallet({ target: browser() });
    await expect(w.connect()).rejects.toMatchObject({
      name: 'TradeError',
      code: 'unavailable',
    });
    expect(w.getAddress()).toBeNull();
  });

  it('asks which one only when there is a choice', async () => {
    const asked = [];
    const one = createWallet({
      target: browser().present(wallet('Phantom')),
      choose: (all) => { asked.push(all.length); return all[0]; },
    });
    await one.connect();

    const many = createWallet({
      target: browser().present(wallet('Phantom'), wallet('Solflare')),
      choose: (all) => { asked.push(all.length); return all[1]; },
    });
    expect(await many.connect()).toBe('Solflare-address');
    expect(asked).toEqual([1, 2]);
  });

  it('connects once and then remembers', async () => {
    let calls = 0;
    const only = wallet('Phantom', {
      connect: async () => {
        calls += 1;
        return { accounts: [{ address: 'kept', chains: ['solana:mainnet'] }] };
      },
    });
    const w = createWallet({ target: browser().present(only), choose: (all) => all[0] });
    expect(await w.connect()).toBe('kept');
    expect(await w.connect()).toBe('kept');
    expect(w.getAddress()).toBe('kept');
    expect(calls).toBe(1);
  });

  it('refuses a wallet with no Solana account rather than signing with the wrong one', async () => {
    const ethOnly = wallet('Rainbow', {
      accounts: [{ address: '0xabc', chains: ['eip155:1'] }],
      connect: async () => ({ accounts: [{ address: '0xabc', chains: ['eip155:1'] }] }),
    });
    const w = createWallet({ target: browser().present(ethOnly), choose: (all) => all[0] });
    await expect(w.connect()).rejects.toMatchObject({ code: 'unavailable' });
  });
});

describe('signing', () => {
  it('hands the wallet bytes and gives Jupiter back base64', async () => {
    const only = wallet('Phantom');
    const w = createWallet({ target: browser().present(only), choose: (all) => all[0] });
    await w.connect();

    const transaction = b64(new Uint8Array([9, 8, 7]));
    expect(await w.signTransaction(transaction)).toBe(b64(SIGNED));

    // The wallet is given bytes, the account object it connected with, and a
    // chain — never a base64 string it would have to guess how to decode.
    expect(only.seen.input.transaction).toBeInstanceOf(Uint8Array);
    expect([...only.seen.input.transaction]).toEqual([9, 8, 7]);
    expect(only.seen.input.account.address).toBe('Phantom-address');
    expect(only.seen.input.chain).toBe('solana:mainnet');
  });

  it('survives a transaction larger than an argument list', async () => {
    const big = new Uint8Array(70_000).map((_, i) => i % 251);
    const only = wallet('Phantom', { sign: async () => [{ signedTransaction: big }] });
    const w = createWallet({ target: browser().present(only), choose: (all) => all[0] });
    await w.connect();
    expect(await w.signTransaction(b64(new Uint8Array([1])))).toBe(b64(big));
  });

  it('will not sign before a wallet is connected', async () => {
    const w = createWallet({ target: browser().present(wallet('Phantom')) });
    await expect(w.signTransaction(b64(new Uint8Array([1]))))
      .rejects.toMatchObject({ code: 'unavailable' });
  });

  it('will not pretend a wallet that cannot sign here can', async () => {
    const noSign = wallet('Viewer');
    delete noSign.features['solana:signTransaction'];
    const w = createWallet({ target: browser().present(noSign), choose: (all) => all[0] });
    await w.connect();
    await expect(w.signTransaction(b64(new Uint8Array([1]))))
      .rejects.toMatchObject({ code: 'unavailable' });
  });

  it('will not submit nothing', async () => {
    const empty = wallet('Phantom', { sign: async () => [] });
    const w = createWallet({ target: browser().present(empty), choose: (all) => all[0] });
    await w.connect();
    await expect(w.signTransaction(b64(new Uint8Array([1]))))
      .rejects.toMatchObject({ code: 'unavailable' });
  });
});

describe('being told no', () => {
  // The panel treats WalletDismissed as a quiet return rather than a failure,
  // so every shape a wallet uses to say "the visitor closed me" must land
  // there — otherwise closing a prompt reads as an error the site caused.
  const refusals = [
    Object.assign(new Error('User rejected the request'), { code: 4001 }),
    new Error('User rejected the request.'),
    new Error('Transaction was declined'),
    new Error('The user cancelled'),
    Object.assign(new Error('opaque'), { code: -32603 }),
  ];

  it.each(refusals.map((e, i) => [i, e]))('reads refusal %i as a dismissal', async (_i, error) => {
    const grumpy = wallet('Phantom', { connect: async () => { throw error; } });
    const w = createWallet({ target: browser().present(grumpy), choose: (all) => all[0] });
    await expect(w.connect()).rejects.toMatchObject({ name: 'WalletDismissed' });
  });

  it('reads a refusal at the signing step too', async () => {
    const grumpy = wallet('Phantom', {
      sign: async () => { throw Object.assign(new Error('nope'), { code: 4001 }); },
    });
    const w = createWallet({ target: browser().present(grumpy), choose: (all) => all[0] });
    await w.connect();
    await expect(w.signTransaction(b64(new Uint8Array([1]))))
      .rejects.toMatchObject({ name: 'WalletDismissed' });
  });

  it('does not swallow a real fault as a dismissal', async () => {
    const broken = wallet('Phantom', {
      connect: async () => { throw new Error('network unreachable'); },
    });
    const w = createWallet({ target: browser().present(broken), choose: (all) => all[0] });
    await expect(w.connect()).rejects.toThrow('network unreachable');
  });
});
