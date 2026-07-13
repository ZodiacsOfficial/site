import { describe, expect, it } from 'vitest';
import { serializeTransitContacts } from '../../lib/ical';
import type { TransitContact } from '../../lib/engine/transit-scan';
import { groupTransitSearchResults } from './transit-search-model';

const contact = (
  exactUtc: string,
  transitBody: TransitContact['transitBody'] = 'Saturn',
  natalPoint: TransitContact['natalPoint'] = 'ASC',
  aspect: TransitContact['aspect'] = 'opposition',
  pass = 1,
  passCount = 1,
): TransitContact => ({ transitBody, natalPoint, aspect, exactUtc, pass, passCount });

describe('transit search results', () => {
  it('caps chronologically before grouping by UTC month and contact', () => {
    const input = [
      contact('2023-01-11T09:00:00.000Z', 'Saturn', 'ASC', 'opposition', 3, 3),
      contact('2022-04-19T12:00:00.000Z', 'Saturn', 'ASC', 'opposition', 1, 3),
      contact('2022-04-20T12:00:00.000Z', 'Jupiter', 'Sun', 'trine'),
      contact('2022-07-23T12:00:00.000Z', 'Saturn', 'ASC', 'opposition', 2, 3),
    ];

    const grouped = groupTransitSearchResults(input, 3);
    expect(grouped).toMatchObject({ total: 4, shown: 3, capped: true });
    expect(grouped.months.map((month) => month.key)).toEqual(['2022-04', '2022-07']);
    expect(grouped.months[0].contacts.map((group) => group.key)).toEqual([
      'Saturn|opposition|ASC',
      'Jupiter|trine|Sun',
    ]);
    expect(grouped.months[1].contacts[0].contacts[0].pass).toBe(2);
  });

  it('serializes the full scan result as one private event per pass', () => {
    const contacts = [
      contact('2022-04-19T12:00:00.000Z', 'Saturn', 'ASC', 'opposition', 1, 3),
      contact('2022-07-23T12:00:00.000Z', 'Saturn', 'ASC', 'opposition', 2, 3),
      contact('2023-01-11T09:00:00.000Z', 'Saturn', 'ASC', 'opposition', 3, 3),
    ];
    const calendar = serializeTransitContacts(contacts, {
      generatedAt: '2026-07-13T00:00:00.000Z',
      calendarName: 'Zodiacs.org transit search',
    });

    expect(calendar.match(/BEGIN:VEVENT/g)).toHaveLength(contacts.length);
    expect(calendar).toContain('Transiting Saturn opposition natal ASC');
    for (const privateValue of ['Frida', '1907-07-06', 'Coyoacán', '19.3467', '-99.1617']) {
      expect(calendar).not.toContain(privateValue);
    }
  });
});
