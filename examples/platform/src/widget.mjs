import { skyURL, SANDBOX } from './widget-contract.mjs';

const byId = (id) => document.getElementById(id);
byId('load-widget').disabled = false;
byId('load-widget').addEventListener('click', () => {
  byId('error').textContent = '';
  try {
    const src = skyURL(byId('theme').value, byId('accent').value);
    const frame = document.createElement('iframe');
    frame.src = src;
    frame.title = 'Today’s sky — Zodiacs.org';
    frame.width = '480';
    frame.height = '300';
    frame.loading = 'lazy';
    frame.setAttribute('sandbox', SANDBOX);
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    byId('frame').replaceChildren(frame);
    byId('widget-status').textContent = 'External widget requested. Check its displayed date; use the link below if it is unavailable or stale.';
  } catch (error) {
    byId('error').textContent = error instanceof Error ? error.message : 'Widget settings are invalid.';
  }
});
