import { SIGN_SLUGS } from '../signs';
import { dailyRecipientHash } from './identity';
import type { DailySunContact } from './segments';
import type { SunSignRecipient } from './types';

const HASH = /^[0-9a-f]{64}$/u;
const HASHES_PER_REQUEST = 50;

interface DailySunAuthorityRow {
  recipient_hash?: unknown;
  sign?: unknown;
  confirmed_at?: unknown;
}

export interface AuthorizedSunRecipients {
  recipients: SunSignRecipient[];
  rejected: number;
}

function preferencesEndpoint(supabaseUrl: string): URL {
  const base = new URL(supabaseUrl);
  if (base.protocol !== 'https:') throw new Error('Supabase URL must use HTTPS.');
  return new URL('/rest/v1/daily_sun_preferences', `${base.origin}/`);
}

function serviceHeaders(serviceKey: string): Record<string, string> {
  if (!serviceKey.trim()) throw new Error('Supabase service key is required.');
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    Accept: 'application/json',
  };
}

function confirmedAuthority(row: DailySunAuthorityRow): { recipientHash: string; sign: string } | null {
  if (typeof row.recipient_hash !== 'string' || !HASH.test(row.recipient_hash)) return null;
  if (typeof row.sign !== 'string' || !SIGN_SLUGS.includes(row.sign)) return null;
  if (typeof row.confirmed_at !== 'string' || !Number.isFinite(Date.parse(row.confirmed_at))) return null;
  return { recipientHash: row.recipient_hash, sign: row.sign };
}

/**
 * Intersects provider routing state with the server-owned consent ledger.
 * Provider membership may drift, but can never grant delivery authority alone.
 */
export async function loadAuthorizedSunRecipients({
  contacts,
  fetchImpl,
  supabaseUrl,
  serviceKey,
  hashSecret,
}: {
  contacts: readonly DailySunContact[];
  fetchImpl: typeof fetch;
  supabaseUrl: string;
  serviceKey: string;
  hashSecret: string;
}): Promise<AuthorizedSunRecipients> {
  if (contacts.length === 0) return { recipients: [], rejected: 0 };

  const candidates = contacts.map((contact) => ({
    contact,
    recipientHash: dailyRecipientHash(contact.email, hashSecret),
  }));
  const hashes = [...new Set(candidates.map((candidate) => candidate.recipientHash))];
  const confirmedByHash = new Map<string, string>();
  const invalidHashes = new Set<string>();

  for (let offset = 0; offset < hashes.length; offset += HASHES_PER_REQUEST) {
    const batch = hashes.slice(offset, offset + HASHES_PER_REQUEST);
    const url = preferencesEndpoint(supabaseUrl);
    url.searchParams.set('select', 'recipient_hash,sign,confirmed_at');
    url.searchParams.set('recipient_hash', `in.(${batch.join(',')})`);
    const response = await fetchImpl(url, {
      headers: serviceHeaders(serviceKey),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      throw new Error(`Daily Sun consent authority lookup failed (${response.status}).`);
    }
    const body = await response.json() as unknown;
    if (!Array.isArray(body)) {
      throw new Error('Daily Sun consent authority returned an invalid response.');
    }
    for (const raw of body) {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
      const authority = confirmedAuthority(raw as DailySunAuthorityRow);
      if (!authority || !batch.includes(authority.recipientHash)) continue;
      const previous = confirmedByHash.get(authority.recipientHash);
      if (previous && previous !== authority.sign) {
        confirmedByHash.delete(authority.recipientHash);
        invalidHashes.add(authority.recipientHash);
      } else if (!invalidHashes.has(authority.recipientHash)) {
        confirmedByHash.set(authority.recipientHash, authority.sign);
      }
    }
  }

  const authorized = candidates.flatMap(({ contact, recipientHash }) => {
    const sign = confirmedByHash.get(recipientHash);
    return sign ? [{
      tier: 'sun_sign' as const,
      email: contact.email,
      sign,
      contactId: contact.contactId,
      timezone: 'UTC' as const,
    }] : [];
  });
  return { recipients: authorized, rejected: contacts.length - authorized.length };
}
