import { describe, expect, it } from 'vitest';
import { GUIDE_KNOWLEDGE_VERSION } from './catalog';
import { resolveGuidePageKnowledge, selectGuideKnowledge } from './retriever';

describe('Guide public knowledge', () => {
  it('selects bounded Astrofolio facts without conflating the account', () => {
    const result = selectGuideKnowledge('Is Astrofolio where my account and chart are stored?');
    expect(result.version).toBe(GUIDE_KNOWLEDGE_VERSION);
    expect(result.entries[0]?.id).toBe('astrofolio');
    expect(result.entries.map(({ facts }) => facts).join(' ')).toContain('never the name of a Zodiacs account');
    expect(result.allowedPaths).toContain('/sdk/#astrofolio');
    expect(result.entries.length).toBeLessThanOrEqual(4);
  });

  it('prioritizes the current approved page without accepting URLs or queries', () => {
    expect(selectGuideKnowledge('Help me understand this', 'page:birth-chart').entries[0]?.id)
      .toBe('birth-chart');
    expect(resolveGuidePageKnowledge('page:birth-chart')?.canonicalPath).toBe('/birth-chart/');
    expect(resolveGuidePageKnowledge('page:/birth-chart/?name=private')).toBeNull();
    expect(resolveGuidePageKnowledge('page:not-published')).toBeNull();
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
