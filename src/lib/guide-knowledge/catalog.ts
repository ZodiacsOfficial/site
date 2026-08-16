/**
 * Public, server-curated facts for Guide. This catalog contains no user data
 * and is deliberately separate from visible/private conversation sources.
 */
export const GUIDE_KNOWLEDGE_VERSION = 'guide-public-knowledge-2026-08-16.1' as const;

export interface GuideKnowledgeEntry {
  id: string;
  title: string;
  canonicalPath: string;
  topics: readonly string[];
  facts: string;
}

const SIGN_GUIDE_FACTS = [
  ['aries', 'Aries', 'fire', 'cardinal', 'Mars'],
  ['taurus', 'Taurus', 'earth', 'fixed', 'Venus'],
  ['gemini', 'Gemini', 'air', 'mutable', 'Mercury'],
  ['cancer', 'Cancer', 'water', 'cardinal', 'the Moon'],
  ['leo', 'Leo', 'fire', 'fixed', 'the Sun'],
  ['virgo', 'Virgo', 'earth', 'mutable', 'Mercury'],
  ['libra', 'Libra', 'air', 'cardinal', 'Venus'],
  ['scorpio', 'Scorpio', 'water', 'fixed', 'Pluto, with Mars as its traditional ruler'],
  ['sagittarius', 'Sagittarius', 'fire', 'mutable', 'Jupiter'],
  ['capricorn', 'Capricorn', 'earth', 'cardinal', 'Saturn'],
  ['aquarius', 'Aquarius', 'air', 'fixed', 'Uranus, with Saturn as its traditional ruler'],
  ['pisces', 'Pisces', 'water', 'mutable', 'Neptune, with Jupiter as its traditional ruler'],
] as const;

const SIGN_GUIDE_ENTRIES: readonly GuideKnowledgeEntry[] = SIGN_GUIDE_FACTS.map(([
  slug,
  name,
  element,
  modality,
  rulership,
]) => ({
  id: `sign-${slug}`,
  title: `${name} sign guide`,
  canonicalPath: `/${slug}/`,
  topics: [slug, `${slug} sign`, 'zodiac sign', element, modality, 'ruling planet'],
  facts: `The canonical /${slug}/ page is the Zodiacs.org sign guide for ${name}. It covers ${name} as a ${element} sign with ${modality} modality and rulership by ${rulership}, together with its symbolism, placements, and compatibility. These are traditional astrological interpretations, not scientific causation or certainty. A Sun sign is one chart placement, not the whole person.`,
}));

export const GUIDE_KNOWLEDGE_ENTRIES: readonly GuideKnowledgeEntry[] = Object.freeze([
  {
    id: 'home',
    title: 'Zodiacs.org home',
    canonicalPath: '/',
    topics: ['zodiacs.org', 'home', 'start', 'astrology tools', 'birth chart', 'sign guides'],
    facts: 'The Zodiacs.org homepage introduces the free astrology reference and links visitors to birth charts, Moon and rising signs, compatibility, horoscopes, sign guides, and the current-sky tools. Chart calculations start in the browser, no account is required for the core tools, and Astrofolio remains separate from the free astrology experience.',
  },
  {
    id: 'guide',
    title: 'Guide',
    canonicalPath: '/ask/',
    topics: ['guide', 'help', 'assistant', 'ask', 'luna'],
    facts: 'Guide is the user-facing Zodiacs.org astrology assistant. Luna is the current underlying model identity, not the feature name. The canonical website route is /ask/. Guide explains astrology and the site in plain language and must not present astrology as scientific causation or certainty.',
  },
  {
    id: 'birth-chart',
    title: 'Birth chart',
    canonicalPath: '/birth-chart/',
    topics: ['birth', 'natal', 'chart', 'sun', 'moon', 'rising', 'ascendant', 'houses', 'aspects'],
    facts: 'The Zodiacs.org birth-chart calculator computes planetary positions in the browser. A complete chart can include the Sun, Moon, rising sign, houses, and aspects. If birth time is unknown, the site uses 12:00 local civil time as a reference for body positions and omits the rising sign, angles, and houses.',
  },
  {
    id: 'tools',
    title: 'Astrology tools',
    canonicalPath: '/tools/',
    topics: ['tools', 'calculator', 'which tool', 'start', 'birth chart', 'moon sign', 'rising sign', 'compatibility'],
    facts: 'The /tools/ page is the Zodiacs.org directory of free astrology tools. It groups starting points such as the birth-chart, Moon-sign, rising-sign, and compatibility calculators; current-sky tools such as transits, Moon phases, eclipses, and retrogrades; and milestone tools such as Saturn and solar returns. A visitor who wants the whole chart should start with /birth-chart/.',
  },
  {
    id: 'moon-sign',
    title: 'Moon sign',
    canonicalPath: '/moon-sign/',
    topics: ['moon sign', 'sun sign', 'sun versus moon', 'big three', 'emotional needs', 'instincts', 'birth time', 'calculator'],
    facts: 'The Sun sign is the tropical sign containing the Sun at a birth instant, while the Moon sign is the tropical sign containing the Moon. In Zodiacs.org’s traditional interpretive language, the Sun describes identity, vitality, and direction, while the Moon describes emotional needs, instincts, memory, and habits. Neither is more accurate; they describe different parts of a chart. Because the Moon moves quickly, birth time can decide the Moon sign on a sign-boundary day. The canonical calculator and explanation are at /moon-sign/.',
  },
  {
    id: 'astrology-method',
    title: 'How Zodiacs.org treats astrology',
    canonicalPath: '/methodology/',
    topics: ['astrology', 'astronomy', 'method', 'accuracy', 'prediction', 'certainty', 'ephemeris'],
    facts: 'Zodiacs.org separates astronomical calculation from astrological interpretation. Sky positions and dates are checkable astronomical inputs. Interpretations are traditional and reflective, not scientifically validated predictions. Guide should preserve the visitor’s agency and use qualified language.',
  },
  {
    id: 'transits',
    title: 'Transits',
    canonicalPath: '/transits/',
    topics: ['transit', 'today', 'current', 'sky', 'aspect', 'orb'],
    facts: 'The transits tool compares the current sky with a birth chart and shows close aspects. A transit describes a present sky-to-chart relationship; it does not guarantee an event or determine a person’s choices.',
  },
  {
    id: 'compatibility',
    title: 'Compatibility',
    canonicalPath: '/compatibility/',
    topics: ['compatibility', 'synastry', 'relationship', 'couple', 'partner', 'sign pairing'],
    facts: 'The compatibility tool compares two charts and the site also publishes guides for all 78 sign pairings. A saved person is never the visitor. Guide must not infer another person’s private thoughts, motives, consent, or future behavior from astrology.',
  },
  {
    id: 'learn',
    title: 'Learn astrology',
    canonicalPath: '/learn/',
    topics: ['learn', 'signs', 'planets', 'houses', 'aspects', 'retrograde', 'beginner'],
    facts: 'The Learn section explains signs, planets, houses, aspects, placements, retrogrades, and chart reading in plain language. Guide may direct a visitor to the closest relevant Learn page when the catalog supports that path.',
  },
  ...SIGN_GUIDE_ENTRIES,
  {
    id: 'horoscopes',
    title: 'Horoscopes and Today',
    canonicalPath: '/horoscopes/',
    topics: ['horoscope', 'today', 'daily', 'weekly', 'monthly', 'yearly'],
    facts: 'Zodiacs.org publishes dated horoscope editions. “Today” is an exact date claim and should be used only when the displayed edition date matches the relevant current date. Horoscope language is reflective guidance, not certainty.',
  },
  {
    id: 'account',
    title: 'Optional Zodiacs account',
    canonicalPath: '/profile/',
    topics: ['account', 'profile', 'sync', 'save', 'saved chart', 'privacy', 'export', 'delete'],
    facts: 'The core site works without an account. Charts start on the device. An optional Zodiacs account may sync only charts the user explicitly selects. The account is called a Zodiacs account, never an Astrofolio account. Account access and Guide generation entitlement are separate.',
  },
  {
    id: 'registry',
    title: 'Zodiacs Registry',
    canonicalPath: '/registry/',
    topics: ['registry', 'official', 'address', 'mint', 'token', 'verify', 'record'],
    facts: 'The Zodiacs Registry is the read-only verification source for the twelve official Zodiac asset records. Guide may explain a published record but must not infer ownership, endorsement, value, or investment merit from Registry status.',
  },
  {
    id: 'terminal',
    title: 'Zodiac Terminal',
    canonicalPath: '/terminal/',
    topics: ['terminal', 'market', 'price', 'volume', 'liquidity', 'research'],
    facts: 'Zodiac Terminal is Zodiacs.org’s market-and-research interface for the twelve Registry assets. Market facts are time-sensitive and must be labeled with their displayed timestamp. Guide may summarize published facts but must not recommend buying, selling, timing, valuation, or a trade.',
  },
  {
    id: 'astrofolio',
    title: 'Astrofolio',
    canonicalPath: '/astrofolio/',
    topics: ['astrofolio', 'shelf', 'collection', 'zodiac asset', 'consumer experience'],
    facts: 'The /astrofolio/ page is the consumer collection for choosing one of twelve gold Zodiac sculptures, seeing the corresponding official token, opening its Registry record, and following the page’s public acquisition guide. Zodiacs.org remains the astrology reference and official Registry and SDK source. The operator of Zodiacs.org states that they do not control astrofolio.xyz, its official channels, token deployment or administrative authorities, treasury, liquidity, or market activity. Astrofolio is never the name of a Zodiacs account or saved chart, and Guide must not recommend buying, selling, timing, valuation, or a trade.',
  },
  {
    id: 'sdk',
    title: 'Zodiacs SDK',
    canonicalPath: '/sdk/',
    topics: ['sdk', 'developer', 'api', 'build', 'integration', 'astrofolio'],
    facts: 'The public Zodiacs SDK documentation covers astrology calculations and Registry integrations. Its Astrofolio section describes the relationship to that separate product; it does not turn Astrofolio into the Zodiacs account or identity system.',
  },
  {
    id: 'disclosure',
    title: 'Ownership and market disclosure',
    canonicalPath: '/disclosure/',
    topics: ['disclosure', 'ownership', 'operator', 'conflict', 'compensation', 'astrofolio'],
    facts: 'The dated Zodiacs.org disclosure is the source of truth for operator control, holdings, compensation, and the separation from Astrofolio. Guide should link to it for those questions and describe statements as the operator’s attestation rather than independent verification.',
  },
]);
