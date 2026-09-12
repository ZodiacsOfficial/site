/**
 * Optional calculation boundary for newly recorded charts. Import dynamically
 * when needed; existing chart, math, UI and saved-profile paths do not load it.
 * This produces a Zodiacs draft receipt, not a legacy-profile migration.
 */
import { natalChart, type BirthInput } from '@zodiacs/engine';
import {
  createNatalEnvelope,
  type NatalEnvelope,
  type NatalEnvelopeContext,
} from '@zodiacs/engine/receipt';
import { adaptChart } from './chart-adapter';
import type { Chart, ChartFlag, HouseSystem } from './types';

/** Canonical replay request. A string instant cannot be changed by Date setters. */
export interface PortableInputSnapshot {
  readonly utc: string;
  readonly latitude?: number;
  readonly longitude?: number;
  readonly houseSystem: HouseSystem;
  readonly timeKnown: boolean;
  readonly flags: readonly ChartFlag[];
}

export interface PortableChartCalculation {
  /** Mutable presentation chart, detached from the receipt and input snapshot. */
  readonly chart: Chart;
  /** Recursively frozen at runtime; retains the SDK type for codec compatibility. */
  readonly envelope: Readonly<NatalEnvelope>;
  readonly inputSnapshot: PortableInputSnapshot;
}

/** Fixed diagnostics never expose input values, imported context or a raw cause. */
export class PortableChartError extends Error {
  readonly code = 'calculation_failed';

  constructor() {
    super('Unable to prepare a portable chart.');
    this.name = 'PortableChartError';
  }
}

/** Only called on the SDK's detached, bounded, validated JSON and our projection. */
function freezeJson<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) freezeJson(child);
    Object.freeze(value);
  }
  return value;
}

/**
 * Calculate once, then retain the complete native result before projecting it.
 * Context must be supplied explicitly: neither source ISO spelling, historical
 * time resolution nor a noon convention is inferred from the resolved instant.
 * The SDK validates and detaches context, including rejecting accessors, after
 * calculation. This does not promise an atomic entry-time snapshot across
 * caller-owned getters or authenticate the supplied provenance claims.
 */
export function computePortableChart(
  input: BirthInput,
  context?: NatalEnvelopeContext,
): PortableChartCalculation {
  try {
    const nativeChart = natalChart(input);
    const envelope = createNatalEnvelope(nativeChart, context);
    const { receipt } = envelope;
    const inputSnapshot: PortableInputSnapshot = freezeJson({
      utc: receipt.instant,
      houseSystem: receipt.houses.requested,
      timeKnown: receipt.timeKnown,
      flags: [...receipt.inputFlags],
      ...(receipt.coordinates === null ? {} : { ...receipt.coordinates }),
    });
    const chart = adaptChart(nativeChart, {
      ...inputSnapshot,
      utc: new Date(inputSnapshot.utc),
      flags: [...inputSnapshot.flags],
    });
    return { chart, envelope: freezeJson(envelope), inputSnapshot };
  } catch {
    throw new PortableChartError();
  }
}
