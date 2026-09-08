/**
 * Site-compatible major-aspect API backed by @zodiacs/engine's lightweight
 * math entry. The adapter retains the site's historical `orbLuminary` and
 * `{ def, orb }` names without duplicating the calculations.
 */
import {
  ASPECTS as ENGINE_ASPECTS,
  ASPECT_BODIES,
  findAspects as engineFindAspects,
  matchAspect as engineMatchAspect,
  separation,
} from '@zodiacs/engine/internal/math';

import type { Aspect, AspectType, BodyPosition } from './types';

export interface AspectDef {
  type: AspectType;
  angle: number;
  orb: number;
  orbLuminary: number;
}

export const ASPECTS: readonly AspectDef[] = ENGINE_ASPECTS.map((aspect) => ({
  type: aspect.type,
  angle: aspect.angle,
  orb: aspect.orb,
  orbLuminary: aspect.luminaryOrb,
}));

export { ASPECT_BODIES, separation };

export function matchAspect(
  aBody: string,
  aLongitude: number,
  bBody: string,
  bLongitude: number,
): { def: AspectDef; orb: number } | null {
  const match = engineMatchAspect(aBody, aLongitude, bBody, bLongitude);
  if (!match) return null;
  const definition = ASPECTS.find((aspect) => aspect.type === match.definition.type);
  if (!definition) return null;
  return { def: definition, orb: match.orb };
}

export function findAspects(bodies: BodyPosition[]): Aspect[] {
  return engineFindAspects(
    bodies as unknown as Parameters<typeof engineFindAspects>[0],
  ) as Aspect[];
}
