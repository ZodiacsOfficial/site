import type { WalletChain } from './types';

export type WalletEnvironment = Record<string, string | undefined>;

export function walletChartEnabled(env: WalletEnvironment): boolean {
  return env.PUBLIC_WALLET_CHART_ENABLED === '1';
}

export function auraEnabled(env: WalletEnvironment): boolean {
  return (env.PUBLIC_REGISTRY_COLLECTION_ENABLED ?? env.PUBLIC_REGISTRY_AURA_ENABLED) === '1';
}

export function validWalletProviderEndpoint(value: string | undefined, env: WalletEnvironment): boolean {
  if (!value?.trim()) return false;
  try {
    const url = new URL(value);
    if (url.protocol === 'https:') return true;
    return env.NODE_ENV !== 'production'
      && url.protocol === 'http:'
      && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
  } catch {
    return false;
  }
}

export function configuredWalletChains(env: WalletEnvironment): WalletChain[] {
  if (!walletChartEnabled(env)) return [];
  const chains: WalletChain[] = [];
  if (validWalletProviderEndpoint(env.SOLANA_RPC_URL, env)) chains.push('solana');
  const explorerConfigured = Boolean(env.BASE_EXPLORER_API_KEY?.trim())
    && (!env.BASE_EXPLORER_API_URL
      || validWalletProviderEndpoint(env.BASE_EXPLORER_API_URL, env));
  if (explorerConfigured || validWalletProviderEndpoint(env.BASE_RPC_URL, env)) chains.push('base');
  return chains;
}

/** Aura reads balances only, so Base requires an RPC endpoint rather than an explorer key. */
export function configuredAuraChains(env: WalletEnvironment): WalletChain[] {
  if (!auraEnabled(env)) return [];
  const chains: WalletChain[] = [];
  if (validWalletProviderEndpoint(env.SOLANA_RPC_URL, env)) chains.push('solana');
  if (validWalletProviderEndpoint(env.BASE_RPC_URL, env)) chains.push('base');
  return chains;
}

export function walletCacheTtlMs(env: WalletEnvironment): number {
  const seconds = Number(env.WALLET_BIRTH_CACHE_TTL_SECONDS ?? 86_400);
  const bounded = Number.isFinite(seconds) ? Math.min(Math.max(seconds, 300), 604_800) : 86_400;
  return bounded * 1_000;
}
