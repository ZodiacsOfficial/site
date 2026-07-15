import { describe, expect, it } from 'vitest';
import { REGISTRY_ESTABLISHED } from '../src/lib/registry-establishment.mjs';
import { injectRegistryEstablishment } from './sync-registry-establishment.mjs';

describe('registry establishment static synchronization', () => {
  it('replaces every marked no-JS slot from the exported constant', () => {
    const fixture = '<b>Est. <span data-registry-established>MMX</span></b><span data-registry-established="year">MMXI</span>';
    const { output, count } = injectRegistryEstablishment(fixture);
    expect(count).toBe(2);
    expect(output).toBe(`<b>Est. <span data-registry-established>${REGISTRY_ESTABLISHED}</span></b><span data-registry-established="year">${REGISTRY_ESTABLISHED}</span>`);
  });
});
