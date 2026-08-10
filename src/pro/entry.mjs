/**
 * Build-time stamping for the Registry Pro quote laboratory.
 *
 * The generated, committed page is always flag-off. A build with
 * PUBLIC_REGISTRY_PRO_ENABLED=1 replaces only the marked region below with
 * the terminal host and its self-hosted bundle. Stamping the same page with
 * the flag absent restores the committed bytes exactly.
 */

export const REGISTRY_PRO_FLAG = 'PUBLIC_REGISTRY_PRO_ENABLED';
export const REGISTRY_PRO_META = 'zodiacs-registry-pro-enabled';
export const REGISTRY_PRO_CHAT_FLAG = 'PUBLIC_REGISTRY_PRO_CHAT_ENABLED';
export const REGISTRY_PRO_CHAT_META = 'zodiacs-registry-pro-chat-enabled';

const START = '<!-- registry-pro:start -->';
const END = '<!-- registry-pro:end -->';
const SLOT = /<!-- registry-pro:slot (\{.*?\}) -->/u;

export function registryProEnabled(env = {}) {
  return env[REGISTRY_PRO_FLAG] === '1';
}

export function registryProChatEnabled(env = {}) {
  return registryProEnabled(env) && env[REGISTRY_PRO_CHAT_FLAG] === '1';
}

export function registryProSlotComment() {
  return '<!-- registry-pro:slot {} -->';
}

export function renderRegistryProRegion({ enabled }) {
  const slot = registryProSlotComment();
  if (!enabled) return `${START}\n      ${slot}\n      ${END}`;

  return [
    START,
    `      ${slot}`,
    '      <section class="registry-pro" data-registry-pro-terminal aria-label="Registry Pro quote laboratory">',
    '        <div class="registry-pro__fallback" data-registry-pro-fallback role="status">',
    '          <strong>The quote laboratory is not open.</strong>',
    '          <p>JavaScript is required to read live observations. If this notice remains, no quote or transaction was sent. The verified records remain available below and in <a href="/registry/">the Registry</a>.</p>',
    '        </div>',
    '      </section>',
    '      <script defer src="/assets/registry-pro.js"></script>',
    END,
  ].join('\n');
}

function metaFor(name, enabled) {
  return `<meta name="${name}" content="${enabled ? '1' : '0'}" />`;
}

/**
 * Rebuilds the marked region from its preserved slot on every run. This is
 * idempotent and byte-reversible; no flag-on bytes belong in git.
 */
export function injectRegistryPro(html, env = {}) {
  const enabled = registryProEnabled(env);
  const chatEnabled = registryProChatEnabled(env);
  const start = html.indexOf(START);
  const end = html.indexOf(END);
  if (start === -1 || end === -1 || end < start) {
    throw new Error('registry-pro: page is missing its terminal region markers');
  }

  const region = html.slice(start, end + END.length);
  if (!SLOT.test(region)) {
    throw new Error('registry-pro: region is missing its slot payload');
  }

  const next = renderRegistryProRegion({ enabled });
  const output = html.slice(0, start) + next + html.slice(end + END.length);
  const meta = new RegExp(`<meta name="${REGISTRY_PRO_META}" content="[01]" />`, 'u');
  const chatMeta = new RegExp(`<meta name="${REGISTRY_PRO_CHAT_META}" content="[01]" />`, 'u');
  if (!meta.test(output) || !chatMeta.test(output)) {
    throw new Error('registry-pro: page is missing its flag marker');
  }

  return {
    output: output
      .replace(meta, metaFor(REGISTRY_PRO_META, enabled))
      .replace(chatMeta, metaFor(REGISTRY_PRO_CHAT_META, chatEnabled)),
    enabled,
    chatEnabled,
  };
}
