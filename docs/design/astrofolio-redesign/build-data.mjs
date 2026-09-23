#!/usr/bin/env node
/**
 * Bakes the data the Astrofolio redesign prototypes read into shared/data.js:
 * the twelve signs (hues, dates, copy), each sign's verified Solana and Base
 * addresses from the public Registry, the fomo deep link built the same way
 * the live vitrine builds it, the latest committed DexScreener snapshot with a
 * 14-day price series, the Sun's sign-ingress times, and the canonical static
 * footer. Prototype support only; nothing in the site build imports it.
 *
 *   node docs/design/astrofolio-redesign/build-data.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderStaticFooter } from '../../../scripts/site-footer.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../..');
const json = (path) => JSON.parse(readFileSync(resolve(root, path), 'utf8'));

// Mirrors src/lib/signs.ts (order, hues, dates) and SITE_SIGN_COPY in src/app.jsx.
const SIGNS = [
  ['aries', 'Aries', '♈', 'Mar 21 – Apr 19', 'March 21 to April 19', 'fire', 'cardinal', 'Mars', '#DE8E79', 'The first spark. Aries marks the vernal equinox, long honored across civilizations as the renewal of time and the opening of the symbolic year.'],
  ['taurus', 'Taurus', '♉', 'Apr 20 – May 20', 'April 20 to May 20', 'earth', 'fixed', 'Venus', '#B9D4BE', 'The bull held sacred from Çatalhöyük to Knossos. Taurus carries a long memory of fertility, endurance, and material stewardship.'],
  ['gemini', 'Gemini', '♊', 'May 21 – Jun 20', 'May 21 to June 20', 'air', 'mutable', 'Mercury', '#B29DD0', 'The twins. From Castor and Pollux to the dual nature of language itself, Gemini holds the symbol of human exchange and discourse.'],
  ['cancer', 'Cancer', '♋', 'Jun 21 – Jul 22', 'June 21 to July 22', 'water', 'cardinal', 'Moon', '#B6D4E4', 'The crab at the summer solstice. Cancer preserves the ancient image of home, memory, and the inner tide.'],
  ['leo', 'Leo', '♌', 'Jul 23 – Aug 22', 'July 23 to August 22', 'fire', 'fixed', 'Sun', '#E0A9B4', 'The lion. Older than empires. Leo carries the sun at the height of summer. The symbol of radiant authority and visible self.'],
  ['virgo', 'Virgo', '♍', 'Aug 23 – Sep 22', 'August 23 to September 22', 'earth', 'mutable', 'Mercury', '#B7D9B0', 'The maiden of the harvest. Virgo preserves the long lineage of craft, discernment, and the discipline of measure.'],
  ['libra', 'Libra', '♎', 'Sep 23 – Oct 22', 'September 23 to October 22', 'air', 'cardinal', 'Venus', '#D3A9DE', 'The scales. The autumn equinox. Libra holds the symbol of balance, civic measure, and the law as a cultural form.'],
  ['scorpio', 'Scorpio', '♏', 'Oct 23 – Nov 21', 'October 23 to November 21', 'water', 'fixed', 'Pluto', '#B9DCE8', 'The scorpion of the deep year. Scorpio carries the rites of transformation. The threshold between what passes and what endures.'],
  ['sagittarius', 'Sagittarius', '♐', 'Nov 22 – Dec 21', 'November 22 to December 21', 'fire', 'mutable', 'Jupiter', '#E0B080', 'The archer at the galactic center. Sagittarius preserves the impulse to travel, to inquire, to chart what lies beyond the known.'],
  ['capricorn', 'Capricorn', '♑', 'Dec 22 – Jan 19', 'December 22 to January 19', 'earth', 'cardinal', 'Saturn', '#C0DEA8', 'The sea-goat. The winter solstice. Capricorn carries the long pattern of structure, lineage, and the building of enduring forms.'],
  ['aquarius', 'Aquarius', '♒', 'Jan 20 – Feb 18', 'January 20 to February 18', 'air', 'fixed', 'Uranus', '#AE8FC9', 'The water-bearer. Aquarius holds the symbol of the unbound mind: invention, dissent, the long arc of cultural shift.'],
  ['pisces', 'Pisces', '♓', 'Feb 19 – Mar 20', 'February 19 to March 20', 'water', 'mutable', 'Neptune', '#A9D4C4', 'Two fishes bound by a silver cord. Pisces closes the wheel. The symbol of dissolution, depth, and the world before the next renewal.'],
];
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const SPARK_DAYS = 14;

const registry = json('public/registry/zodiacs.registry.json');
const history = json('public/assets/data/registry-market-history.v1.json').snapshots;
const latest = history[history.length - 1];
const recent = history.slice(-SPARK_DAYS);

const signs = SIGNS.map(([slug, name, glyph, dates, datesLong, element, modality, ruler, hue, bio], index) => {
  const asset = registry.assets.find((entry) => entry.sign === slug);
  const solana = asset.representations.find((rep) => rep.chain === 'solana');
  const base = asset.representations.find((rep) => rep.chain === 'base');
  const market = latest.assets.find((entry) => entry.sign === slug) ?? {};
  return {
    slug, name, glyph, dates, datesLong, element, modality, ruler, hue, bio,
    order: index + 1,
    roman: ROMAN[index],
    longitude: index * 30,
    symbol: solana.symbol,
    solana: solana.address,
    base: base.address,
    fomo: `https://fomo.family/coin?address=${encodeURIComponent(solana.address)}&chainId=1399811149`,
    registry: `https://zodiacs.org/registry/${slug}/`,
    howToBuy: `https://zodiacs.org/astrofolio/how-to-buy/${slug}/`,
    price: market.priceUsd ?? null,
    change: market.change24hPct ?? null,
    marketCap: market.marketCapUsd ?? null,
    series: recent.map((snap) => snap.assets.find((entry) => entry.sign === slug)?.priceUsd ?? null),
  };
});

const byCap = [...signs].sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0));
for (const sign of signs) sign.rank = byCap.indexOf(sign) + 1;

// Sun ingress windows (exact UTC times from the site's own ingress table).
const sunWindows = json('src/data/ingresses.json').windows
  .filter((w) => w.planet === 'Sun' && w.from >= '2026-01-01' && w.from < '2028-01-01')
  .map(({ sign, from, to }) => ({ sign, from, to }));

const footer = renderStaticFooter({ established: 'MMXXIV' });

const data = {
  snapshot: { date: latest.date, readAt: latest.source?.readAt, provider: latest.source?.provider ?? 'DexScreener', days: recent.length, dates: recent.map((s) => s.date) },
  signs,
  sunWindows,
  shop: [
    { name: 'Astrofolio T-shirt', image: 't-shirt-800.webp', href: 'https://shop.app/products/9655740694871/astrofolio-t-shirt' },
    { name: 'Astrofolio Cap', image: 'cap-800.webp', href: 'https://shop.app/products/9654676455767/astrofolio-cap' },
    { name: 'Astrofolio Hoodie', image: 'hoodie-800.webp', href: 'https://shop.app/products/9654762504535/astrofolio-hoodie' },
  ],
  faqs: [
    ['What is Astrofolio?', 'Astrofolio is the collection of twelve official Zodiac tokens—one for each sign—with its own design and public Registry record.'],
    ['How do I know a Zodiac is official?', 'Compare the complete token address with the published Registry. A name or ticker alone is not enough.'],
    ['Why does each sign have Solana and Base addresses?', 'Each Zodiac began on Solana and has an official Base counterpart. Both verified addresses appear in the same Registry record.'],
    ['Do I need a wallet to browse?', 'No. You can browse the collection, see market context, and verify addresses without connecting a wallet.'],
    ['Where can I find Astrofolio merchandise?', 'Browse the Astrofolio Shop for clothing inspired by the twelve signs.'],
    ['What are the risks?', 'Zodiac tokens are speculative and can be volatile or hard to sell. Prices can fall to zero, and wallet mistakes or scams can cause permanent loss.'],
    ['What is the Terminal?', 'The Terminal is the market desk for all twelve Zodiacs, with live prices, liquidity, charts, season context, research, and trading. Jupiter Ultra supplies the executable route and transaction; your wallet reviews, approves, and signs.'],
  ],
  notice: [
    'Zodiac tokens are speculative, thinly traded digital assets. Prices can be volatile, liquidity may disappear, and you could lose all money used to acquire one. Astrology has no established predictive relationship with asset prices.',
    'Zodiacs.org provides the Terminal interface and public Registry; it does not operate a DEX, exchange, broker, or custodial service. When trading is available, Jupiter, an independent third-party liquidity aggregator, supplies the executable quote, builds and submits the transaction, and charges any venue fee shown; your wallet reviews, approves, and signs. Zodiacs.org holds no keys or funds, cannot reverse transactions, and receives no trading or referral compensation. References to Jupiter do not imply affiliation or endorsement.',
    'Information is for informational purposes only and is not an offer or solicitation, an investment recommendation or trading strategy, or accounting, legal, tax, or financial advice. Third-party services may not be available in all regions. Verify the official address, network, amount, fees, and destination before signing.',
  ],
  footer,
};

const banner = '// Generated by build-data.mjs from the Registry, the committed market history,\n// src/data/ingresses.json and scripts/site-footer.mjs. Do not hand-edit.\n';
writeFileSync(resolve(here, 'shared/data.js'), `${banner}export const DATA = ${JSON.stringify(data, null, 1)};\n`);
console.log(`shared/data.js: ${signs.length} signs, snapshot ${latest.date}, ${sunWindows.length} Sun windows`);
