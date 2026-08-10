/**
 * The trade panel's bootstrap — the only module in src/trade/ that touches the
 * page. Bundled to public/assets/trade.js by scripts/build-trade.mjs.
 *
 * Two ways in, because there are two hosts:
 *
 *   - the twelve catalogue pages, which are static HTML and carry a
 *     [data-trade-panel] slot stamped in when the flag is on;
 *   - the Registry landing, whose explorer is React and mounts the panel
 *     itself through window.zodiacsTrade as the reader walks the twelve.
 *
 * Both get the same panel and the same dependencies. Nothing here decides what
 * the panel says; that is panel-model.mjs, and it is already tested.
 */

import { executeOrder, fetchOrder } from './ultra.mjs';
import { TP_CSS } from './styles.mjs';
import { createWallet } from './wallet.mjs';
import { mountTradePanel } from './view.mjs';
import { fetchIndexedLiquidity } from './liquidity.mjs';

const STYLE_MARK = 'data-tp-styles';

/**
 * The marks the pay list wears. Rendered as CSS masks filled with ink — see
 * docs/VENUE-MARKS.md for where each one came from and which are ours. A
 * missing file costs nothing: the row still carries the company's name.
 */
const MARKS = Object.freeze({
  coinbase: '/assets/venues/coinbase.svg',
  fomo: '/assets/venues/fomo.svg',
  moonpay: '/assets/venues/moonpay.svg',
  ramp: '/assets/venues/ramp.svg',
  applepay: '/assets/venues/applepay.svg',
});

const liquidityCache = new Map();

function indexedLiquidityFor(mint) {
  const current = liquidityCache.get(mint);
  if (current) return current;
  const request = fetchIndexedLiquidity({ mint }).catch(() => null);
  liquidityCache.set(mint, request);
  return request;
}

function ensureStyles() {
  if (document.querySelector(`[${STYLE_MARK}]`)) return;
  const style = document.createElement('style');
  style.setAttribute(STYLE_MARK, '');
  style.textContent = TP_CSS;
  document.head.append(style);
}

/**
 * @param {HTMLElement} host
 * @param {{name: string, slug: string, mint: string, hue?: string, iconUrl?: string}} sign
 * @param {{onStateChange?: Function}} hooks
 */
export function mount(host, sign, hooks = {}) {
  if (!host || !sign?.mint) return null;
  ensureStyles();
  const wallet = createWallet({ host });
  const panel = mountTradePanel({
    host,
    sign,
    deps: {
      fetchOrder,
      executeOrder,
      wallet,
      fetchLiquidity: ({ mint }) => indexedLiquidityFor(mint),
      onStateChange: hooks.onStateChange,
    },
    marks: MARKS,
  });
  return {
    controller: panel.controller,
    destroy() {
      panel.destroy();
      wallet.destroy();
    },
  };
}

/** The catalogue pages: one stamped slot per page, carrying its own sign. */
function mountStampedSlots() {
  for (const slot of document.querySelectorAll('[data-trade-panel]')) {
    const slug = slot.dataset.tradeSign;
    if (!slug || slot.dataset.tradeMounted) continue;
    slot.dataset.tradeMounted = '1';
    mount(slot, {
      name: slot.dataset.tradeName ?? slug,
      slug,
      mint: slot.dataset.tradeMint,
      hue: slot.dataset.tradeHue || null,
      iconUrl: `/assets/zodiac-icons/128/${slug}.webp`,
    });
  }
}

window.zodiacsTrade = Object.freeze({ mount });

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountStampedSlots, { once: true });
} else {
  mountStampedSlots();
}
