import { useEffect, useMemo, useState } from 'preact/hooks';
import type { Profile, SavedChart } from '../profile/schema';
import {
  TODAY_CHART_EVENT,
  reconcileTodayChartPreference,
  setTodayChartPreference,
} from '../profile/today-chart';

export interface TodayChartState {
  chart: SavedChart | null;
  ready: boolean;
  selectChart: (chartId: string) => boolean;
}

/** Shared device-local chart selection for Today, Profile, Ask, and return paths. */
export function useTodayChart(profile: Profile, profileReady: boolean): TodayChartState {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!profileReady) return;
    const sync = () => {
      setSelectedId(reconcileTodayChartPreference(profile.charts)?.id ?? null);
      setReady(true);
    };
    sync();
    window.addEventListener(TODAY_CHART_EVENT, sync);
    return () => window.removeEventListener(TODAY_CHART_EVENT, sync);
  }, [profile, profileReady]);

  const chart = useMemo(
    () => profile.charts.find((candidate) => candidate.id === selectedId) ?? null,
    [profile.charts, selectedId],
  );

  const selectChart = (chartId: string): boolean => {
    const saved = setTodayChartPreference(chartId, profile.charts);
    if (saved) setSelectedId(chartId);
    return saved;
  };

  return { chart, ready, selectChart };
}
