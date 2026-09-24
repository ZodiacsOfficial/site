import type { BodyName } from './types';

const DAY = 86_400_000;
const EDGE_PROBE_MAX_MS = 60_000;

export interface LongitudeCrossing {
  at: Date;
  /** True when the body was moving backward through the degree. */
  retrograde: boolean;
}

export type BodyLongitudeAt = (body: BodyName, date: Date) => number;

/** Signed shortest angular distance a→b, degrees (−180, 180]. */
function delta(a: number, b: number): number {
  const d = (((b - a) % 360) + 360) % 360;
  return d > 180 ? d - 360 : d;
}

/** +1 for a local maximum, −1 for a minimum, 0 for no turn between two motions. */
function turn(before: number, after: number): number {
  if ((before > 0 && after <= 0) || (before === 0 && after < 0)) return 1;
  if ((before < 0 && after >= 0) || (before === 0 && after > 0)) return -1;
  return 0;
}

/**
 * Every instant in (from, to] when `body` sits exactly on `targetLon`.
 * Coarse scan at `stepDays`, then 24-iteration bisection per crossing.
 *
 * A fixed-step scan alone cannot see two crossings that both fall between
 * samples around a station (a 5-day step is blind to Saturn stations within
 * 0.0103° of the target and Jupiter stations within 0.0205°). Wherever the
 * sampled motion turns around without a sign change of the offset, and the
 * turning sample lies within reach of the local curvature, the extremum is
 * found by golden-section search; if it passes the target, both crossings are
 * bisected. A turn inside the first or last cell is seen from a one-minute
 * direction probe just inside the window. No sample is taken outside [from, to].
 */
export function findLongitudeCrossingsWith(
  bodyLongitude: BodyLongitudeAt,
  body: BodyName,
  targetLon: number,
  from: Date,
  to: Date,
  stepDays = 5,
): LongitudeCrossing[] {
  const out: LongitudeCrossing[] = [];
  const step = stepDays * DAY;
  if (!Number.isFinite(step) || step <= 0) throw new RangeError('stepDays must be positive.');

  const fromT = from.getTime();
  const toT = to.getTime();
  const lon = (t: number) => bodyLongitude(body, new Date(t));
  const value = (t: number) => delta(targetLon, lon(t));
  const bisect = (loT: number, hiT: number, rising: boolean) => {
    let lo = loT;
    let hi = hiT;
    for (let i = 0; i < 24; i += 1) {
      const mid = (lo + hi) / 2;
      if ((value(mid) > 0) === rising) hi = mid;
      else lo = mid;
    }
    return hi;
  };
  const keep = (t: number, retrograde: boolean) => {
    if (t > fromT && t <= toT) out.push({ at: new Date(t), retrograde });
  };

  /** Locate the extremum on [lo, hi]; if it passes the target, emit both roots. */
  const completePair = (lo: number, hi: number, maximize: boolean, sideSign: number) => {
    const ratio = (Math.sqrt(5) - 1) / 2;
    let a = lo;
    let b = hi;
    let x1 = b - ratio * (b - a);
    let x2 = a + ratio * (b - a);
    let v1 = value(x1);
    let v2 = value(x2);
    while (b - a > 1) {
      if (maximize ? v1 < v2 : v1 > v2) {
        a = x1; x1 = x2; v1 = v2; x2 = a + ratio * (b - a); v2 = value(x2);
      } else {
        b = x2; x2 = x1; v2 = v1; x1 = b - ratio * (b - a); v1 = value(x1);
      }
    }
    const tExt = (a + b) / 2;
    const vExt = value(tExt);
    if (vExt === 0) {
      keep(tExt, false);
      return;
    }
    if (Math.sign(vExt) === sideSign) return;
    keep(bisect(lo, tExt, maximize), !maximize);
    keep(bisect(tExt, hi, !maximize), maximize);
  };

  const times = [fromT];
  for (let t = fromT + step; t < toT; t += step) times.push(t);
  if (toT > fromT) times.push(toT);
  const lons = times.map(lon);
  const offsets = lons.map((l) => delta(targetLon, l));

  // Ordinary sign changes, with the site's exact-sample rules.
  for (let k = 1; k < times.length; k += 1) {
    const prev = offsets[k - 1];
    const cur = offsets[k];
    // An exact sampled endpoint belongs to this interval once. Skipping a
    // zero previous sample also keeps the lower bound of (from, to] excluded.
    // Retain the ±180-wrap guard (opposite side of the zodiac).
    if (cur === 0 && prev !== 0 && Math.abs(prev) < 90) {
      out.push({ at: new Date(times[k]), retrograde: prev > 0 });
    } else if (prev !== 0 && cur !== 0 && Math.sign(cur) !== Math.sign(prev)
      && Math.abs(cur) < 90 && Math.abs(prev) < 90) {
      const rising = cur > prev;
      // Direction through the degree: longitude increasing = direct.
      out.push({ at: new Date(bisect(times[k - 1], times[k], rising)), retrograde: !rising });
    }
  }

  const hiddenCandidate = (...ds: number[]) => ds.every((d) => d !== 0 && Math.abs(d) < 90
    && Math.sign(d) === Math.sign(ds[0]));

  // Interior turns: three consecutive samples whose motion reverses.
  for (let k = 1; k + 1 < times.length; k += 1) {
    const g0 = delta(lons[k - 1], lons[k]);
    const g1 = delta(lons[k], lons[k + 1]);
    const kind = turn(g0, g1);
    if (kind === 0 || !hiddenCandidate(offsets[k - 1], offsets[k], offsets[k + 1])) continue;
    const maximize = kind > 0;
    if (maximize !== (offsets[k] < 0)) continue; // a maximum below / minimum above the target
    const h0 = times[k] - times[k - 1];
    const h1 = times[k + 1] - times[k];
    const curvature = (2 * Math.abs(g1 / h1 - g0 / h0)) / (h0 + h1);
    const reach = curvature * Math.max(h0, h1) ** 2; // twice the parabolic excess
    if (Math.abs(offsets[k]) > reach + 1e-12) continue;
    completePair(times[k - 1], times[k + 1], maximize, Math.sign(offsets[k]));
  }

  // Interior reach: twice the parabolic excess of the local curvature.
  const reachAt = (k: number) => {
    const g0 = delta(lons[k - 1], lons[k]);
    const g1 = delta(lons[k], lons[k + 1]);
    const h0 = times[k] - times[k - 1];
    const h1 = times[k + 1] - times[k];
    return ((2 * Math.abs(g1 / h1 - g0 / h0)) / (h0 + h1)) * Math.max(h0, h1) ** 2;
  };

  // Edge cells: a turn inside the first or last cell has no third sample. A
  // direction probe just inside the window finds it, taken only when the
  // edge offsets are within reach of the neighbouring curvature.
  const n = times.length;
  if (n >= 2) {
    for (const first of [true, false]) {
      const lo = first ? 0 : n - 2;
      const hi = lo + 1;
      if (!hiddenCandidate(offsets[lo], offsets[hi])) continue;
      const reach = n >= 3 ? 4 * reachAt(first ? 1 : n - 2) : Number.POSITIVE_INFINITY;
      if (Math.min(Math.abs(offsets[lo]), Math.abs(offsets[hi])) > reach + 1e-12) continue;
      const probe = Math.min(EDGE_PROBE_MAX_MS, (times[hi] - times[lo]) / 1000);
      if (!(probe > 0)) continue;
      const cell = delta(lons[lo], lons[hi]);
      const probeLon = lon(first ? times[lo] + probe : times[hi] - probe);
      const local = first ? delta(lons[lo], probeLon) : delta(probeLon, lons[hi]);
      const kind = first ? turn(local, cell) : turn(cell, local);
      if (kind === 0) continue;
      const maximize = kind > 0;
      if (maximize !== (offsets[lo] < 0)) continue;
      completePair(times[lo], times[hi], maximize, Math.sign(offsets[lo]));
    }
  }

  out.sort((a, b) => a.at.getTime() - b.at.getTime());
  return out.filter((c, i) => i === 0 || c.at.getTime() - out[i - 1].at.getTime() >= 1_000);
}
