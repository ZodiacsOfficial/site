import { useEffect, useState } from 'preact/hooks';
import { EMPTY_PROFILE } from '../profile/schema';
import type { Profile } from '../profile/schema';
import { loadProfile } from '../profile/store';

export interface ProfileState {
  profile: Profile;
  /** False during SSR and the first client render; true after storage loads. */
  ready: boolean;
}

/** Keep a hydrated island synchronized with successful same-window writes. */
export function useProfile(): ProfileState {
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setProfile(loadProfile());
    sync();
    window.addEventListener('zodiacs:profile', sync);
    setReady(true);
    return () => window.removeEventListener('zodiacs:profile', sync);
  }, []);

  return { profile, ready };
}
