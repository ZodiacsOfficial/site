/**
 * The trade panel's decision layer: given a state and a quote, what the panel
 * says. Kept free of the DOM so the wording — which carries the disclosure
 * obligations — can be pinned by tests rather than read off a screenshot.
 *
 * Two rules run through all of it. The panel never claims the site does
 * anything it doesn't: the venue quotes, builds and submits, and the visitor's
 * wallet signs. And a cost is never described as smaller than it is — the
 * venue's fee is named in money, and the card route's 3–5% is stated where the
 * card route is offered rather than left in the small print.
 */

import { decimalFromAtomic, priceImpactBand } from './ultra.mjs';

export const PAY_METHODS = Object.freeze(['card', 'usdc']);
export const PANEL_STATES = Object.freeze(['idle', 'quoting', 'ready', 'signing', 'done', 'error']);

/** USDC on Solana. Amounts are entered as plain dollars. */
export const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
export const USDC_DECIMALS = 6;
export const ZODIAC_DECIMALS = 6;

/** Dollar presets. The lowest sits at $25 because on-ramps set minimums. */
export const AMOUNT_PRESETS = Object.freeze(['25', '50', '100', '250']);

/**
 * Where a visitor with no USDC can start, listed alphabetically and never
 * ranked — the Registry refuses ranked lists elsewhere, and the site takes
 * nothing from any of these.
 *
 * These sit only inside the funding branch. None is presented as equivalent
 * to the direct USDC → Zodiac swap on this desk, and none receives a ranking.
 * Each note says what the company does in the fewest words that survive a
 * glance; visitors must still verify the official mint in any third-party app.
 */
export const PAY_WAYS = Object.freeze([
  { name: 'Coinbase', mark: 'coinbase', href: 'https://www.coinbase.com/',
    note: 'Fund a wallet with USDC.' },
  { name: 'fomo', mark: 'fomo', href: 'https://fomo.family/', applePay: true,
    note: 'Fund in-app; verify the mint.' },
  { name: 'MoonPay', mark: 'moonpay', href: 'https://www.moonpay.com/',
    note: 'Buy USDC by card or bank.' },
  { name: 'Ramp Network', mark: 'ramp', href: 'https://rampnetwork.com/',
    note: 'Buy USDC with mobile pay.' },
]);

/** Money, in the smallest unit a person would actually say out loud. */
export function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  if (n < 1) return `${Math.round(n * 100)}¢`;
  return `$${n.toFixed(2)}`;
}

export function groupedAmount(atomic, decimals = ZODIAC_DECIMALS) {
  const whole = decimalFromAtomic(atomic, decimals, { maxFractionDigits: 0 });
  return Number(whole).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

/**
 * The venue's fee as money rather than a percentage. "0.10%" means nothing to
 * most people; "about 3¢ on this trade" does.
 */
export function venueFeeLine(spendDollars, feeBps) {
  const cost = (Number(spendDollars) || 0) * ((Number(feeBps) || 0) / 10_000);
  return `Jupiter’s fee — about ${money(cost)} on this trade.`;
}

export function impactLine(pct) {
  const band = priceImpactBand(pct);
  const value = Math.abs(Number(pct) || 0).toFixed(2);
  return { band, text: `Buying this much moves the price ${value}%.`, severe: band === 'severe' };
}

/** A compact market-depth figure, deliberately named as indexed rather than total. */
export function indexedLiquidity(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: n < 10_000 ? 1 : 0,
  }).format(n);
}

export function quoteAge(quotedAt, nowMs = Date.now()) {
  const age = Math.max(0, Math.floor((Number(nowMs) - Number(quotedAt)) / 1000));
  if (!Number.isFinite(age) || !quotedAt) return '';
  if (age < 10) return 'Just now';
  if (age < 60) return `${age}s ago`;
  return `${Math.floor(age / 60)}m ago`;
}

export function shortMint(mint) {
  const value = String(mint || '');
  if (value.length < 13) return value;
  return `${value.slice(0, 5)}…${value.slice(-5)}`;
}

/** Said only when the pool genuinely cannot absorb the amount. */
export function thinPoolWarning(signName, pct) {
  const value = Math.abs(Number(pct) || 0).toFixed(2);
  return `Not much ${signName} is for sale right now, so buying this much would push the price up `
    + `${value}%. Buying less costs you less.`;
}

/**
 * The closing note follows the path actually chosen. On the card path the site
 * is not even the next step, so promising a wallet prompt would be wrong.
 */
export function closingNote(payMethod) {
  if (payMethod === 'card') {
    return 'Funding and any ID checks happen with the provider you choose. Zodiacs.org never sees your '
      + 'card or holds your money. Funding USDC is not the Zodiac swap; return here to complete it. '
      + 'Prices move fast, and a Zodiac can lose all its value.';
  }
  return 'Your wallet will ask you to approve this before anything happens. Jupiter does the trade, not '
    + 'us — Zodiacs.org never holds your money and can’t undo a trade once it’s made. Prices here move '
    + 'fast, and a Zodiac can lose all its value.';
}

/** What someone wants to know once the trade has landed. */
export function afterPurchase(signName) {
  return [
    'They are in your wallet already. Nobody else can move them — not us, not Jupiter.',
    'You do not need to do anything else. There is nothing to claim and nothing to renew.',
    'Sell them whenever you like, the same way you bought them.',
    `${signName} now shows in your Cabinet of Twelve.`,
  ];
}

/** Failures a visitor can act on, in words that say what to do next. */
export function errorCopy(code) {
  switch (code) {
    case 'no_route':
      return 'No price right now. Try again in a moment, or try a smaller amount.';
    case 'rate_limited':
      return 'Too many requests just now. Wait a moment and try again.';
    case 'invalid_amount':
      return 'Enter an amount using digits and a single decimal point.';
    case 'order_mismatch':
    case 'unexpected_fee':
      // Never soften this one: it means the answer did not match what was shown.
      return 'The price that came back did not match what you were shown, so nothing was sent to your '
        + 'wallet. Try again.';
    case 'execute_failed':
      return 'The trade did not go through. Nothing left your wallet.';
    case 'network':
      return 'That could not be confirmed from here. Check your wallet before trying again — it may '
        + 'still have gone through.';
    default:
      return 'Something went wrong. Nothing was sent to your wallet.';
  }
}

/**
 * The whole view, decided in one place.
 * `quote` is a normalized Ultra order (see ultra.mjs) or null.
 */
export function panelView({
  state = 'idle',
  payMethod = 'card',
  sign,
  amount = '25',
  quote = null,
  error = null,
  quotedAt = null,
  nowMs = Date.now(),
  indexedLiquidityUsd = null,
  awaitingReview = false,
}) {
  if (!PANEL_STATES.includes(state)) throw new Error(`panel-model: unknown state ${state}`);
  if (!PAY_METHODS.includes(payMethod)) throw new Error(`panel-model: unknown pay method ${payMethod}`);

  const view = {
    state,
    payMethod,
    heading: `Buy ${sign.name}`,
    subheading: `Official ${sign.name} fungible token`,
    venue: 'Acquisition desk',
    assetNote: `The gold sculpture is symbolic collection art. You are buying the official fungible ${sign.name} token — not the sculpture, a physical object, or a 1-of-1 NFT.`,
    spendTitle: 'Choose your spend',
    routeTitle: 'Choose your route',
    quoteTitle: payMethod === 'card' ? 'Reference quote' : 'Live swap quote',
    actionTitle: payMethod === 'card' ? 'Fund with USDC' : 'Review & approve',
    actionIntro: payMethod === 'card'
      ? 'These providers fund a wallet. They do not complete this Zodiac order here.'
      : `Your wallet swaps USDC directly for official ${sign.name} through Jupiter.`,
    payLabel: 'Spend',
    payUnit: 'USDC',
    payHint: '1 USDC is designed to track 1 US dollar',
    presets: AMOUNT_PRESETS,
    amount,
    // The card path is offered first: most visitors hold no USDC.
    methods: [
      { id: 'card', eyebrow: 'Fund first', label: 'I’m new to crypto' },
      { id: 'usdc', eyebrow: 'Direct swap', label: 'I already have USDC' },
    ],
    routeHint: payMethod === 'card'
      ? 'Get USDC from a provider, then return and choose the direct swap route.'
      : 'One wallet approval completes the USDC → Zodiac swap.',
    payWays: PAY_WAYS,
    note: closingNote(payMethod),
    showQuote: false,
    showAction: state === 'ready' || state === 'signing',
    facts: [],
    warning: null,
    reviewNotice: awaitingReview
      ? 'The price moved by more than 1% before approval. Nothing was sent to your wallet. Review the refreshed quote and approve again if it still works for you.'
      : null,
    error: null,
    after: null,
    details: [
      {
        label: 'Official mint',
        value: shortMint(sign.mint),
        title: sign.mint,
        href: sign.mint ? `https://solscan.io/token/${encodeURIComponent(sign.mint)}` : null,
      },
      ...(indexedLiquidity(indexedLiquidityUsd)
        ? [{ label: 'Indexed liquidity', value: indexedLiquidity(indexedLiquidityUsd) }]
        : []),
    ],
  };

  if (state === 'error') {
    view.error = errorCopy(error);
    return view;
  }

  if (state === 'done') {
    view.after = afterPurchase(sign.name);
    view.note = 'Zodiacs.org never held your keys or funds, and cannot reverse a trade.';
    return view;
  }

  if (state === 'quoting') {
    view.getLabel = 'You get';
    view.actionLabel = 'Finding the best price…';
    view.actionDisabled = true;
    return view;
  }

  if (quote) {
    const impact = impactLine(quote.priceImpactPct);
    view.showQuote = true;
    view.getLabel = 'You get, about';
    view.receive = groupedAmount(quote.outAmount);
    view.receiveUnit = sign.name;
    view.receiveWorth = quote.outUsdValue ? `worth about $${quote.outUsdValue.toFixed(2)} right now` : '';
    view.facts = [venueFeeLine(amount, quote.feeBps), impact.text];
    const age = quoteAge(quotedAt, nowMs);
    if (age) view.details.splice(1, 0, { label: 'Quote age', value: age });
    view.impactBand = impact.band;
    if (impact.severe) view.warning = thinPoolWarning(sign.name, quote.priceImpactPct);
  }

  view.actionLabel = state === 'signing'
    ? 'Approve in your wallet'
    : awaitingReview
      ? 'Review refreshed quote'
      : 'Review swap in wallet';
  view.actionDisabled = state === 'signing';
  view.walletHint = 'No wallet yet? Phantom and Solflare are free, and hold what you buy.';
  return view;
}
