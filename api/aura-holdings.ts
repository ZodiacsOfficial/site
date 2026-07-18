import { checkRateLimit } from '@vercel/firewall';
import { isAllowedWalletRequest } from './wallet-birth.js';
import { parseWalletAddress } from '../src/lib/wallet/address.js';
import {
  configuredAuraChains,
  type WalletEnvironment,
} from '../src/lib/wallet/config.js';
import {
  normalizeOfficialHoldings,
  resolveOfficialHoldings,
} from '../src/lib/wallet/holdings.js';
import type {
  AuraHoldings,
  AuraHoldingsErrorCode,
} from '../src/lib/wallet/types';

type RateLimitResult = boolean | { rateLimited?: boolean; error?: string } | void;

export const AURA_RATE_LIMIT_ID = 'registry-aura-holdings-v1';

export type AuraRateLimitHook = (
  req: any,
) => RateLimitResult | Promise<RateLimitResult>;

export interface AuraHoldingsDependencies {
  env?: WalletEnvironment;
  now?: () => number;
  rateLimit?: AuraRateLimitHook;
  resolveHoldings?: typeof resolveOfficialHoldings;
  timeoutMs?: number;
}

const MAX_BODY_BYTES = 256;
const DEFAULT_TIMEOUT_MS = 10_000;
// Bounded below the exported maxDuration (15s) so an honest 503 can always
// be serialized before the platform kills the invocation.
const MAX_TIMEOUT_MS = 12_000;

/** The upstream timeout leaves room for the function to serialize an honest 503. */
export const config = { maxDuration: 15 };

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

function declaredBodyIsOversized(req: any): boolean {
  const value = requestHeader(req, 'content-length').trim();
  return /^\d+$/.test(value) && Number(value) > MAX_BODY_BYTES;
}

function bodyByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function parseBody(input: unknown): unknown {
  if (typeof input === 'string') {
    if (bodyByteLength(input) > MAX_BODY_BYTES) return null;
    try {
      return JSON.parse(input);
    } catch {
      return null;
    }
  }

  if (input instanceof Uint8Array) {
    if (input.byteLength > MAX_BODY_BYTES) return null;
    try {
      return JSON.parse(new TextDecoder().decode(input));
    } catch {
      return null;
    }
  }

  try {
    const serialized = JSON.stringify(input);
    if (typeof serialized !== 'string' || bodyByteLength(serialized) > MAX_BODY_BYTES) return null;
  } catch {
    return null;
  }
  return input;
}

function inputAddress(input: unknown): unknown {
  const body = parseBody(input);
  return body && typeof body === 'object' && !Array.isArray(body)
    ? (body as { address?: unknown }).address
    : null;
}

function sendJson(
  res: any,
  status: number,
  body: AuraHoldings | { error: AuraHoldingsErrorCode },
): void {
  res.statusCode = status;
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(body));
}

function boundedTimeout(value: number | undefined): number {
  if (!Number.isFinite(value)) return DEFAULT_TIMEOUT_MS;
  return Math.min(Math.max(Math.floor(value!), 1), MAX_TIMEOUT_MS);
}

function requestRateLimitHook(
  req: any,
  dependencies: AuraHoldingsDependencies,
): AuraRateLimitHook | undefined {
  if (dependencies.rateLimit) return dependencies.rateLimit;
  if (typeof req.rateLimit !== 'function') return undefined;
  return req.rateLimit.bind(req) as AuraRateLimitHook;
}

async function isRateLimited(
  req: any,
  dependencies: AuraHoldingsDependencies,
): Promise<boolean> {
  const hook = requestRateLimitHook(req, dependencies);
  if (!hook) return false;
  const result = await hook(req);
  if (Boolean(result) && typeof result === 'object' && result.error === 'not-found') {
    throw new Error('Aura rate-limit rule is not configured.');
  }
  return result === true
    || (Boolean(result) && typeof result === 'object' && result.rateLimited === true);
}

/** Uses Vercel's per-region firewall counters; the matching WAF rule must use this exported ID. */
export async function checkAuraPlatformRateLimit(req: any): Promise<RateLimitResult> {
  return checkRateLimit(AURA_RATE_LIMIT_ID, { headers: req.headers });
}

async function holdingsWithTimeout(
  chain: 'solana' | 'base',
  address: string,
  env: WalletEnvironment,
  dependencies: AuraHoldingsDependencies,
): ReturnType<typeof resolveOfficialHoldings> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<undefined>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve(undefined);
    }, boundedTimeout(dependencies.timeoutMs));
  });
  const resolver = dependencies.resolveHoldings ?? resolveOfficialHoldings;
  try {
    return await Promise.race([
      resolver(chain, address, env, fetch, controller.signal),
      timeout,
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function handleAuraHoldings(
  req: any,
  res: any,
  dependencies: AuraHoldingsDependencies = {},
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

  const configuredChains = configuredAuraChains(env);
  if (configuredChains.length === 0) {
    sendJson(res, 404, { error: 'disabled' });
    return;
  }

  try {
    if (await isRateLimited(req, dependencies)) {
      sendJson(res, 429, { error: 'rate_limited' });
      return;
    }
  } catch {
    sendJson(res, 503, { error: 'unavailable' });
    return;
  }

  if (declaredBodyIsOversized(req)) {
    sendJson(res, 400, { error: 'invalid_address' });
    return;
  }
  const parsed = parseWalletAddress(inputAddress(req.body));
  if (!parsed) {
    sendJson(res, 400, { error: 'invalid_address' });
    return;
  }
  if (!configuredChains.includes(parsed.chain)) {
    sendJson(res, 503, { error: 'unavailable' });
    return;
  }

  try {
    const resolvedHoldings = await holdingsWithTimeout(
      parsed.chain,
      parsed.address,
      env,
      dependencies,
    );
    if (!Array.isArray(resolvedHoldings)) {
      sendJson(res, 503, { error: 'unavailable' });
      return;
    }
    const holdings = normalizeOfficialHoldings(resolvedHoldings);
    const value: AuraHoldings = {
      chain: parsed.chain,
      heldSigns: holdings.map(({ sign }) => sign),
      holdings,
      checkedAt: new Date((dependencies.now ?? Date.now)()).toISOString(),
    };
    sendJson(res, 200, value);
  } catch {
    sendJson(res, 503, { error: 'unavailable' });
  }
}

export default async function handler(req: any, res: any): Promise<void> {
  return handleAuraHoldings(req, res, { rateLimit: checkAuraPlatformRateLimit });
}
