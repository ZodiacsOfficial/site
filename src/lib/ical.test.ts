import { describe, expect, it } from 'vitest';
import {
  escapeIcalText,
  foldIcalLine,
  serializeTransitContacts,
  transitContactUid,
} from './ical';
import type { TransitContact } from './engine/transit-scan';
import { GET as getSampleCalendar, prerender } from '../pages/transits/sample.ics';

const CRLF = '\r\n';

const SATURN_PASSES: TransitContact[] = [
  {
    transitBody: 'Saturn',
    natalPoint: 'Saturn',
    aspect: 'conjunction',
    exactUtc: '2019-03-21T16:04:00.000Z',
    pass: 1,
    passCount: 3,
  },
  {
    transitBody: 'Saturn',
    natalPoint: 'Saturn',
    aspect: 'conjunction',
    exactUtc: '2019-06-09T10:19:00.000Z',
    pass: 2,
    passCount: 3,
  },
  {
    transitBody: 'Saturn',
    natalPoint: 'Saturn',
    aspect: 'conjunction',
    exactUtc: '2019-12-13T08:51:00.000Z',
    pass: 3,
    passCount: 3,
  },
];

const OPTIONS = { generatedAt: '2026-07-11T00:00:00Z' } as const;

describe('serializeTransitContacts', () => {
  it('pins a complete RFC 5545 event with CRLF and folded content', () => {
    const expected = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Zodiacs.org//Transit Contacts 1.0//EN',
      'CALSCALE:GREGORIAN',
      'X-WR-CALNAME:Zodiacs.org transit contacts',
      'BEGIN:VEVENT',
      'UID:transit-20190321T160400Z-saturn-conjunction-saturn@zodiacs.org',
      'DTSTAMP:20260711T000000Z',
      'DTSTART:20190321T160400Z',
      'DURATION:PT1M',
      'TRANSP:TRANSPARENT',
      'SUMMARY:Transiting Saturn conjunction natal Saturn (exact)',
      'DESCRIPTION:Exact tropical transit contact. Time: 2019-03-21 16:04 UTC. Pas',
      ' s 1 of 3.',
      'END:VEVENT',
      'END:VCALENDAR',
      '',
    ].join(CRLF);

    expect(serializeTransitContacts([SATURN_PASSES[0]], OPTIONS)).toBe(expected);
  });

  it('sorts input, preserves every pass, and gives each pass a stable UID', () => {
    const forward = serializeTransitContacts(SATURN_PASSES, OPTIONS);
    const reversed = serializeTransitContacts([...SATURN_PASSES].reverse(), OPTIONS);
    expect(reversed).toBe(forward);
    expect(forward.match(/BEGIN:VEVENT/g)).toHaveLength(3);

    const uids = SATURN_PASSES.map(transitContactUid);
    expect(new Set(uids).size).toBe(3);
    expect(uids[0]).toBe('transit-20190321T160400Z-saturn-conjunction-saturn@zodiacs.org');

    const sameContactInDifferentWindow = { ...SATURN_PASSES[0], pass: 2, passCount: 2 };
    expect(transitContactUid(sameContactInDifferentWindow)).toBe(uids[0]);

    const closePass = { ...SATURN_PASSES[0], exactUtc: '2019-03-21T16:04:00.250Z' };
    expect(transitContactUid(closePass)).toContain('20190321T160400250Z');
    expect(transitContactUid(closePass)).not.toBe(transitContactUid(SATURN_PASSES[0]));
  });

  it('omits pass wording for a single-hit contact', () => {
    const single = { ...SATURN_PASSES[0], pass: 1, passCount: 1 };
    const calendar = serializeTransitContacts([single], OPTIONS);
    expect(calendar).toContain(
      `DESCRIPTION:Exact tropical transit contact. Time: 2019-03-21 16:04 UTC.${CRLF}`,
    );
    expect(calendar.replace(/\r\n[ \t]/g, '')).not.toContain('Pass ');
  });

  it('escapes TEXT and folds Unicode by UTF-8 octets', () => {
    expect(escapeIcalText('A\\B,C;D\r\nE')).toBe('A\\\\B\\,C\\;D\\nE');

    const logical = `DESCRIPTION:${'é'.repeat(80)}, one; two\\three`;
    const folded = foldIcalLine(logical);
    const physical = folded.split(CRLF);
    expect(physical.length).toBeGreaterThan(1);
    expect(physical.slice(1).every((line) => line.startsWith(' '))).toBe(true);
    for (const line of physical) {
      expect(new TextEncoder().encode(line).byteLength).toBeLessThanOrEqual(75);
    }
    expect(folded.replace(/\r\n[ \t]/g, '')).toBe(logical);
  });

  it('contains only CRLF, never includes chart identity data, and ends with CRLF', () => {
    const calendar = serializeTransitContacts(SATURN_PASSES, OPTIONS);
    expect(calendar.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
    expect(calendar.endsWith(CRLF)).toBe(true);
    for (const forbidden of [
      '1990-02-01', 'birth', 'Bangkok', 'latitude', 'longitude', '13.7563', '100.5018',
    ]) {
      expect(calendar).not.toContain(forbidden);
    }
  });

  it('rejects an empty component list and invalid timestamps', () => {
    expect(() => serializeTransitContacts([], OPTIONS)).toThrow('at least one contact');
    expect(() => serializeTransitContacts(SATURN_PASSES, { generatedAt: 'invalid' })).toThrow('Invalid UTC');
    expect(() => serializeTransitContacts([
      { ...SATURN_PASSES[0], exactUtc: 'invalid' },
    ], OPTIONS)).toThrow('Invalid UTC');
  });
});

describe('/transits/sample.ics', () => {
  it('is prerendered with calendar headers and a byte-valid three-contact sample', async () => {
    const response = await getSampleCalendar({} as Parameters<typeof getSampleCalendar>[0]);
    const calendar = await response.text();

    expect(prerender).toBe(true);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/calendar; charset=utf-8');
    expect(response.headers.get('content-disposition')).toBe(
      'attachment; filename="zodiacs-transit-contacts-sample.ics"',
    );
    expect(calendar.match(/BEGIN:VEVENT/g)).toHaveLength(3);
    expect(calendar.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
    const unfolded = calendar.replace(/\r\n[ \t]/g, '');
    expect(unfolded).toContain('Pass 1 of 3.');
    expect(unfolded).toContain('Pass 2 of 3.');
    expect(unfolded).toContain('Pass 3 of 3.');
    expect(unfolded).not.toContain('retrograde loop');
    for (const line of calendar.slice(0, -CRLF.length).split(CRLF)) {
      expect(new TextEncoder().encode(line).byteLength).toBeLessThanOrEqual(75);
    }
  });
});

describe('sky event calendars', () => {
  const generatedAt = '2026-09-01T00:00:00Z';

  it('serializes instants and windows with stable ids, no personal data, and sorted output', async () => {
    const { serializeSkyEvents } = await import('./ical');
    const calendar = serializeSkyEvents([
      {
        id: 'mercury-retrograde-2027-02-09',
        start: '2027-02-09T13:00:00Z',
        end: '2027-03-03T04:00:00Z',
        summary: 'Mercury retrograde',
        description: 'Station to station.',
        url: 'https://zodiacs.org/mercury-retrograde/2027/#mercury-retrograde-2027-02-09',
      },
      {
        id: 'full-moon-2027-01-22',
        start: '2027-01-22T12:17:00Z',
        summary: 'Full moon in Leo',
        description: 'Full moon at 2°32′ Leo; exact at 12:17 UTC.',
      },
    ], { generatedAt, calendarName: 'Zodiacs.org test' });

    const lines = calendar.split('\r\n');
    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    expect(lines).toContain('PRODID:-//Zodiacs.org//Sky Events 1.0//EN');
    expect(lines).toContain('X-WR-CALNAME:Zodiacs.org test');
    expect(calendar.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    // Earlier instant first, regardless of input order.
    expect(calendar.indexOf('UID:sky-full-moon-2027-01-22@zodiacs.org'))
      .toBeLessThan(calendar.indexOf('UID:sky-mercury-retrograde-2027-02-09@zodiacs.org'));
    expect(lines).toContain('DTSTART:20270122T121700Z');
    expect(lines).toContain('DURATION:PT1M');
    expect(lines).toContain('DTSTART:20270209T130000Z');
    expect(lines).toContain('DTEND:20270303T040000Z');
    expect(lines).toContain('DESCRIPTION:Full moon at 2°32′ Leo\\; exact at 12:17 UTC.');
    // The URL runs past 75 octets, so it arrives folded; unfold before asserting.
    expect(calendar.replace(/\r\n /g, ''))
      .toContain('\r\nURL:https://zodiacs.org/mercury-retrograde/2027/#mercury-retrograde-2027-02-09\r\n');
    expect(calendar.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(lines.every((line) => new TextEncoder().encode(line).byteLength <= 75)).toBe(true);
  });

  it('refuses an empty calendar', async () => {
    const { serializeSkyEvents } = await import('./ical');
    expect(() => serializeSkyEvents([], { generatedAt })).toThrow(RangeError);
  });
});
