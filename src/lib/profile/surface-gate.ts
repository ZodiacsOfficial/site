/**
 * With account sync v2 on, AccountBoundProfileSurface decides when this
 * browser's local profile may be shown to the signed-in account. The page's
 * other personal surfaces (the your-page header, your people, received
 * cards) follow that one decision instead of repeating it: the gate
 * announces it on the document, and they reveal or withhold with it.
 * Without v2 there is no account boundary and they show as before.
 */
import { useEffect, useState } from 'preact/hooks';

const VISIBLE_ATTRIBUTE = 'data-profile-surface-visible';
export const PROFILE_SURFACE_EVENT = 'zodiacs:profile-surface';

export function announceProfileSurface(visible: boolean): void {
  try {
    document.documentElement.toggleAttribute(VISIBLE_ATTRIBUTE, visible);
    window.dispatchEvent(new Event(PROFILE_SURFACE_EVENT));
  } catch {
    // Without a document there is nothing to reveal.
  }
}

export function profileSurfaceVisible(accountBound: boolean): boolean {
  if (!accountBound) return true;
  try {
    return document.documentElement.hasAttribute(VISIBLE_ATTRIBUTE);
  } catch {
    return false;
  }
}

/** False until the account gate (when there is one) has revealed the profile. */
export function useProfileSurface(accountBound: boolean): boolean {
  const [visible, setVisible] = useState(!accountBound);

  useEffect(() => {
    if (!accountBound) return;
    const sync = () => setVisible(profileSurfaceVisible(true));
    sync();
    window.addEventListener(PROFILE_SURFACE_EVENT, sync);
    return () => window.removeEventListener(PROFILE_SURFACE_EVENT, sync);
  }, [accountBound]);

  return visible;
}
