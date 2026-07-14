import { describe, expect, it } from 'vitest';
import { scoreEntry, searchIndex, type SearchEntry } from './score';

const entries: SearchEntry[] = [
  { path: '/saturn-return/', title: 'Saturn return', description: 'The exact dates your Saturn return hits.', kind: 'tool' },
  { path: '/learn/planets/saturn/', title: 'Saturn', description: 'Structure, limits, and time.', kind: 'learn' },
  { path: '/learn/glossary/#saturn-return', title: 'Saturn return', description: 'A Saturn return is the transit when Saturn reaches its natal longitude.', kind: 'term' },
  { path: '/birth-chart/', title: 'Free Birth Chart Calculator — Sun, Moon & Rising', description: 'Calculate your free birth chart.', kind: 'tool' },
  { path: '/aries/', title: 'Aries: dates, personality, compatibility', description: 'Aries explained in plain language.', kind: 'sign' },
  { path: '/learn/glossary/#orb', title: 'Orb', description: 'An orb is the distance from exact.', kind: 'term' },
];

describe('scoreEntry', () => {
  it('rejects entries missing any token', () => {
    expect(scoreEntry(entries[4], ['aries', 'return'])).toBe(0);
  });
  it('scores exact title matches above prefix and substring hits', () => {
    const exact = scoreEntry(entries[5], ['orb']);
    const substring = scoreEntry(
      { path: '/x/', title: 'The orbit page', description: '', kind: 'page' },
      ['orb'],
    );
    expect(exact).toBeGreaterThan(substring);
  });
  it('matches optional curated keywords without exposing them as copy', () => {
    const registryEntry: SearchEntry = {
      path: '/registry/aries/',
      title: 'Aries — registry record',
      description: 'The canonical record of Aries in the registry.',
      kind: 'registry',
      keywords: ['astrofolio'],
    };
    expect(scoreEntry(registryEntry, ['astrofolio'])).toBeGreaterThan(0);
    expect(registryEntry.title).not.toContain('astrofolio');
    expect(registryEntry.description).not.toContain('astrofolio');
  });
});

describe('searchIndex', () => {
  it('returns nothing below two characters', () => {
    expect(searchIndex(entries, 's')).toHaveLength(0);
    expect(searchIndex(entries, ' ')).toHaveLength(0);
  });
  it('ranks the tool above the glossary term for the same title', () => {
    const results = searchIndex(entries, 'saturn return');
    expect(results[0].path).toBe('/saturn-return/');
    expect(results.map((r) => r.path)).toContain('/learn/glossary/#saturn-return');
  });
  it('multi-token queries require every token', () => {
    const results = searchIndex(entries, 'birth chart');
    expect(results).toHaveLength(1);
    expect(results[0].path).toBe('/birth-chart/');
  });
  it('prefers a concept route over tools that only mention the same phrase', () => {
    const results = searchIndex([
      entries[3],
      { path: '/widgets/', title: 'Free Astrology Widgets — Moon, Sky & Birth Chart', description: 'Embed a private mini birth chart.', kind: 'tool' },
      { path: '/transits/', title: 'Transit Tracker — The Sky Moving Over Your Birth Chart', description: 'Transits over a birth chart.', kind: 'tool' },
    ], 'birth chart');
    expect(results[0].path).toBe('/birth-chart/');
  });
  it('is case-insensitive and caps at the limit', () => {
    expect(searchIndex(entries, 'SATURN', 2)).toHaveLength(2);
  });
});
