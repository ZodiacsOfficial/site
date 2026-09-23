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
 * profile-store path pay for the ephemeris. Charts without a place return
 * immediately. A summary from another engine recomputes from the lossless
 * birth input. So does one from the current engine whose instant no longer
 * matches the birthplace clock, which can happen only for a birth before
 * standard time: until 2026-09 those used the mean time of the zone's
 * reference city instead of the birthplace's own, so a Buffalo birth in 1870
 * was saved on New York's clock. Any failure falls back quietly to the stored
 * summary.
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
  const place = chart.birth.place;
  if (!place) return stored;
  const current = currentSavedCalculation(chart.summary.engineVersion);

  try {
    const [engine, { birthplaceTimeCanApply, prepareLocalTime, resolveLocalToUtc }] = await Promise.all([
      current ? null : loadEngine(),
      import('../time/localToUtc'),
    ]);
    if (current && !birthplaceTimeCanApply(chart.birth.date)) return stored;
    await prepareLocalTime(chart.birth.date, place.tz);
    const resolved = resolveLocalToUtc(
      chart.birth.date,
      chart.birth.timeKnown && chart.birth.time ? chart.birth.time : '12:00',
      place.tz,
      { longitude: place.lon },
    );
    if (current && resolved.utc.toISOString() === chart.summary.utcISO) return stored;
    const result = (engine ?? await loadEngine()).computeChart({
      utc: resolved.utc,
      latitude: place.lat,
      longitude: place.lon,
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
