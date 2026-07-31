/**
 * localStorage-backed profile store. Every write dispatches
 * `zodiacs:profile` on window so the nav glyph and any open islands
 * stay in sync without a framework store.
 */
import { EMPTY_PROFILE, MAX_CHARTS, PROFILE_KEY } from './schema';
import type { Profile, SavedChart } from './schema';
import { clearChartDeletion, recordChartDeletion } from './deletions';
import { trackAnalytics } from '../analytics';

const YEAR_AHEAD_CACHE_KEY = 'zodiacs.yearahead.v1';

interface PersistOptions {
  sync?: boolean;
}

export type StoredChartIdentity = Pick<SavedChart, 'birth'> & {
  summary: Pick<SavedChart['summary'], 'houseSystem'>;
};

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return structuredClone(EMPTY_PROFILE);
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1 || !Array.isArray(parsed.charts)) {
      return structuredClone(EMPTY_PROFILE);
    }
    return parsed as Profile;
  } catch {
    return structuredClone(EMPTY_PROFILE);
  }
}

function queueCloudSync() {
  if (typeof window === 'undefined') return;
  // Build-time gate: without Supabase env the sync chunk (and the
  // supabase-js dependency inside it) is never even fetched.
  if (!import.meta.env.PUBLIC_SUPABASE_URL) return;
  import('./sync')
    .then(({ scheduleCloudSync }) => scheduleCloudSync())
    .catch(() => {});
}

function persist(profile: Profile, options: PersistOptions = { sync: true }): boolean {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    window.dispatchEvent(new CustomEvent('zodiacs:profile', { detail: profile }));
    if (options.sync !== false) queueCloudSync();
    return true;
  } catch {
    return false; // storage full / private mode — callers surface a notice
  }
}

export function replaceProfile(profile: Profile): boolean {
  const ok = persist(profile, { sync: false });
  if (ok) pruneYearAheadCacheExcept(new Set(profile.charts.map((chart) => chart.id)));
  return ok;
}

function sameStoredInput(a: StoredChartIdentity, b: StoredChartIdentity): boolean {
  const aPlace = a.birth.place;
  const bPlace = b.birth.place;
  return a.birth.date === b.birth.date &&
    a.birth.time === b.birth.time &&
    aPlace !== null &&
    bPlace !== null &&
    aPlace.lat === bPlace.lat &&
    aPlace.lon === bPlace.lon &&
    a.summary.houseSystem === b.summary.houseSystem;
}

export function findMatchingChart(chart: StoredChartIdentity): SavedChart | null {
  return loadProfile().charts.find((candidate) => sameStoredInput(candidate, chart)) ?? null;
}

export function saveChart(
  chart: SavedChart,
  options: { explicitName?: string } = {},
): 'saved' | 'updated' | 'full' | 'error' {
  const profile = loadProfile();
  const explicitName = options.explicitName?.trim() || undefined;
  let existing = profile.charts.findIndex((c) => c.id === chart.id);
  if (existing < 0) {
    existing = profile.charts.findIndex((candidate) => sameStoredInput(candidate, chart));
  }
  if (existing >= 0) {
    const saved = profile.charts[existing];
    const updated = {
      ...chart,
      id: saved.id,
      name: explicitName ?? saved.name,
      createdAt: saved.createdAt,
      updatedAt: new Date().toISOString(),
    };
    profile.charts[existing] = updated;
    if (!persist(profile)) return 'error';
    clearChartDeletion(updated.id);
    return 'updated';
  }
  if (profile.charts.length >= MAX_CHARTS) return 'full';
  const previousCount = profile.charts.length;
  const inserted = explicitName ? { ...chart, name: explicitName } : chart;
  profile.charts.unshift(inserted);
  if (!persist(profile)) return 'error';
  clearChartDeletion(inserted.id);
  if (previousCount === 1) trackAnalytics('second_chart_saved');
  return 'saved';
}

function pruneYearAheadCacheEntries(shouldRemove: (id: string) => boolean): void {
  try {
    const raw = localStorage.getItem(YEAR_AHEAD_CACHE_KEY);
    if (!raw) return;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return;
    const cache = parsed as Record<string, unknown>;
    let changed = false;
    for (const id of Object.keys(cache)) {
      if (!shouldRemove(id)) continue;
      delete cache[id];
      changed = true;
    }
    if (changed) localStorage.setItem(YEAR_AHEAD_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // The profile deletion is authoritative; this derived cache is best-effort.
  }
}

function pruneYearAheadCache(id: string): void {
  pruneYearAheadCacheEntries((candidate) => candidate === id);
}

function pruneYearAheadCacheExcept(chartIds: Set<string>): void {
  pruneYearAheadCacheEntries((candidate) => !chartIds.has(candidate));
}

export function deleteChart(id: string): boolean {
  const profile = loadProfile();
  const existed = profile.charts.some((c) => c.id === id);
  profile.charts = profile.charts.filter((c) => c.id !== id);
  const ok = persist(profile, { sync: false });
  if (ok && existed) {
    pruneYearAheadCache(id);
    recordChartDeletion(id);
    queueCloudSync();
  }
  return ok;
}

export function renameChart(id: string, name: string): boolean {
  const profile = loadProfile();
  const chart = profile.charts.find((c) => c.id === id);
  if (!chart) return false;
  chart.name = name;
  chart.updatedAt = new Date().toISOString();
  return persist(profile);
}

export function setHouseSystem(houseSystem: Profile['settings']['houseSystem']): void {
  const profile = loadProfile();
  profile.settings.houseSystem = houseSystem;
  persist(profile);
}
