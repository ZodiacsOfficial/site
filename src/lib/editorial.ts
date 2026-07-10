/**
 * The editorial identity — one name, stated once, used everywhere.
 *
 * Rowan Vale is Zodiacs.org's editorial persona (owner decision D8): a
 * consistent editor with a bio page and review dates, so people and crawlers
 * can attach the site's content to a stable author entity. The bio claims
 * only what is true — the editorial METHOD (computed figures checked against
 * JPL reference data, sources cited, interpretation labeled as tradition) —
 * never personal astrology credentials. Keep it that way.
 */

export const EDITOR_NAME = 'Rowan Vale';
export const EDITOR_ID = 'https://zodiacs.org/about/#editor';

/** Full Person node — rendered once, on /about/. */
export const EDITOR_PERSON = {
  '@type': 'Person',
  '@id': EDITOR_ID,
  name: EDITOR_NAME,
  url: EDITOR_ID,
  description:
    'Editor of Zodiacs.org. Every computed figure on the site is checked '
    + 'against NASA JPL reference data before publication; sources are cited, '
    + 'and interpretive claims are labeled as tradition rather than fact.',
  worksFor: { '@id': 'https://zodiacs.org/#org' },
  knowsAbout: ['astrology', 'astronomical computation', 'the tropical zodiac', 'house systems'],
} as const;

/** Compact author reference — embedded by every Article emitter. */
export const EDITOR_AUTHOR = {
  '@type': 'Person',
  '@id': EDITOR_ID,
  name: EDITOR_NAME,
  url: EDITOR_ID,
} as const;
