import { describe, expect, it } from 'vitest';
import {
  ZODIAC_SIGNS,
  getAllOfficialRepresentations,
} from '@zodiacs/sdk';
import registryDocument from '../../../public/registry/zodiacs.registry.json';
import packageDocument from '../../../package.json';
import { AURA_SIGN_ORDER } from './types';

describe('published SDK conformance', () => {
  it('pins the SDK as a test-only dependency and shares its zodiac order', () => {
    expect(packageDocument.devDependencies['@zodiacs/sdk']).toBe('1.0.1');
    expect(packageDocument.dependencies).not.toHaveProperty('@zodiacs/sdk');
    expect(AURA_SIGN_ORDER).toEqual(ZODIAC_SIGNS);
  });

  it('keeps site-local official identity semantics aligned with the SDK', () => {
    const identity = (representation: { sign: string; chain: string; address: string }) => ({
      sign: representation.sign,
      chain: representation.chain,
      address: representation.chain === 'base'
        ? representation.address.toLowerCase()
        : representation.address,
    });
    const local = registryDocument.assets
      .flatMap((asset) => asset.representations)
      .filter((representation) => representation.isOfficialRepresentation)
      .map(identity);
    const published = getAllOfficialRepresentations().map(identity);

    expect(local).toEqual(published);
  });
});
