import { normalizeEmail } from '../email/input.js';
import { createRateLimitedResendRequest, type ResendRequest } from './resend-request.js';

export interface DailySunContact {
  email: string;
  contactId: string;
}

interface ResendContact {
  id?: unknown;
  email?: unknown;
  unsubscribed?: unknown;
}

interface ResendContactPage {
  data?: unknown;
  has_more?: unknown;
}

export function parseDailySunSegmentId(value: unknown, legacyWeeklySegment: unknown = ''): string | null {
  if (typeof value !== 'string') return null;
  const id = value.trim();
  if (!/^[A-Za-z0-9_-]{6,128}$/.test(id)) return null;
  const weekly = typeof legacyWeeklySegment === 'string' ? legacyWeeklySegment.trim() : '';
  return weekly && weekly === id ? null : id;
}

export function requireDailySunSegmentId(value: unknown, legacyWeeklySegment: unknown = ''): string {
  const id = parseDailySunSegmentId(value, legacyWeeklySegment);
  if (id) return id;
  const daily = typeof value === 'string' ? value.trim() : '';
  const weekly = typeof legacyWeeklySegment === 'string' ? legacyWeeklySegment.trim() : '';
  if (daily && weekly && daily === weekly) {
    throw new Error('RESEND_DAILY_SEGMENT_ID must differ from legacy RESEND_SEGMENT_ID.');
  }
  throw new Error('RESEND_DAILY_SEGMENT_ID must be a valid Resend segment ID.');
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

export async function loadDailySunContacts({
  fetchImpl,
  apiKey,
  segment,
  request = createRateLimitedResendRequest(fetchImpl),
}: {
  fetchImpl: typeof fetch;
  apiKey: string;
  segment: string;
  request?: ResendRequest;
}): Promise<{ contacts: DailySunContact[]; duplicates: string[] }> {
  const byEmail = new Map<string, DailySunContact>();
  const duplicates = new Set<string>();
  const contacts = await listResendSegmentContacts(request, apiKey, segment);
  for (const contact of contacts) {
    if (contact.unsubscribed === true || typeof contact.id !== 'string') continue;
    const email = normalizeEmail(contact.email);
    if (!email || duplicates.has(email)) continue;
    const previous = byEmail.get(email);
    if (previous && previous.contactId !== contact.id) {
      duplicates.add(email);
      byEmail.delete(email);
      continue;
    }
    byEmail.set(email, { email, contactId: contact.id });
  }

  return {
    contacts: [...byEmail.values()].sort((left, right) => left.email.localeCompare(right.email)),
    duplicates: [...duplicates].sort(),
  };
}
