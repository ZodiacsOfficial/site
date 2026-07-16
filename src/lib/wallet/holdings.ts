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

async function solanaHeldSigns(
  address: string,
  rpcUrl: string,
  fetcher: Fetcher,
  signal?: AbortSignal,
): Promise<string[]> {
  const official = OFFICIAL.filter((asset) => asset.chain === 'solana');
  const requests = official.map((asset, index) => ({
    jsonrpc: '2.0', id: index + 1, method: 'getTokenAccountsByOwner',
    params: [
      address,
      { mint: asset.address },
      { encoding: 'jsonParsed', commitment: 'confirmed' },
    ],
  }));
  const response = await fetcher(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify(requests),
  });
  if (!response.ok) throw new Error('holdings unavailable');
  const payload = await response.json() as any;
  if (!Array.isArray(payload) || payload.length !== requests.length) {
    throw new Error('holdings unavailable');
  }

  const byId = new Map<number, any[]>();
  for (const entry of payload) {
    const id = entry?.id;
    const value = entry?.result?.value;
    if (!Number.isInteger(id)
      || id < 1
      || id > requests.length
      || byId.has(id)
      || entry?.error != null
      || !Array.isArray(value)) {
      throw new Error('holdings unavailable');
    }
    byId.set(id, value);
  }
  if (byId.size !== requests.length) throw new Error('holdings unavailable');

  return normalizeOfficialHeldSigns(official.flatMap((asset, index) => {
    let balance = 0n;
    for (const account of byId.get(index + 1)!) {
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
  }));
}

async function baseHeldSigns(
  address: string,
  rpcUrl: string,
  fetcher: Fetcher,
  signal?: AbortSignal,
): Promise<string[]> {
  const official = OFFICIAL.filter((asset) => asset.chain === 'base');
  const ownerWord = address.toLowerCase().replace(/^0x/, '').padStart(64, '0');
  const requests = official.map((asset, index) => ({
    jsonrpc: '2.0', id: index + 1, method: 'eth_call',
    params: [{ to: asset.address, data: `0x70a08231${ownerWord}` }, 'latest'],
  }));
  const response = await fetcher(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify(requests),
  });
  if (!response.ok) throw new Error('holdings unavailable');
  const payload = await response.json() as any;
  if (!Array.isArray(payload) || payload.length !== requests.length) {
    throw new Error('holdings unavailable');
  }

  const byId = new Map<number, string>();
  for (const entry of payload) {
    const id = entry?.id;
    const result = entry?.result;
    if (!Number.isInteger(id)
      || id < 1
      || id > requests.length
      || byId.has(id)
      || entry?.error != null
      || typeof result !== 'string'
      || !/^0x[0-9a-fA-F]+$/.test(result)) {
      throw new Error('holdings unavailable');
    }
    try {
      BigInt(result);
    } catch {
      throw new Error('holdings unavailable');
    }
    byId.set(id, result);
  }
  if (byId.size !== requests.length) throw new Error('holdings unavailable');

  return normalizeOfficialHeldSigns(official.flatMap((asset, index) => (
    BigInt(byId.get(index + 1)!) > 0n ? [asset.sign] : []
  )));
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
  } catch {
    return undefined;
  }
  return undefined;
}
