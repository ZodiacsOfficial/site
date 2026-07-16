import { describe, expect, it, vi } from 'vitest';
import {
  connectEip6963Provider,
  connectSolanaWallet,
  watchEip6963Providers,
  watchSolanaWallets,
  type Eip6963ProviderDetail,
  type StandardWallet,
} from './aura-connectors';

const SOLANA_ADDRESS = '11111111111111111111111111111111';
const BASE_ADDRESS = '0x1111111111111111111111111111111111111111';

describe('Aura wallet connectors', () => {
  it('discovers Wallet Standard wallets without requesting an account', () => {
    const target = new EventTarget();
    const connect = vi.fn();
    const wallet = { name: 'Quiet Wallet', features: { 'standard:connect': { connect } } } as StandardWallet;
    target.addEventListener('wallet-standard:app-ready', ((event: Event) => {
      (event as CustomEvent<{ register: (candidate: StandardWallet) => void }>).detail.register(wallet);
    }) as EventListener);
    const seen: (readonly StandardWallet[])[] = [];

    const stop = watchSolanaWallets((wallets) => seen.push(wallets), target);

    expect(seen.at(-1)).toEqual([wallet]);
    expect(connect).not.toHaveBeenCalled();
    stop();
  });

  it('connects through the public Wallet Standard account feature and invalidates only when accounts change', async () => {
    let change: ((value: { accounts?: readonly { address: string; chains?: string[] }[] }) => void) | undefined;
    const off = vi.fn();
    const wallet = {
      name: 'Quiet Wallet',
      accounts: [],
      features: {
        'standard:connect': {
          connect: vi.fn().mockResolvedValue({
            accounts: [{ address: SOLANA_ADDRESS, chains: ['solana:mainnet'] }],
          }),
        },
        'standard:events': {
          on: vi.fn((_event, listener) => { change = listener; return off; }),
        },
      },
    } as StandardWallet;
    const accountChanged = vi.fn();

    const session = await connectSolanaWallet(wallet, accountChanged);
    expect(session).toMatchObject({ chain: 'solana', address: SOLANA_ADDRESS });
    expect(wallet.features['standard:connect']?.connect).toHaveBeenCalledTimes(1);

    change?.({});
    expect(accountChanged).not.toHaveBeenCalled();
    change?.({ accounts: [] });
    expect(accountChanged).toHaveBeenCalledTimes(1);
    expect(accountChanged).toHaveBeenCalledWith(null);
    session.dispose();
    expect(off).toHaveBeenCalledTimes(1);
  });

  it('makes Wallet Standard disconnect best-effort and leaves local invalidation to the session owner', async () => {
    const disconnect = vi.fn().mockRejectedValue(new Error('wallet refused disconnect'));
    const wallet = {
      name: 'Quiet Wallet',
      accounts: [],
      features: {
        'standard:connect': {
          connect: vi.fn().mockResolvedValue({
            accounts: [{ address: SOLANA_ADDRESS, chains: ['solana:mainnet'] }],
          }),
        },
        'standard:disconnect': { disconnect },
      },
    } as StandardWallet;
    const accountChanged = vi.fn();

    const session = await connectSolanaWallet(wallet, accountChanged);

    await expect(session.disconnect()).resolves.toBeUndefined();
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(accountChanged).not.toHaveBeenCalled();
  });

  it('discovers EIP-6963 providers without requesting accounts', () => {
    const target = new EventTarget();
    const request = vi.fn();
    const detail = {
      info: { uuid: '0796f7a1-229c-48c4-a275-9d77f623b43f', name: 'Base Wallet' },
      provider: { request },
    } satisfies Eip6963ProviderDetail;
    target.addEventListener('eip6963:requestProvider', () => {
      target.dispatchEvent(new CustomEvent('eip6963:announceProvider', { detail }));
    });
    const seen: (readonly Eip6963ProviderDetail[])[] = [];

    const stop = watchEip6963Providers((providers) => seen.push(providers), target);

    expect(seen.at(-1)?.[0]).toBe(detail);
    expect(request).not.toHaveBeenCalled();
    stop();
  });

  it('uses only the EVM public-account request and clears on account change', async () => {
    const listeners = new Map<string, (value?: unknown) => void>();
    const request = vi.fn().mockResolvedValue([BASE_ADDRESS]);
    const detail: Eip6963ProviderDetail = {
      info: { uuid: '0796f7a1-229c-48c4-a275-9d77f623b43f', name: 'Base Wallet' },
      provider: {
        request,
        on: (event, listener) => { listeners.set(event, listener); },
        removeListener: (event) => { listeners.delete(event); },
      },
    };
    const accountChanged = vi.fn();

    const session = await connectEip6963Provider(detail, accountChanged);

    expect(request).toHaveBeenCalledWith({ method: 'eth_requestAccounts' });
    expect(request).toHaveBeenCalledTimes(1);
    expect(session).toMatchObject({ chain: 'base', address: BASE_ADDRESS });
    listeners.get('accountsChanged')?.([]);
    expect(accountChanged).toHaveBeenLastCalledWith(null);

    accountChanged.mockClear();
    await expect(session.disconnect()).resolves.toBeUndefined();
    expect(accountChanged).not.toHaveBeenCalled();
  });
});
