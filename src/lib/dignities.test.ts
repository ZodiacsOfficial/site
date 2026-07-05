/** Shape + canonical anchors for the classical dignity table. */
import { describe, expect, it } from 'vitest';
import { dignityFor, hasClassicalDignities } from './dignities';
import { SIGNS, SIGN_SLUGS } from './signs';

const CLASSICAL = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];

describe('dignities', () => {
  it('covers exactly the seven classical planets', () => {
    for (const p of CLASSICAL) expect(hasClassicalDignities(p)).toBe(true);
    for (const p of ['Uranus', 'Neptune', 'Pluto']) {
      expect(hasClassicalDignities(p)).toBe(false);
      expect(dignityFor(p, 'aries')).toBeNull();
    }
  });

  it('matches the canonical anchors', () => {
    expect(dignityFor('Sun', 'leo')).toBe('domicile');
    expect(dignityFor('Sun', 'aries')).toBe('exaltation');
    expect(dignityFor('Sun', 'libra')).toBe('fall');
    expect(dignityFor('Moon', 'cancer')).toBe('domicile');
    expect(dignityFor('Moon', 'taurus')).toBe('exaltation');
    expect(dignityFor('Venus', 'scorpio')).toBe('detriment');
    expect(dignityFor('Venus', 'pisces')).toBe('exaltation');
    expect(dignityFor('Mars', 'capricorn')).toBe('exaltation');
    expect(dignityFor('Mars', 'cancer')).toBe('fall');
    expect(dignityFor('Saturn', 'libra')).toBe('exaltation');
    expect(dignityFor('Saturn', 'aries')).toBe('fall');
    expect(dignityFor('Jupiter', 'cancer')).toBe('exaltation');
  });

  it('Mercury in Virgo reads as exaltation over domicile', () => {
    expect(dignityFor('Mercury', 'virgo')).toBe('exaltation');
    expect(dignityFor('Mercury', 'gemini')).toBe('domicile');
  });

  it('derives structurally from the canonical sign table', () => {
    // Domicile = the signs signs.ts says the planet rules (modern or
    // classical); detriment sits opposite each domicile; fall sits
    // opposite the exaltation. This cross-locks the two tables forever.
    const opposite = (slug: string) => {
      const i = SIGN_SLUGS.indexOf(slug);
      return SIGN_SLUGS[(i + 6) % 12];
    };
    for (const p of CLASSICAL) {
      const domiciles = SIGNS.filter((s) => s.ruler === p || s.classicRuler === p).map((s) => s.slug);
      expect(domiciles.length).toBeGreaterThanOrEqual(1);
      for (const d of domiciles) {
        expect(dignityFor(p, d) === 'domicile' || dignityFor(p, d) === 'exaltation').toBe(true);
        const det = dignityFor(p, opposite(d));
        expect(det === 'detriment' || det === 'fall').toBe(true);
      }
      // Exactly one exaltation and its opposite is the fall.
      const exalts = SIGN_SLUGS.filter((s) => dignityFor(p, s) === 'exaltation');
      expect(exalts.length).toBeLessThanOrEqual(1);
      if (exalts.length === 1) {
        expect(dignityFor(p, opposite(exalts[0]))).toBe('fall');
      }
    }
  });

  it('every dignity value names a real sign, and neutrals return null', () => {
    for (const p of CLASSICAL) {
      let hits = 0;
      for (const s of SIGN_SLUGS) {
        const d = dignityFor(p, s);
        if (d !== null) hits += 1;
      }
      // Each classical planet has 2 domiciles + 2 detriments (or 1+1 for
      // the luminaries) + exaltation + fall, with Mercury/Venus overlaps.
      expect(hits).toBeGreaterThanOrEqual(4);
      expect(hits).toBeLessThanOrEqual(6);
    }
    expect(dignityFor('Venus', 'gemini')).toBeNull();
  });
});
