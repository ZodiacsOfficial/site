import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import peopleData from '../src/data/people.json';

describe('Phase 5 People pilot contract', () => {
  it('contains exactly 20 distinct, index-ineligible records', () => {
    expect(peopleData.people).toHaveLength(20);
    expect(new Set(peopleData.people.map((person) => person.slug)).size).toBe(20);
    expect(new Set(peopleData.people.map((person) => person.qid)).size).toBe(20);
    expect(peopleData.people.every((person) => person.indexEligibility.eligible === false)).toBe(true);
  });

  it('never counts an uncertain sign in chart aggregates', () => {
    for (const person of peopleData.people) {
      const settled = person.placements.filter((placement) => placement.stableAcrossDay);
      expect(person.patterns.settledBodyCount).toBe(settled.length);
      expect(Object.values(person.patterns.elements).reduce((sum, value) => sum + value, 0)).toBe(settled.length);
      expect(Object.values(person.patterns.modalities).reduce((sum, value) => sum + value, 0)).toBe(settled.length);
    }
  });

  it('names every non-Moon placement whose sign is uncertain', () => {
    for (const person of peopleData.people) {
      const facts = person.copy.blocks.flatMap((block) => block.facts);
      const text = person.copy.blocks.map((block) => block.text).join(' ');
      for (const placement of person.placements.filter((entry) => (
        !entry.stableAcrossDay && entry.body !== 'Moon'
      ))) {
        const fact = facts.find((entry) => entry.startsWith(`sign-uncertain:${placement.body}:`));
        expect(fact).toBeTruthy();
        const [, body, start, end] = fact.split(':');
        const startName = start.charAt(0).toUpperCase() + start.slice(1);
        const endName = end.charAt(0).toUpperCase() + end.slice(1);
        expect(text).toContain(
          `${body} crossed from ${startName} into ${endName} during that day, so its sign is left open.`,
        );
      }
    }
  });

  it('pins both route templates to noindex and nofollow', async () => {
    for (const file of ['src/pages/people/index.astro', 'src/pages/people/[slug].astro']) {
      const source = await readFile(resolve(file), 'utf8');
      expect(source).toMatch(/\bnoindex\b/u);
      expect(source).toMatch(/\bnofollow\b/u);
    }
  });

  it('keeps People out of the sitemap and primary navigation', async () => {
    const sitemap = await readFile(resolve('src/pages/sitemap.xml.ts'), 'utf8');
    const nav = await readFile(resolve('src/components/SiteNav.astro'), 'utf8');
    expect(sitemap).not.toContain('/people/');
    expect(nav).not.toContain('/people/');
  });
});
