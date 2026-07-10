import { ENGINE_VERSION } from '../engine/types';
import type { Chart } from '../engine/types';
import type { SavedChart } from './schema';

export interface ResolvedSavedChart {
  bodies: { body: string; lon: number }[];
  asc: number | null;
  timeKnown: boolean;
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
  chart: SavedChart,
  loadEngine: SavedChartEngineLoader,
): Promise<ResolvedSavedChart> {
  const stored: ResolvedSavedChart = {
    bodies: chart.summary.bodies.map(({ body, lon }) => ({ body, lon })),
    asc: chart.summary.angles?.asc ?? null,
    timeKnown: chart.birth.timeKnown,
  };
  if (chart.summary.engineVersion === ENGINE_VERSION || !chart.birth.place) return stored;

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
    };
  } catch {
    return stored;
  }
}
