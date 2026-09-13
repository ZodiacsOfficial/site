/** Pure projection of a complete engine chart into the site's existing shape. */
import type { Chart as EngineChart } from '@zodiacs/engine';
import type { BodyPosition, Chart, ChartInput } from './types';

export const adaptBody = (position: BodyPosition): BodyPosition => ({
  body: position.body,
  lon: position.lon,
  lat: position.lat,
  speed: position.speed,
  retrograde: position.retrograde,
});

/** Preserve the caller's input identity and the established numerical references. */
export function adaptChart(chart: EngineChart, input: ChartInput): Chart {
  return {
    input,
    bodies: chart.bodies.map(adaptBody),
    angles: chart.angles,
    houses: chart.houses,
    aspects: chart.aspects,
    flags: [...chart.flags],
    engineVersion: chart.engineVersion,
  };
}
