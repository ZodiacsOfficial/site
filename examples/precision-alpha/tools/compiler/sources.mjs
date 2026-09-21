/**
 * The body set and the frame each body is fitted in.
 *
 * DE440s stores planets as BARYCENTRES relative to the solar-system
 * barycentre. That framing is the wrong one to compress in: the SSB-relative
 * vector of every outer planet carries the Sun's ~7.4e5 km wobble about the
 * SSB at Jupiter's 11.86-year period, which is far faster than Neptune's own
 * 165-year motion. Fitting Neptune in a SUN-centred frame removes that term
 * from the function being approximated, which lowers its bandwidth and so the
 * Chebyshev degree needed for a given error. The Sun's own SSB motion is
 * stored once, and every planet adds it back.
 *
 * Both framings are swept and the cheaper one is chosen per body from measured
 * error, which is what makes candidate B "adaptive".
 */
import { NAIF } from './spkref.mjs';

export const BODY_SEGS = [
  { name: 'mercuryBary', target: 1, center: 0 },
  { name: 'venusBary', target: 2, center: 0 },
  { name: 'emb', target: 3, center: 0 },
  { name: 'marsBary', target: 4, center: 0 },
  { name: 'jupiterBary', target: 5, center: 0 },
  { name: 'saturnBary', target: 6, center: 0 },
  { name: 'uranusBary', target: 7, center: 0 },
  { name: 'neptuneBary', target: 8, center: 0 },
  { name: 'plutoBary', target: 9, center: 0 },
  { name: 'sun', target: 10, center: 0 },
  { name: 'moon', target: 301, center: 3 },
];

/**
 * Position budgets, km, declared before any fit was run. Every one is at or
 * inside the frozen targets:
 *   - Moon 0.010 km is 20x inside T6's 0.2 km and, at 3.56e5 km minimum
 *     geocentric distance, is 0.0058" -- well inside T2's 0.05".
 *   - Outer planets 1.0 km is 2x inside T6's 2 km.
 *   - The inner-planet and EMB budgets are set by T2, not T6: EMB error moves
 *     every geocentric vector, and Venus at 4.04e7 km minimum distance turns
 *     0.3 km into 0.0015".
 */
export const BUDGET_KM = {
  mercuryBary: 0.30,
  venusBary: 0.30,
  emb: 0.30,
  marsBary: 0.50,
  jupiterBary: 1.0,
  saturnBary: 1.0,
  uranusBary: 1.0,
  neptuneBary: 1.0,
  plutoBary: 1.0,
  sun: 0.30,
  moon: 0.010,
};

/** Interval lengths, in days, that divide the 109600-day kernel span exactly. */
export const LADDER = [4, 8, 16, 20, 25, 32, 40, 50, 80, 100, 137, 160, 200, 274, 400, 548, 685, 800, 1096, 1370, 2192, 2740];

export const SPAN_DAYS = 109600;
export const DAY = 86400;
export { NAIF };
