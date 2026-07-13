/**
 * Secondary progressions over the full planetary engine. Progressed ANGLES
 * (ASC/MC) are deliberately not computed — they require a house-progression
 * convention (Naibod, solar-arc MC, …) we have not adopted, and faking one
 * would misstate what was computed.
 */
import { computeBodies } from './full';
import type { BodyPosition } from './types';

/** Tropical year length used for the day-for-a-year mapping. */
export const PROGRESSION_DAYS_PER_YEAR = 365.2422;

const DAY_MS = 86_400_000;

/**
 * Secondary-progression instant: one civil day after birth stands for one
 * tropical year of life. Elapsed life is measured in tropical years so the
 * mapping has no calendar drift.
 */
export function progressedInstant(birthUtc: Date, target: Date): Date {
  const yearsLived = (target.getTime() - birthUtc.getTime()) / (PROGRESSION_DAYS_PER_YEAR * DAY_MS);
  return new Date(birthUtc.getTime() + yearsLived * DAY_MS);
}

/** Progressed planetary positions for `target`. Planets only — no angles. */
export function progressedBodies(birthUtc: Date, target: Date): BodyPosition[] {
  return computeBodies(progressedInstant(birthUtc, target));
}
