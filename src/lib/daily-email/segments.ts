import { normalizeEmail } from '../email/input';
import { SIGN_SLUGS } from '../signs';
import { createRateLimitedResendRequest, type ResendRequest } from './resend-request';
import type { SunSignRecipient } from './types';

export type SignSegmentMap = Record<string, string>;

interface ResendContact {
  id?: unknown;
  email?: unknown;
  unsubscribed?: unknown;
}

interface ResendContactPage {
  data?: unknown;
  has_more?: unknown;
}

function segmentId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const id = value.trim();
  return /^[A-Za-z0-9_-]{6,128}$/.test(id) ? id : null;
}

export function parseSignSegmentMap(raw: string): SignSegmentMap {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error('RESEND_DAILY_SIGN_SEGMENTS_JSON must be valid JSON.');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('RESEND_DAILY_SIGN_SEGMENTS_JSON must be an object.');
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const expected = [...SIGN_SLUGS].sort();
  if (JSON.stringify(keys) !== JSON.stringify(expected)) {
    throw new Error('RESEND_DAILY_SIGN_SEGMENTS_JSON must contain exactly the twelve canonical signs.');
  }
  const result: SignSegmentMap = {};
  for (const sign of SIGN_SLUGS) {
    const id = segmentId(record[sign]);
    if (!id) throw new Error(`Invalid Resend segment ID for ${sign}.`);
    result[sign] = id;
  }
  if (new Set(Object.values(result)).size !== SIGN_SLUGS.length) {
    throw new Error('Each daily sign must use its own Resend segment.');
  }
  return result;
}

export async function listResendSegmentContacts(
  request: ResendRequest,
  apiKey: string,
  segment: string,
): Promise<ResendContact[]> {
  const contacts: ResendContact[] = [];
  let after: string | null = null;
  do {
    const url = new URL(`https://api.resend.com/segments/${encodeURIComponent(segment)}/contacts`);
    url.searchParams.set('limit', '100');
    if (after) url.searchParams.set('after', after);
    const response = await request(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok) {
      throw new Error(`Could not list Resend segment ${segment} (${response.status}).`);
    }
    const page = await response.json() as ResendContactPage;
    if (!Array.isArray(page.data)) throw new Error('Resend segment response was not a contact list.');
    const rows = page.data as ResendContact[];
    contacts.push(...rows);
    if (page.has_more !== true) break;
    const cursor = rows.at(-1)?.id;
    if (typeof cursor !== 'string' || !cursor) {
      throw new Error('Resend segment pagination omitted its cursor.');
    }
    after = cursor;
  } while (after);
  return contacts;
}

export async function loadSunSignRecipients({
  fetchImpl,
  apiKey,
  segments,
  request = createRateLimitedResendRequest(fetchImpl),
}: {
  fetchImpl: typeof fetch;
  apiKey: string;
  segments: SignSegmentMap;
  request?: ResendRequest;
}): Promise<{ recipients: SunSignRecipient[]; ambiguous: string[] }> {
  const byEmail = new Map<string, SunSignRecipient>();
  const ambiguous = new Set<string>();

  for (const sign of SIGN_SLUGS) {
    const contacts = await listResendSegmentContacts(request, apiKey, segments[sign]);
    for (const contact of contacts) {
      if (contact.unsubscribed === true || typeof contact.id !== 'string') continue;
      const email = normalizeEmail(contact.email);
      if (!email) continue;
      const previous = byEmail.get(email);
      if (previous && previous.sign !== sign) {
        ambiguous.add(email);
        byEmail.delete(email);
        continue;
      }
      if (!ambiguous.has(email)) {
        byEmail.set(email, {
          tier: 'sun_sign',
          email,
          sign,
          contactId: contact.id,
          timezone: 'UTC',
        });
      }
    }
  }

  return {
    recipients: [...byEmail.values()].sort((left, right) => left.email.localeCompare(right.email)),
    ambiguous: [...ambiguous].sort(),
  };
}
