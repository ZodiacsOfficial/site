import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import {
  PEOPLE_IDENTITY_REVIEW_FLAG as flag,
  peopleIdentityReviewOptions,
  reviewedPeople,
} from './people-identity-og-review.mjs';

const people = [
  { slug: 'neil-armstrong', disciplines: ['astronaut', 'test pilot'], shortDescription: 'Astronaut and test pilot · United States · 1930–2012' },
  { slug: 'amelia-earhart', disciplines: ['aircraft pilot'], shortDescription: 'Aircraft pilot · United States · 1897–1939' },
  { slug: 'maya-angelou', disciplines: ['writer'], shortDescription: 'Writer · United States · 1928–2014' },
];

describe('People identity OG review boundary', () => {
  it('requires the explicit mode and fixes its destination outside production', () => {
    expect(peopleIdentityReviewOptions([], '/repo')).toBeNull();
    expect(peopleIdentityReviewOptions(['--only-people'], '/repo')).toBeNull();
    expect(peopleIdentityReviewOptions([flag], '/repo')).toEqual({
      output: resolve('/repo/tests/visual/artifacts/explorer/people-identity-og'),
    });
  });

  it.each(['--only-people', '--only-wing', '--include-fallback', '--output=/repo/public', flag])(
    'rejects mixed or repeated mode %s before rendering',
    (other) => expect(() => peopleIdentityReviewOptions([flag, other], '/repo')).toThrow('must be used alone'),
  );

  it('rejects a value on the closed flag instead of falling into the full production renderer', () => {
    expect(() => peopleIdentityReviewOptions([`${flag}=/repo/public`], '/repo')).toThrow('must be used alone');
  });

  it('rejects an unpinned browser module instead of attesting a different runtime', () => {
    expect(() => peopleIdentityReviewOptions([flag], '/repo', { PLAYWRIGHT_MODULE: '/another/playwright.mjs' }))
      .toThrow('pinned playwright-core');
  });

  it('selects exactly the three approved people in a stable order', () => {
    const unrelated = { slug: 'another-person', disciplines: ['writer'], shortDescription: 'Writer · elsewhere' };
    expect(reviewedPeople([unrelated, ...people.toReversed()])).toEqual(people);
  });

  it('rejects missing and duplicate reviewed records', () => {
    expect(() => reviewedPeople(people.slice(0, 2))).toThrow('maya-angelou');
    expect(() => reviewedPeople([...people, people[0]])).toThrow('exactly one');
  });

  it('rejects old production descriptions and changed editorial selections', () => {
    expect(() => reviewedPeople(people.map((person, i) => i ? person : {
      ...person, shortDescription: 'University teacher · United States · 1930–2012',
    }))).toThrow('has not been migrated');
    expect(() => reviewedPeople(people.map((person, i) => i !== 2 ? person : {
      ...person, disciplines: ['poet'],
    }))).toThrow('reviewed selection');
  });
});
