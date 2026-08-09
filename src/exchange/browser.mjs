/**
 * Bundle entry for the Exchange page. Injects the terminal's styles once and
 * boots into the stamped [data-zme-terminal] container. The container exists
 * only when PUBLIC_REGISTRY_EXCHANGE_ENABLED stamped it in — a flag-off page
 * carries neither the container nor this script.
 */

import { ZX_CSS } from './styles.mjs';
import { createTerminal } from './terminal.mjs';

function ensureStyles() {
  if (document.querySelector('style[data-zme-styles]')) return;
  const style = document.createElement('style');
  style.setAttribute('data-zme-styles', '');
  style.textContent = ZX_CSS;
  document.head.appendChild(style);
}

function boot() {
  const host = document.querySelector('[data-zme-terminal]');
  if (!host || host.dataset.zmeMounted) return;
  host.dataset.zmeMounted = '1';
  ensureStyles();
  createTerminal({ host });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
