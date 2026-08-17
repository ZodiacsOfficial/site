/** Small shared vocabulary for the Race share surfaces. */

export const SIGN_ID_PATTERN =
  /^(aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces)$/;

/** 1 → "1st", 2 → "2nd", 3 → "3rd", 4 → "4th" … 12 → "12th". */
export function ordinalLabel(rank: number): string {
  if (!Number.isInteger(rank) || rank < 1 || rank > 12) {
    throw new TypeError("rank must be an integer between 1 and 12.");
  }
  const suffix = rank === 1 ? "st" : rank === 2 ? "nd" : rank === 3 ? "rd" : "th";
  return `${rank}${suffix}`;
}
