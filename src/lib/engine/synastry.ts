/**
 * Synastry: aspects between two charts. Deliberately engine-free — it
 * accepts plain {body, lon} lists, so saved charts (whose summaries
 * already carry longitudes) compare without ever loading the ephemeris.
 * Applying/separating is omitted on purpose: between two natal charts
 * nothing is moving.
 */
import { ASPECT_BODIES, matchAspect } from './aspects';
import type { AspectType } from './types';
import { signForLongitude } from '../signs';
import type { Element, Modality } from '../signs';

export interface MinimalBody {
  body: string;
  /** Tropical ecliptic longitude, degrees 0–360. */
  lon: number;
}

export interface InterAspect {
  /** Body in chart A. */
  a: string;
  aLon: number;
  /** Body in chart B. */
  b: string;
  bLon: number;
  type: AspectType;
  /** Deviation from exact, degrees (unsigned). */
  orb: number;
}

/**
 * Every major aspect between chart A's bodies and chart B's bodies —
 * the full cross product (up to 10×10), never intra-chart pairs.
 * Sorted tightest first.
 */
export function findInterAspects(a: MinimalBody[], b: MinimalBody[]): InterAspect[] {
  const listA = a.filter((x) => ASPECT_BODIES.has(x.body));
  const listB = b.filter((x) => ASPECT_BODIES.has(x.body));
  const out: InterAspect[] = [];

  for (const A of listA) {
    for (const B of listB) {
      const best = matchAspect(A.body, A.lon, B.body, B.lon);
      if (!best) continue;
      out.push({
        a: A.body, aLon: A.lon, b: B.body, bLon: B.lon,
        type: best.def.type, orb: best.orb,
      });
    }
  }

  return out.sort((x, y) => x.orb - y.orb);
}

/** Count of a chart's ten aspect bodies by element (sums to 10). */
export function elementBalance(bodies: MinimalBody[]): Record<Element, number> {
  const out: Record<Element, number> = { fire: 0, earth: 0, air: 0, water: 0 };
  for (const b of bodies) {
    if (!ASPECT_BODIES.has(b.body)) continue;
    out[signForLongitude(b.lon).element] += 1;
  }
  return out;
}

/** Count of a chart's ten aspect bodies by modality (sums to 10). */
export function modalityBalance(bodies: MinimalBody[]): Record<Modality, number> {
  const out: Record<Modality, number> = { cardinal: 0, fixed: 0, mutable: 0 };
  for (const b of bodies) {
    if (!ASPECT_BODIES.has(b.body)) continue;
    out[signForLongitude(b.lon).modality] += 1;
  }
  return out;
}

/**
 * A planet conjunct its own counterpart in the other chart, for the three
 * slowest bodies. Pluto takes a dozen years to cross a sign, so any two
 * people born near each other carry Pluto conjunct Pluto at a fraction of
 * a degree — it describes a birth cohort, not a couple. The tally keeps
 * them; the headline should not lead with them.
 */
const GENERATIONAL_BODIES = new Set(['Uranus', 'Neptune', 'Pluto']);

export function isGenerationalContact(
  aspect: Pick<InterAspect, 'a' | 'b' | 'type'>,
): boolean {
  return aspect.type === 'conjunction'
    && aspect.a === aspect.b
    && GENERATIONAL_BODIES.has(aspect.a);
}

/**
 * The bodies that describe a person rather than a cohort. They move fast
 * enough that a few days' difference in birth date moves them, which is
 * exactly what makes a contact between them worth naming.
 */
const PERSONAL_BODIES = new Set(['Sun', 'Moon', 'Mercury', 'Venus', 'Mars']);

/**
 * Contacts ordered by how much they say about this particular pair, in
 * three bands, each sorted by orb:
 *
 *   1. anything touching a personal body — the contacts a reader recognises
 *   2. the slower pairings, real but shared with everyone born nearby
 *   3. a slow planet conjunct its own counterpart, which is only a birth date
 *
 * Demoted rather than dropped: a pair whose only tight contacts are
 * generational still gets shown something true, just not as a headline.
 */
export function rankedContacts(aspects: readonly InterAspect[]): InterAspect[] {
  const band = (aspect: InterAspect) => {
    if (isGenerationalContact(aspect)) return 2;
    return PERSONAL_BODIES.has(aspect.a) || PERSONAL_BODIES.has(aspect.b) ? 0 : 1;
  };
  return [...aspects].sort((one, other) => band(one) - band(other) || one.orb - other.orb);
}

export interface PairSummary {
  aspects: InterAspect[];
  /** The tightest few, for display. */
  top: InterAspect[];
  counts: Record<AspectType, number>;
  /** Easeful (trine/sextile) vs charged (square/opposition) tally. */
  easeful: number;
  charged: number;
  elements: { a: Record<Element, number>; b: Record<Element, number> };
  modalities: { a: Record<Modality, number>; b: Record<Modality, number> };
}

export function summarizePair(a: MinimalBody[], b: MinimalBody[], topN = 8): PairSummary {
  const aspects = findInterAspects(a, b);
  const counts: Record<AspectType, number> = {
    conjunction: 0, sextile: 0, square: 0, trine: 0, opposition: 0,
  };
  for (const asp of aspects) counts[asp.type] += 1;
  return {
    aspects,
    top: rankedContacts(aspects).slice(0, topN),
    counts,
    easeful: counts.trine + counts.sextile,
    charged: counts.square + counts.opposition,
    elements: { a: elementBalance(a), b: elementBalance(b) },
    modalities: { a: modalityBalance(a), b: modalityBalance(b) },
  };
}
