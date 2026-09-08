import { profileAccessAllowed } from '../account-v2/profile-access-reader';
import { EMPTY_PROFILE, PROFILE_KEY, type Profile, type SavedChart } from './schema';
import { repairLegacyPolarChart } from './polar-repair';

/** Only an unambiguous, explicit owner choice identifies a personal chart. */
export function explicitSelfChart(charts: readonly SavedChart[]): SavedChart | null {
  const own = charts.filter((chart) => chart.relationship === 'self');
  return own.length === 1 ? own[0] : null;
}

/** Lightweight, fail-closed profile reader for read-only route islands. */
export function loadProfile(): Profile {
  if (!profileAccessAllowed()) return structuredClone(EMPTY_PROFILE);
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return structuredClone(EMPTY_PROFILE);
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1 || !Array.isArray(parsed.charts)) {
      return structuredClone(EMPTY_PROFILE);
    }
    // Profile-store consumers see the corrected axis, including lightweight
    // Today islands. Reading never writes storage or queues a cloud sync.
    const profile = parsed as Profile;
    return { ...profile, charts: profile.charts.map(repairLegacyPolarChart) };
  } catch {
    return structuredClone(EMPTY_PROFILE);
  }
}
