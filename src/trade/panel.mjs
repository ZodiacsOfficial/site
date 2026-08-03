/**
 * The trade panel's controller: the state machine between a visitor's amount
 * and a signed transaction. Rendering is a separate concern (panel-model.mjs
 * decides the words); this file decides what happens and in what order.
 *
 * Everything that touches a wallet or the network arrives through `deps`, so
 * the sequence can be tested without a browser, a wallet, or a live venue.
 *
 * The site's part is deliberately small: quote, show, hand the venue's own
 * transaction to the visitor's wallet, hand the signature back. It never
 * builds a transaction, never holds a key, never broadcasts.
 */

import { assertOrderMatches, atomicFromDecimal, isSignable, TradeError } from './ultra.mjs';
import { USDC_DECIMALS, USDC_MINT, panelView } from './panel-model.mjs';

/**
 * A quote shown without a taker is not the one that gets signed — the signable
 * order is fetched fresh, and the price can move between the two. Beyond this
 * much movement against the visitor we stop and show the new figure rather
 * than pushing it into a wallet prompt they are likely to approve on trust.
 */
export const REVIEW_AGAIN_BPS = 100;

export const QUOTE_DEBOUNCE_MS = 350;

function outAmountDroppedTooFar(shown, signable) {
  if (!shown || shown <= 0n) return false;
  const floor = (shown * BigInt(10_000 - REVIEW_AGAIN_BPS)) / 10_000n;
  return signable < floor;
}

export function createTradePanel({ sign, deps, amount = '25', payMethod = 'card' }) {
  const { fetchOrder, executeOrder, wallet, onChange, setTimeout: setT = setTimeout,
    clearTimeout: clearT = clearTimeout } = deps;

  const state = {
    state: 'idle', payMethod, amount, quote: null, error: null,
    signature: null, awaitingReview: false,
  };
  let quoteToken = 0;
  let debounce = null;
  let destroyed = false;

  const emit = () => { if (!destroyed) onChange?.(view(), { ...state }); };
  const view = () => panelView({
    state: state.state, payMethod: state.payMethod, sign, amount: state.amount,
    quote: state.quote, error: state.error,
  });

  function fail(error) {
    state.state = 'error';
    state.error = error instanceof TradeError ? error.code : 'unknown';
    state.quote = null;
    emit();
  }

  /** Price for display. No address leaves the browser to show a price. */
  async function refreshQuote() {
    if (destroyed) return;
    const token = ++quoteToken;
    let atomic;
    try {
      atomic = atomicFromDecimal(state.amount, USDC_DECIMALS);
    } catch (error) { fail(error); return; }

    state.state = 'quoting';
    state.error = null;
    emit();

    try {
      const order = await fetchOrder({
        inputMint: USDC_MINT, outputMint: sign.mint, amount: atomic,
      });
      if (token !== quoteToken) return;                 // a newer amount won
      assertOrderMatches(order, { inputMint: USDC_MINT, outputMint: sign.mint, amount: atomic });
      state.quote = order;
      state.state = 'ready';
      emit();
    } catch (error) {
      if (token !== quoteToken) return;
      fail(error);
    }
  }

  function setAmount(next) {
    state.amount = String(next);
    state.awaitingReview = false;
    if (debounce) clearT(debounce);
    debounce = setT(() => { debounce = null; refreshQuote(); }, QUOTE_DEBOUNCE_MS);
    emit();
  }

  function setPayMethod(next) {
    state.payMethod = next;
    emit();
  }

  /**
   * The only path that reaches a wallet. The order shown was quoted without a
   * taker, so a signable one is fetched for this address and checked before
   * anything is handed over.
   */
  async function review() {
    if (destroyed || state.state === 'signing') return;
    let atomic;
    try {
      atomic = atomicFromDecimal(state.amount, USDC_DECIMALS);
    } catch (error) { fail(error); return; }

    const shown = state.quote?.outAmount ?? null;
    state.state = 'signing';
    state.error = null;
    emit();

    try {
      const address = wallet.getAddress() || await wallet.connect();
      const order = await fetchOrder({
        inputMint: USDC_MINT, outputMint: sign.mint, amount: atomic, taker: address,
      });
      assertOrderMatches(order, { inputMint: USDC_MINT, outputMint: sign.mint, amount: atomic });
      if (!isSignable(order)) throw new TradeError('unavailable', 'The venue returned no transaction.');

      // Moved against them since the figure on screen: show it again first.
      if (outAmountDroppedTooFar(shown, order.outAmount)) {
        state.quote = order;
        state.state = 'ready';
        state.awaitingReview = true;
        emit();
        return;
      }

      const signed = await wallet.signTransaction(order.transaction);
      const result = await executeOrder({ signedTransaction: signed, requestId: order.requestId });
      state.quote = order;
      state.signature = result.signature;
      state.state = 'done';
      emit();
    } catch (error) {
      // A wallet the visitor dismissed is not a failure worth shouting about.
      if (error?.name === 'WalletDismissed') {
        state.state = state.quote ? 'ready' : 'idle';
        emit();
        return;
      }
      fail(error);
    }
  }

  function destroy() {
    destroyed = true;
    quoteToken += 1;
    if (debounce) clearT(debounce);
    debounce = null;
  }

  return {
    get state() { return { ...state }; },
    view,
    setAmount,
    setPayMethod,
    refreshQuote,
    review,
    destroy,
  };
}
