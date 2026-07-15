import { parseWalletAddress } from '../src/lib/wallet/address.js';
import {
  configuredWalletChains,
  walletCacheTtlMs,
  type WalletEnvironment,
} from '../src/lib/wallet/config.js';
import { resolveOfficialHeldSigns } from '../src/lib/wallet/holdings.js';
import {
  createWalletBirthProvider,
  HistoryCostBoundaryError,
} from '../src/lib/wallet/providers.js';
import type {
  WalletBirth,
  WalletBirthErrorCode,
  WalletBirthProvider,
} from '../src/lib/wallet/types';

interface CacheEntry {
  expiresAt: number;
  value: WalletBirth | null;
}

interface WalletBirthDependencies {
  env?: WalletEnvironment;
  now?: () => number;
  provider?: WalletBirthProvider;
  resolveHeldSigns?: typeof resolveOfficialHeldSigns;
}

const MAX_CACHE_ENTRIES = 1_000;
const birthCache = new Map<string, CacheEntry>();

/** Old Solana histories require sequential cursor pages; stay within Vercel's bounded function window. */
export const config = { maxDuration: 60 };

function firstHeader(value: unknown): string {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : '';
  return typeof value === 'string' ? value : '';
}

function requestHeader(req: any, name: string): string {
  if (typeof req.get === 'function') {
    const value = req.get(name);
    if (typeof value === 'string') return value;
  }
  return firstHeader(req.headers?.[name.toLowerCase()]);
}

function hostname(value: string): string {
  const first = value.split(',')[0]?.trim().toLowerCase() ?? '';
  if (!first) return '';
  try {
    return new URL(first.includes('://') ? first : `https://${first}`).hostname.toLowerCase();
  } catch {
    return '';
  }
}

/** Same-origin POSTs only, to keep a public chain-history endpoint from becoming an open relay. */
export function isAllowedWalletRequest(req: any, env: WalletEnvironment = process.env): boolean {
  const source = requestHeader(req, 'origin') || requestHeader(req, 'referer');
  if (!source) return false;
  let sourceUrl: URL;
  try {
    sourceUrl = new URL(source);
  } catch {
    return false;
  }
  const requestHost = hostname(requestHeader(req, 'x-forwarded-host') || requestHeader(req, 'host'));
  if (!requestHost || sourceUrl.hostname.toLowerCase() !== requestHost) return false;
  if (sourceUrl.protocol === 'https:') {
    return requestHost === 'zodiacs.org'
      || requestHost === 'www.zodiacs.org'
      || requestHost.endsWith('.vercel.app');
  }
  return env.NODE_ENV !== 'production'
    && sourceUrl.protocol === 'http:'
    && (requestHost === 'localhost' || requestHost === '127.0.0.1');
}

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
  body: WalletBirth | { error: WalletBirthErrorCode },
): void {
  res.statusCode = status;
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(body));
}

function trimCache(now: number): void {
  for (const [key, entry] of birthCache) {
    if (entry.expiresAt <= now) birthCache.delete(key);
  }
  while (birthCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = birthCache.keys().next().value;
    if (typeof oldest !== 'string') break;
    birthCache.delete(oldest);
  }
}

export function clearWalletBirthCache(): void {
  birthCache.clear();
}

export async function handleWalletBirth(
  req: any,
  res: any,
  dependencies: WalletBirthDependencies = {},
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

  const configuredChains = configuredWalletChains(env);
  if (configuredChains.length === 0) {
    sendJson(res, 404, { error: 'disabled' });
    return;
  }

  const parsed = parseWalletAddress(inputAddress(req.body));
  // Invalid and unknown addresses deliberately share the verifier's neutral outcome.
  if (!parsed) {
    sendJson(res, 404, { error: 'not_found' });
    return;
  }
  if (!configuredChains.includes(parsed.chain)) {
    sendJson(res, 503, { error: 'unavailable' });
    return;
  }

  const now = (dependencies.now ?? Date.now)();
  const cacheKey = `${parsed.chain}:${parsed.address}`;
  const cached = birthCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    sendJson(res, cached.value ? 200 : 404, cached.value ?? { error: 'not_found' });
    return;
  }

  const provider = dependencies.provider ?? createWalletBirthProvider(parsed.chain, env);
  if (!provider || provider.chain !== parsed.chain) {
    sendJson(res, 503, { error: 'unavailable' });
    return;
  }

  try {
    const birth = await provider.resolveEarliestTransaction(parsed.address);
    const expiresAt = now + walletCacheTtlMs(env);
    if (!birth) {
      trimCache(now);
      birthCache.set(cacheKey, { expiresAt: Math.min(expiresAt, now + 300_000), value: null });
      sendJson(res, 404, { error: 'not_found' });
      return;
    }

    const resolveHeldSigns = dependencies.resolveHeldSigns ?? resolveOfficialHeldSigns;
    const heldSigns = await resolveHeldSigns(parsed.chain, parsed.address, env);
    const value: WalletBirth = heldSigns === undefined ? birth : { ...birth, heldSigns };
    trimCache(now);
    birthCache.set(cacheKey, { expiresAt, value });
    sendJson(res, 200, value);
  } catch (error) {
    if (error instanceof HistoryCostBoundaryError) {
      sendJson(res, 422, { error: 'history_too_deep' });
      return;
    }
    sendJson(res, 503, { error: 'unavailable' });
  }
}

export default async function handler(req: any, res: any): Promise<void> {
  return handleWalletBirth(req, res);
}
