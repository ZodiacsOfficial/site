import { useEffect, useRef } from 'preact/hooks';
import { profileAccessAllowed } from '../account-v2/profile-access-reader';

/**
 * Gives async, profile-derived UI a generation token. Revocation increments
 * the token synchronously at the event boundary, so late completions can be
 * discarded and already-rendered derived state can be scrubbed.
 */
export function useProfileAccessGeneration(onRevoke: () => void) {
  const generation = useRef(0);
  const onRevokeRef = useRef(onRevoke);
  onRevokeRef.current = onRevoke;
  useEffect(() => {
    const onAccess = () => {
      generation.current += 1;
      if (!profileAccessAllowed()) onRevokeRef.current();
    };
    window.addEventListener('zodiacs:profile-access', onAccess);
    return () => window.removeEventListener('zodiacs:profile-access', onAccess);
  }, []);
  return generation;
}
