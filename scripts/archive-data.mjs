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

import { EN } from '../src/strings/en.mjs';

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

/**
 * Receipt links are the direct record for an entry. Contextual and secondary
 * reporting stays in `sources`; an `archivedUrl` is left empty until the
 * operator supplies a real archive rather than a guessed one.
 */
function isAbsoluteHttpUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    const parsed = new URL(value);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

export function validateArchiveReceipts(entries) {
  if (!Array.isArray(entries)) throw new TypeError('Archive entries must be an array');

  for (const entry of entries) {
    const id = entry?.id || '(unknown)';
    if (!Array.isArray(entry?.receipts)) {
      throw new TypeError(`Archive entry ${id} must define a receipts array`);
    }

    entry.receipts.forEach((receipt, index) => {
      const prefix = `Archive receipt ${id}[${index}]`;
      if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) {
        throw new TypeError(`${prefix} must be an object`);
      }
      if (typeof receipt.label !== 'string' || !receipt.label.trim()) {
        throw new TypeError(`${prefix}.label must be a non-empty string`);
      }
      if (!isAbsoluteHttpUrl(receipt.url)) {
        throw new TypeError(`${prefix}.url must be an absolute HTTP(S) URL`);
      }
      if (typeof receipt.archivedUrl !== 'string') {
        throw new TypeError(`${prefix}.archivedUrl must be a string`);
      }
      if (receipt.archivedUrl && !isAbsoluteHttpUrl(receipt.archivedUrl)) {
        throw new TypeError(`${prefix}.archivedUrl must be empty or an absolute HTTP(S) URL`);
      }
    });
  }
}

export function listZeroReceiptEntryIds(entries = ARCHIVE_ENTRIES) {
  if (!Array.isArray(entries)) throw new TypeError('Archive entries must be an array');
  return entries
    .filter((entry) => !Array.isArray(entry?.receipts) || entry.receipts.length === 0)
    .map((entry) => entry?.id || '(unknown)');
}

export function hasArchivedPrimaryReceipt(entry) {
  return Array.isArray(entry?.receipts) && entry.receipts.some(
    (receipt) => typeof receipt?.archivedUrl === 'string' && receipt.archivedUrl.trim() !== '',
  );
}

export function receiptVerificationState(entry) {
  if (!entry?.requiresArchivedPrimaryReceipt) return null;
  return hasArchivedPrimaryReceipt(entry) ? 'verified' : 'pending';
}

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
    requiresArchivedPrimaryReceipt: true,
    receipts: [
      {
        label: EN['archive.entries.accidental-libra.receipts.wrongLibra'],
        url: 'https://x.com/stoolpresidente/status/1891526647033024920',
        // [OPERATOR TO SUPPLY ARCHIVED PRIMARY SOURCE]
        archivedUrl: ''
      },
      {
        label: EN['archive.entries.accidental-libra.receipts.mintAddress'],
        url: 'https://x.com/stoolpresidente/status/1891528769770279114',
        // [OPERATOR TO SUPPLY ARCHIVED PRIMARY SOURCE]
        archivedUrl: ''
      }
    ],
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
    receipts: [
      {
        label: EN['archive.entries.zodiac-iwo.receipts.primary'],
        url: 'https://x.com/inversebrah/status/1887520374964867250',
        archivedUrl: ''
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
    receipts: [
      {
        label: EN['archive.entries.onboarding-wave.receipts.primary'],
        url: 'https://x.com/wantonwallet/status/1883692206349021677',
        archivedUrl: ''
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
    receipts: [
      {
        label: EN['archive.entries.astrology-girlies.receipts.primary'],
        url: 'https://x.com/iJaadee/status/1880988151805538587',
        archivedUrl: ''
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
        text: 'Astrology - Human Civilization’s Oldest Meme',
        attribution: 'Andrew Kang · @Rewkang',
        sourceUrl: 'https://x.com/Rewkang/status/1867976901501009965'
      }
    ],
    receipts: [
      {
        label: EN['archive.entries.oldest-meme.receipts.primary'],
        url: 'https://x.com/Rewkang/status/1867976901501009965',
        archivedUrl: ''
      }
    ],
    sources: [
      { label: 'The original post on X', url: 'https://x.com/Rewkang/status/1867976901501009965' },
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
    receipts: [
      {
        label: EN['archive.entries.astrologers-arrive.receipts.primary'],
        url: 'https://x.com/TikTokInvestors/status/1859805329145594113',
        archivedUrl: ''
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
      'Numinous Realm publishes Somya Desai’s long-form article on Astrofolio ' +
      'and the meeting of astrology and cryptocurrency.',
    body: [
      'The article describes an ecosystem of Sun sign-themed tokens and ' +
      'includes an interview with wantonwallet about astrology, ' +
      'cryptocurrency, decentralization, and the project’s launch.'
    ],
    quotes: [
      {
        text: 'the depths to which you can go with astrology are beautifully endless.',
        attribution: 'wantonwallet, quoted by Somya Desai · Numinous Realm',
        sourceUrl: 'https://www.numinousrealm.com/news/horoscopes-to-hodl-building-your-astrofolio'
      }
    ],
    receipts: [
      {
        label: EN['archive.entries.horoscopes-to-hodl.receipts.primary'],
        url: 'https://www.numinousrealm.com/news/horoscopes-to-hodl-building-your-astrofolio',
        archivedUrl: ''
      }
    ],
    sources: [
      { label: '“Horoscopes to Hodl: Building Your Astrofolio” · Somya Desai, Numinous Realm',
        url: 'https://www.numinousrealm.com/news/horoscopes-to-hodl-building-your-astrofolio' }
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
      'The public registry records twelve native Solana assets and their ' +
      'official Base representations.',
    body: [
      'Each sign has one canonical Solana SPL record. Its official Base ' +
      'representation points back to that origin through Wormhole.',
      'The registry keeps the addresses, chain roles, and provenance public ' +
      'and machine-readable.'
    ],
    quotes: [],
    receipts: [
      {
        label: EN['archive.entries.origin.receipts.registry'],
        url: 'https://zodiacs.org/registry/zodiacs.registry.json',
        archivedUrl: ''
      }
    ],
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
    date: '2025-10-29',
    dateDisplay: 'October 2025',
    type: 'context',
    title: 'A pure belief system',
    lede:
      'CZ describes gold as a pure belief system. The thesis applies the ' +
      'same lens to symbols that outlast the institutions around them.',
    body: [],
    quotes: [
      {
        text:
          'Gold’s price is not derived from its industrial or utility ' +
          'value. Just a pure belief system.',
        attribution: 'Changpeng Zhao (CZ)',
        sourceUrl: 'https://x.com/cz_binance/status/1983514879643292126'
      }
    ],
    receipts: [
      {
        label: EN['archive.entries.pure-belief.receipts.primary'],
        url: 'https://x.com/cz_binance/status/1983514879643292126',
        archivedUrl: ''
      }
    ],
    sources: [
      { label: 'The original post on X', url: 'https://x.com/cz_binance/status/1983514879643292126' },
      { label: 'The thesis, on this site', url: '/thesis/' }
    ],
    signs: []
  }
];

export const PRESS_KIT = {
  boilerplate:
    'The Zodiacs are twelve onchain records of the zodiac signs: one native ' +
    'Solana asset and one official Base representation per sign, registered ' +
    'at zodiacs.org. The registry is read-only and the record is public.',
  facts: [
    ['Origin', 'Minted on Solana, 2024'],
    ['Registry', '12 signs · Solana + Base'],
    ['Representations', 'Native Solana SPL · official Base ERC-20 via Wormhole'],
    ['Edition', 'Twelve signs · one canonical record each']
  ],
  assets: [
    { label: 'Share cards · 1200×630 · /assets/og/v2/sign/{sign}.png', url: '/assets/og/v2/sign/libra.png' },
    { label: 'Sign icons · /assets/zodiac-icons/400/{sign}.webp', url: '/assets/zodiac-icons/400/libra.webp' },
    { label: 'Sculptural figures · /assets/nuggets/{sign}.png', url: '/assets/nuggets/libra.png' },
    { label: 'Registry JSON · machine-readable', url: '/registry/zodiacs.registry.json' },
    { label: 'SDK · GitHub', url: 'https://github.com/ZodiacsOfficial/sdk' }
  ],
  contact:
    'For press: direct message @astrofoliosol on X, or write in the ' +
    'Telegram channel. Quotes from this page may be reused with a link ' +
    'back to the archive.'
};
