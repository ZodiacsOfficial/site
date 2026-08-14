import { profileAccessAllowed } from '../account-v2/profile-access-reader';
import { EMPTY_PROFILE, PROFILE_KEY, type Profile } from './schema';

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
    return parsed as Profile;
  } catch {
    return structuredClone(EMPTY_PROFILE);
  }
}
