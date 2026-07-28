/**
 * Declination aspects — the family a chart wheel cannot draw.
 *
 * The wheel measures one angle: ecliptic longitude, the position round the
 * zodiac. Declination measures a different one — how far north or south of
 * the celestial equator a body actually stands. The two are independent
 * enough that a pair can sit a third of the sky apart in longitude and
 * still ride the same declination circle, at the same height above the
 * equator, crossing the sky together night after night.
 *
 * Traditional practice reads that as a conjunction in all but name (a
 * parallel), and reads the mirrored case — equal declinations on opposite
 * sides of the equator — as an opposition (a contraparallel).
 *
 * Arithmetic over positions the chart already carries; no ephemeris here.
 */
import { declinationOf, OBLIQUITY, separation } from './wheel/ecliptic3d';

/**
 * Declination aspects are held to a tight orb — a degree is already wide
 * for a measurement that only spans ±23.4° in total. The luminaries carry
 * the wider allowance, the same way they do for longitude aspects.
 */
export const DECLINATION_ORB = 1;
export const DECLINATION_ORB_LUMINARY = 1.5;

const LUMINARIES = new Set(['Sun', 'Moon']);

export type DeclinationAspectType = 'parallel' | 'contraparallel';

export interface DeclinationBody {
  body: string;
  lon: number;
  lat: number;
}

export interface DeclinationAspect {
  a: string;
  b: string;
  type: DeclinationAspectType;
  /** Degrees from exact. */
  orb: number;
  /** Declination of each body, north positive. */
  decA: number;
  decB: number;
  /** The pair's ecliptic separation — what the flat wheel shows instead. */
  separation: number;
}

/** The orb this pair is allowed, widened when a luminary is involved. */
export function declinationOrb(a: string, b: string): number {
  return LUMINARIES.has(a) || LUMINARIES.has(b)
    ? DECLINATION_ORB_LUMINARY
    : DECLINATION_ORB;
}

/**
 * Every parallel and contraparallel among the bodies handed in.
 *
 * Which of the two a pair forms never needs a sign test: |δa − δb| is the
 * smaller quantity exactly when the declinations share a sign, and
 * |δa + δb| exactly when they oppose. Taking the smaller therefore picks
 * the right relationship and its orb in one step.
 *
 * The two are equal only when one body sits exactly on the equator, which
 * is its own mirror and so takes no side. That reading is called a
 * parallel, since a body at 0° is at the same height as its partner in the
 * only sense the equator admits.
 */
export function findDeclinationAspects(
  bodies: readonly DeclinationBody[],
  obliquityDeg = OBLIQUITY,
): DeclinationAspect[] {
  const placed = bodies.map((body) => ({
    ...body,
    dec: declinationOf(body.lon, body.lat, obliquityDeg),
  }));

  const found: DeclinationAspect[] = [];
  for (let i = 0; i < placed.length; i += 1) {
    for (let j = i + 1; j < placed.length; j += 1) {
      const a = placed[i];
      const b = placed[j];
      const sameSide = Math.abs(a.dec - b.dec);
      const mirrored = Math.abs(a.dec + b.dec);
      const orb = Math.min(sameSide, mirrored);
      if (orb > declinationOrb(a.body, b.body)) continue;
      found.push({
        a: a.body,
        b: b.body,
        type: sameSide <= mirrored ? 'parallel' : 'contraparallel',
        orb,
        decA: a.dec,
        decB: b.dec,
        separation: separation(a.lon, b.lon),
      });
    }
  }
  return found.sort((one, other) => one.orb - other.orb);
}
