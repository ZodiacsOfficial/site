import type { APIRoute } from 'astro';
import { serializeTransitContacts } from '../../lib/ical';
import type { TransitContact } from '../../lib/engine/transit-scan';

export const prerender = true;

const SAMPLE_CONTACTS: TransitContact[] = [
  {
    transitBody: 'Saturn',
    natalPoint: 'Saturn',
    aspect: 'conjunction',
    exactUtc: '2019-03-21T16:04:00.000Z',
    pass: 1,
    passCount: 1,
  },
  {
    transitBody: 'Saturn',
    natalPoint: 'Saturn',
    aspect: 'conjunction',
    exactUtc: '2019-06-09T10:19:00.000Z',
    pass: 1,
    passCount: 1,
  },
  {
    transitBody: 'Saturn',
    natalPoint: 'Saturn',
    aspect: 'conjunction',
    exactUtc: '2019-12-13T08:51:00.000Z',
    pass: 1,
    passCount: 1,
  },
];

const calendar = serializeTransitContacts(SAMPLE_CONTACTS, {
  generatedAt: '2026-07-11T00:00:00Z',
  calendarName: 'Zodiacs.org sample transit contacts',
});

export const GET: APIRoute = () => new Response(calendar, {
  headers: {
    'Content-Type': 'text/calendar; charset=utf-8',
    'Content-Disposition': 'attachment; filename="zodiacs-transit-contacts-sample.ics"',
    'Cache-Control': 'public, max-age=3600, s-maxage=86400',
  },
});
