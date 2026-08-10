/**
 * Provider-neutral contracts for the Registry Pro quote laboratory.
 *
 * Phase 1 is deliberately quote-only. A provider adapter may observe an
 * exact-input route, but it cannot prepare, sign, submit, or retain an
 * execution handle. Those capabilities require a later owner decision.
 */

export const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
export const USDC_DECIMALS = 6;
export const QUOTE_SLIPPAGE_MIN_BPS = 10;
export const QUOTE_SLIPPAGE_MAX_BPS = 100;
export const QUOTE_AMOUNT_MAX_DIGITS = 24;

export const QUOTE_ERROR_CODES = Object.freeze([
  'invalid_intent',
  'unsupported_pair',
  'no_route',
  'rate_limited',
  'schema_changed',
  'network',
  'unavailable',
  'stale',
]);

export const QUOTE_ONLY_CAPABILITIES = Object.freeze({
  quote: true,
  prepare: false,
  sign: false,
  submit: false,
});

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BASE58_INDEX = new Map([...BASE58_ALPHABET].map((character, index) => [character, index]));
const FORBIDDEN_INTENT_KEYS = Object.freeze([
  'taker', 'wallet', 'walletAddress', 'receiver', 'payer',
  'referrer', 'referralAccount', 'referralFee', 'feeBps',
]);

export class ProQuoteError extends Error {
  constructor(code, message, { retryAfterMs = 0, cause } = {}) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'ProQuoteError';
    this.code = QUOTE_ERROR_CODES.includes(code) ? code : 'unavailable';
    this.retryAfterMs = Number.isFinite(retryAfterMs) && retryAfterMs > 0
      ? Math.floor(retryAfterMs)
      : 0;
  }
}

export function decodeBase58(value) {
  if (typeof value !== 'string' || value.length < 32 || value.length > 44) return null;
  const bytes = [0];
  for (const character of value) {
    const digit = BASE58_INDEX.get(character);
    if (digit === undefined) return null;
    let carry = digit;
    for (let index = 0; index < bytes.length; index += 1) {
      const next = bytes[index] * 58 + carry;
      bytes[index] = next & 0xff;
      carry = next >> 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  let leadingZeroes = 0;
  while (leadingZeroes < value.length - 1 && value[leadingZeroes] === '1') leadingZeroes += 1;
  while (leadingZeroes > 0) {
    bytes.push(0);
    leadingZeroes -= 1;
  }
  return Uint8Array.from(bytes.reverse());
}

export function isSolanaAddress(value) {
  return decodeBase58(value)?.byteLength === 32;
}

export function atomicString(value, { positive = true } = {}) {
  const text = typeof value === 'bigint'
    ? value.toString()
    : typeof value === 'string'
      ? value
      : '';
  if (!/^(?:0|[1-9]\d*)$/u.test(text) || text.length > QUOTE_AMOUNT_MAX_DIGITS) {
    throw new ProQuoteError('invalid_intent', 'The exact input amount is invalid.');
  }
  const parsed = BigInt(text);
  if (positive && parsed <= 0n) {
    throw new ProQuoteError('invalid_intent', 'The exact input amount must be positive.');
  }
  return text;
}

export function decimalToAtomic(value, decimals) {
  const text = String(value ?? '').trim();
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
    throw new ProQuoteError('invalid_intent', 'The token precision is unsupported.');
  }
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/u.test(text)) {
    throw new ProQuoteError('invalid_intent', 'Enter an ordinary decimal amount.');
  }
  const [whole, fraction = ''] = text.split('.');
  if (fraction.length > decimals) {
    throw new ProQuoteError('invalid_intent', `Use no more than ${decimals} decimal places.`);
  }
  const atomic = `${whole}${fraction.padEnd(decimals, '0')}`.replace(/^0+(?=\d)/u, '');
  return atomicString(atomic || '0');
}

export function atomicToDecimal(value, decimals, { trim = true } = {}) {
  const atomic = atomicString(value, { positive: false });
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
    throw new ProQuoteError('schema_changed', 'The provider returned unsupported precision.');
  }
  const padded = atomic.padStart(decimals + 1, '0');
  const whole = decimals === 0 ? padded : padded.slice(0, -decimals);
  let fraction = decimals === 0 ? '' : padded.slice(-decimals);
  if (trim) fraction = fraction.replace(/0+$/u, '');
  return fraction ? `${whole}.${fraction}` : whole;
}

function safeSlippage(value) {
  const slippageBps = Number(value);
  if (!Number.isInteger(slippageBps)
      || slippageBps < QUOTE_SLIPPAGE_MIN_BPS
      || slippageBps > QUOTE_SLIPPAGE_MAX_BPS) {
    throw new ProQuoteError(
      'invalid_intent',
      `Slippage must be an integer from ${QUOTE_SLIPPAGE_MIN_BPS} to ${QUOTE_SLIPPAGE_MAX_BPS} bps.`,
    );
  }
  return slippageBps;
}

/**
 * The server supplies officialMints from the committed Registry. Provider
 * metadata is never allowed to redefine market identity.
 */
export function normalizeQuoteIntent(candidate, { officialMints } = {}) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    throw new ProQuoteError('invalid_intent', 'The quote request is invalid.');
  }
  for (const key of FORBIDDEN_INTENT_KEYS) {
    if (Object.prototype.hasOwnProperty.call(candidate, key)) {
      throw new ProQuoteError('invalid_intent', 'Wallet and compensation fields are not accepted.');
    }
  }
  const inputMint = typeof candidate.inputMint === 'string' ? candidate.inputMint : '';
  const outputMint = typeof candidate.outputMint === 'string' ? candidate.outputMint : '';
  if (!isSolanaAddress(inputMint) || !isSolanaAddress(outputMint) || inputMint === outputMint) {
    throw new ProQuoteError('invalid_intent', 'The quote pair is invalid.');
  }
  const allowed = officialMints instanceof Set ? officialMints : new Set();
  const zodiacMint = inputMint === USDC_MINT ? outputMint : inputMint;
  if (!allowed.has(zodiacMint)
      || (inputMint !== USDC_MINT && outputMint !== USDC_MINT)) {
    throw new ProQuoteError('unsupported_pair', 'Only official Zodiac/USDC pairs are available.');
  }
  return Object.freeze({
    inputMint,
    outputMint,
    amount: atomicString(candidate.amount),
    slippageBps: safeSlippage(candidate.slippageBps ?? 50),
  });
}

export function parseRetryAfter(value, now = Date.now()) {
  if (typeof value !== 'string' || !value.trim()) return 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(Math.ceil(seconds * 1000), 120_000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.min(Math.max(0, date - now), 120_000) : 0;
}

export function quoteIsFresh(quote, now = Date.now(), fallbackMaxAgeMs = 15_000) {
  if (!quote || !Number.isFinite(Date.parse(quote.observedAt))) return false;
  const observed = Date.parse(quote.observedAt);
  const expires = quote.expiresAt ? Date.parse(quote.expiresAt) : observed + fallbackMaxAgeMs;
  return Number.isFinite(expires) && observed <= now && now < expires;
}
