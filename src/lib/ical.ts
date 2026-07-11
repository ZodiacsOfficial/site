/** RFC 5545 serialization for exact transit contacts. Engine-free. */
import type { TransitContact } from './engine/transit-scan';

const CRLF = '\r\n';
const MAX_CONTENT_LINE_OCTETS = 75;
const encoder = new TextEncoder();

export interface TransitCalendarOptions {
  /** Receipt time used for VEVENT DTSTAMP values. */
  generatedAt: Date | string;
  calendarName?: string;
}

/** Escape an RFC 5545 TEXT value. */
export function escapeIcalText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

/** Fold one logical content line without splitting a UTF-8 code point. */
export function foldIcalLine(line: string): string {
  if (/\r|\n/.test(line)) throw new Error('iCalendar logical lines cannot contain raw newlines.');
  if (encoder.encode(line).byteLength <= MAX_CONTENT_LINE_OCTETS) return line;

  const physical: string[] = [];
  let current = '';
  for (const character of line) {
    if (encoder.encode(current + character).byteLength > MAX_CONTENT_LINE_OCTETS) {
      if (!current) throw new Error('Unable to fold iCalendar content line.');
      physical.push(current);
      current = ` ${character}`;
    } else {
      current += character;
    }
  }
  physical.push(current);
  return physical.join(CRLF);
}

export function formatIcalUtc(value: Date | string): string {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new RangeError(`Invalid UTC date-time: ${String(value)}`);
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function uidTimestamp(value: string): string {
  const date = new Date(value);
  const seconds = formatIcalUtc(date);
  const milliseconds = date.getUTCMilliseconds();
  return milliseconds === 0
    ? seconds
    : `${seconds.slice(0, -1)}${String(milliseconds).padStart(3, '0')}Z`;
}

export function transitContactUid(contact: TransitContact): string {
  return [
    'transit',
    uidTimestamp(contact.exactUtc),
    slug(contact.transitBody),
    contact.aspect,
    slug(contact.natalPoint),
  ].join('-') + '@zodiacs.org';
}

function exactDescription(contact: TransitContact): string {
  const iso = new Date(contact.exactUtc).toISOString();
  const utcMinute = `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
  const description = `Exact tropical transit contact. Time: ${utcMinute}.`;
  // Multi-hit groups get their window-scoped pass number. The cause is
  // deliberately not asserted: dual-target aspects can produce a second
  // pass for a fast body with no retrograde loop involved.
  return contact.passCount > 1
    ? `${description} Pass ${contact.pass} of ${contact.passCount}.`
    : description;
}

function eventLines(contact: TransitContact, dtstamp: string): string[] {
  // Calling formatIcalUtc first keeps invalid input from reaching description.
  const dtstart = formatIcalUtc(contact.exactUtc);
  return [
    'BEGIN:VEVENT',
    `UID:${transitContactUid(contact)}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    'DURATION:PT1M',
    'TRANSP:TRANSPARENT',
    `SUMMARY:${escapeIcalText(`Transiting ${contact.transitBody} ${contact.aspect} natal ${contact.natalPoint} (exact)`)}`,
    `DESCRIPTION:${escapeIcalText(exactDescription(contact))}`,
    'END:VEVENT',
  ];
}

/**
 * Serialize one zero-PII calendar. Input order does not affect event order or
 * UIDs; separate retrograde passes remain separate because their instants do.
 */
export function serializeTransitContacts(
  contacts: readonly TransitContact[],
  options: TransitCalendarOptions,
): string {
  if (contacts.length === 0) throw new RangeError('A transit calendar requires at least one contact.');
  const dtstamp = formatIcalUtc(options.generatedAt);
  const prepared = contacts.map((contact) => ({
    contact,
    dtstart: formatIcalUtc(contact.exactUtc),
  })).sort((a, b) =>
    a.dtstart.localeCompare(b.dtstart)
    || a.contact.transitBody.localeCompare(b.contact.transitBody)
    || a.contact.natalPoint.localeCompare(b.contact.natalPoint)
    || a.contact.aspect.localeCompare(b.contact.aspect));

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Zodiacs.org//Transit Contacts 1.0//EN',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${escapeIcalText(options.calendarName ?? 'Zodiacs.org transit contacts')}`,
    ...prepared.flatMap(({ contact }) => eventLines(contact, dtstamp)),
    'END:VCALENDAR',
  ];

  return lines.map(foldIcalLine).join(CRLF) + CRLF;
}
