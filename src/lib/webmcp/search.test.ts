import { describe, expect, it, vi } from 'vitest';
import type { SearchEntry } from '../search/score';
import {
  executeWebMcpSearch,
  rankConsumerSearchEntries,
  SEARCH_INPUT_SCHEMA,
  SEARCH_RESULT_LIMIT,
} from './search';

const entries: SearchEntry[] = [
  {
    path: '/',
    title: 'Zodiacs.org — Free Birth Charts, Sign Guides & Astrology Tools',
    description: 'Free birth charts and astrology references.',
    kind: 'page',
  },
  {
    path: '/birth-chart/',
    title: 'Free Birth Chart Calculator — Sun, Moon & Rising',
    description: 'Calculate a free birth chart in your browser.',
    kind: 'tool',
  },
  {
    path: '/learn/aspects/',
    title: 'Aspects in Astrology — Conjunction, Square, Trine & More',
    description: 'A guide to the major aspects.',
    kind: 'learn',
  },
  {
    path: '/learn/aspects/trine/',
    title: 'The trine: 120 degrees of effortless support',
    description: 'A trine joins placements 120 degrees apart.',
    kind: 'learn',
  },
  {
    path: '/aries/',
    title: 'Aries: dates, personality, compatibility',
    description: 'Aries explained in plain language.',
    kind: 'sign',
  },
  {
    path: '/eclipses/',
    title: 'Eclipse Dates 2026–2028 — Solar & Lunar, Exact',
    description: 'Exact eclipse dates and times.',
    kind: 'tool',
  },
  {
    path: '/learn/glossary/#eclipse',
    title: 'Eclipse',
    description: 'An eclipse occurs when one body obscures another.',
    kind: 'term',
  },
  {
    path: '/about/',
    title: 'About Zodiacs.org',
    description: 'About the consumer astrology site.',
    kind: 'page',
  },
  {
    path: '/astrofolio/',
    title: 'Astrofolio',
    description: 'Choose your sign, see its gold sculpture and official token, and check its Registry record.',
    kind: 'astrofolio',
    keywords: ['astrofolio', 'collection', 'gold sculpture', 'official token'],
  },
  {
    path: '/registry/',
    title: 'Zodiacs Registry',
    description: 'Official token identities and verified addresses.',
    kind: 'registry',
    keywords: ['registry', 'verify', 'record'],
  },
  {
    path: '/thesis/',
    title: 'The Registry Thesis',
    description: 'The essay of record.',
    kind: 'registry',
    keywords: ['registry', 'thesis', 'record'],
  },
  {
    path: '/registry/aries/',
    title: 'Aries — official Zodiac record',
    description: 'Official Aries identity, addresses, artwork, provenance, and verification.',
    kind: 'registry',
    keywords: ['registry', 'astrofolio', 'record', 'aries'],
  },
];

const okFetch = (value: unknown = entries) => vi.fn(async () => ({
  ok: true,
  json: async () => value,
}));

describe('WebMCP search schema and validation', () => {
  it('pins the closed query schema', () => {
    expect(SEARCH_INPUT_SCHEMA).toEqual({
      type: 'object',
      properties: {
        query: {
          type: 'string',
          minLength: 2,
          maxLength: 200,
          pattern: '\\S[\\s\\S]*\\S',
          description: 'Words to find on zodiacs.org.',
        },
      },
      required: ['query'],
      additionalProperties: false,
    });
  });

  it.each([
    undefined,
    null,
    {},
    { query: 'x' },
    { query: '  ' },
    { query: 'x'.repeat(201) },
    { query: 'aries', extra: true },
  ])('returns INVALID_INPUT without fetching for %j', async (input) => {
    const fetch = okFetch();
    await expect(executeWebMcpSearch(input, { fetch })).resolves.toEqual({
      ok: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'The query must contain between 2 and 200 characters and no other fields.',
      },
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('WebMCP consumer search', () => {
  it('fetches the same-origin index and returns a JSON-safe envelope without the query', async () => {
    const fetch = okFetch();
    const result = await executeWebMcpSearch({ query: 'Aries' }, { fetch });

    expect(fetch).toHaveBeenCalledWith('/search-index.json', {
      credentials: 'same-origin',
      headers: { accept: 'application/json' },
    });
    expect(result).toEqual({
      ok: true,
      data: {
        results: [expect.objectContaining({ path: '/aries/', kind: 'sign' })],
      },
    });
    expect(result).not.toHaveProperty('query');
  });

  it('caps results at five and keeps deterministic ordering', () => {
    const many = Array.from({ length: 8 }, (_, index): SearchEntry => ({
      path: `/learn/fixture-${7 - index}/`,
      title: 'Fixture term',
      description: 'A fixture term.',
      kind: 'learn',
    }));
    const forward = rankConsumerSearchEntries(many, 'fixture').map((entry) => entry.path);
    const reverse = rankConsumerSearchEntries([...many].reverse(), 'fixture').map((entry) => entry.path);
    expect(forward).toHaveLength(SEARCH_RESULT_LIMIT);
    expect(reverse).toEqual(forward);
  });

  it('returns an honest empty result set', async () => {
    await expect(executeWebMcpSearch({ query: 'quincunx' }, { fetch: okFetch() }))
      .resolves.toEqual({ ok: true, data: { results: [] } });
  });

  it.each([
    vi.fn(async () => { throw new Error('offline'); }),
    vi.fn(async () => ({ ok: false, json: async () => entries })),
    okFetch({ entries }),
    okFetch([{ path: '/broken/' }]),
    okFetch([{ ...entries[0], path: 'https://example.com/' }]),
  ])('maps an unusable index to INDEX_UNAVAILABLE', async (fetch) => {
    await expect(executeWebMcpSearch({ query: 'aries' }, { fetch }))
      .resolves.toEqual({
        ok: false,
        error: {
          code: 'INDEX_UNAVAILABLE',
          message: 'The site search index is unavailable.',
        },
      });
  });

  it.each([
    ['birth charts', '/birth-chart/'],
    ['trines', '/learn/aspects/trine/'],
    ['Aries', '/aries/'],
    ['eclipses', '/eclipses/'],
  ])('places the intended route in the top three for %s', (query, expectedPath) => {
    const paths = rankConsumerSearchEntries(entries, query).map((entry) => entry.path);
    expect(paths.slice(0, 3)).toContain(expectedPath);
  });

  it.each(['registry', 'thesis', 'astrofolio', 'aries record'])
    ('never returns a wing entry for %s', (query) => {
      const results = rankConsumerSearchEntries(entries, query);
      expect(results.every((entry) => entry.kind !== 'astrofolio' && entry.kind !== 'terminal' && entry.kind !== 'registry')).toBe(true);
      expect(results.every((entry) => !/^\/(?:terminal|registry|thesis|sdk|archive)(?:\/|$)/.test(entry.path)))
        .toBe(true);
    });

  it('rejects wing paths even if their kind is wrong', () => {
    const mistaggedWing: SearchEntry[] = [
      { path: '/registry/', title: 'Registry', description: 'Registry records.', kind: 'page' },
      { path: '/thesis/', title: 'Thesis', description: 'Registry thesis.', kind: 'learn' },
      { path: '/sdk/', title: 'SDK', description: 'Registry SDK.', kind: 'tool' },
      { path: '/archive/', title: 'Archive', description: 'Registry archive.', kind: 'page' },
      { path: '/collect/', title: 'Collect', description: 'Legacy registry path.', kind: 'page' },
      { path: '/about/', title: 'About', description: 'About the registry boundary.', kind: 'page' },
    ];
    expect(rankConsumerSearchEntries(mistaggedWing, 'registry')).toEqual([{
      path: '/about/',
      title: 'About',
      description: 'About the registry boundary.',
      kind: 'page',
    }]);
  });
});
