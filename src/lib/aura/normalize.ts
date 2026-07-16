import { AURA_SIGN_ORDER, type AuraSign } from './types';

const SIGN_SET = new Set<string>(AURA_SIGN_ORDER);

/** Trims, lowercases, de-duplicates, and returns holdings in canonical zodiac order. */
export function normalizeHeldSigns(signs: readonly string[]): AuraSign[] {
  const held = new Set<AuraSign>();
  for (const value of signs) {
    const normalized = value.trim().toLowerCase();
    if (SIGN_SET.has(normalized)) held.add(normalized as AuraSign);
  }
  return AURA_SIGN_ORDER.filter((sign) => held.has(sign));
}
