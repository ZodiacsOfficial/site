/**
 * English source catalogue for build-time social cards and additive schema.
 *
 * Keep keys and tool IDs stable so localized card generation can replace this
 * catalogue without scraping copy from Astro templates or generated HTML.
 */
export const SOCIAL_PROFILES = Object.freeze([
  'https://github.com/ZodiacsOfficial/sdk',
  'https://x.com/astrofoliosol',
  'https://www.instagram.com/astrofolioonsol/',
  'https://t.me/astrofoliosol',
]);

export const OG_EN = Object.freeze({
  fallbackAlt: 'Zodiacs.org — free birth charts, sign guides, and astrology tools.',
  site: 'zodiacs.org',
  signNames: Object.freeze({
    aries: 'Aries',
    taurus: 'Taurus',
    gemini: 'Gemini',
    cancer: 'Cancer',
    leo: 'Leo',
    virgo: 'Virgo',
    libra: 'Libra',
    scorpio: 'Scorpio',
    sagittarius: 'Sagittarius',
    capricorn: 'Capricorn',
    aquarius: 'Aquarius',
    pisces: 'Pisces',
  }),
  share: {
    title: 'Explore the stars behind your story.',
    subtitle: 'Free birth charts, sign guides, and astrology tools.',
  },
  signGuide: {
    kicker: 'Sign guide',
  },
  registryLot: {
    kicker: 'The Registry',
    numberLine: 'Nº {number} / 12 · Lot {lot} of XII',
    subtitle: 'Official record · native Solana origin · bridged Base representation',
  },
  registry: {
    kicker: 'The Official Registry',
    title: 'Twelve signs. One register.',
    subtitle: 'A read-only catalogue of the twelve official Zodiac records.',
    data: 'Nº 01–12 / 12 · read-only by design',
    path: '/registry/',
    image: '/assets/og/v2/registry.png',
    alt: 'The Zodiacs.org Registry — twelve official Zodiac records in a read-only catalogue.',
  },
  thesis: {
    kicker: 'The Thesis',
    title: 'Belief is the oldest asset.',
    footer: 'zodiacs.org — The Registry · Revised July 2026',
    path: '/thesis/',
    image: '/assets/og/v2/thesis.png',
    alt: 'Belief is the oldest asset — the Zodiacs.org Registry thesis.',
  },
  disclosure: {
    kicker: 'Registry disclosure',
    title: 'The facts, including the unresolved ones.',
    subtitle: 'Operator, economic-interest, provenance, separation, and read-only disclosures.',
    path: '/disclosure/',
    image: '/assets/og/v2/disclosure.png',
    alt: 'Registry disclosure — verified facts and pending operator confirmations.',
  },
  horoscope: {
    kicker: 'Monthly horoscope',
    subtitle: 'Monthly horoscopes grounded in real moon phases, retrogrades, and major transits.',
  },
  rising: {
    kicker: 'Rising signs',
    title: '{sign}<br/>rising',
    subtitle: 'How the world first meets you — and the planet that steers your chart.',
    data: 'the ascendant changes sign about every two hours',
  },
  placements: {
    kicker: 'Placements',
    title: '{planet} through<br/>the signs',
    subtitle: 'All twelve {planet} placements, read closely.',
  },
  compatibility: {
    kicker: 'Compatibility',
    title: '{a}<br/>and {b}',
    data: '{aElement} and {bElement} · {aModality} and {bModality}',
  },
  planetNames: Object.freeze({
    sun: 'Sun',
    moon: 'Moon',
    mercury: 'Mercury',
    venus: 'Venus',
    mars: 'Mars',
    jupiter: 'Jupiter',
    saturn: 'Saturn',
    uranus: 'Uranus',
    neptune: 'Neptune',
    pluto: 'Pluto',
  }),
  pin: {
    signGuide: {
      kicker: 'Sign guide',
    },
    horoscope: {
      kicker: 'Monthly horoscope',
      title: '{sign}, this month',
      subtitle: 'Grounded in the real sky: moon phases, retrogrades, and major transits, each with its date.',
    },
    howTo: {
      kicker: 'Learn astrology',
      title: 'How to read a birth chart.',
      steps: {
        bigThree: '1 · The big three',
        rooms: '2 · Planets, room by room',
        aspects: '3 · The working aspects',
        weather: '4 · The chart’s weather',
      },
    },
  },
  tools: Object.freeze([
    { key: 'birth-chart', path: '/birth-chart/', kicker: 'Free calculator', title: 'Your birth chart', sub: 'Sun, moon, rising, houses, and aspects — computed on your device.' },
    { key: 'moon-sign', path: '/moon-sign/', kicker: 'Free calculator', title: 'Your moon sign', sub: 'How you feel and what soothes you — from your date, time, and place of birth.' },
    { key: 'rising-sign', path: '/rising-sign/', kicker: 'Free calculator', title: 'Your rising sign', sub: 'How people first read you — from your birth time and place.' },
    { key: 'moon-phase', path: '/moon-phase/', kicker: 'Free calculator', title: 'The moon, any night', sub: 'Tonight’s phase, and the moon of any date that matters to you.' },
    { key: 'saturn-return', path: '/saturn-return/', kicker: 'Free calculator', title: 'Your Saturn return', sub: 'The exact dates, every pass and retrograde loop included.' },
    { key: 'mercury-retrograde', path: '/mercury-retrograde/', kicker: 'The calendar', title: 'Mercury retrograde', sub: 'Every window through 2027, computed from the planet’s real motion.' },
    { key: 'compatibility', path: '/compatibility/', kicker: 'Compatibility', title: 'Two charts, compared', sub: 'Whole-chart synastry — plus guides to all 78 sign pairings.' },
    { key: 'horoscopes', path: '/horoscopes/', kicker: 'Monthly horoscopes', title: 'All twelve signs', sub: 'Grounded in real moon phases, retrogrades, and major transits.' },
    { key: 'learn', path: '/learn/', kicker: 'Learn astrology', title: 'Read your chart', sub: 'The signs, the planets, the houses, and the aspects, in plain language.' },
    { key: 'how-to-read-a-birth-chart', path: '/learn/how-to-read-a-birth-chart/', kicker: 'Learn astrology', title: 'How to read a birth chart', sub: 'Big three, planets room by room, the working aspects, then the weather — in order.' },
    { key: 'tools', path: '/tools/', kicker: 'Free astrology tools', title: 'Calculators, no signup', sub: 'Birth chart, compatibility, moon sign, and more — computed on your device.' },
    { key: 'transits', path: '/transits/', kicker: 'Free tracker', title: 'Your transits, today', sub: 'The current sky aspected to your birth chart, within 3° of exact.' },
    { key: 'eclipses', path: '/eclipses/', kicker: 'The calendar', title: 'Eclipses, dated', sub: 'Every solar and lunar eclipse through 2028, with exact peak times and signs.' },
    { key: 'full-moon-calendar', path: '/full-moon-calendar/', kicker: 'The calendar', title: 'Every full moon', sub: 'Exact instants through 2027, with each moon’s sign, degree, and name.' },
    { key: 'retrogrades', path: '/retrogrades/', kicker: 'The calendar', title: 'Every retrograde', sub: 'All eight planets, 2026–2027, computed station to station.' },
    { key: 'baby-zodiac', path: '/baby-zodiac/', kicker: 'Free calculator', title: 'What sign will the baby be?', sub: 'The due date’s near-certain Sun, the week’s possible Moons, and what waits for the clock.' },
    { key: 'birthday', path: '/birthday/', kicker: 'Birthday astrology', title: 'Every date, computed', sub: 'Sun sign checked across ninety-one years, degree spans, decans, and cusp tables.' },
    { key: 'today', path: '/today/', kicker: 'Your daily brief', title: 'Today, against your chart', sub: 'The noon sky compared privately with the latest chart saved on this device.' },
  ]),
});

export const WEB_APPLICATION_PATHS = Object.freeze([
  '/birth-chart/',
  '/compatibility/',
  '/transits/',
  '/moon-sign/',
  '/rising-sign/',
  '/moon-phase/',
  '/saturn-return/',
  '/birthday/',
  '/today/',
  '/baby-zodiac/',
  '/full-moon-calendar/',
  '/eclipses/',
  '/retrogrades/',
  '/mercury-retrograde/',
]);

export const SCHEMA_EN = Object.freeze({
  organizationName: 'Zodiacs',
  organizationAlternateName: 'Zodiacs.org',
  websiteName: 'Zodiacs.org',
  websiteDescription: 'Free birth charts, moon signs, compatibility, horoscopes, and sign guides — private in your browser.',
  breadcrumbHome: 'Zodiacs.org',
  applicationCategory: 'LifestyleApplication',
  operatingSystem: 'Any device with a modern web browser',
  browserRequirements: 'Requires a modern web browser.',
  freePrice: '0',
  currency: 'USD',
});

export const BREADCRUMB_LABELS = Object.freeze({
  about: 'About',
  archive: 'Archive',
  'baby-zodiac': 'Baby zodiac',
  'birth-chart': 'Birth chart',
  birthday: 'Birthday astrology',
  compatibility: 'Compatibility',
  disclosure: 'Disclosure',
  eclipses: 'Eclipses',
  es: 'Español',
  feeds: 'Feeds',
  'full-moon-calendar': 'Full moon calendar',
  horoscopes: 'Horoscopes',
  houses: 'Houses',
  learn: 'Learn astrology',
  'mercury-retrograde': 'Mercury retrograde',
  methodology: 'Methodology',
  'moon-phase': 'Moon phase',
  'moon-sign': 'Moon sign',
  placements: 'Placements',
  planets: 'Planets',
  privacy: 'Privacy',
  profile: 'Profile',
  registry: 'The Registry',
  retrogrades: 'Retrogrades',
  'rising-sign': 'Rising sign',
  'saturn-return': 'Saturn return',
  sdk: 'SDK',
  terms: 'Terms',
  thesis: 'The Thesis',
  today: 'Today',
  tools: 'Astrology tools',
  transits: 'Transits',
  widgets: 'Widgets',
});

function normalizedPath(path) {
  const value = String(path || '/').split(/[?#]/, 1)[0];
  return value === '/' ? value : `/${value.replace(/^\/+|\/+$/g, '')}/`;
}

/** Return a generated card for a known page, or null for the global fallback. */
export function ogImageForPath(path) {
  const normalized = normalizedPath(path);
  const tool = OG_EN.tools.find((entry) => entry.path === normalized);
  if (tool) return `/assets/og/v2/tool/${tool.key}.png`;
  for (const special of [OG_EN.registry, OG_EN.thesis, OG_EN.disclosure]) {
    if (special.path === normalized) return special.image;
  }
  return null;
}

export function ogAltForPath(path) {
  const normalized = normalizedPath(path);
  const tool = OG_EN.tools.find((entry) => entry.path === normalized);
  if (tool) return `${tool.title} — Zodiacs.org`;
  for (const special of [OG_EN.registry, OG_EN.thesis, OG_EN.disclosure]) {
    if (special.path === normalized) return special.alt;
  }
  return OG_EN.fallbackAlt;
}

export function breadcrumbLabel(segment) {
  const key = decodeURIComponent(String(segment || '')).toLowerCase();
  return BREADCRUMB_LABELS[key]
    ?? key.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
