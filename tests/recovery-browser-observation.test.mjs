import assert from 'node:assert/strict';
import { test } from 'vitest';
import { isExpectedInjectedError } from './recovery-browser-checks.mjs';

const injected = 'http://127.0.0.1:4399/_astro/full.fixture.js';
const other = 'http://127.0.0.1:4399/_astro/unrelated.fixture.js';
const failedUrls = new Set([injected]);
const moduleError = {
  name: 'ModuleLoadError', message: 'Calculation module unavailable',
  cause: `Failed to fetch dynamically imported module: ${injected}`,
};
const entry = (patch = {}) => ({ text: '', url: '', argumentCount: patch.errors?.length ?? 0, errors: [], ...patch });

test('only an exact injected network request can explain a browser network error', () => {
  for (const code of ['FAILED', 'ABORTED']) {
    const text = `Failed to load resource: net::ERR_${code}`;
    assert.equal(isExpectedInjectedError(entry({ text, url: injected }), failedUrls), true);
    assert.equal(isExpectedInjectedError(entry({ text, url: other }), failedUrls), false);
  }
  for (const text of ['Failed to load resource: the server responded with a status of 404 (Not Found)',
    'Failed to load resource: net::ERR_CONNECTION_REFUSED', 'Unrelated application error']) {
    assert.equal(isExpectedInjectedError(entry({ text, url: injected }), failedUrls), false);
  }
});

test('a caught module error must retain the exact deliberately rejected native import cause', () => {
  assert.equal(isExpectedInjectedError(entry({ errors: [moduleError] }), failedUrls), true);
  for (const error of [
    { ...moduleError, name: 'TypeError' },
    { ...moduleError, message: 'Other error' },
    { ...moduleError, cause: null },
    { ...moduleError, cause: `Failed to fetch dynamically imported module: ${other}` },
    { ...moduleError, cause: 'Unexpected token in a downloaded module' },
  ]) {
    assert.equal(isExpectedInjectedError(entry({ errors: [error] }), failedUrls), false);
  }
  assert.equal(isExpectedInjectedError(entry({ text: 'ModuleLoadError: Calculation module unavailable' }), failedUrls), false);
});

test('an injected failure does not excuse another error reported alongside it', () => {
  assert.equal(isExpectedInjectedError(entry({ errors: [moduleError, {
    name: 'TypeError', message: 'Cannot read properties of undefined', cause: null,
  }] }), failedUrls), false);
  assert.equal(isExpectedInjectedError(entry({ errors: [moduleError] }), new Set()), false);
  // The observer filters non-Error handles from errors, but preserves the
  // original argument count so extra strings or plain objects stay fatal.
  for (const extra of ['unrelated failure', { unrelated: 'failure' }]) {
    const args = [moduleError, extra];
    assert.equal(isExpectedInjectedError(entry({
      text: 'unrelated failure ModuleLoadError: Calculation module unavailable',
      errors: [moduleError], argumentCount: args.length,
    }), failedUrls), false);
  }
});
