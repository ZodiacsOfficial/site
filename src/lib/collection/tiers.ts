import { SIGNS } from '../signs';
import type { OfficialHolding } from '../wallet/holdings';

/**
 * Collection tiers follow the TOTAL amount held across the Twelve at one
 * address (ui units). The cabinet is the separate presence count: which signs
 * are held at all, each counted once. Master requires both maxed — Gold depth
 * and every seat filled. Amounts are balance reads, never value claims.
 */
export type CollectionTierId = 'none' | 'bronze' | 'silver' | 'gold' | 'master';

export const SILVER_THRESHOLD = 100_000;
export const GOLD_THRESHOLD = 1_000_000;
export const CABINET_SIZE = 12;

const SIGN_ORDER = new Map(SIGNS.map((sign, index) => [sign.slug, index]));

function positiveOfficial(holdings: OfficialHolding[]): OfficialHolding[] {
  return holdings.filter((holding) => SIGN_ORDER.has(holding.sign)
    && Number.isFinite(holding.amount)
    && holding.amount > 0);
}

/** Signs present at the address, each counted once, in zodiac order. */
export function cabinetOf(holdings: OfficialHolding[]): string[] {
  const present = new Set(positiveOfficial(holdings).map((holding) => holding.sign));
  return [...present].sort((a, b) => SIGN_ORDER.get(a)! - SIGN_ORDER.get(b)!);
}

/** Total ui amount held across every official sign. */
export function totalHeld(holdings: OfficialHolding[]): number {
  return positiveOfficial(holdings).reduce((sum, holding) => sum + holding.amount, 0);
}

export function tierFor(holdings: OfficialHolding[]): CollectionTierId {
  const cabinet = cabinetOf(holdings);
  if (cabinet.length === 0) return 'none';
  const total = totalHeld(holdings);
  if (total >= GOLD_THRESHOLD) return cabinet.length === CABINET_SIZE ? 'master' : 'gold';
  if (total >= SILVER_THRESHOLD) return 'silver';
  return 'bronze';
}
