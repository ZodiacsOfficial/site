import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { skyURL, SANDBOX } from '../src/widget-contract.mjs';

test('widget URL has only constrained display inputs at the canonical HTTPS origin', () => {
  const url = new URL(skyURL('light', '#7B6DA8'));
  assert.equal(url.origin, 'https://zodiacs.org');
  assert.equal(url.pathname, '/embed/sky/');
  assert.deepEqual([...url.searchParams], [['theme', 'light'], ['accent', '#7B6DA8']]);
  assert.equal(SANDBOX, 'allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox');
  for (const theme of ['auto', '', 'dark&birth=secret']) assert.throws(() => skyURL(theme, '#7B6DA8'), RangeError);
  for (const accent of ['red', '#fff', '#7B6DA800', '#7B6DA8\n', '"><script>', '', null]) assert.throws(() => skyURL('dark', accent), RangeError);
});

test('local pages cannot submit birth fields when JavaScript fails; hosted fallback remains available', async () => {
  for (const path of ['natal.html', 'transits.html']) {
    const html = await readFile(new URL(`../src/${path}`, import.meta.url), 'utf8');
    assert.doesNotMatch(html, /<form\b|<iframe\b|<input[^>]*\bname\s*=/i);
    assert.match(html, /id="calculate" type="button" disabled/);
    assert.doesNotMatch(html, /(?:src|href)="https?:/i);
  }
  const widget = await readFile(new URL('../src/widget.html', import.meta.url), 'utf8');
  assert.match(widget, /href="https:\/\/zodiacs.org\/today\/"/);
  assert.match(widget, /Powered by Zodiacs.org/);
  assert.doesNotMatch(widget, /<iframe\b/i); // Created only after an explicit publisher-page click.
});
