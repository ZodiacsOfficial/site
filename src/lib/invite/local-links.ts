/**
 * One-time invitation URLs live only in the browser that created them.
 * The account register receives positions-free rows from the server and
 * deliberately has no way to reconstruct a private link on another device.
 */
export const INVITE_LINKS_STORAGE_KEY = 'zodiacs.compat.invite-links.v1';

const INVITE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const INVITE_PATH = /^\/c\/[A-Za-z0-9_-]{43}\/$/u;

export interface InviteLinkStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

type StoredInviteLinks = Record<string, string>;

function browserStorage(): InviteLinkStorage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function browserOrigin(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.location.origin;
  } catch {
    return null;
  }
}

function safeStore(
  storage: InviteLinkStorage | null | undefined,
): InviteLinkStorage | null {
  return storage === undefined ? browserStorage() : storage;
}

function readAll(storage: InviteLinkStorage): StoredInviteLinks | null {
  let raw: string | null;
  try {
    raw = storage.getItem(INVITE_LINKS_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    const links: StoredInviteLinks = {};
    for (const [id, value] of Object.entries(parsed)) {
      if (INVITE_ID.test(id) && typeof value === 'string') links[id] = value;
    }
    return links;
  } catch {
    return {};
  }
}

function normalizedInviteUrl(
  value: string,
  currentOrigin: string | null,
): string | null {
  try {
    const base = currentOrigin ?? 'https://zodiacs.org';
    const url = new URL(value, base);
    const sameBrowserOrigin = currentOrigin !== null && url.origin === currentOrigin;
    const canonicalOrigin = url.origin === 'https://zodiacs.org';
    if (
      url.protocol !== 'https:'
      && !(sameBrowserOrigin && url.hostname === 'localhost')
      && !(sameBrowserOrigin && url.hostname === '127.0.0.1')
    ) return null;
    if (!sameBrowserOrigin && !canonicalOrigin) return null;
    if (!INVITE_PATH.test(url.pathname) || url.search || url.hash) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function rememberInviteLink(
  id: string,
  url: string,
  storage?: InviteLinkStorage | null,
  currentOrigin: string | null = browserOrigin(),
): boolean {
  const target = safeStore(storage);
  const normalized = normalizedInviteUrl(url, currentOrigin);
  if (!target || !INVITE_ID.test(id) || !normalized) return false;
  try {
    const links = readAll(target);
    if (!links) return false;
    links[id] = normalized;
    target.setItem(INVITE_LINKS_STORAGE_KEY, JSON.stringify(links));
    return true;
  } catch {
    return false;
  }
}

export function readInviteLink(
  id: string,
  storage?: InviteLinkStorage | null,
  currentOrigin: string | null = browserOrigin(),
): string | null {
  const target = safeStore(storage);
  if (!target || !INVITE_ID.test(id)) return null;
  const stored = readAll(target)?.[id];
  return stored ? normalizedInviteUrl(stored, currentOrigin) : null;
}

export function removeInviteLink(
  id: string,
  storage?: InviteLinkStorage | null,
): boolean {
  const target = safeStore(storage);
  if (!target || !INVITE_ID.test(id)) return false;
  try {
    const links = readAll(target);
    if (!links) return false;
    if (!(id in links)) return true;
    delete links[id];
    if (Object.keys(links).length === 0) {
      target.removeItem(INVITE_LINKS_STORAGE_KEY);
    } else {
      target.setItem(INVITE_LINKS_STORAGE_KEY, JSON.stringify(links));
    }
    return true;
  } catch {
    return false;
  }
}

export function inviteLinksForRows(
  ids: readonly string[],
  storage?: InviteLinkStorage | null,
  currentOrigin: string | null = browserOrigin(),
): Readonly<Record<string, string>> {
  const target = safeStore(storage);
  if (!target) return {};
  const wanted = new Set(ids.filter((id) => INVITE_ID.test(id)));
  const links = readAll(target);
  if (!links) return {};
  return Object.fromEntries(
    Object.entries(links)
      .filter(([id]) => wanted.has(id))
      .map(([id, url]) => [id, normalizedInviteUrl(url, currentOrigin)])
      .filter((entry): entry is [string, string] => entry[1] !== null),
  );
}
