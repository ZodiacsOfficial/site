import { describe, expect, it } from 'vitest';
import { selectTransitDisplayMonth } from './transit-month';

describe('selectTransitDisplayMonth', () => {
  const now = new Date('2026-08-31T23:59:59.999Z');

  it('selects the exact UTC month even when later data is committed', () => {
    expect(selectTransitDisplayMonth(
      ['2030-12', '2026-07', '2026-08', '2027-01'],
      now,
    )).toEqual({ month: '2026-08', status: 'current' });
  });

  it('selects the newest past month and marks it stale', () => {
    expect(selectTransitDisplayMonth(
      ['2026-06', '2030-12', '2026-07'],
      now,
    )).toEqual({ month: '2026-07', status: 'stale' });
  });

  it('renders no monthly receipt for future-only or empty data', () => {
    expect(selectTransitDisplayMonth(['2026-09', '2030-12'], now))
      .toEqual({ month: null, status: 'none' });
    expect(selectTransitDisplayMonth([], now))
      .toEqual({ month: null, status: 'none' });
  });

  it('uses UTC rather than the date string\'s original offset', () => {
    expect(selectTransitDisplayMonth(
      ['2026-08', '2026-09'],
      new Date('2026-09-01T06:30:00+07:00'),
    )).toEqual({ month: '2026-08', status: 'current' });
  });

  it('fails closed for malformed months and invalid dates', () => {
    expect(() => selectTransitDisplayMonth(['2026-13'], now))
      .toThrow('Invalid transit month: 2026-13');
    expect(() => selectTransitDisplayMonth(['2026-08'], new Date('invalid')))
      .toThrow('selectTransitDisplayMonth requires a valid date');
  });
});
