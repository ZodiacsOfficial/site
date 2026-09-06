import type { SavedChart } from './schema';

/** Only an unambiguous, explicit owner choice identifies a personal chart. */
export function explicitSelfChart(charts: readonly SavedChart[]): SavedChart | null {
  const own = charts.filter((chart) => chart.relationship === 'self');
  return own.length === 1 ? own[0] : null;
}
