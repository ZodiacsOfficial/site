import {
  ProQuoteError,
  QUOTE_ONLY_CAPABILITIES,
  atomicString,
  isSolanaAddress,
  parseRetryAfter,
} from './contracts.mjs';

export const JUPITER_V2_ORDER_URL = 'https://api.jup.ag/swap/v2/order';
export const JUPITER_QUOTE_DEADLINE_MS = 12_000;
export const JUPITER_CAPABILITIES = QUOTE_ONLY_CAPABILITIES;

const ROUTERS = new Set(['metis', 'jupiterz', 'dflow', 'okx']);
const TRANSACTION_ALIASES = Object.freeze(['swapTransaction', 'serializedTransaction', 'tx']);

export function jupiterQuoteUrl(intent, baseUrl = JUPITER_V2_ORDER_URL) {
  const url = new URL(baseUrl);
  url.search = new URLSearchParams({
    inputMint: intent.inputMint,
    outputMint: intent.outputMint,
    amount: intent.amount,
  }).toString();
  return url.toString();
}

function boundedFee(value, label) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 50) {
    throw new ProQuoteError('schema_changed', `Jupiter returned an invalid ${label}.`);
  }
  return value;
}

function boundedSlippage(value) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 10_000) {
    throw new ProQuoteError('schema_changed', 'Jupiter returned invalid RTSE slippage.');
  }
  return value;
}

function boundedPriceImpact(value) {
  if (typeof value !== 'number'
      || !Number.isFinite(value)
      || value < -100
      || value > 100) {
    throw new ProQuoteError('schema_changed', 'Jupiter returned invalid price impact.');
  }
  return Object.is(value, -0) ? 0 : value;
}

function providerAtomic(value, label, options) {
  try {
    return atomicString(value, options);
  } catch {
    throw new ProQuoteError('schema_changed', `Jupiter returned an invalid ${label}.`);
  }
}

export function normalizeJupiterQuote(payload, intent, { now = Date.now() } = {}) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new ProQuoteError('schema_changed', 'Jupiter returned an invalid quote.');
  }
  if (payload.transaction !== null
      || TRANSACTION_ALIASES.some((key) => Object.prototype.hasOwnProperty.call(payload, key))) {
    throw new ProQuoteError('schema_changed', 'A quote-only Jupiter answer unexpectedly contained a transaction.');
  }
  const inputMint = String(payload.inputMint ?? '');
  const outputMint = String(payload.outputMint ?? '');
  const inputAmount = providerAtomic(payload.inAmount ?? payload.inputAmount, 'input amount');
  const outputAmount = providerAtomic(payload.outAmount ?? payload.outputAmount, 'output amount');
  if (inputMint !== intent.inputMint
      || outputMint !== intent.outputMint
      || inputAmount !== intent.amount
      || !isSolanaAddress(inputMint)
      || !isSolanaAddress(outputMint)) {
    throw new ProQuoteError('schema_changed', 'Jupiter substituted the requested pair or amount.');
  }
  const router = String(payload.router ?? '').toLowerCase();
  if (!ROUTERS.has(router) || payload.mode !== 'ultra' || payload.swapMode !== 'ExactIn') {
    throw new ProQuoteError('schema_changed', 'Jupiter returned an unknown routing mode.');
  }
  const feeBps = boundedFee(payload.feeBps, 'total fee');
  const slippageBps = boundedSlippage(payload.slippageBps);
  const priceImpactPct = boundedPriceImpact(payload.priceImpact);
  const platformFeeBps = payload.platformFee === undefined || payload.platformFee === null
    ? null
    : boundedFee(payload.platformFee?.feeBps, 'platform fee');
  if (platformFeeBps !== null && platformFeeBps > feeBps) {
    throw new ProQuoteError('schema_changed', 'Jupiter platform fees exceed the reported total fee.');
  }
  const thresholdRaw = payload.otherAmountThreshold;
  const minimumOutput = thresholdRaw === undefined || thresholdRaw === null
    ? null
    : providerAtomic(thresholdRaw, 'minimum output');
  if (minimumOutput !== null && BigInt(minimumOutput) > BigInt(outputAmount)) {
    throw new ProQuoteError('schema_changed', 'Jupiter returned an invalid minimum output.');
  }
  const observedAt = new Date(now).toISOString();
  let expiresAt = null;
  if (payload.expireAt !== undefined && payload.expireAt !== null) {
    if (typeof payload.expireAt !== 'string' || !payload.expireAt.trim()) {
      throw new ProQuoteError('schema_changed', 'Jupiter returned an invalid expiry.');
    }
    const parsedExpiry = Date.parse(payload.expireAt);
    if (!Number.isFinite(parsedExpiry)) {
      throw new ProQuoteError('schema_changed', 'Jupiter returned an invalid expiry.');
    }
    expiresAt = new Date(parsedExpiry).toISOString();
  }
  return Object.freeze({
    version: 1,
    provider: 'jupiter',
    providerLabel: 'Swap V2 Meta-Aggregator · Ultra mode',
    capabilities: JUPITER_CAPABILITIES,
    inputMint,
    outputMint,
    inputAmount,
    outputAmount,
    minimumOutput,
    slippageBps,
    feeBps,
    platformFeeBps,
    priceImpactPct,
    route: Object.freeze([router]),
    observedAt,
    expiresAt,
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

export async function fetchJupiterQuote({
  intent,
  apiKey,
  fetchImpl = globalThis.fetch,
  baseUrl = JUPITER_V2_ORDER_URL,
  signal,
  deadlineMs = JUPITER_QUOTE_DEADLINE_MS,
  now = Date.now,
} = {}) {
  if (typeof apiKey !== 'string' || apiKey.trim().length < 16) {
    throw new ProQuoteError('unavailable', 'Jupiter quote access is not configured.');
  }
  const bounded = linkedAbort(signal, deadlineMs);
  try {
    const response = await fetchImpl(jupiterQuoteUrl(intent, baseUrl), {
      method: 'GET',
      headers: { accept: 'application/json', 'x-api-key': apiKey.trim() },
      signal: bounded.signal,
      cache: 'no-store',
      redirect: 'error',
    });
    if (response.status === 429) {
      throw new ProQuoteError('rate_limited', 'Jupiter asked for a pause.', {
        retryAfterMs: parseRetryAfter(response.headers?.get?.('retry-after'), now()),
      });
    }
    if (!response.ok) throw new ProQuoteError('unavailable', `Jupiter quote failed (${response.status}).`);
    const payload = await response.json();
    return normalizeJupiterQuote(payload, intent, { now: now() });
  } catch (error) {
    if (error instanceof ProQuoteError) throw error;
    if (signal?.aborted) throw error;
    throw new ProQuoteError('network', 'Jupiter could not be reached.', { cause: error });
  } finally {
    bounded.cleanup();
  }
}
