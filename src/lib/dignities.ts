/**
 * Classical essential dignities — the tradition's map of where each
 * planet works with the grain (domicile, exaltation) or against it
 * (detriment, fall). Defined for the seven classical planets only;
 * Uranus, Neptune, and Pluto entered the story after the system was
 * built, and this site doesn't retrofit them.
 */

export type Dignity = 'domicile' | 'exaltation' | 'detriment' | 'fall';

interface DignityRow {
  domicile: string[];
  exaltation: string | null;
  detriment: string[];
  fall: string | null;
}

const TABLE: Record<string, DignityRow> = {
  Sun: { domicile: ['leo'], exaltation: 'aries', detriment: ['aquarius'], fall: 'libra' },
  Moon: { domicile: ['cancer'], exaltation: 'taurus', detriment: ['capricorn'], fall: 'scorpio' },
  Mercury: { domicile: ['gemini', 'virgo'], exaltation: 'virgo', detriment: ['sagittarius', 'pisces'], fall: 'pisces' },
  Venus: { domicile: ['taurus', 'libra'], exaltation: 'pisces', detriment: ['scorpio', 'aries'], fall: 'virgo' },
  Mars: { domicile: ['aries', 'scorpio'], exaltation: 'capricorn', detriment: ['libra', 'taurus'], fall: 'cancer' },
  Jupiter: { domicile: ['sagittarius', 'pisces'], exaltation: 'cancer', detriment: ['gemini', 'virgo'], fall: 'capricorn' },
  Saturn: { domicile: ['capricorn', 'aquarius'], exaltation: 'libra', detriment: ['cancer', 'leo'], fall: 'aries' },
};

/** One-line glosses in the house voice, rendered next to the label. */
export const DIGNITY_GLOSS: Record<Dignity, string> = {
  domicile: 'the planet in its own sign, running on home rules',
  exaltation: 'the tradition’s honored-guest placement, working at its best',
  detriment: 'the planet opposite its home, working against the grain',
  fall: 'the tradition’s uphill placement, strength earned rather than given',
};

/**
 * The classical dignity of a planet in a sign, or null when neutral or
 * when the planet carries no classical dignities (the outer three).
 * Exaltation/fall outrank domicile/detriment only where they overlap
 * (Mercury in Virgo reads as exaltation, its stronger title there).
 */
export function dignityFor(planet: string, signSlug: string): Dignity | null {
  const row = TABLE[planet];
  if (!row) return null;
  if (row.exaltation === signSlug) return 'exaltation';
  if (row.fall === signSlug) return 'fall';
  if (row.domicile.includes(signSlug)) return 'domicile';
  if (row.detriment.includes(signSlug)) return 'detriment';
  return null;
}

/** True for the seven planets the classical system covers. */
export function hasClassicalDignities(planet: string): boolean {
  return planet in TABLE;
}
