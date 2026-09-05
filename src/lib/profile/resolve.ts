import type { Chart } from '../engine/types';
import type { SavedChart } from './schema';
import { currentSavedCalculation, repairLegacyPolarChart } from './polar-repair';

export interface ResolvedSavedChart {
  bodies: { body: string; lon: number }[];
  asc: number | null;
  timeKnown: boolean;
  /** All derived fields belong to the same calculation, including share receipts. */
  summary: SavedChart['summary'];
}

export type SavedChartEngineLoader = () => Promise<{
  computeChart: (input: Chart['input']) => Chart;
}>;

/**
 * Resolve a saved chart against the current engine without making the common
 * profile-store path pay for the ephemeris. Current summaries (and charts
 * without a place) return immediately; stale summaries recompute from their
 * lossless birth input and fall back quietly on any failure.
 */
export async function resolveSavedChart(
  source: SavedChart,
  loadEngine: SavedChartEngineLoader,
): Promise<ResolvedSavedChart> {
  const chart = repairLegacyPolarChart(source);
  const stored: ResolvedSavedChart = {
    bodies: chart.summary.bodies.map(({ body, lon }) => ({ body, lon })),
    asc: chart.summary.angles?.asc ?? null,
    timeKnown: chart.birth.timeKnown,
    summary: chart.summary,
  };
  if (currentSavedCalculation(chart.summary.engineVersion) || !chart.birth.place) return stored;

  try {
    const [engine, { resolveLocalToUtc }] = await Promise.all([
      loadEngine(),
      import('../time/localToUtc'),
    ]);
    const resolved = resolveLocalToUtc(
      chart.birth.date,
      chart.birth.timeKnown && chart.birth.time ? chart.birth.time : '12:00',
      chart.birth.place.tz,
    );
    const result = engine.computeChart({
      utc: resolved.utc,
      latitude: chart.birth.place.lat,
      longitude: chart.birth.place.lon,
      houseSystem: chart.summary.houseSystem,
      timeKnown: chart.birth.timeKnown,
      flags: resolved.flags,
    });
    return {
      bodies: result.bodies.map(({ body, lon }) => ({ body, lon })),
      asc: result.angles?.asc ?? null,
      timeKnown: chart.birth.timeKnown,
      summary: {
        engineVersion: result.engineVersion,
        utcISO: result.input.utc.toISOString(),
        houseSystem: result.houses?.system ?? result.input.houseSystem,
        bodies: result.bodies.map(({ body, lon, retrograde }) => ({ body, lon, retrograde })),
        angles: result.angles ? { asc: result.angles.asc, mc: result.angles.mc } : null,
        flags: result.flags,
      },
    };
  } catch {
    return stored;
  }
}
