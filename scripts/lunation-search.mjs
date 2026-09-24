/*
 * The one lunation search shared by build-sky.mjs and build-transits.mjs.
 *
 * A new or full moon is the instant the apparent geocentric ecliptic longitude
 * of the Moon minus that of the Sun (both of date, the Sun with annual
 * aberration, exactly as the site's charts compute them through
 * @zodiacs/engine) reaches 0° or 180°. Daily brackets are anchored on UTC
 * midnights starting one day before `from`; each sign change is bisected 20
 * times (a 1-day bracket resolves to 82 ms; the reported instant is the upper
 * end of the final bracket). Both generators call this function with the same
 * brackets, so a lunation present in both files carries the same instant.
 */
import { normalizeLongitude } from '@zodiacs/engine';
import { bodyLongitude } from '@zodiacs/engine/internal';

const DAY = 86_400_000;
export const LUNATION_BISECTION_STEPS = 20;

const wrap180 = (x) => {
  const w = normalizeLongitude(x);
  return w > 180 ? w - 360 : w;
};

function refine(lo, hi, flipped) {
  for (let i = 0; i < LUNATION_BISECTION_STEPS; i += 1) {
    const mid = new Date((lo.getTime() + hi.getTime()) / 2);
    if (flipped(mid)) hi = mid; else lo = mid;
  }
  return hi;
}

/** Instants in [from, to) at which Moon − Sun apparent longitude equals `target` (0 or 180). */
export function searchLunations(from, to, target) {
  const found = [];
  const phaseError = (date) => wrap180(bodyLongitude('Moon', date) - bodyLongitude('Sun', date) - target);
  let previousDate = new Date(from.getTime() - DAY);
  let previous = phaseError(previousDate);
  for (let time = from.getTime(); time <= to.getTime(); time += DAY) {
    const date = new Date(time);
    const current = phaseError(date);
    // The <90° guard rejects the artificial sign flip at the ±180° seam.
    if (Math.sign(current) !== Math.sign(previous)
      && Math.abs(current) < 90 && Math.abs(previous) < 90) {
      const rising = current > previous;
      const at = refine(previousDate, date, (candidate) => (phaseError(candidate) > 0) === rising);
      if (at >= from && at < to) found.push(at);
    }
    previousDate = date;
    previous = current;
  }
  return found;
}
