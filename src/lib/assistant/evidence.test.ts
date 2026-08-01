import { describe, expect, it } from 'vitest';
import {
  assistantEvidenceLabel,
  assistantEvidenceSelection,
  normalizeAssistantEvidence,
} from './evidence';

const RECEIPT = {
  kind: 'transit',
  date: '2026-08-01',
  transitingBody: 'Saturn',
  aspect: 'square',
  natalPoint: 'Sun',
  orb: 1.24,
} as const;

describe('assistant evidence', () => {
  it('accepts and copies a closed deterministic transit receipt', () => {
    const normalized = normalizeAssistantEvidence(RECEIPT);
    expect(normalized).toEqual(RECEIPT);
    expect(normalized).not.toBe(RECEIPT);
    expect(assistantEvidenceLabel(normalized!))
      .toBe('Saturn square natal Sun · 1.2° orb · 2026-08-01');
    expect(assistantEvidenceSelection(normalized!)).toBe('body:Sun');
  });

  it.each([
    { ...RECEIPT, date: '2026-02-30' },
    { ...RECEIPT, transitingBody: 'Earth' },
    { ...RECEIPT, aspect: 'quincunx' },
    { ...RECEIPT, natalPoint: 'Vertex' },
    { ...RECEIPT, orb: -0.1 },
    { ...RECEIPT, orb: 3.1 },
  ])('rejects evidence outside the server vocabulary: $transitingBody $aspect', (value) => {
    expect(normalizeAssistantEvidence(value)).toBeNull();
  });

  it('maps stored angles to Chart Explorer angle selections', () => {
    expect(assistantEvidenceSelection({ ...RECEIPT, natalPoint: 'Ascendant' })).toBe('angle:asc');
    expect(assistantEvidenceSelection({ ...RECEIPT, natalPoint: 'Midheaven' })).toBe('angle:mc');
  });
});
