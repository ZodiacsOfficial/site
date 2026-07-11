import { describe, expect, it } from 'vitest';
import {
  extractPageMetadata,
  firstSentence,
  glossarySearchEntries,
  htmlFileToPath,
  inferSearchKind,
  isEnglishHtml,
  searchIndexShapeFailures,
  shouldIndexPath,
  sortSearchEntries,
  truncateAtWord,
} from './search-index-lib.mjs';

describe('search-index HTML extraction', () => {
  it('extracts normalized title and description regardless of meta attribute order', () => {
    const html = `<!doctype html>
      <html><head>
        <meta content="Charts &amp; exact times" name="description">
        <title>Birth Chart &amp; Rising Sign | Zodiacs.org</title>
      </head><body></body></html>`;

    expect(extractPageMetadata(html)).toEqual({
      title: 'Birth Chart & Rising Sign',
      description: 'Charts & exact times',
      noindex: false,
    });
    expect(isEnglishHtml('<html lang="en-US"><head></head></html>')).toBe(true);
    expect(isEnglishHtml('<html lang="es"><head></head></html>')).toBe(false);
  });

  it('recognizes noindex among mixed robots directives', () => {
    const html = `<title>Private | Zodiacs.org</title>
      <meta name='description' content='Not for search'>
      <meta content='nofollow, NOINDEX' name='robots'>`;
    expect(extractPageMetadata(html).noindex).toBe(true);
  });

  it('maps built files, exclusions, and kinds deterministically', () => {
    expect(htmlFileToPath('index.html')).toBe('/');
    expect(htmlFileToPath('learn/houses/index.html')).toBe('/learn/houses/');
    expect(htmlFileToPath('404.html')).toBe('/404.html');
    expect(shouldIndexPath('/es/learn/')).toBe(false);
    expect(shouldIndexPath('/registry/aries/')).toBe(false);
    expect(shouldIndexPath('/learn/page/2/')).toBe(false);
    expect(shouldIndexPath('/learn/pages/3/')).toBe(false);
    expect(shouldIndexPath('/learn/page-4.html')).toBe(false);
    expect(inferSearchKind('/aries/')).toBe('sign');
    expect(inferSearchKind('/compatibility/aries-taurus/')).toBe('pairing');
    expect(inferSearchKind('/horoscopes/aries/')).toBe('horoscope');
    expect(inferSearchKind('/learn/aspects/')).toBe('learn');
    expect(inferSearchKind('/birth-chart/')).toBe('tool');
    expect(inferSearchKind('/about/')).toBe('page');
  });
});

describe('glossary search entries', () => {
  it('maps fixture terms to anchored entries using the first definition sentence', () => {
    const entries = glossarySearchEntries([
      {
        slug: 'orb',
        term: 'Orb',
        definition: 'An orb is the distance from exact. A second sentence stays out.',
      },
      {
        slug: 'utc',
        term: 'UTC',
        definition: 'UTC is one time standard worldwide. Location resolves local time.',
      },
    ]);

    expect(entries).toEqual([
      {
        path: '/learn/glossary/#orb',
        title: 'Orb',
        description: 'An orb is the distance from exact.',
        kind: 'term',
      },
      {
        path: '/learn/glossary/#utc',
        title: 'UTC',
        description: 'UTC is one time standard worldwide.',
        kind: 'term',
      },
    ]);
    expect(firstSentence('zodiacs.org uses one standard. Another follows.'))
      .toBe('zodiacs.org uses one standard.');
  });

  it('sorts paths, trims at word boundaries, and reports corrupt shapes', () => {
    const sorted = sortSearchEntries([
      { path: '/z/', title: 'Z', description: 'Z page', kind: 'page' },
      { path: '/a/', title: 'A', description: 'A page', kind: 'page' },
    ]);
    expect(sorted.map((entry) => entry.path)).toEqual(['/a/', '/z/']);

    const trimmed = truncateAtWord('one two three four five', 15);
    expect(trimmed).toBe('one two three…');
    expect(trimmed).not.toContain('fou');

    expect(searchIndexShapeFailures(sorted, { minEntries: 1 })).toEqual([]);
    expect(searchIndexShapeFailures(null, { minEntries: 1 })).toEqual(['root must be an array']);
    expect(searchIndexShapeFailures([
      ...sorted,
      { path: '/a/', title: '', description: 'duplicate', kind: 'mystery' },
      { path: '/../outside', title: 'Outside', description: 'Escapes dist', kind: 'page' },
      { path: '/learn/glossary/#orb#alias', title: 'Alias', description: 'Alias term', kind: 'term' },
      { path: '/learn/glossary/#%6Frb', title: 'Encoded', description: 'Encoded term', kind: 'term' },
      { path: '/about/#team', title: 'Team', description: 'Page fragment', kind: 'page' },
    ], { minEntries: 1 })).toEqual(expect.arrayContaining([
      'entry 2 has invalid title',
      'duplicate path /a/',
      'entry 2 has unknown kind mystery',
      'entries are not sorted at /a/',
      'entry 3 path contains a parent segment',
      'entry 4 path contains multiple fragments',
      'entry 4 term path is not canonical',
      'entry 5 term path is not canonical',
      'entry 6 non-term path contains a fragment',
    ]));
  });
});
