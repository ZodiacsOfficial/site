// Build-time synthetic examples. No visitor birth data and no browser ephemeris.
import { computeChart } from '../../src/lib/engine/full';
import { explainConnections } from './model';

export const examples = [
  { name: 'Sample chart A', utc: '1990-06-15T12:30:00Z', latitude: 40.7128, longitude: -74.006, timeKnown: true, description: '15 June 1990 · 12:30 UTC · New York · illustrative birth data' },
  { name: 'Sample chart B', utc: '1999-08-11T12:00:00Z', latitude: undefined, longitude: undefined, timeKnown: false, description: '11 August 1999 · 12:00 UTC reference · birth time unknown' },
].map(({ name, description, ...input }) => {
  const chart = computeChart({ ...input, utc: new Date(input.utc), houseSystem: 'whole' });
  return { name, description, timeKnown: input.timeKnown, engineVersion: chart.engineVersion, connections: explainConnections(chart) };
});
