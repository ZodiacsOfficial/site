/**
 * The acceptance corpus for chart comparison: the presets of `presets.ts` as
 * real receipts.
 *
 * Every receipt here is produced by the real pinned engine at call time from
 * synthetic inputs — no chart result is written down by hand. The birth details
 * describe nobody: they are round coordinates for well-known cities and dates
 * chosen for what they exercise.
 */
import { natalChart } from '@zodiacs/engine';
import { createNatalEnvelope, type NatalEnvelope } from '@zodiacs/engine/receipt';
import type { Preset, SyntheticInput } from './presets';

export { ORDINARY, PRESETS } from './presets';
export type { Preset, SyntheticInput } from './presets';

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

export function presetEnvelopes(preset: Preset): { left: NatalEnvelope; right: NatalEnvelope } {
  return { left: buildEnvelope(preset.left), right: buildEnvelope(preset.right) };
}
