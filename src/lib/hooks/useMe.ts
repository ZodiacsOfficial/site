import { useEffect, useState } from 'preact/hooks';
import { DEFAULT_ME, loadMe, type MeSettings } from '../profile/me';
import { loadCircle, type CircleEntry } from '../profile/circle';

/** Your-page settings, kept in step with same-window writes and the account boundary. */
export function useMe(): MeSettings {
  const [me, setMe] = useState<MeSettings>(DEFAULT_ME);

  useEffect(() => {
    const sync = () => setMe(loadMe());
    sync();
    window.addEventListener('zodiacs:me', sync);
    window.addEventListener('zodiacs:profile-access', sync);
    return () => {
      window.removeEventListener('zodiacs:me', sync);
      window.removeEventListener('zodiacs:profile-access', sync);
    };
  }, []);

  return me;
}

/** Cards other people sent, kept in step with same-window writes and the account boundary. */
export function useCircle(): CircleEntry[] {
  const [entries, setEntries] = useState<CircleEntry[]>([]);

  useEffect(() => {
    const sync = () => setEntries(loadCircle());
    sync();
    window.addEventListener('zodiacs:circle', sync);
    window.addEventListener('zodiacs:profile-access', sync);
    return () => {
      window.removeEventListener('zodiacs:circle', sync);
      window.removeEventListener('zodiacs:profile-access', sync);
    };
  }, []);

  return entries;
}
