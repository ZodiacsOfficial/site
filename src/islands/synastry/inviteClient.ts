import type { InvitePublicPayload } from '../../lib/invite/types';
import { decodePositionsLink, encodePositionsLink } from '../../lib/share-positions';
import { signForLongitude } from '../../lib/signs';

const PENDING_KEY_PREFIX = 'zodiacs.invites.pending.v2.';
const SESSION_HANDLE_RE = /^[A-Za-z0-9_-]{22}$/u;
const MAX_PENDING_COMPLETIONS = 24;

export type InviteSessionResult =
  | { state: 'ready'; handle: string; payload: InvitePublicPayload }
  | { state: 'unavailable' }
  | { state: 'offline' };

interface PendingCompletion {
  handle: string;
  expiresAt: string;
  rememberedAt: number;
}

function validSessionHandle(handle: string): boolean {
  return SESSION_HANDLE_RE.test(handle);
}

function publicPayload(value: unknown): InvitePublicPayload | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const rowKeys = Object.keys(row).sort().join(',');
  if (rowKeys !== 'expiresAt,label,positions,sunSign,timeKnown,version'
    || row.version !== 1
    || typeof row.label !== 'string'
    || row.label !== row.label.trim()
    || /[\u0000-\u001f\u007f-\u009f]/u.test(row.label)
    || !row.label
    || Array.from(row.label).length > 24
    || typeof row.sunSign !== 'string'
    || typeof row.timeKnown !== 'boolean'
    || typeof row.expiresAt !== 'string'
    || !Number.isFinite(Date.parse(row.expiresAt))
    || !row.positions
    || typeof row.positions !== 'object'
    || Array.isArray(row.positions)) return null;
  const source = row.positions as Record<string, unknown>;
  if (Object.keys(source).sort().join(',') !== 'angles,bodies,engineVersion,houseSystem') return null;
  const token = encodePositionsLink(
    source as unknown as Parameters<typeof encodePositionsLink>[0],
  );
  const positions = token ? decodePositionsLink(token) : null;
  const sun = positions?.bodies.find((body) => body.body === 'Sun');
  if (!positions
    || !sun
    || row.timeKnown !== (positions.angles !== null)
    || signForLongitude(sun.lon).slug !== row.sunSign) return null;
  return {
    version: 1,
    label: row.label,
    sunSign: row.sunSign as InvitePublicPayload['sunSign'],
    positions,
    timeKnown: row.timeKnown,
    expiresAt: row.expiresAt,
  };
}

export async function openInviteSession(
  handle: string,
  fetcher: typeof fetch = fetch,
): Promise<InviteSessionResult> {
  if (!validSessionHandle(handle)) return { state: 'unavailable' };
  if (typeof navigator !== 'undefined' && !navigator.onLine) return { state: 'offline' };
  try {
    const response = await fetcher(
      `/api/compatibility/invite-session?session=${encodeURIComponent(handle)}`,
      {
      method: 'GET',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      },
    );
    const value = await response.json() as unknown;
    if (!response.ok || !value || typeof value !== 'object' || Array.isArray(value)) {
      return { state: 'unavailable' };
    }
    const row = value as Record<string, unknown>;
    const payload = row.state === 'ready' ? publicPayload(row.payload) : null;
    if (payload) {
      return { state: 'ready', handle, payload };
    }
    return { state: 'unavailable' };
  } catch {
    return typeof navigator !== 'undefined' && !navigator.onLine
      ? { state: 'offline' }
      : { state: 'unavailable' };
  }
}

function forgetCompletion(handle: string): void {
  try {
    localStorage.removeItem(`${PENDING_KEY_PREFIX}${handle}`);
  } catch {}
}

function pendingCompletions(): PendingCompletion[] {
  const entries: PendingCompletion[] = [];
  try {
    const now = Date.now();
    const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
      .filter((key): key is string => typeof key === 'string' && key.startsWith(PENDING_KEY_PREFIX));
    for (const key of keys) {
      const handle = key.slice(PENDING_KEY_PREFIX.length);
      try {
        const raw = localStorage.getItem(key);
        const value = raw ? JSON.parse(raw) as unknown : null;
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid');
        const pending = value as Record<string, unknown>;
        if (pending.version !== 2
          || pending.handle !== handle
          || !validSessionHandle(handle)
          || typeof pending.expiresAt !== 'string'
          || !Number.isFinite(Date.parse(pending.expiresAt))
          || Date.parse(pending.expiresAt) <= now
          || typeof pending.rememberedAt !== 'number'
          || !Number.isFinite(pending.rememberedAt)
          || pending.rememberedAt < 0) throw new Error('invalid');
        entries.push({
          handle,
          expiresAt: pending.expiresAt,
          rememberedAt: pending.rememberedAt,
        });
      } catch {
        localStorage.removeItem(key);
      }
    }
    entries.sort((left, right) => left.rememberedAt - right.rememberedAt
      || left.handle.localeCompare(right.handle));
    const extra = entries.slice(0, Math.max(0, entries.length - MAX_PENDING_COMPLETIONS));
    for (const pending of extra) forgetCompletion(pending.handle);
    return entries.slice(-MAX_PENDING_COMPLETIONS);
  } catch {
    return [];
  }
}

function rememberCompletion(handle: string, expiresAt: string): boolean {
  if (!validSessionHandle(handle)
    || !Number.isFinite(Date.parse(expiresAt))
    || Date.parse(expiresAt) <= Date.now()) return false;
  try {
    localStorage.setItem(`${PENDING_KEY_PREFIX}${handle}`, JSON.stringify({
      version: 2,
      handle,
      expiresAt,
      rememberedAt: Date.now(),
    }));
    pendingCompletions();
  } catch {
    // The immediate request still runs; storage denial only removes replay.
  }
  return true;
}

export async function completeInvite(
  handle: string,
  expiresAt: string,
  fetcher: typeof fetch = fetch,
): Promise<boolean> {
  if (!rememberCompletion(handle, expiresAt)) return false;
  try {
    const response = await fetcher(
      `/api/compatibility/invite-complete?session=${encodeURIComponent(handle)}`,
      {
      method: 'POST',
      credentials: 'same-origin',
      keepalive: true,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: '{}',
      },
    );
    if (!response.ok) return false;
    const value = await response.json() as unknown;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const outcome = (value as Record<string, unknown>).outcome;
    if (outcome !== 'completed' && outcome !== 'duplicate') return false;
    forgetCompletion(handle);
    return true;
  } catch {
    return false;
  }
}

export async function replayPendingCompletion(fetcher: typeof fetch = fetch): Promise<boolean> {
  const pending = pendingCompletions();
  if (pending.length === 0) return false;
  let completed = false;
  for (const entry of pending) {
    if (await completeInvite(entry.handle, entry.expiresAt, fetcher)) completed = true;
  }
  return completed;
}

export function beaconPendingCompletion(): boolean {
  if (typeof navigator.sendBeacon !== 'function') return false;
  let queued = false;
  for (const pending of pendingCompletions()) {
    queued = navigator.sendBeacon(
      `/api/compatibility/invite-complete?session=${encodeURIComponent(pending.handle)}`,
      new Blob(['{}'], { type: 'application/json' }),
    ) || queued;
  }
  return queued;
}

export const INVITE_PENDING_COMPLETION_KEY_PREFIX = PENDING_KEY_PREFIX;
