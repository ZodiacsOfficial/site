/**
 * Stamping for the Exchange page's terminal region.
 *
 * The committed HTML is always flag-off: the page ships as a quiet reading
 * room — title, the twelve record links, the pinned risk copy — and none of
 * the terminal. A production build with PUBLIC_REGISTRY_EXCHANGE_ENABLED=1
 * stamps the terminal container and its runtime in; running the stamper again
 * without the flag restores the committed bytes exactly, so the CI drift gate
 * — which regenerates with no env and diffs — stays quiet.
 *
 * Follows src/trade/entry.mjs: marked region, meta marker, idempotent,
 * reversible. The slot payload is deliberately empty — nothing about a sign,
 * a mint, or a pool is baked into the page. The terminal reads the live
 * registry answer, the same one answer to what a sign's mint is.
 */

export const REGISTRY_EXCHANGE_FLAG = 'PUBLIC_REGISTRY_EXCHANGE_ENABLED';
export const REGISTRY_EXCHANGE_META = 'zodiacs-registry-exchange-enabled';
export const REGISTRY_EXCHANGE_PATH = '/terminal/markets/';
export const REGISTRY_EXCHANGE_PUBLIC_NAME = 'Zodiac Markets';
export const REGISTRY_EXCHANGE_LANDING_COPY = Object.freeze({
  eyebrow: 'Advanced market view',
  action: 'Open Zodiac Markets',
  description: 'All 12 · charts · recent trades · independent venue quotes',
  ariaLabel: 'Open Zodiac Markets for the selected Zodiac token',
});

const START = '<!-- registry-exchange:start -->';
const END = '<!-- registry-exchange:end -->';
const SLOT = /<!-- registry-exchange:slot (\{.*?\}) -->/;

export function registryExchangeEnabled(env = {}) {
  return env[REGISTRY_EXCHANGE_FLAG] === '1';
}

export function exchangeSlotComment() {
  return '<!-- registry-exchange:slot {} -->';
}

/**
 * Flag-off renders nothing at all — not a hidden container, not a
 * placeholder. A visitor with the flag off gets the page exactly as it is
 * committed.
 */
export function renderExchangeRegion({ enabled }) {
  const slot = exchangeSlotComment();
  if (!enabled) return `${START}\n      ${slot}\n      ${END}`;
  return [
    START,
    `      ${slot}`,
    `      <section class="zme" data-zme-terminal aria-label="${REGISTRY_EXCHANGE_PUBLIC_NAME} terminal">`,
    '        <noscript>',
    '          <p class="zme__noscript">The terminal needs JavaScript. Each record page under',
    '          <a href="/registry/">the Registry</a> lists the venue route directly.</p>',
    '        </noscript>',
    '      </section>',
    '      <script defer src="/assets/exchange.js"></script>',
    END,
  ].join('\n');
}

function metaFor(enabled) {
  return `<meta name="${REGISTRY_EXCHANGE_META}" content="${enabled ? '1' : '0'}" />`;
}

/**
 * Re-render the region for the current flag state. Idempotent, and
 * byte-reversible: inject(inject(html, on), off) === html.
 */
export function injectRegistryExchange(html, env = {}) {
  const enabled = registryExchangeEnabled(env);
  const start = html.indexOf(START);
  const end = html.indexOf(END);
  if (start === -1 || end === -1) {
    throw new Error('registry-exchange: page is missing its terminal region markers');
  }
  const region = html.slice(start, end + END.length);
  if (!SLOT.test(region)) {
    throw new Error('registry-exchange: region is missing its slot payload');
  }

  const next = renderExchangeRegion({ enabled });
  const output = html.slice(0, start) + next + html.slice(end + END.length);

  const meta = new RegExp(`<meta name="${REGISTRY_EXCHANGE_META}" content="[01]" />`);
  if (!meta.test(output)) throw new Error('registry-exchange: page is missing its flag marker');
  return { output: output.replace(meta, metaFor(enabled)), enabled };
}

/**
 * The Registry landing owns only a build marker for this surface. Its React
 * shell decides whether and where to render the single discovery entry. This
 * keeps the route and landing on one flag without baking terminal markup or a
 * venue URL into the committed hub.
 */
export function injectRegistryExchangeLanding(html, env = {}) {
  const enabled = registryExchangeEnabled(env);
  const source = `<meta name="${REGISTRY_EXCHANGE_META}" content="[01]" />`;
  const matches = html.match(new RegExp(source, 'g')) ?? [];
  if (matches.length === 0) throw new Error('registry-exchange: hub is missing its flag marker');
  if (matches.length !== 1) {
    throw new Error('registry-exchange: hub must contain exactly one flag marker');
  }
  const meta = new RegExp(source);
  return { output: html.replace(meta, metaFor(enabled)), enabled };
}
