import registryDocument from '../../../public/registry/zodiacs.registry.json' with { type: 'json' };
import { compareProviderQuotes } from '../execution/coordinator.mjs';
import { ProQuoteError } from '../execution/contracts.mjs';
import { fetchJupiterQuote } from '../execution/jupiter-v2.mjs';
import { fetchRaydiumQuote } from '../execution/raydium.mjs';
import { intentForMarket, normalizeRegistryMarkets } from '../catalog.mjs';

export const PRO_QUOTES_RATE_LIMIT_ID = 'registry-pro-quotes-v1';
export const PRO_QUOTES_MAX_BODY_BYTES = 512;
const PRO_QUOTES_BODY_KEYS = new Set(['sign', 'side', 'amount', 'slippageBps']);

function value(env, key) {
  const candidate = env?.[key];
  return typeof candidate === 'string' ? candidate.trim() : '';
}

function firstHeader(candidate) {
  if (Array.isArray(candidate)) return typeof candidate[0] === 'string' ? candidate[0] : '';
  return typeof candidate === 'string' ? candidate : '';
}

function header(req, name) {
  const direct = typeof req?.get === 'function' ? req.get(name) : undefined;
  if (typeof direct === 'string') return direct;
  return firstHeader(req?.headers?.[name.toLowerCase()]);
}

function normalizedHost(candidate) {
  const first = String(candidate ?? '').split(',')[0]?.trim().toLowerCase() ?? '';
  if (!first) return '';
  try {
    return new URL(first.includes('://') ? first : `https://${first}`).host.toLowerCase();
  } catch {
    return '';
  }
}

/** A public quote proxy is same-origin only; it must never become an open relay. */
export function isAllowedProRequest(req, env = process.env) {
  const source = header(req, 'origin') || header(req, 'referer');
  if (!source) return false;
  let sourceUrl;
  try {
    sourceUrl = new URL(source);
  } catch {
    return false;
  }
  const requestHost = normalizedHost(header(req, 'x-forwarded-host') || header(req, 'host'));
  const forwardedProtocol = header(req, 'x-forwarded-proto').split(',')[0]?.trim().toLowerCase();
  const protocol = forwardedProtocol || sourceUrl.protocol.slice(0, -1).toLowerCase();
  if (!requestHost || `${sourceUrl.protocol}//${sourceUrl.host.toLowerCase()}` !== `${protocol}://${requestHost}`) {
    return false;
  }
  const hostname = new URL(`${protocol}://${requestHost}`).hostname.toLowerCase();
  if (sourceUrl.protocol === 'https:') {
    return hostname === 'zodiacs.org'
      || hostname === 'www.zodiacs.org'
      || hostname.endsWith('.vercel.app');
  }
  return value(env, 'NODE_ENV') !== 'production'
    && sourceUrl.protocol === 'http:'
    && (hostname === 'localhost' || hostname === '127.0.0.1');
}

function bodyBytes(valueToMeasure) {
  return new TextEncoder().encode(valueToMeasure).byteLength;
}

function parseBody(input) {
  if (typeof input === 'string') {
    if (bodyBytes(input) > PRO_QUOTES_MAX_BODY_BYTES) return null;
    try {
      return JSON.parse(input);
    } catch {
      return null;
    }
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  try {
    const serialized = JSON.stringify(input);
    if (bodyBytes(serialized) > PRO_QUOTES_MAX_BODY_BYTES) return null;
  } catch {
    return null;
  }
  return input;
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(body));
}

function configured(env) {
  return value(env, 'REGISTRY_PRO_QUOTES_ENABLED') === '1'
    && value(env, 'JUPITER_API_KEY').length >= 16;
}

async function limited(req, dependencies) {
  const hook = dependencies.rateLimit
    ?? (typeof req?.rateLimit === 'function' ? req.rateLimit.bind(req) : null);
  if (!hook) throw new Error('Registry Pro quote rate limiting is unavailable.');
  const result = await hook(req);
  if (result && typeof result === 'object' && result.error === 'not-found') {
    throw new Error('Registry Pro quote rate-limit rule is not configured.');
  }
  return result === true || (result && typeof result === 'object' && result.rateLimited === true);
}

function publicResult(comparison, sign, side) {
  return {
    version: 1,
    sign,
    side,
    status: comparison.status,
    highestQuotedOutputProvider: comparison.highestQuotedOutputProvider,
    observedAt: comparison.observedAt,
    results: comparison.results.map((result) => {
      if (result.status === 'failed') return result;
      const quote = result.quote;
      return {
        provider: result.provider,
        status: 'ready',
        quote: {
          provider: quote.provider,
          providerLabel: quote.providerLabel,
          inputMint: quote.inputMint,
          outputMint: quote.outputMint,
          inputAmount: quote.inputAmount,
          outputAmount: quote.outputAmount,
          minimumOutput: quote.minimumOutput,
          slippageBps: quote.slippageBps,
          feeBps: quote.feeBps,
          platformFeeBps: quote.platformFeeBps,
          priceImpactPct: quote.priceImpactPct,
          route: quote.route,
          observedAt: quote.observedAt,
          expiresAt: quote.expiresAt,
          executable: false,
        },
      };
    }),
  };
}

export async function handleProQuotes(req, res, dependencies = {}) {
  const env = dependencies.env ?? process.env;
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendJson(res, 405, { error: 'method' });
    return;
  }
  if (!isAllowedProRequest(req, env)) {
    sendJson(res, 403, { error: 'forbidden' });
    return;
  }
  if (!configured(env)) {
    sendJson(res, 404, { error: 'disabled' });
    return;
  }
  const declaredLength = header(req, 'content-length');
  if (/^\d+$/u.test(declaredLength) && Number(declaredLength) > PRO_QUOTES_MAX_BODY_BYTES) {
    sendJson(res, 400, { error: 'invalid_intent' });
    return;
  }
  try {
    if (await limited(req, dependencies)) {
      sendJson(res, 429, { error: 'rate_limited' });
      return;
    }
  } catch {
    sendJson(res, 503, { error: 'unavailable' });
    return;
  }

  const body = parseBody(req.body);
  if (!body || Object.keys(body).some((key) => !PRO_QUOTES_BODY_KEYS.has(key))) {
    sendJson(res, 400, { error: 'invalid_intent' });
    return;
  }
  let intent;
  try {
    const markets = normalizeRegistryMarkets(dependencies.registry ?? registryDocument);
    intent = intentForMarket(markets, {
      sign: body.sign,
      side: body.side,
      amount: body.amount,
      slippageBps: body.slippageBps,
    });
  } catch (error) {
    sendJson(res, 400, { error: error instanceof ProQuoteError ? error.code : 'invalid_intent' });
    return;
  }

  const fetchImpl = dependencies.fetchImpl ?? globalThis.fetch;
  const now = dependencies.now ?? Date.now;
  try {
    const comparison = await compareProviderQuotes({
      intent,
      now,
      providers: [
        {
          id: 'jupiter',
          quote: (quoteIntent) => (dependencies.jupiterQuote ?? fetchJupiterQuote)({
            intent: quoteIntent,
            apiKey: value(env, 'JUPITER_API_KEY'),
            fetchImpl,
            now,
          }),
        },
        {
          id: 'raydium',
          quote: (quoteIntent) => (dependencies.raydiumQuote ?? fetchRaydiumQuote)({
            intent: quoteIntent,
            fetchImpl,
            now,
          }),
        },
      ],
    });
    const payload = publicResult(comparison, body.sign, body.side);
    sendJson(res, comparison.status === 'unavailable' ? 503 : 200, payload);
  } catch {
    sendJson(res, 503, { error: 'unavailable' });
  }
}
