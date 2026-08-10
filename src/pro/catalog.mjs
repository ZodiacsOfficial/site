import {
  ProQuoteError,
  USDC_MINT,
  isSolanaAddress,
  normalizeQuoteIntent,
} from './execution/contracts.mjs';

export const PRO_SIGNS = Object.freeze([
  { slug: 'aries', name: 'Aries', glyph: '♈', hue: '#DE8E79' },
  { slug: 'taurus', name: 'Taurus', glyph: '♉', hue: '#B9D4BE' },
  { slug: 'gemini', name: 'Gemini', glyph: '♊', hue: '#B29DD0' },
  { slug: 'cancer', name: 'Cancer', glyph: '♋', hue: '#B6D4E4' },
  { slug: 'leo', name: 'Leo', glyph: '♌', hue: '#E0A9B4' },
  { slug: 'virgo', name: 'Virgo', glyph: '♍', hue: '#B7D9B0' },
  { slug: 'libra', name: 'Libra', glyph: '♎', hue: '#D3A9DE' },
  { slug: 'scorpio', name: 'Scorpio', glyph: '♏', hue: '#B9DCE8' },
  { slug: 'sagittarius', name: 'Sagittarius', glyph: '♐', hue: '#E0B080' },
  { slug: 'capricorn', name: 'Capricorn', glyph: '♑', hue: '#C0DEA8' },
  { slug: 'aquarius', name: 'Aquarius', glyph: '♒', hue: '#AE8FC9' },
  { slug: 'pisces', name: 'Pisces', glyph: '♓', hue: '#A9D4C4' },
]);

export function normalizeRegistryMarkets(document) {
  if (!document || !Array.isArray(document.assets)) {
    throw new ProQuoteError('unavailable', 'The Registry is unavailable.');
  }
  const markets = new Map();
  const seenMints = new Set();
  for (const sign of PRO_SIGNS) {
    const asset = document.assets.find((entry) => entry?.sign === sign.slug);
    const native = asset?.native;
    if (!native
        || native.chain !== 'solana'
        || native.tokenStandard !== 'SPL'
        || native.isCanonicalOrigin !== true
        || native.isOfficialRepresentation !== true
        || native.sign !== sign.slug
        || native.decimals !== 6
        || typeof native.address !== 'string'
        || !isSolanaAddress(native.address)
        || native.address === USDC_MINT
        || seenMints.has(native.address)
        || typeof native.symbol !== 'string') {
      throw new ProQuoteError('unavailable', `The ${sign.name} Registry record is invalid.`);
    }
    markets.set(sign.slug, Object.freeze({
      ...sign,
      mint: native.address,
      decimals: native.decimals,
      symbol: native.symbol,
    }));
    seenMints.add(native.address);
  }
  if (markets.size !== PRO_SIGNS.length) {
    throw new ProQuoteError('unavailable', 'The Registry does not contain all twelve markets.');
  }
  return markets;
}

export function intentForMarket(markets, { sign, side, amount, slippageBps }) {
  const market = markets.get(sign);
  if (!market || (side !== 'buy' && side !== 'sell')) {
    throw new ProQuoteError('invalid_intent', 'Choose an official market and side.');
  }
  const officialMints = new Set([...markets.values()].map((entry) => entry.mint));
  return normalizeQuoteIntent({
    inputMint: side === 'buy' ? USDC_MINT : market.mint,
    outputMint: side === 'buy' ? market.mint : USDC_MINT,
    amount,
    slippageBps,
  }, { officialMints });
}

export async function readRegistryMarkets({
  fetchImpl = globalThis.fetch,
  url = '/registry/zodiacs.registry.json',
  signal,
} = {}) {
  const response = await fetchImpl(url, { headers: { accept: 'application/json' }, signal, cache: 'no-store' });
  if (!response.ok) throw new ProQuoteError('unavailable', `The Registry could not be read (${response.status}).`);
  return normalizeRegistryMarkets(await response.json());
}
