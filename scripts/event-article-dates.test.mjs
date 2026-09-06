import { describe, expect, it } from 'vitest';
import { eventArticleDateFailures } from './event-article-dates.mjs';

const receipt = { lastModified: '2026-09-06' };
const article = { dateModified: '2026-09-06T00:00:00.000Z' };
describe('event Article date receipt', () => {
  it('requires the documented revision while omitting an unknown first publication', () => {
    expect(eventArticleDateFailures(article, receipt)).toEqual([]);
    expect(eventArticleDateFailures({}, receipt)).not.toEqual([]);
    expect(eventArticleDateFailures({ dateModified: '2026-07-20T00:00:00.000Z' }, receipt)).not.toEqual([]);
  });
  it('rejects invented or null publication dates and missing receipts', () => {
    for (const datePublished of ['2026-07-20', null, '']) {
      expect(eventArticleDateFailures({ ...article, datePublished }, receipt)).not.toEqual([]);
    }
    expect(eventArticleDateFailures(article, undefined)).not.toEqual([]);
  });
  it('requires a documented publication date exactly when one exists', () => {
    const known = { ...receipt, publishedAt: '2026-08-31T09:00:00.000Z' };
    expect(eventArticleDateFailures(article, known)).not.toEqual([]);
    expect(eventArticleDateFailures({ ...article, datePublished: known.publishedAt }, known)).toEqual([]);
  });
  it('rejects normalized calendar dates in revision receipts', () => {
    expect(eventArticleDateFailures({ dateModified: '2026-02-30T00:00:00.000Z' }, { lastModified: '2026-02-30' })).not.toEqual([]);
  });
});
