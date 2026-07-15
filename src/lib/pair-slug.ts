import { SIGN_SLUGS } from './signs';

/** Canonical pair slug: both signs in zodiac order, joined with a hyphen. */
export function pairSlug(a: string, b: string): string {
  const ia = SIGN_SLUGS.indexOf(a);
  const ib = SIGN_SLUGS.indexOf(b);
  if (ia < 0 || ib < 0) throw new Error(`Unknown sign in pair: ${a}, ${b}`);
  return ia <= ib ? `${a}-${b}` : `${b}-${a}`;
}
