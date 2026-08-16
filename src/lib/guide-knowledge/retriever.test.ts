import { describe, expect, it } from 'vitest';
import { GUIDE_KNOWLEDGE_ENTRIES, GUIDE_KNOWLEDGE_VERSION } from './catalog';
import { resolveGuidePageKnowledge, selectGuideKnowledge } from './retriever';

describe('Guide public knowledge', () => {
  it('selects bounded Astrofolio facts without conflating the account', () => {
    const result = selectGuideKnowledge('Is Astrofolio where my account and chart are stored?');
    expect(result.version).toBe(GUIDE_KNOWLEDGE_VERSION);
    expect(result.entries[0]?.id).toBe('astrofolio');
    expect(result.entries.map(({ facts }) => facts).join(' ')).toContain('never the name of a Zodiacs account');
    expect(result.allowedPaths).toContain('/astrofolio/');
    expect(result.entries.length).toBeLessThanOrEqual(4);
  });

  it('prioritizes the current approved page without accepting URLs or queries', () => {
    expect(selectGuideKnowledge('Help me understand this', 'page:birth-chart').entries[0]?.id)
      .toBe('birth-chart');
    expect(resolveGuidePageKnowledge('page:birth-chart')?.canonicalPath).toBe('/birth-chart/');
    expect(resolveGuidePageKnowledge('page:/birth-chart/?name=private')).toBeNull();
    expect(resolveGuidePageKnowledge('page:not-published')).toBeNull();
  });

  it('resolves every newly supported top-level page to server-curated knowledge', () => {
    const expectedPages = new Map([
      ['home', '/'],
      ['tools', '/tools/'],
      ['astrofolio', '/astrofolio/'],
      ['sign-aries', '/aries/'],
      ['sign-taurus', '/taurus/'],
      ['sign-gemini', '/gemini/'],
      ['sign-cancer', '/cancer/'],
      ['sign-leo', '/leo/'],
      ['sign-virgo', '/virgo/'],
      ['sign-libra', '/libra/'],
      ['sign-scorpio', '/scorpio/'],
      ['sign-sagittarius', '/sagittarius/'],
      ['sign-capricorn', '/capricorn/'],
      ['sign-aquarius', '/aquarius/'],
      ['sign-pisces', '/pisces/'],
    ] as const);

    for (const [id, canonicalPath] of expectedPages) {
      expect(resolveGuidePageKnowledge(`page:${id}`), id).toMatchObject({ id, canonicalPath });
      expect(selectGuideKnowledge('Help me understand this page', `page:${id}`).entries[0]?.id, id)
        .toBe(id);
    }
    expect(resolveGuidePageKnowledge('page:sign-ophiuchus')).toBeNull();
  });

  it('keeps page selectors and canonical routes unique', () => {
    const ids = GUIDE_KNOWLEDGE_ENTRIES.map(({ id }) => id);
    const canonicalPaths = GUIDE_KNOWLEDGE_ENTRIES.map(({ canonicalPath }) => canonicalPath);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(canonicalPaths).size).toBe(canonicalPaths.length);
  });

  it('grounds each sign page without reducing a person to one Sun-sign placement', () => {
    const signEntries = GUIDE_KNOWLEDGE_ENTRIES.filter(({ id }) => id.startsWith('sign-'));
    expect(signEntries).toHaveLength(12);
    for (const entry of signEntries) {
      expect(entry.facts, entry.id).toContain('traditional astrological interpretations');
      expect(entry.facts, entry.id).toContain('one chart placement, not the whole person');
    }
  });

  it('grounds Sun-versus-Moon questions in the canonical Moon-sign page', () => {
    const result = selectGuideKnowledge(
      'What is the difference between a sun sign and a moon sign?',
    );
    expect(result.entries[0]).toMatchObject({
      id: 'moon-sign',
      canonicalPath: '/moon-sign/',
    });
    expect(result.entries[0]?.facts).toContain('Neither is more accurate');
    expect(result.allowedPaths).toContain('/moon-sign/');
    const fromGuidePage = selectGuideKnowledge(
      'How is that different from a Moon sign?',
      'page:guide',
    );
    expect(fromGuidePage.entries.some(({ id }) => id === 'moon-sign')).toBe(true);
    expect(fromGuidePage.allowedPaths).toContain('/moon-sign/');
    expect(resolveGuidePageKnowledge('page:moon-sign')?.canonicalPath).toBe('/moon-sign/');
    expect(selectGuideKnowledge('Help me understand this', 'page:moon-sign').entries[0]?.id)
      .toBe('moon-sign');
  });

  it('grounds unknown astrology questions in method rather than inventing site facts', () => {
    const result = selectGuideKnowledge('quincunx');
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]?.id).toBe('astrology-method');
  });

  it('keeps market help factual and explicitly non-advisory', () => {
    const result = selectGuideKnowledge('Should I buy a Zodiac token at this price?');
    const facts = result.entries.map((entry) => entry.facts).join(' ');
    expect(facts).toContain('must not recommend buying, selling, timing, valuation, or a trade');
  });
});
