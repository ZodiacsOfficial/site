/** Browser entry for the independently flagged Registry Pro quote lab. */

import { REGISTRY_PRO_CSS } from './styles.mjs';
import { createProTerminal } from './terminal.mjs';

function ensureStyles() {
  if (document.querySelector('style[data-registry-pro-styles]')) return;
  const style = document.createElement('style');
  style.setAttribute('data-registry-pro-styles', '');
  style.textContent = REGISTRY_PRO_CSS;
  document.head.append(style);
}

function boot() {
  const host = document.querySelector('[data-registry-pro-terminal]');
  if (!host || host.dataset.registryProMounted) return;
  host.dataset.registryProMounted = '1';
  ensureStyles();
  try {
    const chatEnabled = document.querySelector(
      'meta[name="zodiacs-registry-pro-chat-enabled"][content="1"]',
    ) !== null;
    createProTerminal({ host, chatEnabled });
  } catch {
    host.innerHTML = '';
    const fallback = document.createElement('div');
    fallback.className = 'registry-pro__fallback';
    fallback.setAttribute('role', 'status');
    fallback.textContent = 'Registry Pro could not open. No quote or transaction was sent.';
    host.append(fallback);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
