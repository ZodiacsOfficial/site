import { describe, expect, it } from 'vitest';
import { DISCLOSURE_ROWS } from './disclosure';
import {
  REGISTRY_ESTABLISHED,
  REGISTRY_ESTABLISHMENT,
  REGISTRY_ESTABLISHMENT_PROVENANCE_URL,
} from './registry-establishment.mjs';

describe('registry disclosure contract', () => {
  it('publishes every required disclosure row exactly once', () => {
    expect(DISCLOSURE_ROWS.map((row) => row.id)).toEqual([
      'operator',
      'economic-interest',
      'origin',
      'separation',
      'read-only',
      'financial-advice',
    ]);
  });

  it('keeps every unverified operator claim visibly pending', () => {
    const pending = DISCLOSURE_ROWS.filter((row) => row.status === 'pending');
    expect(pending.map((row) => row.id)).toEqual(['operator', 'economic-interest', 'origin']);
    expect(pending.every((row) => `${row.statement} ${row.evidence}`.includes('[OPERATOR TO'))).toBe(true);
  });

  it('provides one pending deploy-transaction slot per sign', () => {
    const origin = DISCLOSURE_ROWS.find((row) => row.id === 'origin');
    expect(origin?.links).toHaveLength(12);
    expect(origin?.links.every((link) => !link.href && link.label.includes('[OPERATOR TO'))).toBe(true);
  });

  it('centralizes the provisional year and leaves provenance unsupplied', () => {
    expect(REGISTRY_ESTABLISHED).toBe(REGISTRY_ESTABLISHMENT.romanYear);
    expect(REGISTRY_ESTABLISHMENT_PROVENANCE_URL).toBeNull();
  });
});
