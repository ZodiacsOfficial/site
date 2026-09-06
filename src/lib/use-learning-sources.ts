import { useEffect, useRef, useState } from 'preact/hooks';
import { PROFILE_KEY } from './profile/schema';
import { readLearningSources, type LearningSource } from './learning-source';

/** Event payloads never authorize disclosure. Every refresh rereads behind the guard. */
export function useLearningSources() {
  const [sources, setSources] = useState<LearningSource[]>([]);
  const accessGeneration = useRef(0);
  useEffect(() => {
    const refresh = () => setSources(readLearningSources());
    const access = () => { accessGeneration.current += 1; refresh(); };
    const storage = (event: StorageEvent) => { if (event.key === null || event.key === PROFILE_KEY) refresh(); };
    refresh();
    window.addEventListener('zodiacs:profile', refresh);
    window.addEventListener('zodiacs:profile-synced', refresh);
    window.addEventListener('zodiacs:profile-access', access);
    window.addEventListener('storage', storage);
    window.addEventListener('pageshow', refresh);
    return () => {
      window.removeEventListener('zodiacs:profile', refresh);
      window.removeEventListener('zodiacs:profile-synced', refresh);
      window.removeEventListener('zodiacs:profile-access', access);
      window.removeEventListener('storage', storage);
      window.removeEventListener('pageshow', refresh);
    };
  }, []);
  return { sources, accessGeneration };
}
