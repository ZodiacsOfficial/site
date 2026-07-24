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
  representations: RegistryRepresentation[];
}

/** One official sign with a positive on-chain balance, in ui units (6 decimals). */
export interface OfficialHolding {
  sign: string;
  amount: number;
}

const OFFICIAL = (registryDocument.assets as RegistryAsset[])
  .flatMap((asset) => asset.representations)
  .filter((representation) => representation.isOfficialRepresentation);

const SOLANA_TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const RAW_PER_TOKEN = 1_000_000n;

/** Every official representation carries decimals: 6; keep whole units exact past 2^53 raw. */
function uiAmount(raw: bigint): number {
  return Number(raw / RAW_PER_TOKEN) + Number(raw % RAW_PER_TOKEN) / 1_000_000;
}

async function solanaHoldings(address: string, rpcUrl: string, fetcher: Fetcher): Promise<OfficialHolding[]> {
  const response = await fetcher(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 1, method: 'getTokenAccountsByOwner',
      params: [
        address,
        { programId: SOLANA_TOKEN_PROGRAM },
        { encoding: 'jsonParsed', commitment: 'confirmed' },
      ],
    }),
  });
  if (!response.ok) throw new Error('holdings unavailable');
  const payload = await response.json() as any;
  if (payload.error || !Array.isArray(payload.result?.value)) throw new Error('holdings unavailable');
  const balances = new Map<string, bigint>();
  for (const account of payload.result.value) {
    const info = account?.account?.data?.parsed?.info;
    const mint = info?.mint;
    const amount = info?.tokenAmount?.amount;
    if (typeof mint !== 'string' || typeof amount !== 'string' || !/^\d+$/.test(amount)) continue;
    balances.set(mint, (balances.get(mint) ?? 0n) + BigInt(amount));
  }
  return OFFICIAL
    .filter((asset) => asset.chain === 'solana' && (balances.get(asset.address) ?? 0n) > 0n)
    .map((asset) => ({ sign: asset.sign, amount: uiAmount(balances.get(asset.address)!) }));
}

async function baseHoldings(address: string, rpcUrl: string, fetcher: Fetcher): Promise<OfficialHolding[]> {
  const official = OFFICIAL.filter((asset) => asset.chain === 'base');
  const ownerWord = address.toLowerCase().replace(/^0x/, '').padStart(64, '0');
  const requests = official.map((asset, index) => ({
    jsonrpc: '2.0', id: index + 1, method: 'eth_call',
    params: [{ to: asset.address, data: `0x70a08231${ownerWord}` }, 'latest'],
  }));
  const response = await fetcher(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requests),
  });
  if (!response.ok) throw new Error('holdings unavailable');
  const payload = await response.json() as any;
  if (!Array.isArray(payload)) throw new Error('holdings unavailable');
  const byId = new Map(payload.map((entry: any) => [entry.id, entry]));
  return official.flatMap((asset, index) => {
    const result = byId.get(index + 1)?.result;
    if (typeof result !== 'string' || !/^0x[0-9a-fA-F]+$/.test(result)) return [];
    try {
      const raw = BigInt(result);
      return raw > 0n ? [{ sign: asset.sign, amount: uiAmount(raw) }] : [];
    } catch {
      return [];
    }
  });
}

/** Best-effort, read-only balance amounts. Failure never changes identity. */
export async function resolveOfficialHoldings(
  chain: WalletChain,
  address: string,
  env: WalletEnvironment,
  fetcher: Fetcher = fetch,
): Promise<OfficialHolding[] | undefined> {
  try {
    const solanaRpcUrl = env.SOLANA_RPC_URL;
    const baseRpcUrl = env.BASE_RPC_URL;
    if (chain === 'solana' && solanaRpcUrl && validWalletProviderEndpoint(solanaRpcUrl, env)) {
      return await solanaHoldings(address, solanaRpcUrl, fetcher);
    }
    if (chain === 'base' && baseRpcUrl && validWalletProviderEndpoint(baseRpcUrl, env)) {
      return await baseHoldings(address, baseRpcUrl, fetcher);
    }
  } catch {
    return undefined;
  }
  return undefined;
}

/** Best-effort, read-only balance context. Failure never changes identity. */
export async function resolveOfficialHeldSigns(
  chain: WalletChain,
  address: string,
  env: WalletEnvironment,
  fetcher: Fetcher = fetch,
): Promise<string[] | undefined> {
  const holdings = await resolveOfficialHoldings(chain, address, env, fetcher);
  return holdings?.map((holding) => holding.sign);
}
