import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import peopleData from '../src/data/people.json';

describe('Phase 5 People pilot contract', () => {
  it('contains exactly 501 distinct records with the policy-driven release boundary', () => {
    // 500 were published; one was withdrawn on 2026-07-27 because its Sun
    // sign proved undeterminable. Two owner-authorized protected living
    // records were added on 2026-08-16. See index-policy.json.
    expect(peopleData.people).toHaveLength(501);
    expect(new Set(peopleData.people.map((person) => person.slug)).size).toBe(peopleData.people.length);
    expect(new Set(peopleData.people.map((person) => person.qid)).size).toBe(peopleData.people.length);
    const indexable = peopleData.people.filter((person) => person.indexEligibility.eligible);
    const protectedLiving = peopleData.people.filter((person) => !person.indexEligibility.eligible);
    expect(indexable).toHaveLength(peopleData.people.filter((person) => !person.living).length);
    expect(indexable.every((person) => !person.living && person.indexEligibility.blockedBy.length === 0)).toBe(true);
    expect(protectedLiving.map((person) => person.slug).sort()).toEqual([
      'bill-gates',
      'leonardo-dicaprio',
      'rigoberta-menchu',
      'serena-williams',
    ]);
    expect(protectedLiving.every((person) => (
      person.living
      && person.indexEligibility.blockedBy.some((reason) => reason.includes('living-person-protection'))
    ))).toBe(true);
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

  it('keeps the directory protected and derives profile robots from eligibility', async () => {
    const directory = await readFile(resolve('src/pages/people/index.astro'), 'utf8');
    const profile = await readFile(resolve('src/pages/people/[slug].astro'), 'utf8');
    expect(directory).toContain('noindex={!PEOPLE_DIRECTORY_INDEXABLE}');
    expect(directory).toContain('nofollow={!PEOPLE_DIRECTORY_INDEXABLE}');
    expect(profile).toContain('noindex={!person.indexEligibility.eligible}');
    expect(profile).toContain('nofollow={!person.indexEligibility.eligible}');
  });

  it('publishes only allowlisted profiles in the sitemap and keeps People out of primary navigation', async () => {
    const sitemap = await readFile(resolve('src/pages/sitemap.xml.ts'), 'utf8');
    const nav = await readFile(resolve('src/components/SiteNav.astro'), 'utf8');
    expect(sitemap).toContain('INDEXABLE_PEOPLE.map');
    expect(nav).not.toContain('/people/');
  });

  it('declares the shared page gutter without legacy People overrides', async () => {
    const styles = await readFile(resolve('src/styles/people.css'), 'utf8');
    const pageShell = styles.match(/\.people-page,\s*\.person-page\s*\{([^}]*)\}/u)?.[1] ?? '';

    expect(pageShell).toContain('width: min(var(--people-width), calc(100% - 40px));');
    expect(styles).not.toMatch(/100% - (?:24|32)px/u);
  });
});
