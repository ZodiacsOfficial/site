import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ASPECTS } from '../lib/engine/aspects';
import { TRANSIT_ORB } from '../lib/transits';
import { GLOSSARY } from './glossary';

const BANNED_PHRASES = [
  'done properly',
  'computed properly',
  'shows its work',
  'like a human',
  'no mush',
  'not vibes',
  'game-changing',
  'unlock',
  'revolutionary',
];

function sentenceCount(value: string): number {
  return value.match(/[.!?](?:["”’')\]]+)?(?:\s|$)/g)?.length ?? 0;
}

describe('glossary data', () => {
  it('keeps the published vocabulary large, unique, kebab-case, and stable', () => {
    const slugs = GLOSSARY.map((entry) => entry.slug);

    expect(GLOSSARY.length).toBeGreaterThanOrEqual(110);
    expect(GLOSSARY.length).toBeLessThanOrEqual(200);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs.every((slug) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))).toBe(true);
    // Term slugs are PUBLIC URLs (/learn/glossary/#orb) — renaming or removing
    // one breaks inbound links and the DefinedTerm @ids. This hash pins the
    // exact slug set and is EXPECTED to change when terms are added: log
    // `actual` below, update the pin, and never rename or drop an existing
    // slug in the same change.
    const actual = createHash('sha256').update(slugs.join('\n')).digest('hex');
    expect(actual).toBe('141155bc280f639f97d0ff0584169bc32ca7b67e4251c424791a352d211f477a');
  });

  it('keeps definitions within the house voice contract', () => {
    const banned = new RegExp(BANNED_PHRASES.join('|'), 'i');

    for (const entry of GLOSSARY) {
      const sentences = sentenceCount(entry.definition);
      expect(sentences, entry.slug).toBeGreaterThanOrEqual(2);
      expect(sentences, entry.slug).toBeLessThanOrEqual(4);
      // The voice contract covers every rendered string, not just definitions.
      expect(entry.definition, entry.slug).not.toMatch(banned);
      expect(entry.receipt ?? '', entry.slug).not.toMatch(banned);
      expect(entry.term, entry.slug).not.toMatch(banned);
      expect(entry.link?.label ?? '', entry.slug).not.toMatch(banned);
      expect(entry.receipt ?? '', entry.slug).not.toMatch(/[\r\n]/);
    }
  });

  it('resolves every related term and uses root-relative living links', () => {
    const slugs = new Set(GLOSSARY.map((entry) => entry.slug));

    for (const entry of GLOSSARY) {
      for (const related of entry.related ?? []) {
        expect(slugs.has(related), `${entry.slug} → ${related}`).toBe(true);
      }
      if (entry.link) {
        expect(entry.link.href, entry.slug).toMatch(/^\//);
      }
    }
  });

  it('quotes aspect and transit numbers directly from engine constants', () => {
    for (const definition of ASPECTS) {
      const entry = GLOSSARY.find((candidate) => candidate.slug === definition.type);
      expect(entry, definition.type).toBeDefined();
      expect(entry?.definition).toContain(`${definition.angle}°`);
      expect(entry?.receipt).toBe(
        `Exact ${definition.angle}° · natal orb ≤ ${definition.orb}° · with Sun or Moon ≤ ${definition.orbLuminary}°`,
      );
    }

    const orb = GLOSSARY.find((entry) => entry.slug === 'orb');
    const transit = GLOSSARY.find((entry) => entry.slug === 'transit');
    expect(orb?.definition).toContain(`${TRANSIT_ORB}° limit for active transits`);
    expect(orb?.receipt).toBe(`Active transit orb ≤ ${TRANSIT_ORB}°`);
    expect(transit?.definition).toContain(`within ${TRANSIT_ORB}° of exact`);
    expect(transit?.receipt).toBe(`Transits read as active within ${TRANSIT_ORB}° of exact`);
  });

  it('does not claim unsupported chart bodies or calculations', () => {
    const bySlug = new Map(GLOSSARY.map((entry) => [entry.slug, entry]));

    expect(bySlug.has('chiron')).toBe(false);
    expect(bySlug.get('sidereal-zodiac')?.definition).toContain('does not compute sidereal charts');
    expect(bySlug.get('progression')?.definition).toContain('does not calculate progressed charts');
    expect(bySlug.get('composite-chart')?.definition).toContain('not composite charts');
    expect(bySlug.get('void-of-course-moon')?.definition).toContain(
      'does not calculate void-of-course intervals',
    );
  });
});
