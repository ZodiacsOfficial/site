import { describe, expect, it } from 'vitest';
import dailyData from '../../data/daily.json';
import publicationData from '../../data/daily-publication.json';
import programData from '../../data/horoscope-program.json';
import type { Daily } from '../daily';
import type { DailyPublication } from '../daily-publication';
import { upcomingPublishedEvents } from '../events/publication';
import type { HoroscopeProgram } from '../horoscope-program';
import type { SavedChart } from '../profile/schema';
import { SIGN_SLUGS } from '../signs';
import { natalPointsForChart, selectTodayContacts } from '../today';
import { TRANSIT_ORB, transitLine } from '../transits';
import { renderDailyEmail, validateDailyEmailSources } from './content';

const daily = dailyData as Daily;
const publication = publicationData as DailyPublication;
const program = programData as HoroscopeProgram;
const unsubscribeUrl = 'https://zodiacs.org/api/email/unsubscribe?token=test';

function chartWithBodies(bodies: SavedChart['summary']['bodies']): SavedChart {
  return {
    id: '10000000-0000-4000-8000-000000000001',
    name: 'Test chart',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    birth: { date: '1990-01-01', time: '12:00', timeKnown: true, place: null },
    summary: {
      engineVersion: 'fixture', utcISO: '1990-01-01T12:00:00.000Z', houseSystem: 'whole',
      bodies, angles: null, flags: [],
    },
  };
}

function quietLongitude(): number {
  const angles = [0, 60, 90, 120, 180];
  const candidates = Array.from({ length: 3_600 }, (_, index) => index / 10).map((lon) => ({
    lon,
    nearest: Math.min(...daily.bodies.flatMap((body) => {
      const raw = Math.abs(body.lon - lon) % 360;
      const separation = raw > 180 ? 360 - raw : raw;
      return angles.map((angle) => Math.abs(separation - angle));
    })),
  }));
  const best = candidates.sort((left, right) => right.nearest - left.nearest)[0];
  if (!best || best.nearest <= TRANSIT_ORB) throw new Error('No quiet fixture.');
  return best.lon;
}

describe('daily email content', () => {
  it('accepts only one exact English publication package', () => {
    expect(() => validateDailyEmailSources({ daily, publication, program })).not.toThrow();
    expect(() => validateDailyEmailSources({
      daily: { ...daily, date: '2026-07-19' }, publication, program,
    })).toThrow(/exact committed edition/u);
  });

  it('renders the approved publication headline and collective sky lines for every sign', () => {
    for (const sign of SIGN_SLUGS) {
      const message = renderDailyEmail({
        recipient: {
          tier: 'sun_sign', email: `${sign}@example.com`, sign,
          contactId: `contact_${sign}`, timezone: 'UTC',
        },
        daily,
        publication,
        program,
        baseUrl: 'https://zodiacs.org',
        unsubscribeUrl,
      });
      const published = publication.signs.find((entry) => entry.sign === sign)!;
      for (const line of [published.headline, ...published.lines
        .filter((entry) => entry.scope === 'collective')
        .map((entry) => entry.text.replace(/[.]$/u, ''))]) {
        expect(message.text).toContain(line);
        expect(message.html).toContain(line
          .replaceAll('&', '&amp;')
          .replaceAll('’', '’')
          .replaceAll("'", '&#39;'));
      }
      expect(message.html).toContain(`/assets/zodiac-icons/128/${sign}.webp`);
      expect(message.html).toContain('bgcolor="#060709"');
      expect(message.text).toContain(unsubscribeUrl);
      expect(message.html).toContain(unsubscribeUrl.replaceAll('&', '&amp;'));
    }
    const leo = renderDailyEmail({
      recipient: {
        tier: 'sun_sign', email: 'leo@example.com', sign: 'leo',
        contactId: 'contact_leo', timezone: 'UTC',
      },
      daily, publication, program, baseUrl: 'https://zodiacs.org', unsubscribeUrl,
    });
    expect(leo.subject).toBe('Leo today — messages come to the front');
    expect(leo.text).toContain('07:47 UTC');
  });

  it('uses the exact Today contact selector and transit prose for chart mail', () => {
    const chart = chartWithBodies(daily.bodies.slice(0, 3).map((body) => ({
      body: body.body, lon: body.lon, retrograde: false,
    })));
    const contact = selectTodayContacts(
      natalPointsForChart(chart), daily.bodies, TRANSIT_ORB, 3,
    )[0];
    expect(contact).toBeTruthy();
    const expected = transitLine(contact.transiting, contact.type, contact.natal);
    const message = renderDailyEmail({
      recipient: {
        tier: 'chart', email: 'chart@example.com', userId: 'user', chartId: chart.id,
        chart, timezone: 'UTC',
      },
      daily,
      publication,
      program,
      nearbyEvent: upcomingPublishedEvents(publication.date, { days: 5, limit: 1 })[0],
      baseUrl: 'https://zodiacs.org',
      unsubscribeUrl,
    });
    expect(message.text).toContain(expected);
    expect(message.html).toContain(expected.replaceAll('—', '—'));
    expect((message.text.match(/Ahead:/gu) ?? [])).toHaveLength(1);
    expect((message.html.match(/Ahead:/gu) ?? [])).toHaveLength(1);
    expect(message.text).toContain('Why this appeared:');
    expect(message.text).toContain('method →');
  });

  it('uses the same quiet-state conclusion when no contact is within 3 degrees', () => {
    const chart = chartWithBodies([{ body: 'Sun', lon: quietLongitude(), retrograde: false }]);
    expect(selectTodayContacts(natalPointsForChart(chart), daily.bodies, TRANSIT_ORB, 3)).toEqual([]);
    const message = renderDailyEmail({
      recipient: {
        tier: 'chart', email: 'quiet@example.com', userId: 'user', chartId: chart.id,
        chart, timezone: 'UTC',
      },
      daily,
      publication,
      program,
      baseUrl: 'https://zodiacs.org',
      unsubscribeUrl,
    });
    const quiet = 'Today looks quieter against your chart. There is less pressure to act on anything immediately.';
    expect(message.text).toContain(quiet);
    expect(message.html).toContain(quiet);
  });
});
