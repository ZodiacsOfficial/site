/**
 * The acceptance corpus for chart comparison, and the presets the page loads.
 *
 * Every receipt here is produced by the real pinned engine at call time from
 * synthetic inputs — no chart result is written down by hand. The birth details
 * describe nobody: they are round coordinates for well-known cities and dates
 * chosen for what they exercise.
 */
import { natalChart } from '@zodiacs/engine';
import { createNatalEnvelope, type NatalEnvelope } from '@zodiacs/engine/receipt';

export interface SyntheticInput {
  readonly utc: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly houseSystem: 'placidus' | 'whole';
  readonly sourceInstant?: string;
  readonly timeKnown?: boolean;
}

/** London, an ordinary non-polar place, on a date with nothing special about it. */
export const ORDINARY: SyntheticInput = {
  utc: '1990-06-15T13:30:00Z', latitude: 51.5074, longitude: -0.1278, houseSystem: 'placidus',
};

export function buildEnvelope(input: SyntheticInput): NatalEnvelope {
  const chart = natalChart({
    utc: input.utc,
    latitude: input.latitude,
    longitude: input.longitude,
    houseSystem: input.houseSystem,
    ...(input.timeKnown === false ? { timeKnown: false } : {}),
  } as Parameters<typeof natalChart>[0]);
  return createNatalEnvelope(chart, { sourceInstant: input.sourceInstant ?? input.utc });
}

export interface Preset {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly left: SyntheticInput;
  readonly right: SyntheticInput;
}

/**
 * Four presets, each chosen because it produces a different kind of answer:
 * nothing, a reproducible cause, a reported cause with no numerical
 * consequence, and a case the tool refuses to call.
 */
export const PRESETS: readonly Preset[] = Object.freeze([
  {
    id: 'identical',
    title: 'The same calculation twice',
    summary: 'Nothing differs. A comparison tool that cannot say "these agree" is not much use.',
    left: ORDINARY,
    right: ORDINARY,
  },
  {
    id: 'house-system',
    title: 'Same birth details, different house system',
    summary: 'The bodies sit where they sat; the angles and every cusp move. The cause can be demonstrated, not just guessed.',
    left: ORDINARY,
    right: { ...ORDINARY, houseSystem: 'whole' },
  },
  {
    id: 'equivalent-instants',
    title: 'The same moment, written two ways',
    summary: 'One file says 13:30 UTC and the other 19:00+05:30. Same instant, so nothing computed differs.',
    left: ORDINARY,
    right: { ...ORDINARY, sourceInstant: '1990-06-15T19:00:00+05:30' },
  },
  {
    id: 'ambiguous',
    title: 'Not enough information to say',
    summary: 'Two different places and two different moments at once. Several causes fit, and the tool says so rather than picking one.',
    left: ORDINARY,
    right: { utc: '1990-06-15T18:45:00Z', latitude: 40.7128, longitude: -74.006, houseSystem: 'placidus' },
  },
]);

export function presetEnvelopes(preset: Preset): { left: NatalEnvelope; right: NatalEnvelope } {
  return { left: buildEnvelope(preset.left), right: buildEnvelope(preset.right) };
}
