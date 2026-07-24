import { parseWalletAddress } from '../src/lib/wallet/address.js';
import {
  configuredCollectionChains,
  walletCacheTtlMs,
  type WalletEnvironment,
} from '../src/lib/wallet/config.js';
import { resolveOfficialHoldings, type OfficialHolding } from '../src/lib/wallet/holdings.js';
import { isAllowedWalletRequest } from './wallet-birth.js';
import type { WalletChain } from '../src/lib/wallet/types';

export interface CollectionHoldingsResult {
  chain: WalletChain;
  address: string;
  holdings: OfficialHolding[];
  totalAmount: number;
  checkedAt: string;
}

type CollectionErrorCode = 'method' | 'forbidden' | 'disabled' | 'invalid_address' | 'unavailable';

interface CacheEntry {
  expiresAt: number;
  value: CollectionHoldingsResult;
}

interface CollectionHoldingsDependencies {
  env?: WalletEnvironment;
  now?: () => number;
  resolveHoldings?: typeof resolveOfficialHoldings;
}

const MAX_CACHE_ENTRIES = 1_000;
const holdingsCache = new Map<string, CacheEntry>();

/** One balance read per chain; nothing paginates, so the default window is generous. */
export const config = { maxDuration: 30 };

function parseBody(input: unknown): unknown {
  if (typeof input !== 'string') return input;
  if (input.length > 256) return null;
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

function inputAddress(input: unknown): unknown {
  const body = parseBody(input);
  return body && typeof body === 'object' ? (body as { address?: unknown }).address : null;
}

function sendJson(
  res: any,
  status: number,
  body: CollectionHoldingsResult | { error: CollectionErrorCode },
): void {
  res.statusCode = status;
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(body));
}

function trimCache(now: number): void {
  for (const [key, entry] of holdingsCache) {
    if (entry.expiresAt <= now) holdingsCache.delete(key);
  }
  while (holdingsCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = holdingsCache.keys().next().value;
    if (typeof oldest !== 'string') break;
    holdingsCache.delete(oldest);
  }
}

export function clearCollectionHoldingsCache(): void {
  holdingsCache.clear();
}

export async function handleCollectionHoldings(
  req: any,
  res: any,
  dependencies: CollectionHoldingsDependencies = {},
): Promise<void> {
  const env = dependencies.env ?? process.env;
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendJson(res, 405, { error: 'method' });
    return;
  }
  if (!isAllowedWalletRequest(req, env)) {
    sendJson(res, 403, { error: 'forbidden' });
    return;
  }

  const configuredChains = configuredCollectionChains(env);
  if (configuredChains.length === 0) {
    sendJson(res, 404, { error: 'disabled' });
    return;
  }

  // Unlike the wallet-birth verifier, a balance read has no unknown-address
  // concept — malformed input gets an honest 400 instead of a neutral outcome.
  const parsed = parseWalletAddress(inputAddress(req.body));
  if (!parsed) {
    sendJson(res, 400, { error: 'invalid_address' });
    return;
  }
  if (!configuredChains.includes(parsed.chain)) {
    sendJson(res, 503, { error: 'unavailable' });
    return;
  }

  const now = (dependencies.now ?? Date.now)();
  const cacheKey = `${parsed.chain}:${parsed.address}`;
  const cached = holdingsCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    sendJson(res, 200, cached.value);
    return;
  }

  const resolveHoldings = dependencies.resolveHoldings ?? resolveOfficialHoldings;
  const holdings = await resolveHoldings(parsed.chain, parsed.address, env);
  // Best-effort failure is a distinct outcome from a successful empty read,
  // and failures are never cached.
  if (holdings === undefined) {
    sendJson(res, 503, { error: 'unavailable' });
    return;
  }

  const value: CollectionHoldingsResult = {
    chain: parsed.chain,
    address: parsed.address,
    holdings,
    totalAmount: holdings.reduce((sum, holding) => sum + holding.amount, 0),
    checkedAt: new Date(now).toISOString(),
  };
  trimCache(now);
  holdingsCache.set(cacheKey, { expiresAt: now + walletCacheTtlMs(env), value });
  sendJson(res, 200, value);
}

export default async function handler(req: any, res: any): Promise<void> {
  return handleCollectionHoldings(req, res);
}
