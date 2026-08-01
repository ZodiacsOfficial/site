import { describe, expect, it } from 'vitest';
import {
  datedEditionText,
  editionDateLabel,
  isCurrentUtcEdition,
  millisecondsUntilNextUtcDay,
} from './edition-freshness';

describe('daily edition freshness', () => {
  it('uses the UTC calendar day rather than the visitor timezone', () => {
    expect(isCurrentUtcEdition('2026-08-01', new Date('2026-08-01T23:59:59.000-07:00'))).toBe(false);
    expect(isCurrentUtcEdition('2026-08-02', new Date('2026-08-01T23:59:59.000-07:00'))).toBe(true);
    expect(isCurrentUtcEdition('not-a-date', new Date('2026-08-02T06:59:59.000Z'))).toBe(false);
  });

  it('turns relative Today wording into an explicit archived edition', () => {
    const dated = datedEditionText(
      'Today, read today’s sky. Today is quieter; read today.',
      '2026-08-01',
    );
    expect(dated).toBe(
      'For the August 1, 2026 edition, read the August 1, 2026 edition’s sky. '
      + 'The August 1, 2026 edition is quieter; read on August 1, 2026.',
    );
    expect(dated).not.toMatch(/\btoday\b/iu);
    expect(editionDateLabel('2026-08-01')).toBe('August 1, 2026');
  });

  it('keeps prepositions grammatical when dating lowercase relative copy', () => {
    expect(datedEditionText(
      'What matters today; read for today, as of today, and from today.',
      '2026-08-01',
    )).toBe(
      'What matters on August 1, 2026; read for August 1, 2026, '
      + 'as of August 1, 2026, and from August 1, 2026.',
    );
  });

  it('schedules the next check just after UTC midnight', () => {
    expect(millisecondsUntilNextUtcDay(new Date('2026-08-01T23:59:59.500Z'))).toBe(1_500);
  });
});
