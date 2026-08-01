import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import peopleData from '../src/data/people.json';
import {
  selectPublishablePeople,
  validatePeopleTrustPolicy,
  validatePersonTrustFacts,
} from './people-trust.mjs';

describe('Phase 5 People pilot contract', () => {
  it('contains exactly 499 distinct records with the policy-driven release boundary', () => {
    // 500 were published; one was withdrawn on 2026-07-27 because its Sun
    // sign proved undeterminable. See src/data/corrections.json.
    expect(peopleData.people).toHaveLength(499);
    expect(new Set(peopleData.people.map((person) => person.slug)).size).toBe(peopleData.people.length);
    expect(new Set(peopleData.people.map((person) => person.qid)).size).toBe(peopleData.people.length);
    const indexable = peopleData.people.filter((person) => person.indexEligibility.eligible);
    const protectedLiving = peopleData.people.filter((person) => !person.indexEligibility.eligible);
    expect(indexable).toHaveLength(peopleData.people.filter((person) => !person.living).length);
    expect(indexable.every((person) => !person.living && person.indexEligibility.blockedBy.length === 0)).toBe(true);
    expect(protectedLiving.map((person) => person.slug).sort()).toEqual([
      'rigoberta-menchu',
      'serena-williams',
    ]);
    expect(protectedLiving.every((person) => (
      person.living
      && person.indexEligibility.blockedBy.some((reason) => reason.includes('living-person-protection'))
    ))).toBe(true);
    expect(peopleData.releaseCounts).toEqual({
      reviewedSourceRecords: 499,
      publishedRecords: 499,
      indexableDeceasedRecords: 497,
      protectedLivingRecords: 2,
      historicalWithdrawals: 1,
      quarantinedRecords: 0,
    });
    expect(peopleData.status).toBe(
      'Phase 5 public release — 499 published records: 497 indexable deceased, 2 protected living; 1 historical withdrawal; 0 quarantined',
    );
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

  it('publishes the reviewed Sun Yat-sen and Roberto Clemente corrections', async () => {
    const policy = JSON.parse(await readFile(resolve('docs/phase5/people-pilot/trust-policy.json'), 'utf8'));
    const manifest = JSON.parse(await readFile(resolve('docs/phase5/people-pilot/manifest.json'), 'utf8'));
    expect(validatePeopleTrustPolicy(policy, manifest)).toEqual([]);
    const incompletePolicy = structuredClone(policy);
    incompletePolicy.overrides[0].sources.forEach((source) => {
      source.supports = source.supports.filter((fact) => fact !== 'deathDate');
    });
    expect(validatePeopleTrustPolicy(incompletePolicy, manifest)).toContain(
      'sun-yat-sen: authoritative sources do not cover deathDate',
    );
    expect(peopleData.sourceTrustPolicySha256).toMatch(/^[a-f0-9]{64}$/u);

    const sun = peopleData.people.find((person) => person.slug === 'sun-yat-sen');
    expect(sun).toMatchObject({
      qid: 'Q8573',
      birthDate: { storedValue: '1866-11-12' },
      birthPlace: {
        entity: 'Q588677',
        normalisedLabel: 'Cuiheng, China',
        timeZone: 'Asia/Shanghai',
      },
      timeQuality: 'unknown',
      reviewedAtUtc: '2026-08-01T00:00:00Z',
    });
    expect(sun.sources.authoritative.map((source) => source.publisher)).toEqual([
      'Sun Yat-sen Memorial Hall',
    ]);

    const clemente = peopleData.people.find((person) => person.slug === 'roberto-clemente');
    expect(clemente).toMatchObject({
      qid: 'Q684020',
      birthDate: { storedValue: '1934-08-18' },
      birthPlace: {
        entity: 'Q990293',
        normalisedLabel: 'Carolina, Puerto Rico',
        timeZone: 'America/Puerto_Rico',
      },
      timeQuality: 'unknown',
      reviewedAtUtc: '2026-08-01T00:00:00Z',
    });
    expect(clemente.sources.authoritative.map((source) => source.publisher)).toEqual([
      'Major League Baseball',
      'National Baseball Hall of Fame',
    ]);
    const clementeCopy = JSON.parse(await readFile(
      resolve('docs/phase5/people-pilot/copy/roberto-clemente.json'),
      'utf8',
    ));
    expect(clementeCopy.identity).toBe('Baseball player · Puerto Rico · 1934–1972');
  });

  it('fails closed on impossible dates and country-level birthplaces', () => {
    const valid = {
      slug: 'fixture',
      birthDate: '1934-08-18',
      deathDate: '1972-12-31',
      living: false,
      birthPlace: {
        entity: 'Q990293',
        normalisedLabel: 'Carolina, Puerto Rico',
        country: { entity: 'Q30', label: 'United States' },
        coordinates: { sourceEntity: 'Q990293' },
      },
    };
    expect(validatePersonTrustFacts(valid, { today: '2026-08-01' })).toEqual([]);
    expect(validatePersonTrustFacts({ ...valid, birthDate: '1934-02-30' }, { today: '2026-08-01' }))
      .toContain('fixture: birth date is not a real ISO calendar day');
    expect(validatePersonTrustFacts({ ...valid, deathDate: '1930-01-01' }, { today: '2026-08-01' }))
      .toContain('fixture: death date precedes birth date');
    expect(validatePersonTrustFacts({ ...valid, birthDate: '2030-01-01' }, { today: '2026-08-01' }))
      .toContain('fixture: birth date is in the future');

    const countryPlace = {
      ...valid,
      birthPlace: {
        entity: 'Q38',
        normalisedLabel: 'Italy, Italy',
        country: { entity: 'Q38', label: 'Italy' },
        coordinates: { sourceEntity: 'Q38' },
      },
    };
    expect(validatePersonTrustFacts(countryPlace, { today: '2026-08-01' })).toEqual(expect.arrayContaining([
      'fixture: birthplace resolves to the country entity',
      'fixture: birthplace coordinates resolve to a country centroid',
      'fixture: birthplace label repeats the same place and country',
    ]));
  });

  it('removes quarantined records before any generated surface can consume them', () => {
    const selected = selectPublishablePeople([
      { slug: 'safe-person' },
      { slug: 'withheld-person' },
    ], {
      quarantinedProfiles: [{ slug: 'withheld-person' }],
    });
    expect(selected).toEqual([{ slug: 'safe-person' }]);
  });
});
