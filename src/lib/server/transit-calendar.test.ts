import { describe, expect, it } from 'vitest';
import handler, {
  buildTransitCalendar,
  handleTransitCalendar,
} from '../../../api/calendar/transits';
import { calendarWebcalUrl } from '../../islands/CalendarSubscribe';

const CRLF = '\r\n';
const PINNED_TOKEN = '2.eyJiIjpbMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDBdLCJhIjpbMCw5MF0sImgiOiJ3IiwidiI6IjEuMC4wIn0';
const WINDOW = {
  from: new Date('2026-03-19T00:00:00Z'),
  to: new Date('2026-03-22T00:00:00Z'),
} as const;

function uidLines(calendar: string): string[] {
  return calendar.split(CRLF).filter((line) => line.startsWith('UID:'));
}

describe('subscribable transit calendar', () => {
  it('serializes a pinned positions-only token with stable UIDs and valid RFC 5545 lines', () => {
    const first = buildTransitCalendar(PINNED_TOKEN, {
      ...WINDOW,
      generatedAt: '2026-03-19T12:00:00Z',
    });
    const refreshed = buildTransitCalendar(PINNED_TOKEN, {
      ...WINDOW,
      generatedAt: '2026-03-20T12:00:00Z',
    });

    expect(first.startsWith(`BEGIN:VCALENDAR${CRLF}`)).toBe(true);
    expect(first.endsWith(`END:VCALENDAR${CRLF}`)).toBe(true);
    expect(first.match(/BEGIN:VEVENT/g)?.length).toBeGreaterThan(0);
    expect(first.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
    expect(uidLines(first)).toEqual(uidLines(refreshed));
    expect(new Set(uidLines(first)).size).toBe(uidLines(first).length);

    const unfolded = first.replace(/\r\n[ \t]/g, '');
    expect(unfolded).toContain('SUMMARY:Transiting Sun conjunction natal Sun (exact)');
    expect(unfolded).toContain('DESCRIPTION:Exact tropical transit contact. Time:');
    for (const line of first.slice(0, -CRLF.length).split(CRLF)) {
      expect(new TextEncoder().encode(line).byteLength).toBeLessThanOrEqual(75);
    }
    for (const forbidden of [
      'birth date', 'birth time', 'birth place', 'coordinates', 'latitude', 'longitude',
      '1990-02-01', 'Bangkok', '13.7563', '100.5018',
    ]) {
      expect(first.toLowerCase()).not.toContain(forbidden.toLowerCase());
    }
  });

  it('builds webcal URLs with only the existing positions token', () => {
    const value = calendarWebcalUrl('https://zodiacs.org', PINNED_TOKEN);
    const parsed = new URL(value);
    expect(parsed.protocol).toBe('webcal:');
    expect(parsed.host).toBe('zodiacs.org');
    expect(parsed.pathname).toBe('/api/calendar/transits');
    expect([...parsed.searchParams.keys()]).toEqual(['token']);
    expect(parsed.searchParams.get('token')).toBe(PINNED_TOKEN);
    expect(value).not.toMatch(/date|time|place|lat|lon|coord|name/i);
  });

  it('rejects invalid tokens and non-GET requests without scanning', async () => {
    const response = () => {
      const headers = new Map<string, string>();
      return {
        statusCode: 0,
        body: '',
        headers,
        setHeader(name: string, value: string) { headers.set(name.toLowerCase(), value); },
        end(body: string) { this.body = body; },
      };
    };

    const invalid = response();
    await handler({ method: 'GET', query: { token: '2.invalid' } }, invalid);
    expect(invalid.statusCode).toBe(400);
    expect(invalid.headers.get('cache-control')).toBe('no-store');

    const wrongMethod = response();
    await handler({ method: 'POST', query: { token: PINNED_TOKEN } }, wrongMethod);
    expect(wrongMethod.statusCode).toBe(405);
    expect(wrongMethod.headers.get('allow')).toBe('GET');
  });

  it('serves the feed inline with a six-hour shared cache policy', async () => {
    const calendar = buildTransitCalendar(PINNED_TOKEN, {
      ...WINDOW,
      generatedAt: '2026-03-19T12:00:00Z',
    });
    const headers = new Map<string, string>();
    const response = {
      statusCode: 0,
      body: '',
      setHeader(name: string, value: string) { headers.set(name.toLowerCase(), value); },
      end(body: string) { this.body = body; },
    };

    await handleTransitCalendar(
      { method: 'GET', query: { token: PINNED_TOKEN } },
      response,
      (token) => {
        expect(token).toBe(PINNED_TOKEN);
        return calendar;
      },
    );

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe(calendar);
    expect(headers.get('content-type')).toBe('text/calendar; charset=utf-8');
    expect(headers.get('content-disposition')).toBe('inline; filename="zodiacs-transits.ics"');
    expect(headers.get('cache-control')).toBe(
      'public, max-age=0, s-maxage=21600, stale-while-revalidate=43200',
    );
  });
});
