/**
 * localStorage-backed profile store. Every write dispatches
 * `zodiacs:profile` on window so the nav glyph and any open islands
 * stay in sync without a framework store.
 */
import { EMPTY_PROFILE, MAX_CHARTS, PROFILE_KEY } from './schema';
import type { Profile, SavedChart } from './schema';

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

function persist(profile: Profile): boolean {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    window.dispatchEvent(new CustomEvent('zodiacs:profile', { detail: profile }));
    return true;
  } catch {
    return false; // storage full / private mode — callers surface a notice
  }
}

export function saveChart(chart: SavedChart): 'saved' | 'updated' | 'full' | 'error' {
  const profile = loadProfile();
  const existing = profile.charts.findIndex((c) => c.id === chart.id);
  if (existing >= 0) {
    profile.charts[existing] = { ...chart, updatedAt: new Date().toISOString() };
    return persist(profile) ? 'updated' : 'error';
  }
  if (profile.charts.length >= MAX_CHARTS) return 'full';
  profile.charts.unshift(chart);
  return persist(profile) ? 'saved' : 'error';
}

export function deleteChart(id: string): boolean {
  const profile = loadProfile();
  profile.charts = profile.charts.filter((c) => c.id !== id);
  return persist(profile);
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
