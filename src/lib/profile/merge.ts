import { EMPTY_PROFILE } from './schema';
import type { Profile, SavedChart } from './schema';
import type { ChartDeletion } from './deletions';

export interface RemoteChartSnapshot {
  id: string;
  payload: unknown;
  updatedAt: string | null;
}

export interface RemoteDeletionSnapshot {
  id: string;
  deletedAt: string | null;
}

export interface SyncMergeInput {
  localProfile: Profile;
  remoteSettings: unknown;
  remoteCharts: RemoteChartSnapshot[];
  localDeletions: ChartDeletion[];
  remoteDeletions: RemoteDeletionSnapshot[];
}

export interface SyncMergeResult {
  profile: Profile;
  deletions: ChartDeletion[];
  deletedChartIds: string[];
}

const HOUSE_SYSTEMS = new Set<Profile['settings']['houseSystem']>(['whole', 'placidus']);

export function mergeSyncState({
  localProfile,
  remoteSettings,
  remoteCharts,
  localDeletions,
  remoteDeletions,
}: SyncMergeInput): SyncMergeResult {
  const charts = new Map<string, SavedChart>();
  for (const chart of localProfile.charts) setNewestChart(charts, chart);

  for (const row of remoteCharts) {
    if (!isSavedChart(row.payload) || row.payload.id !== row.id) continue;
    setNewestChart(charts, normalizeRemoteChart(row.payload, row.updatedAt));
  }

  const deletions = newestDeletions([
    ...localDeletions,
    ...remoteDeletions
      .filter((d): d is { id: string; deletedAt: string } => typeof d.deletedAt === 'string')
      .map((d) => ({ id: d.id, deletedAt: d.deletedAt })),
  ]);

  for (const [id, deletion] of deletions) {
    const chart = charts.get(id);
    if (!chart) continue;
    if (timestamp(deletion.deletedAt) >= timestamp(chart.updatedAt)) {
      charts.delete(id);
    } else {
      deletions.delete(id);
    }
  }

  const sortedCharts = Array.from(charts.values()).sort((a, b) => timestamp(b.updatedAt) - timestamp(a.updatedAt));
  const sortedDeletions = Array.from(deletions.values()).sort((a, b) => timestamp(b.deletedAt) - timestamp(a.deletedAt));

  return {
    profile: {
      version: 1,
      settings: validSettings(remoteSettings) ?? localProfile.settings ?? EMPTY_PROFILE.settings,
      charts: sortedCharts,
    },
    deletions: sortedDeletions,
    deletedChartIds: sortedDeletions.map((d) => d.id),
  };
}

function setNewestChart(charts: Map<string, SavedChart>, chart: SavedChart): void {
  const existing = charts.get(chart.id);
  if (!existing || timestamp(chart.updatedAt) > timestamp(existing.updatedAt)) {
    charts.set(chart.id, chart);
  }
}

function normalizeRemoteChart(chart: SavedChart, rowUpdatedAt: string | null): SavedChart {
  if (!rowUpdatedAt || timestamp(rowUpdatedAt) <= timestamp(chart.updatedAt)) return chart;
  return { ...chart, updatedAt: rowUpdatedAt };
}

function newestDeletions(deletions: ChartDeletion[]): Map<string, ChartDeletion> {
  const latest = new Map<string, ChartDeletion>();
  for (const deletion of deletions) {
    if (!isChartDeletion(deletion)) continue;
    const existing = latest.get(deletion.id);
    if (!existing || timestamp(deletion.deletedAt) > timestamp(existing.deletedAt)) {
      latest.set(deletion.id, deletion);
    }
  }
  return latest;
}

function validSettings(value: unknown): Profile['settings'] | null {
  if (!value || typeof value !== 'object') return null;
  const houseSystem = (value as { houseSystem?: unknown }).houseSystem;
  return HOUSE_SYSTEMS.has(houseSystem as Profile['settings']['houseSystem'])
    ? { houseSystem: houseSystem as Profile['settings']['houseSystem'] }
    : null;
}

function isSavedChart(value: unknown): value is SavedChart {
  if (!value || typeof value !== 'object') return false;
  const chart = value as Partial<SavedChart>;
  return typeof chart.id === 'string' &&
    chart.id.length > 0 &&
    typeof chart.name === 'string' &&
    typeof chart.createdAt === 'string' &&
    typeof chart.updatedAt === 'string' &&
    Number.isFinite(Date.parse(chart.updatedAt)) &&
    Boolean(chart.birth) &&
    typeof chart.birth === 'object' &&
    Boolean(chart.summary) &&
    typeof chart.summary === 'object';
}

function isChartDeletion(value: unknown): value is ChartDeletion {
  if (!value || typeof value !== 'object') return false;
  const deletion = value as Partial<ChartDeletion>;
  return typeof deletion.id === 'string' &&
    deletion.id.length > 0 &&
    typeof deletion.deletedAt === 'string' &&
    Number.isFinite(Date.parse(deletion.deletedAt));
}

function timestamp(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
