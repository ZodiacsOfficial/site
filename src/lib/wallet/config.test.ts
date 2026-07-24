import { describe, expect, it } from 'vitest';
import { configuredCollectionChains, configuredWalletChains, walletCacheTtlMs } from './config';

describe('wallet chart feature configuration', () => {
  it('is dead unless the flag and a server-only provider are both set', () => {
    expect(configuredWalletChains({ SOLANA_RPC_URL: 'https://rpc.test' })).toEqual([]);
    expect(configuredWalletChains({ PUBLIC_WALLET_CHART_ENABLED: '1' })).toEqual([]);
    expect(configuredWalletChains({
      PUBLIC_WALLET_CHART_ENABLED: '1',
      SOLANA_RPC_URL: 'https://rpc.test',
      BASE_EXPLORER_API_KEY: 'server-secret',
    })).toEqual(['solana', 'base']);
    expect(configuredWalletChains({
      NODE_ENV: 'production',
      PUBLIC_WALLET_CHART_ENABLED: '1',
      SOLANA_RPC_URL: 'http://rpc.test',
    })).toEqual([]);
  });

  it('counts a collection chain only with its own flag and an RPC balance endpoint', () => {
    expect(configuredCollectionChains({ SOLANA_RPC_URL: 'https://rpc.test' })).toEqual([]);
    expect(configuredCollectionChains({ PUBLIC_COLLECTION_ENABLED: '1' })).toEqual([]);
    expect(configuredCollectionChains({
      PUBLIC_COLLECTION_ENABLED: '1',
      SOLANA_RPC_URL: 'https://rpc.test',
      BASE_RPC_URL: 'https://base.test',
    })).toEqual(['solana', 'base']);
    // An explorer key powers the wallet-chart history provider, not balance reads.
    expect(configuredCollectionChains({
      PUBLIC_COLLECTION_ENABLED: '1',
      BASE_EXPLORER_API_KEY: 'server-secret',
    })).toEqual([]);
    // The wallet-chart flag never enables the collection checker.
    expect(configuredCollectionChains({
      PUBLIC_WALLET_CHART_ENABLED: '1',
      SOLANA_RPC_URL: 'https://rpc.test',
    })).toEqual([]);
  });

  it('bounds warm-function cache time', () => {
    expect(walletCacheTtlMs({ WALLET_BIRTH_CACHE_TTL_SECONDS: '1' })).toBe(300_000);
    expect(walletCacheTtlMs({ WALLET_BIRTH_CACHE_TTL_SECONDS: '9999999' })).toBe(604_800_000);
    expect(walletCacheTtlMs({})).toBe(86_400_000);
  });
});
