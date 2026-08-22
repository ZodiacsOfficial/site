/**
 * Public, server-curated facts for Guide. This catalog contains no user data
 * and is deliberately separate from visible/private conversation sources.
 */
export const GUIDE_KNOWLEDGE_VERSION = 'guide-public-knowledge-2026-08-20.1' as const;

export interface GuideKnowledgeEntry {
  id: string;
  title: string;
  canonicalPath: string;
  topics: readonly string[];
  facts: string;
}

export const GUIDE_KNOWLEDGE_ENTRIES: readonly GuideKnowledgeEntry[] = Object.freeze([
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
    facts: 'The core site works without an account. Charts start on the device. An optional Zodiacs account may sync only charts the user explicitly selects. Account access and Guide generation entitlement are separate.',
  },
]);
