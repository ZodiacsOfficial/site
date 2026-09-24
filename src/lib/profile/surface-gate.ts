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

/*
 * A card arriving at the top of /profile/ can hold the page's one white
 * action ("Add to your people", then "Send your card"). While it does, the
 * header below offers its own actions as ghosts, so the page never shows two
 * primaries at once. Announced on the document like the account gate, so
 * the order the islands hydrate in does not matter.
 */
const INBOX_PRIMARY_ATTRIBUTE = 'data-card-inbox-primary';
const INBOX_PRIMARY_EVENT = 'zodiacs:card-inbox-primary';

export function announceInboxPrimary(holds: boolean): void {
  try {
    document.documentElement.toggleAttribute(INBOX_PRIMARY_ATTRIBUTE, holds);
    window.dispatchEvent(new Event(INBOX_PRIMARY_EVENT));
  } catch {
    // Without a document there is no header to step down.
  }
}

/** True while a received card holds the page's primary action. */
export function useInboxHoldsPrimary(): boolean {
  const [holds, setHolds] = useState(false);

  useEffect(() => {
    const sync = () => setHolds(document.documentElement.hasAttribute(INBOX_PRIMARY_ATTRIBUTE));
    sync();
    window.addEventListener(INBOX_PRIMARY_EVENT, sync);
    return () => window.removeEventListener(INBOX_PRIMARY_EVENT, sync);
  }, []);

  return holds;
}
