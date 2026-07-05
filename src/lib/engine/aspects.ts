/**
 * Aspect detection between chart bodies. Pure angular math.
 * Majors only, documented orbs, luminary bonus, applying/separating
 * from relative longitude speed.
 */
import type { Aspect, AspectType, BodyPosition } from './types';

export interface AspectDef {
  type: AspectType;
  angle: number;
  orb: number;
  orbLuminary: number;
}

export const ASPECTS: readonly AspectDef[] = [
  { type: 'conjunction', angle: 0, orb: 8, orbLuminary: 10 },
  { type: 'sextile', angle: 60, orb: 4, orbLuminary: 5 },
  { type: 'square', angle: 90, orb: 7, orbLuminary: 8 },
  { type: 'trine', angle: 120, orb: 7, orbLuminary: 8 },
  { type: 'opposition', angle: 180, orb: 8, orbLuminary: 10 },
] as const;

const LUMINARIES = new Set(['Sun', 'Moon']);
/** Bodies that participate in aspect detection. */
const ASPECT_BODIES = new Set([
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
]);

/** Unsigned angular separation 0–180. */
export function separation(a: number, b: number): number {
  const d = Math.abs((((a - b) % 360) + 360) % 360);
  return d > 180 ? 360 - d : d;
}

export function findAspects(bodies: BodyPosition[]): Aspect[] {
  const list = bodies.filter((b) => ASPECT_BODIES.has(b.body));
  const out: Aspect[] = [];

  for (let i = 0; i < list.length; i += 1) {
    for (let j = i + 1; j < list.length; j += 1) {
      const A = list[i];
      const B = list[j];
      const sep = separation(A.lon, B.lon);
      const luminary = LUMINARIES.has(A.body) || LUMINARIES.has(B.body);

      let best: { def: AspectDef; orb: number } | null = null;
      for (const def of ASPECTS) {
        const orb = Math.abs(sep - def.angle);
        const max = luminary ? def.orbLuminary : def.orb;
        if (orb <= max && (!best || orb < best.orb)) best = { def, orb };
      }
      if (!best) continue;

      // Applying: is the separation moving toward the exact angle?
      // d(sep)/dt has the sign of (sep' − sep) for a small step.
      const step = 0.02; // days
      const sepNext = separation(A.lon + A.speed * step, B.lon + B.speed * step);
      const applying = Math.abs(sepNext - best.def.angle) < best.orb;

      out.push({ a: A.body, b: B.body, type: best.def.type, orb: best.orb, applying });
    }
  }

  return out.sort((x, y) => x.orb - y.orb);
}
