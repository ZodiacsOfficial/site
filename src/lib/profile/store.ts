/**
 * localStorage-backed profile store. Every write dispatches
 * `zodiacs:profile` on window so the nav glyph and any open islands
 * stay in sync without a framework store.
 */
import { EMPTY_PROFILE, MAX_CHARTS, PROFILE_KEY } from './schema';
import type { Profile, SavedChart } from './schema';
import { clearChartDeletion, recordChartDeletion } from './deletions';

interface PersistOptions {
  sync?: boolean;
}

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
  return persist(profile, { sync: false });
}

export function saveChart(chart: SavedChart): 'saved' | 'updated' | 'full' | 'error' {
  const profile = loadProfile();
  const existing = profile.charts.findIndex((c) => c.id === chart.id);
  if (existing >= 0) {
    profile.charts[existing] = { ...chart, updatedAt: new Date().toISOString() };
    if (!persist(profile)) return 'error';
    clearChartDeletion(chart.id);
    return 'updated';
  }
  if (profile.charts.length >= MAX_CHARTS) return 'full';
  profile.charts.unshift(chart);
  if (!persist(profile)) return 'error';
  clearChartDeletion(chart.id);
  return 'saved';
}

export function deleteChart(id: string): boolean {
  const profile = loadProfile();
  const existed = profile.charts.some((c) => c.id === id);
  profile.charts = profile.charts.filter((c) => c.id !== id);
  const ok = persist(profile, { sync: false });
  if (ok && existed) recordChartDeletion(id);
  if (ok && existed) queueCloudSync();
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
