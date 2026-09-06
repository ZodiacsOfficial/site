import type { Aspect, HouseSystem } from '../../lib/engine/types';
import type { ReadingPathPlacement } from './ReadingPath';
import type { EntityRef, SignSlug } from '../../lib/scene/types';
import { SIGNS, signForLongitude, signName } from '../../lib/signs';
import { natalAspectLine } from '../../lib/natal';
import type { StepId } from '../../lib/learning-progress';

export interface LearningExercise {
  id: StepId; question: string; answer: string; choices: string[];
  explanation: string; reflection: string; entity: EntityRef;
}
export interface ExerciseInput {
  placements: readonly ReadingPathPlacement[]; topAspects: readonly Aspect[];
  timeKnown: boolean; risingLon: number | null; housesKnown: boolean;
  moonSignCandidates?: readonly string[];
  effectiveHouseSystem: HouseSystem | null; requestedHouseSystem: HouseSystem | null;
  polarFallback: boolean;
}

/** Uses only the supplied reading's placements/aspects. No additional engine calculation. */
export function learningExercises(input: ExerciseInput, focus: 'Sun' | 'Moon' | 'Rising' = 'Sun') {
  const signs = SIGNS.map((sign) => signName(sign));
  let sign: string | null = null;
  let entity: EntityRef = focus === 'Rising' ? { kind: 'angle', angle: 'asc' } : { kind: 'body', body: focus };
  const point = input.placements.find((p) => p.body === focus);
  if (focus === 'Rising') {
    if (input.timeKnown && input.housesKnown && input.risingLon !== null && Number.isFinite(input.risingLon)) sign = signName(signForLongitude(input.risingLon));
  } else if (focus === 'Moon' && !input.timeKnown) {
    const candidates = input.moonSignCandidates;
    if (Array.isArray(candidates) && candidates.length === 1) {
      const known = SIGNS.find((s) => s.slug === candidates[0]);
      if (known) { sign = signName(known); entity = { kind: 'sign', sign: known.slug as SignSlug }; }
    }
  } else if (point && Number.isFinite(point.lon)) sign = signName(signForLongitude(point.lon));
  const bigThree: LearningExercise | null = sign ? {
    id: 'big-three', question: `Which sign holds your ${focus === 'Rising' ? 'rising point' : focus}?`, answer: sign,
    choices: signs, entity,
    explanation: `${focus} is in ${sign}.${focus === 'Moon' && !input.timeKnown ? ' This settles its sign across the day, not an exact birth degree or aspect.' : ''}`,
    reflection: `I can describe one way this ${focus} placement relates to my experience.`,
  } : null;
  const housed = input.timeKnown && input.housesKnown && input.effectiveHouseSystem
    ? input.placements.find((p) => p.body === 'Sun' && Number.isInteger(p.house) && p.house! >= 1 && p.house! <= 12)
    : undefined;
  const system = input.effectiveHouseSystem === 'placidus' ? 'Placidus' : 'whole-sign';
  const provenance = input.polarFallback ? ' A polar fallback is recorded for this result.' : '';
  const requested = input.requestedHouseSystem === null ? ' The saved record does not retain an earlier requested system.' : '';
  const houses: LearningExercise | null = housed ? {
    id: 'planets-houses', question: 'In which house is your Sun in this result?', answer: `House ${housed.house}`,
    choices: Array.from({ length: 12 }, (_, i) => `House ${i + 1}`), entity: { kind: 'house', house: housed.house! },
    explanation: `Your Sun occupies House ${housed.house} in the ${system} result.${provenance}${requested}`,
    reflection: 'I can connect this house to one area of my life.',
  } : null;
  const aspect = input.topAspects.find((a) => (input.timeKnown || (a.a !== 'Moon' && a.b !== 'Moon'))
    && Number.isFinite(a.orb) && a.orb >= 0 && ['conjunction', 'sextile', 'square', 'trine', 'opposition'].includes(a.type));
  const aspects: LearningExercise | null = aspect ? {
    id: 'aspects', question: `Which aspect connects ${aspect.a} and ${aspect.b} in this reading?`, answer: aspect.type,
    choices: ['conjunction', 'sextile', 'square', 'trine', 'opposition'],
    entity: { kind: 'aspect', a: aspect.a, b: aspect.b, type: aspect.type },
    explanation: natalAspectLine(aspect.a, aspect.type, aspect.b),
    reflection: 'I can describe how these two planets work together in this aspect.',
  } : null;
  return { 'big-three': bigThree, 'planets-houses': houses, aspects };
}
