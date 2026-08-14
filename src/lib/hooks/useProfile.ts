import { useEffect, useState } from 'preact/hooks';
import { EMPTY_PROFILE } from '../profile/schema';
import type { Profile } from '../profile/schema';
import { loadProfile } from '../profile/read-store';
import { profileAccessAllowed } from '../account-v2/profile-access-reader';

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
    const sync = () => {
      if (!profileAccessAllowed()) {
        setProfile(EMPTY_PROFILE);
        setReady(false);
        return;
      }
      setProfile(loadProfile());
      setReady(true);
    };
    sync();
    window.addEventListener('zodiacs:profile', sync);
    window.addEventListener('zodiacs:profile-access', sync);
    return () => {
      window.removeEventListener('zodiacs:profile', sync);
      window.removeEventListener('zodiacs:profile-access', sync);
    };
  }, []);

  return { profile, ready };
}
