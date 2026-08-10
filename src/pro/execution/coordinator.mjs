import { ProQuoteError, quoteIsFresh } from './contracts.mjs';

function failure(provider, error) {
  const known = error instanceof ProQuoteError;
  return Object.freeze({
    provider,
    status: 'failed',
    error: known ? error.code : 'unavailable',
    retryAfterMs: known ? error.retryAfterMs : 0,
  });
}

/**
 * Runs independent quote providers without letting one hide the other's
 * failure. "Highest quoted output" is exact BigInt ordering for one identical
 * intent; it is not a promise of best execution or a signable order.
 */
export async function compareProviderQuotes({ intent, providers, now = Date.now } = {}) {
  if (!Array.isArray(providers) || providers.length === 0) {
    throw new ProQuoteError('unavailable', 'No quote providers are configured.');
  }
  const readNow = typeof now === 'function' ? now : () => now;
  const settled = await Promise.all(providers.map(async ({ id, quote }) => {
    try {
      const value = await quote(intent);
      if (!quoteIsFresh(value, readNow())) throw new ProQuoteError('stale', `${id} returned a stale quote.`);
      return { provider: id, status: 'ready', quote: value };
    } catch (error) {
      return failure(id, error);
    }
  }));
  const ready = settled
    .filter((result) => result.status === 'ready')
    .sort((left, right) => {
      const difference = BigInt(right.quote.outputAmount) - BigInt(left.quote.outputAmount);
      if (difference !== 0n) return difference > 0n ? 1 : -1;
      return left.provider.localeCompare(right.provider);
    });
  return Object.freeze({
    version: 1,
    status: ready.length === providers.length ? 'complete' : ready.length ? 'partial' : 'unavailable',
    highestQuotedOutputProvider: ready[0]?.provider ?? null,
    results: Object.freeze(settled),
    observedAt: new Date(readNow()).toISOString(),
  });
}
