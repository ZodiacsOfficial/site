import { describe, expect, it } from 'vitest';
import {
  RENDERED_TRANSIT_PATHS,
  assertExactPublicationDate,
  assertRenderedCurrentTransit,
  assertRenderedToday,
} from './live-transit-verification-lib.mjs';

describe('rendered transit verification', () => {
  it('covers every locale that renders the monthly current-sky receipt', () => {
    expect(RENDERED_TRANSIT_PATHS).toEqual([
      '/transits/',
      '/es/transits/',
      '/fr/transits/',
      '/it/transits/',
      '/pt/transits/',
    ]);
  });

  it('accepts one exact current marker regardless of attribute order', () => {
    expect(() => assertRenderedCurrentTransit(
      '<section data-transit-status="current" class="sky" data-transit-month="2026-08"></section>',
      '2026-08',
      '/transits/',
    )).not.toThrow();
  });

  it('rejects future, stale, missing, and duplicate rendered markers', () => {
    expect(() => assertRenderedCurrentTransit(
      '<section data-transit-month="2030-12" data-transit-status="current"></section>',
      '2026-08',
    )).toThrow('rendered transit month is 2030-12, expected 2026-08');
    expect(() => assertRenderedCurrentTransit(
      '<section data-transit-month="2026-07" data-transit-status="stale"></section>',
      '2026-08',
    )).toThrow('rendered transit month is 2026-07, expected 2026-08');
    expect(() => assertRenderedCurrentTransit('<main></main>', '2026-08'))
      .toThrow('expected one rendered transit month, found 0');
    expect(() => assertRenderedCurrentTransit(
      '<i data-transit-month="2026-08"></i><i data-transit-month="2026-08"></i>',
      '2026-08',
    )).toThrow('expected one rendered transit month, found 2');
  });

  it('requires the exact Today edition and rejects crawler-visible false outages', () => {
    expect(() => assertRenderedToday(
      '<main data-daily-date="2026-08-01">Ready</main>',
      '2026-08-01',
    )).not.toThrow();
    expect(() => assertRenderedToday(
      '<main data-daily-date="2026-07-31">Ready</main>',
      '2026-08-01',
    )).toThrow('rendered daily edition is 2026-07-31, expected 2026-08-01');
    expect(() => assertRenderedToday(
      '<main data-daily-date="2026-08-01">Saved-chart comparison is temporarily unavailable</main>',
      '2026-08-01',
    )).toThrow('rendered HTML advertises a saved-chart outage');
    expect(() => assertRenderedToday('<main></main>', '2026-02-30'))
      .toThrow('Invalid expected edition day: 2026-02-30');
  });

  it('requires the committed edition to equal the explicit UTC workflow target', () => {
    expect(() => assertExactPublicationDate('2026-08-01', '2026-08-01')).not.toThrow();
    expect(() => assertExactPublicationDate('2026-07-31', '2026-08-01'))
      .toThrow('committed publication date is 2026-07-31, expected UTC target 2026-08-01');
    expect(() => assertExactPublicationDate('2026-08-01', '2026-02-30'))
      .toThrow('Invalid target UTC day: 2026-02-30');
  });
});
