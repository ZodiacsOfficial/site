// Archive data for /archive/ — dated moments, press, and origin records.
//
// Sourcing rules:
//   - Quotes are verbatim. They are the record; do not paraphrase them,
//     "fix" their punctuation, or trim without an ellipsis.
//   - Every sourceUrl was supplied and verified by the project owner.
//     Entries without a link ship link-less rather than with a guessed URL.
//   - mintProof is validated against registry/zodiacs.registry.json at
//     build time; the build fails on any mismatch.
//   - Editorial text (title, lede, body) stays in the registry voice:
//     factual, past-tense, no forward-looking claims, no recommendations.

export const ARCHIVE_META = {
  title: 'The Archive',
  tagline: 'What the record remembers.',
  description:
    'Dated moments, press, and origin records for the twelve Zodiacs: ' +
    'the accidental Libra, the astrology girlies, and a register that ' +
    'verified itself in public.',
  url: 'https://zodiacs.org/archive/'
};

export const ENTRY_TYPES = ['moment', 'coverage', 'origin', 'context'];

// Rendered newest-first; `date` is the sort key (YYYY-MM-DD). When a moment
// has only year or month precision, `dateDisplay` overrides the rendered
// date while `date` keeps a sortable value.
export const ARCHIVE_ENTRIES = [
  {
    id: 'accidental-libra',
    date: '2025-02-17',
    type: 'moment',
    title: 'The accidental Libra',
    lede:
      'During the collapse of an unrelated token called LIBRA, Dave Portnoy ' +
      'bought the official Zodiac Libra by mistake, posted its mint verbatim ' +
      'to millions, and the record verified itself in public.',
    body: [
      'Days earlier, a token named LIBRA, amplified from the account of ' +
      'Argentina’s president, had collapsed in public view. Portnoy, ' +
      'who had been caught in that fall, went back in. He picked the wrong ' +
      'Libra: the zodiac one.',
      'Reports at the time put the move at a surge of roughly 3,000 percent ' +
      '(Decrypt, Yahoo Finance). The number mattered less than the ' +
      'mechanism. A verbatim mint address, posted in public, checkable ' +
      'against a registry that had been published long before.'
    ],
    quotes: [
      {
        text: 'Ps - I rugged myself! I’m buying the wrong libra! This league!!',
        attribution: 'Dave Portnoy · @stoolpresidente',
        sourceUrl: 'https://x.com/stoolpresidente/status/1891526647033024920'
      },
      {
        text:
          'Anybody wanna buy some fake Libra? Warning. This is a meme coin. ' +
          'I bought it by accident. It will be volatile. It will eventually ' +
          'go to zero. It may rip. It may tank. Don’t put on more than ' +
          'you can lose!!! It’s a collectible\n' +
          '7Zt2KUh5mkpEpPGcNcFy51aGkh9Ycb5ELcqRH1n2GmAe',
        attribution: 'Dave Portnoy · @stoolpresidente',
        sourceUrl: 'https://x.com/stoolpresidente/status/1891528769770279114',
        note: 'The address he posted matches the official record, character for character.'
      },
      {
        text: '\u{1F602}\u{1F602} Maybe I did Astrofolio maybe I did.',
        attribution: 'Dave Portnoy · @stoolpresidente',
        sourceUrl: 'https://x.com/stoolpresidente/status/1891542069690212669'
      },
      {
        text: 'Fake politicians come and go, but the signs are timeless.',
        attribution: 'Astrofolio · @astrofoliosol',
        sourceUrl: 'https://x.com/astrofoliosol/status/1891536867729743905'
      }
    ],
    mintProof: {
      address: '7Zt2KUh5mkpEpPGcNcFy51aGkh9Ycb5ELcqRH1n2GmAe',
      sign: 'libra'
    },
    sources: [
      { label: 'The re-entry post · @stoolpresidente',
        url: 'https://x.com/stoolpresidente/status/1891526130588406008' },
      { label: '“Bro pumped the astrofolio libra” · @karbonbased',
        url: 'https://x.com/karbonbased/status/1891528919628538182' },
      { label: '“This was always a part of the astrofolio thesis” · @DeeZe',
        url: 'https://x.com/DeeZe/status/1891529567266808245' },
      { label: '“libra results” · @inversebrah',
        url: 'https://x.com/inversebrah/status/1891510164081217726' }
    ],
    signs: ['libra']
  },
  {
    id: 'zodiac-iwo',
    date: '2025-02-06',
    type: 'moment',
    title: 'A nod from inversebrah',
    lede:
      'The most-watched lurker on crypto X turns its attention to the ' +
      'zodiac, in the signature shorthand.',
    body: [
      'Eleven days later, his Libra poll was running while Portnoy bought ' +
      'the wrong one.'
    ],
    quotes: [
      {
        text: 'wise move tbw consider investing in ur zodiac also iwo',
        attribution: 'inversebrah · @inversebrah',
        sourceUrl: 'https://x.com/inversebrah/status/1887520374964867250'
      }
    ],
    sources: [
      { label: 'The Libra poll, the week before the Portnoy moment',
        url: 'https://x.com/inversebrah/status/1890545754256572583' }
    ],
    signs: []
  },
  {
    id: 'onboarding-wave',
    date: '2025-01-27',
    type: 'moment',
    title: 'Twelve hundred first wallets',
    lede:
      'An Astrofolio airdrop run with iJaadee brings more than 1,200 women ' +
      'onchain, most of them to their first Solana wallet.',
    body: [
      'A community arriving through the signs themselves, many for the ' +
      'first time.'
    ],
    quotes: [
      {
        text:
          '@phantom Amazing stuff rn, @astrofoliosol and @iJaadee just ' +
          'organically onboarded 1200+ real women, to (most) their first ' +
          'Phantom and Solana via a @astrofoliosol airdrop!',
        attribution: 'wantonwallet · @wantonwallet, founder',
        sourceUrl: 'https://x.com/wantonwallet/status/1883692206349021677'
      }
    ],
    sources: [],
    signs: []
  },
  {
    id: 'astrology-girlies',
    date: '2025-01-19',
    type: 'moment',
    title: 'The astrology girlies arrive',
    lede:
      'iJaadee, an astrology voice with a six-figure following, calls her ' +
      'community into the twelve coins.',
    body: [
      'Her argument was structural: seven years of astro twitter, a ' +
      'centralized belief, all twelve signs accessible, and an identity ' +
      'rule that assigns everyone three of them: sun, moon, and rising.'
    ],
    quotes: [
      {
        text:
          'astrology girlies prepare yourself to invest in the ' +
          '@astrofoliosol coins … coin identity (easy. invest in your ' +
          'sun moon and rising sign)',
        attribution: 'iJaadee · @iJaadee',
        sourceUrl: 'https://x.com/iJaadee/status/1880988151805538587'
      }
    ],
    sources: [],
    signs: []
  },
  {
    id: 'oldest-meme',
    date: '2024-12-14',
    type: 'moment',
    title: 'Human civilization’s oldest meme',
    lede:
      'Andrew Kang of Mechanism Capital frames astrology as the ' +
      'longest-running meme in human history.',
    body: [
      'The registry’s own version of the argument lives on the thesis ' +
      'page: symbols with millennia of continuity make durable records.'
    ],
    quotes: [
      {
        text: 'Astrology — Human Civilization’s Oldest Meme',
        attribution: 'Andrew Kang · @Rewkang'
      }
    ],
    sources: [
      { label: 'The thesis, on this site', url: '/thesis/' }
    ],
    signs: []
  },
  {
    id: 'astrologers-arrive',
    date: '2024-11-22',
    type: 'moment',
    title: 'The astrologers have arrived',
    lede:
      'TikTokInvestors, the account that catalogues retail’s arrival ' +
      'in every cycle, files the zodiac moment early.',
    body: [],
    quotes: [
      {
        text: 'The astrologers have arrived',
        attribution: 'TikTokInvestors · @TikTokInvestors',
        sourceUrl: 'https://x.com/TikTokInvestors/status/1859805329145594113'
      }
    ],
    sources: [],
    signs: []
  },
  {
    id: 'horoscopes-to-hodl',
    date: '2024-08-29',
    type: 'coverage',
    title: 'Horoscopes to HODL',
    lede:
      'Numinous Realm publishes a long-form profile: an interview with the ' +
      'founder on fair distribution, BRC-20 origins, and what makes a ' +
      'perfect Lindy meme.',
    body: [
      'The project began in January 2024, inspired by the BRC-20 zodiac ' +
      'inscriptions: twelve signs, minted fairly, no presale. The ' +
      'founder’s phrase for it: the perfect Lindy meme.'
    ],
    quotes: [
      {
        text: 'Astrology enthusiasts, meme lovers, and crypto degens.',
        attribution: 'On the community · Numinous Realm',
        sourceUrl: 'https://numinousrealm.com/news/horoscopes-to-hodl-building-your-astrofolio'
      }
    ],
    sources: [
      { label: '“Horoscopes to HODL: Building your Astrofolio” · Somya Desai, Numinous Realm',
        url: 'https://numinousrealm.com/news/horoscopes-to-hodl-building-your-astrofolio' }
    ],
    signs: []
  },
  {
    id: 'origin',
    date: '2024-01-01',
    dateDisplay: '2024',
    type: 'origin',
    title: 'Twelve mints, one register',
    lede:
      'The twelve Zodiacs are minted on Solana and fully distributed. No ' +
      'presale, no allocation, a public record from the first day.',
    body: [
      'Each sign is one canonical SPL asset. Official Base representations ' +
      'follow by Wormhole bridge, each pointing back to its Solana origin.',
      'The community has since held through full market cycles. The ' +
      'register at zodiacs.org keeps the canonical addresses public and ' +
      'verifiable.'
    ],
    quotes: [],
    sources: [
      { label: 'The registry, machine-readable', url: '/registry/zodiacs.registry.json' }
    ],
    signs: [
      'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
      'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'
    ]
  },
  {
    id: 'pure-belief',
    date: '2025-10-01',
    dateDisplay: 'October 2025',
    type: 'context',
    title: 'A pure belief system',
    lede:
      'CZ describes gold as a pure belief system. The thesis applies the ' +
      'same lens to symbols that outlast the institutions around them.',
    body: [],
    quotes: [
      {
        text: 'Gold is a pure belief system.',
        attribution: 'Changpeng Zhao (CZ)'
      }
    ],
    sources: [
      { label: 'The thesis, on this site', url: '/thesis/' }
    ],
    signs: []
  }
];

export const PRESS_KIT = {
  boilerplate:
    'The Zodiacs are twelve onchain records of the zodiac signs: minted on ' +
    'Solana in 2024, fully distributed with no presale, bridged to Base, ' +
    'and registered at zodiacs.org. The registry is read-only and the ' +
    'record is public.',
  facts: [
    ['Origin', 'Minted on Solana, 2024'],
    ['Distribution', 'Fully distributed · no presale'],
    ['Representations', 'Native Solana SPL · official Base ERC-20 via Wormhole'],
    ['Edition', 'Twelve signs · one canonical record each']
  ],
  assets: [
    { label: 'Share cards · 1200×630 · /assets/og/{sign}.png', url: '/assets/og/libra.png' },
    { label: 'Sign icons · /assets/icons/{sign}.png', url: '/assets/icons/libra.png' },
    { label: 'Sculptural figures · /assets/nuggets/{sign}.png', url: '/assets/nuggets/libra.png' },
    { label: 'Registry JSON · machine-readable', url: '/registry/zodiacs.registry.json' },
    { label: 'SDK · GitHub', url: 'https://github.com/ZodiacsOfficial/sdk' }
  ],
  contact:
    'For press: direct message @astrofoliosol on X, or write in the ' +
    'Telegram channel. Quotes from this page may be reused with a link ' +
    'back to the archive.'
};
