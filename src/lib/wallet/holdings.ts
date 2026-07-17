import registryDocument from '../../../public/registry/zodiacs.registry.json' with { type: 'json' };
import type { WalletChain } from './types';
import { validWalletProviderEndpoint, type WalletEnvironment } from './config.js';

type Fetcher = typeof fetch;

interface RegistryRepresentation {
  sign: string;
  chain: WalletChain;
  address: string;
  isOfficialRepresentation: boolean;
}

interface RegistryAsset {
  sign: string;
  representations: RegistryRepresentation[];
}

const REGISTRY_ASSETS = registryDocument.assets as RegistryAsset[];
const ZODIAC_ORDER = REGISTRY_ASSETS.map((asset) => asset.sign);
const OFFICIAL = REGISTRY_ASSETS
  .flatMap((asset) => asset.representations)
  .filter((representation) => representation.isOfficialRepresentation);

export function normalizeOfficialHeldSigns(signs: readonly string[]): string[] {
  const held = new Set(signs);
  return ZODIAC_ORDER.filter((sign) => held.has(sign));
}

// Each per-asset call goes out as its own single-object request: public
// keyless endpoints cap or reject JSON-RPC batches (observed 2026-07-17:
// mainnet-beta rate-limits getTokenAccountsByOwner, PublicNode caps that
// method at batch size 1, dRPC free tier caps batches at 3), while every
// provider accepts the calls individually. One retry with a short pause
// and, for Solana, a small concurrency window keep a shared-egress
// deployment (many tenants behind one IP) inside provider burst limits.
const RETRY_DELAY_MS = 400;
const SOLANA_CONCURRENCY = 4;

async function rpcCall(
  rpcUrl: string,
  fetcher: Fetcher,
  signal: AbortSignal | undefined,
  request: { jsonrpc: string; id: number; method: string; params: unknown[] },
): Promise<any> {
  const attempt = async () => {
    const response = await fetcher(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error(`holdings unavailable (http-error ${response.status})`);
    const payload = await response.json() as any;
    if (Array.isArray(payload) || payload?.id !== request.id || payload?.error != null) {
      throw new Error('holdings unavailable (rpc-shape)');
    }
    return payload;
  };
  try {
    return await attempt();
  } catch (error) {
    if (signal?.aborted) throw error;
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    return attempt();
  }
}

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  await Promise.all(Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (next < items.length) {
        const index = next;
        next += 1;
        results[index] = await task(items[index], index);
      }
    },
  ));
  return results;
}

async function solanaHeldSigns(
  address: string,
  rpcUrl: string,
  fetcher: Fetcher,
  signal?: AbortSignal,
): Promise<string[]> {
  const official = OFFICIAL.filter((asset) => asset.chain === 'solana');
  const held = await mapWithConcurrency(official, SOLANA_CONCURRENCY, async (asset, index) => {
    const payload = await rpcCall(rpcUrl, fetcher, signal, {
      jsonrpc: '2.0', id: index + 1, method: 'getTokenAccountsByOwner',
      params: [
        address,
        { mint: asset.address },
        { encoding: 'jsonParsed', commitment: 'confirmed' },
      ],
    });
    const value = payload?.result?.value;
    if (!Array.isArray(value)) throw new Error('holdings unavailable');

    let balance = 0n;
    for (const account of value) {
      const info = account?.account?.data?.parsed?.info;
      const amount = info?.tokenAmount?.amount;
      if (info?.mint !== asset.address
        || typeof amount !== 'string'
        || !/^\d+$/.test(amount)) {
        throw new Error('holdings unavailable');
      }
      balance += BigInt(amount);
    }
    return balance > 0n ? [asset.sign] : [];
  });
  return normalizeOfficialHeldSigns(held.flat());
}

async function baseHeldSigns(
  address: string,
  rpcUrl: string,
  fetcher: Fetcher,
  signal?: AbortSignal,
): Promise<string[]> {
  const official = OFFICIAL.filter((asset) => asset.chain === 'base');
  const ownerWord = address.toLowerCase().replace(/^0x/, '').padStart(64, '0');
  const held = await Promise.all(official.map(async (asset, index) => {
    const payload = await rpcCall(rpcUrl, fetcher, signal, {
      jsonrpc: '2.0', id: index + 1, method: 'eth_call',
      params: [{ to: asset.address, data: `0x70a08231${ownerWord}` }, 'latest'],
    });
    const result = payload?.result;
    if (typeof result !== 'string' || !/^0x[0-9a-fA-F]+$/.test(result)) {
      throw new Error('holdings unavailable');
    }
    return BigInt(result) > 0n ? [asset.sign] : [];
  }));
  return normalizeOfficialHeldSigns(held.flat());
}

/** Best-effort, read-only balance context. Failure never changes identity. */
export async function resolveOfficialHeldSigns(
  chain: WalletChain,
  address: string,
  env: WalletEnvironment,
  fetcher: Fetcher = fetch,
  signal?: AbortSignal,
): Promise<string[] | undefined> {
  try {
    const solanaRpcUrl = env.SOLANA_RPC_URL;
    const baseRpcUrl = env.BASE_RPC_URL;
    if (chain === 'solana' && solanaRpcUrl && validWalletProviderEndpoint(solanaRpcUrl, env)) {
      return await solanaHeldSigns(address, solanaRpcUrl, fetcher, signal);
    }
    if (chain === 'base' && baseRpcUrl && validWalletProviderEndpoint(baseRpcUrl, env)) {
      return await baseHeldSigns(address, baseRpcUrl, fetcher, signal);
    }
  } catch (error) {
    // Address-free by construction: the thrown messages are static strings
    // plus an HTTP status. Surfaces the provider failure mode in function
    // logs without weakening the fail-closed contract.
    console.warn('aura-holdings lookup failed', chain, (error as Error)?.message);
    return undefined;
  }
  return undefined;
}
