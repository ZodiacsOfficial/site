import { describe, expect, it } from 'vitest';
import { mergeSyncState } from './merge';
import type { Profile, SavedChart } from './schema';
import type { ChartDeletion } from './deletions';

const profile = (charts: SavedChart[]): Profile => ({
  version: 1,
  settings: { houseSystem: 'whole' },
  charts,
});

const chart = (id: string, updatedAt: string, name = id): SavedChart => ({
  id,
  name,
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt,
  birth: {
    date: '1990-01-01',
    time: '12:00',
    timeKnown: true,
    place: {
      name: 'Bangkok',
      admin1: 'Bangkok',
      country: 'TH',
      lat: 13.7563,
      lon: 100.5018,
      tz: 'Asia/Bangkok',
    },
  },
  summary: {
    engineVersion: 'test',
    utcISO: '1990-01-01T05:00:00.000Z',
    houseSystem: 'whole',
    bodies: [{ body: 'Sun', lon: 280, retrograde: false }],
    angles: { asc: 12, mc: 102 },
    flags: [],
  },
});

const deletion = (id: string, deletedAt: string): ChartDeletion => ({ id, deletedAt });

describe('mergeSyncState', () => {
  it('keeps a local-only chart for first sync upload', () => {
    const local = chart('chart-a', '2026-07-01T10:00:00.000Z');
    const result = mergeSyncState({
      localProfile: profile([local]),
      remoteSettings: null,
      remoteCharts: [],
      localDeletions: [],
      remoteDeletions: [],
    });
    expect(result.profile.charts).toEqual([local]);
    expect(result.deletedChartIds).toEqual([]);
  });

  it('downloads a remote-only chart', () => {
    const remote = chart('chart-a', '2026-07-01T10:00:00.000Z');
    const result = mergeSyncState({
      localProfile: profile([]),
      remoteSettings: null,
      remoteCharts: [{ id: remote.id, payload: remote, updatedAt: remote.updatedAt }],
      localDeletions: [],
      remoteDeletions: [],
    });
    expect(result.profile.charts).toEqual([remote]);
  });

  it('keeps the newer local chart over an older remote chart', () => {
    const local = chart('chart-a', '2026-07-02T10:00:00.000Z', 'new local');
    const remote = chart('chart-a', '2026-07-01T10:00:00.000Z', 'old remote');
    const result = mergeSyncState({
      localProfile: profile([local]),
      remoteSettings: null,
      remoteCharts: [{ id: remote.id, payload: remote, updatedAt: remote.updatedAt }],
      localDeletions: [],
      remoteDeletions: [],
    });
    expect(result.profile.charts[0].name).toBe('new local');
  });

  it('keeps the newer remote chart over an older local chart', () => {
    const local = chart('chart-a', '2026-07-01T10:00:00.000Z', 'old local');
    const remote = chart('chart-a', '2026-07-02T10:00:00.000Z', 'new remote');
    const result = mergeSyncState({
      localProfile: profile([local]),
      remoteSettings: null,
      remoteCharts: [{ id: remote.id, payload: remote, updatedAt: remote.updatedAt }],
      localDeletions: [],
      remoteDeletions: [],
    });
    expect(result.profile.charts[0].name).toBe('new remote');
  });

  it('uses remote updated_at when it is newer than the payload timestamp', () => {
    const local = chart('chart-a', '2026-07-02T10:00:00.000Z', 'old local');
    const remote = chart('chart-a', '2026-07-01T10:00:00.000Z', 'new remote');
    const result = mergeSyncState({
      localProfile: profile([local]),
      remoteSettings: null,
      remoteCharts: [{ id: remote.id, payload: remote, updatedAt: '2026-07-03T10:00:00.000Z' }],
      localDeletions: [],
      remoteDeletions: [],
    });
    expect(result.profile.charts[0].name).toBe('new remote');
    expect(result.profile.charts[0].updatedAt).toBe('2026-07-03T10:00:00.000Z');
  });

  it('removes a chart when the tombstone is newer', () => {
    const local = chart('chart-a', '2026-07-01T10:00:00.000Z');
    const result = mergeSyncState({
      localProfile: profile([local]),
      remoteSettings: null,
      remoteCharts: [],
      localDeletions: [deletion('chart-a', '2026-07-02T10:00:00.000Z')],
      remoteDeletions: [],
    });
    expect(result.profile.charts).toEqual([]);
    expect(result.deletions).toEqual([deletion('chart-a', '2026-07-02T10:00:00.000Z')]);
    expect(result.deletedChartIds).toEqual(['chart-a']);
  });

  it('ignores an older tombstone when the chart is newer', () => {
    const local = chart('chart-a', '2026-07-02T10:00:00.000Z');
    const result = mergeSyncState({
      localProfile: profile([local]),
      remoteSettings: null,
      remoteCharts: [],
      localDeletions: [deletion('chart-a', '2026-07-01T10:00:00.000Z')],
      remoteDeletions: [],
    });
    expect(result.profile.charts).toEqual([local]);
    expect(result.deletions).toEqual([]);
    expect(result.deletedChartIds).toEqual([]);
  });

  it('applies a newer remote tombstone to a remote chart', () => {
    const remote = chart('chart-a', '2026-07-01T10:00:00.000Z');
    const result = mergeSyncState({
      localProfile: profile([]),
      remoteSettings: null,
      remoteCharts: [{ id: remote.id, payload: remote, updatedAt: remote.updatedAt }],
      localDeletions: [],
      remoteDeletions: [{ id: 'chart-a', deletedAt: '2026-07-02T10:00:00.000Z' }],
    });
    expect(result.profile.charts).toEqual([]);
    expect(result.deletedChartIds).toEqual(['chart-a']);
  });

  it('sorts multiple surviving charts by updatedAt descending', () => {
    const older = chart('chart-a', '2026-07-01T10:00:00.000Z');
    const newer = chart('chart-b', '2026-07-03T10:00:00.000Z');
    const middle = chart('chart-c', '2026-07-02T10:00:00.000Z');
    const result = mergeSyncState({
      localProfile: profile([older, newer, middle]),
      remoteSettings: null,
      remoteCharts: [],
      localDeletions: [],
      remoteDeletions: [],
    });
    expect(result.profile.charts.map((c) => c.id)).toEqual(['chart-b', 'chart-c', 'chart-a']);
  });
});
