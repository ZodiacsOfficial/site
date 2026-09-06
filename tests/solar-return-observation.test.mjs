import { describe, expect, it } from 'vitest';
import { isExpectedSolarError } from './solar-return-drive.mjs';

const url = 'http://127.0.0.1:4399/_astro/share-card.fixture.js';
const failures = new Set([url]);
const network = { argumentCount: 0, errors: [], text: 'Failed to load resource: net::ERR_FAILED', url };
const moduleError = { name: 'ModuleLoadError', message: 'Calculation module unavailable', cause: `Failed to fetch dynamically imported module: ${url}` };

describe('Solar injected-error observation boundary', () => {
  it('only permits the exact deliberately rejected resource and network reason', () => {
    expect(isExpectedSolarError(network, failures)).toBe(true);
    expect(isExpectedSolarError(network, new Set())).toBe(false);
    expect(isExpectedSolarError({ ...network, url: `${url}?unrelated` }, failures)).toBe(false);
    for (const text of ['Failed to load resource: net::ERR_CONNECTION_REFUSED', 'Unexpected application failure']) {
      expect(isExpectedSolarError({ ...network, text }, failures)).toBe(false);
    }
  });
  it('requires one caught module error retaining the exact native failure cause', () => {
    const entry = { argumentCount: 1, errors: [moduleError] };
    expect(isExpectedSolarError(entry, failures)).toBe(true);
    for (const patch of [{ name: 'TypeError' }, { message: 'Different failure' }, { cause: null }, { cause: `${moduleError.cause}?unrelated` }]) {
      expect(isExpectedSolarError({ ...entry, errors: [{ ...moduleError, ...patch }] }, failures)).toBe(false);
    }
  });
  it('keeps extra console arguments and unrelated errors fatal during injection', () => {
    expect(isExpectedSolarError({ argumentCount: 2, errors: [moduleError] }, failures)).toBe(false);
    expect(isExpectedSolarError({ argumentCount: 2, errors: [moduleError, { name: 'Error', message: 'Unrelated' }] }, failures)).toBe(false);
    expect(isExpectedSolarError({ ...network, argumentCount: 1 }, failures)).toBe(false);
  });
});
