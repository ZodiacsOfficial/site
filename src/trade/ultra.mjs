/**
 * Jupiter Ultra client for the Registry trade panel.
 *
 * The site never builds, signs, or broadcasts a transaction. Ultra returns a
 * transaction it built, the visitor's wallet signs it, and Ultra submits it.
 * What is left for us is the part that protects the visitor: proving that the
 * order Jupiter returned is the order the page displayed, before any of it
 * reaches a wallet for signing.
 *
 * Amounts are exact integers throughout. A float would round a balance.
 */

export const ULTRA_BASE_URL = 'https://lite-api.jup.ag';
export const WSOL_MINT = 'So11111111111111111111111111111111111111112';

/** Solana's native mint carries nine decimals; every Zodiac carries six. */
export const SOL_DECIMALS = 9;

/**
 * Jupiter's own Ultra fee was 10 bps when this panel was written. We display
 * whatever the order reports rather than a hardcoded figure, but refuse an
 * order whose fee has grown beyond anything the venue has published: that
 * shape is what a mistakenly configured referral account would look like, and
 * the site takes no fee at all.
 */
export const VENUE_FEE_CEILING_BPS = 50;

export const TRADE_ERROR_CODES = Object.freeze([
  'invalid_amount',
  'no_route',
  'unavailable',
  'rate_limited',
  'order_mismatch',
  'unexpected_fee',
  'network',
  'execute_failed',
]);

export class TradeError extends Error {
  constructor(code, message, { cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'TradeError';
    this.code = code;
  }
}

function fail(code, message, options) {
  throw new TradeError(code, message, options);
}

/**
 * "0.35" at 9 decimals → 350000000n. Rejects anything that is not a plain
 * decimal, and anything carrying more precision than the token can hold —
 * silently truncating a visitor's amount is not an option here.
 */
export function atomicFromDecimal(value, decimals) {
  const text = String(value ?? '').trim();
  if (!/^\d+(?:\.\d+)?$|^\.\d+$|^\d+\.$/.test(text)) {
    fail('invalid_amount', 'Enter an amount using digits and a single decimal point.');
  }
  const [whole = '', fraction = ''] = text.split('.');
  if (fraction.length > decimals) {
    fail('invalid_amount', `That amount is finer than this token's ${decimals} decimals.`);
  }
  const atomic = BigInt((whole || '0') + fraction.padEnd(decimals, '0'));
  if (atomic <= 0n) fail('invalid_amount', 'Enter an amount greater than zero.');
  return atomic;
}

/** 350000000n at 9 decimals → "0.35". Trailing zeros are dropped. */
export function decimalFromAtomic(atomic, decimals, { maxFractionDigits = decimals } = {}) {
  const value = BigInt(atomic);
  const negative = value < 0n;
  const digits = (negative ? -value : value).toString().padStart(decimals + 1, '0');
  const whole = digits.slice(0, digits.length - decimals);
  let fraction = decimals > 0 ? digits.slice(digits.length - decimals) : '';
  if (maxFractionDigits < fraction.length) fraction = fraction.slice(0, maxFractionDigits);
  fraction = fraction.replace(/0+$/, '');
  return `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`;
}

/**
 * Pool depth for these assets is thin, so impact is a headline number, not a
 * footnote. The bands drive how loudly the panel says so.
 */
export function priceImpactBand(pct) {
  const value = Number(pct);
  if (!Number.isFinite(value)) return 'unknown';
  const magnitude = Math.abs(value);
  if (magnitude < 1) return 'low';
  if (magnitude < 5) return 'notable';
  return 'severe';
}

function orderUrl(baseUrl, params) {
  const url = new URL('/ultra/v1/order', baseUrl);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function readJson(response) {
  try {
    return await response.json();
  } catch (error) {
    fail('unavailable', 'The venue did not return a readable answer.', { cause: error });
  }
  return undefined;
}

/**
 * Ask Ultra for a price. Called without a taker to quote, and with the
 * connected address to obtain the transaction Jupiter has built.
 */
export async function fetchOrder({
  inputMint,
  outputMint,
  amount,
  taker,
  baseUrl = ULTRA_BASE_URL,
  fetchImpl = globalThis.fetch,
  signal,
}) {
  const url = orderUrl(baseUrl, { inputMint, outputMint, amount: String(amount), taker });
  let response;
  try {
    response = await fetchImpl(url, { method: 'GET', signal, headers: { accept: 'application/json' } });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    fail('network', 'The price could not be reached just now.', { cause: error });
  }
  if (response.status === 429) fail('rate_limited', 'The venue is rate limiting requests. Try again shortly.');
  if (response.status >= 500) fail('unavailable', 'The venue did not answer.');

  const payload = await readJson(response);
  // Ultra reports a routing failure as 200 + {error}, and a bad request as 4xx.
  if (payload?.error || !response.ok) {
    const message = typeof payload?.error === 'string' ? payload.error : 'no route';
    if (/quote|route|liquidity/i.test(message)) {
      fail('no_route', 'No route is available for that amount right now.');
    }
    fail('unavailable', 'The venue could not price that trade.');
  }
  return normalizeOrder(payload);
}

/** Reduce Ultra's response to the fields the panel shows and checks. */
export function normalizeOrder(payload) {
  if (!payload || typeof payload !== 'object') fail('unavailable', 'The venue returned no order.');
  const { inputMint, outputMint, inAmount, outAmount, requestId } = payload;
  if (!inputMint || !outputMint || !inAmount || !outAmount) {
    fail('unavailable', 'The venue returned an incomplete order.');
  }
  const feeBps = Number(payload.platformFee?.feeBps ?? payload.feeBps ?? 0);
  return {
    inputMint,
    outputMint,
    inAmount: BigInt(inAmount),
    outAmount: BigInt(outAmount),
    priceImpactPct: Number(payload.priceImpactPct ?? 0),
    feeBps: Number.isFinite(feeBps) ? feeBps : 0,
    routeLabels: Array.isArray(payload.routePlan)
      ? payload.routePlan.map((leg) => leg?.swapInfo?.label).filter(Boolean)
      : [],
    requestId: requestId ?? null,
    transaction: payload.transaction ?? null,
    inUsdValue: Number(payload.inUsdValue ?? 0),
    outUsdValue: Number(payload.outUsdValue ?? 0),
  };
}

/**
 * The guard that earns this module its keep. A wallet prompt is the last
 * moment a visitor can catch a substitution, and by then they are reading a
 * base64 blob. Refuse anything that is not exactly what the panel showed.
 */
export function assertOrderMatches(order, expected) {
  if (order.inputMint !== expected.inputMint || order.outputMint !== expected.outputMint) {
    fail('order_mismatch', 'The venue answered for a different token than the one shown.');
  }
  if (order.inAmount !== BigInt(expected.amount)) {
    fail('order_mismatch', 'The venue answered for a different amount than the one entered.');
  }
  if (order.outAmount <= 0n) {
    fail('order_mismatch', 'The venue returned an empty amount.');
  }
  if (order.feeBps > VENUE_FEE_CEILING_BPS) {
    fail('unexpected_fee', 'The venue quoted an unexpected fee, so nothing was sent to your wallet.');
  }
  return order;
}

/** A quote can be displayed without a taker; only a signable order has both. */
export function isSignable(order) {
  return typeof order.transaction === 'string'
    && order.transaction.length > 0
    && typeof order.requestId === 'string'
    && order.requestId.length > 0;
}

/**
 * Hand the wallet-signed transaction back to Ultra, which submits it. The
 * site never touches a write RPC; this is the whole of its involvement.
 */
export async function executeOrder({
  signedTransaction,
  requestId,
  baseUrl = ULTRA_BASE_URL,
  fetchImpl = globalThis.fetch,
  signal,
}) {
  if (!signedTransaction || !requestId) {
    fail('execute_failed', 'The signed transaction was incomplete.');
  }
  let response;
  try {
    response = await fetchImpl(new URL('/ultra/v1/execute', baseUrl).toString(), {
      method: 'POST',
      signal,
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ signedTransaction, requestId }),
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    // A submitted trade may still land after the connection drops, so this
    // says "unconfirmed", never "failed".
    fail('network', 'The result could not be confirmed from here.', { cause: error });
  }
  const payload = await readJson(response);
  if (!response.ok || payload?.status === 'Failed' || payload?.error) {
    const reason = payload?.error || payload?.status || 'the venue rejected it';
    fail('execute_failed', `The trade did not go through: ${reason}.`);
  }
  return {
    signature: payload?.signature ?? null,
    slot: payload?.slot ?? null,
    status: payload?.status ?? 'Success',
  };
}
