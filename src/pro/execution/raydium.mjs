import {
  ProQuoteError,
  QUOTE_ONLY_CAPABILITIES,
  atomicString,
  isSolanaAddress,
  parseRetryAfter,
} from './contracts.mjs';

export const RAYDIUM_QUOTE_URL = 'https://transaction-v1.raydium.io/compute/swap-base-in';
export const RAYDIUM_QUOTE_DEADLINE_MS = 10_000;
export const RAYDIUM_CAPABILITIES = QUOTE_ONLY_CAPABILITIES;
const TRANSACTION_KEYS = Object.freeze(['transaction', 'transactions', 'swapTransaction', 'serializedTransaction', 'tx']);

function providerAtomic(value, label, options) {
  try {
    return atomicString(value, options);
  } catch {
    throw new ProQuoteError('schema_changed', `Raydium returned an invalid ${label}.`);
  }
}

export function raydiumQuoteUrl(intent, baseUrl = RAYDIUM_QUOTE_URL) {
  const url = new URL(baseUrl);
  url.search = new URLSearchParams({
    inputMint: intent.inputMint,
    outputMint: intent.outputMint,
    amount: intent.amount,
    slippageBps: String(intent.slippageBps),
    txVersion: 'V0',
  }).toString();
  return url.toString();
}

function normalizeRoute(routePlan, intent) {
  if (!Array.isArray(routePlan) || routePlan.length === 0 || routePlan.length > 8) {
    throw new ProQuoteError('schema_changed', 'Raydium returned an invalid route.');
  }
  const route = [];
  let expectedInput = intent.inputMint;
  for (const leg of routePlan) {
    const inputMint = String(leg?.inputMint ?? '');
    const outputMint = String(leg?.outputMint ?? '');
    const poolId = String(leg?.poolId ?? '');
    if (inputMint !== expectedInput
        || !isSolanaAddress(inputMint)
        || !isSolanaAddress(outputMint)
        || !isSolanaAddress(poolId)) {
      throw new ProQuoteError('schema_changed', 'Raydium returned a discontinuous route.');
    }
    providerAtomic(leg?.feeAmount ?? '0', 'route fee amount', { positive: false });
    if (leg?.feeMint !== undefined && !isSolanaAddress(String(leg.feeMint))) {
      throw new ProQuoteError('schema_changed', 'Raydium returned an invalid fee mint.');
    }
    route.push(poolId);
    expectedInput = outputMint;
  }
  if (expectedInput !== intent.outputMint) {
    throw new ProQuoteError('schema_changed', 'Raydium route does not reach the requested output.');
  }
  return Object.freeze(route);
}

export function normalizeRaydiumQuote(payload, intent, { now = Date.now() } = {}) {
  if (!payload || typeof payload !== 'object' || payload.success !== true || payload.version !== 'V1'
      || !payload.data || typeof payload.data !== 'object') {
    const message = String(payload?.msg ?? payload?.message ?? '');
    throw new ProQuoteError(/no route|liquidity|unsupported mint/iu.test(message) ? 'no_route' : 'schema_changed',
      'Raydium returned no usable route.');
  }
  const data = payload.data;
  if (TRANSACTION_KEYS.some((key) => (
    Object.prototype.hasOwnProperty.call(payload, key)
    || Object.prototype.hasOwnProperty.call(data, key)
  ))) {
    throw new ProQuoteError('schema_changed', 'A quote-only Raydium answer unexpectedly contained a transaction.');
  }
  const inputMint = String(data.inputMint ?? '');
  const outputMint = String(data.outputMint ?? '');
  const inputAmount = providerAtomic(data.inputAmount, 'input amount');
  const outputAmount = providerAtomic(data.outputAmount, 'output amount');
  const minimumOutput = providerAtomic(data.otherAmountThreshold, 'minimum output');
  if (inputMint !== intent.inputMint
      || outputMint !== intent.outputMint
      || inputAmount !== intent.amount
      || data.swapType !== 'BaseIn'
      || data.slippageBps !== intent.slippageBps) {
    throw new ProQuoteError('schema_changed', 'Raydium substituted the requested quote.');
  }
  if (BigInt(minimumOutput) > BigInt(outputAmount)) {
    throw new ProQuoteError('schema_changed', 'Raydium returned an invalid minimum output.');
  }
  if (data.referrerAmount !== '0') {
    throw new ProQuoteError('schema_changed', 'Raydium added an unexpected referrer amount.');
  }
  const priceImpactPct = data.priceImpactPct;
  if (typeof priceImpactPct !== 'number'
      || !Number.isFinite(priceImpactPct) || priceImpactPct < 0 || priceImpactPct > 100) {
    throw new ProQuoteError('schema_changed', 'Raydium returned invalid price impact.');
  }
  const route = normalizeRoute(data.routePlan, intent);
  return Object.freeze({
    version: 1,
    provider: 'raydium',
    providerLabel: 'Raydium route',
    capabilities: RAYDIUM_CAPABILITIES,
    inputMint,
    outputMint,
    inputAmount,
    outputAmount,
    minimumOutput,
    slippageBps: intent.slippageBps,
    feeBps: null,
    platformFeeBps: null,
    priceImpactPct,
    route,
    observedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + 30_000).toISOString(),
    executable: false,
  });
}

function linkedAbort(parentSignal, timeoutMs) {
  const controller = new AbortController();
  const abort = () => controller.abort(parentSignal?.reason);
  if (parentSignal?.aborted) abort();
  else parentSignal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => controller.abort(new DOMException('Quote deadline exceeded', 'TimeoutError')), timeoutMs);
  return {
    signal: controller.signal,
    cleanup() {
      clearTimeout(timer);
      parentSignal?.removeEventListener('abort', abort);
    },
  };
}

export async function fetchRaydiumQuote({
  intent,
  fetchImpl = globalThis.fetch,
  baseUrl = RAYDIUM_QUOTE_URL,
  signal,
  deadlineMs = RAYDIUM_QUOTE_DEADLINE_MS,
  now = Date.now,
} = {}) {
  const bounded = linkedAbort(signal, deadlineMs);
  try {
    const response = await fetchImpl(raydiumQuoteUrl(intent, baseUrl), {
      method: 'GET',
      headers: { accept: 'application/json' },
      signal: bounded.signal,
      cache: 'no-store',
      redirect: 'error',
    });
    if (response.status === 429) {
      throw new ProQuoteError('rate_limited', 'Raydium asked for a pause.', {
        retryAfterMs: parseRetryAfter(response.headers?.get?.('retry-after'), now()),
      });
    }
    if (!response.ok) throw new ProQuoteError('unavailable', `Raydium quote failed (${response.status}).`);
    return normalizeRaydiumQuote(await response.json(), intent, { now: now() });
  } catch (error) {
    if (error instanceof ProQuoteError) throw error;
    if (signal?.aborted) throw error;
    throw new ProQuoteError('network', 'Raydium could not be reached.', { cause: error });
  } finally {
    bounded.cleanup();
  }
}
