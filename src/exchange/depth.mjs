/**
 * The depth ladder — the honest substitute for an order book.
 *
 * These pools are AMMs; there is no book of resting orders to display. Each
 * rung below is instead an indicative quote for a fixed size, fetched from
 * the same Jupiter Ultra endpoint the trade panel uses. No taker is present,
 * so a trade is quoted again before wallet review.
 *
 * Two rules carry over from the ratified trade decision and are pinned by
 * test: no taker is ever sent — a ladder is price display, and an address
 * leaves the browser only on an explicit trade action — and amounts stay
 * exact integers end to end; the displayed price is derived from the order's
 * atomic amounts with scaled-BigInt division, never floats.
 */

import {
  VENUE_REQUEST_SPACING_MS,
  assertOrderMatches,
  atomicFromDecimal,
  decimalFromAtomic,
  fetchOrder,
} from '../trade/ultra.mjs';
import { USDC_DECIMALS, USDC_MINT } from '../trade/panel-model.mjs';

export { USDC_DECIMALS, USDC_MINT };

/** Zodiac mints all carry six decimals, like USDC. */
export const ZODIAC_DECIMALS = 6;

/** Rung sizes in USDC dollars. Strings: these become exact atomic amounts. */
export const LADDER_NOTIONALS = Object.freeze(['25', '100', '250', '500', '1000']);

/** Ladder prices are USDC per token at twelve fractional digits. */
export const PRICE_SCALE_DECIMALS = 12;
const PRICE_SCALE = 10n ** BigInt(PRICE_SCALE_DECIMALS);
/** Legacy keyless venue traffic stays below one request every two seconds. */
export const LADDER_QUOTE_SPACING_MS = VENUE_REQUEST_SPACING_MS;

/**
 * USDC per token from an order's atomic amounts, as a scaled BigInt.
 * usdcAtomic and tokenAtomic both carry six decimals, so their ratio is the
 * decimal price; the scale keeps twelve digits of it exactly.
 */
export function priceScaledFromAtomic(usdcAtomic, tokenAtomic) {
  const usdc = BigInt(usdcAtomic);
  const token = BigInt(tokenAtomic);
  if (usdc <= 0n || token <= 0n) return null;
  return (usdc * PRICE_SCALE) / token;
}

/** "0.000072691341" — the scaled price back as a plain decimal string. */
export function priceDecimal(priceScaled) {
  if (priceScaled === null || priceScaled === undefined) return null;
  return decimalFromAtomic(priceScaled, PRICE_SCALE_DECIMALS);
}

/**
 * How much worse a rung's price is than the smallest rung's, in whole basis
 * points. Buys worsen upward (paying more per token), sells worsen downward
 * (receiving less per token); both come out as a non-negative number here.
 */
export function impactBps(priceScaled, basePriceScaled, side) {
  if (!priceScaled || !basePriceScaled || basePriceScaled <= 0n) return null;
  const delta = side === 'sell'
    ? basePriceScaled - priceScaled
    : priceScaled - basePriceScaled;
  const bps = (delta * 10000n) / basePriceScaled;
  return bps < 0n ? 0 : Number(bps);
}

/**
 * The token amount that matches a dollar notional at the current indexed
 * price, as a decimal string the order endpoint accepts. Sizing may round —
 * only the sizes are approximate; every price on the ladder comes from the
 * venue's atomic amounts.
 */
export function tokenAmountForNotional(notional, midPriceUsd) {
  const dollars = Number(notional);
  const price = Number(midPriceUsd);
  if (!Number.isFinite(dollars) || dollars <= 0) return null;
  if (!Number.isFinite(price) || price <= 0) return null;
  const tokens = dollars / price;
  if (!Number.isFinite(tokens) || tokens <= 0) return null;
  return tokens.toFixed(ZODIAC_DECIMALS);
}

const sleepFor = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

/**
 * One side of the ladder, smallest rung first, fetched sequentially with a
 * breath between quotes so a refresh is five polite requests, not a burst.
 * A rung that fails resolves to its error code and the rest keep going;
 * an abort stops the walk where it stands.
 */
export async function fetchLadder({
  mint,
  side,
  notionals = LADDER_NOTIONALS,
  midPriceUsd = null,
  fetchImpl,
  signal,
  spacingMs = LADDER_QUOTE_SPACING_MS,
  sleep = sleepFor,
  deadlineMs,
}) {
  const rungs = [];
  // "vs best" only means something against the smallest size. If the first
  // rung fails, later rungs carry no impact figure rather than measuring
  // against a rung that is not the best.
  let baseline = null;
  for (let index = 0; index < notionals.length; index += 1) {
    const notional = notionals[index];
    if (signal?.aborted) break;
    if (index > 0 && spacingMs > 0) await sleep(spacingMs);
    if (signal?.aborted) break;

    try {
      let params;
      if (side === 'sell') {
        const tokenAmount = tokenAmountForNotional(notional, midPriceUsd);
        if (!tokenAmount) {
          rungs.push({ notional, error: 'unavailable' });
          continue;
        }
        params = {
          inputMint: mint,
          outputMint: USDC_MINT,
          amount: atomicFromDecimal(tokenAmount, ZODIAC_DECIMALS),
        };
      } else {
        params = {
          inputMint: USDC_MINT,
          outputMint: mint,
          amount: atomicFromDecimal(notional, USDC_DECIMALS),
        };
      }

      const order = await fetchOrder({
        ...params,
        fetchImpl,
        signal,
        requestClass: 'background',
        deadlineMs,
      });
      assertOrderMatches(order, params);
      const priceScaled = side === 'sell'
        ? priceScaledFromAtomic(order.outAmount, order.inAmount)
        : priceScaledFromAtomic(order.inAmount, order.outAmount);
      if (!priceScaled) {
        rungs.push({ notional, error: 'unavailable' });
        continue;
      }
      if (index === 0) baseline = priceScaled;
      rungs.push({
        notional,
        priceScaled,
        price: priceDecimal(priceScaled),
        impactBps: impactBps(priceScaled, baseline, side),
        priceImpactPct: order.priceImpactPct,
      });
    } catch (error) {
      if (error?.name === 'AbortError') throw error;
      if (error?.code === 'rate_limited') {
        return { side, rungs, halted: 'rate_limited', retryAfterMs: error.retryAfterMs };
      }
      rungs.push({ notional, error: error?.code ?? 'unavailable' });
    }
  }
  return { side, rungs };
}
