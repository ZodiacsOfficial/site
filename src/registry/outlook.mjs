/**
 * Registry sky/market outlook model.
 *
 * This module is deliberately pure: callers provide an explicit UTC date and
 * the committed transit/ingress catalogs. It never reads the clock, filesystem,
 * wallet, or network. That makes a published outlook reproducible from the
 * source facts named in its output.
 *
 * The model keeps two things separate:
 *   1. a symbolic sky signal, calculated from disclosed astrology weights; and
 *   2. a descriptive market snapshot, calculated from live market fields.
 *
 * The market snapshot never changes the sky score. Directional price and
 * liquidity forecasts remain disabled until a timestamped history can be
 * evaluated out of sample against a non-astrological baseline.
 */

export const REGISTRY_SIGNS = Object.freeze([
  'aries',
  'taurus',
  'gemini',
  'cancer',
  'leo',
  'virgo',
  'libra',
  'scorpio',
  'sagittarius',
  'capricorn',
  'aquarius',
  'pisces',
]);

const SIGN_NAMES = Object.freeze(Object.fromEntries(
  REGISTRY_SIGNS.map((sign) => [sign, sign[0].toUpperCase() + sign.slice(1)]),
));

const OCCUPANCY_ATTENTION = Object.freeze({
  Sun: 9,
  Mercury: 5,
  Venus: 6,
  Mars: 7,
  Jupiter: 8,
  Saturn: 7,
  Uranus: 5,
  Neptune: 4,
  Pluto: 5,
});

const EVENT_WEIGHTS = Object.freeze({
  ingress: Object.freeze({ attention: 10, tone: 0, volatility: 2 }),
  'new-moon': Object.freeze({ attention: 22, tone: 8, volatility: 8 }),
  'full-moon': Object.freeze({ attention: 24, tone: 0, volatility: 16 }),
  'station-retrograde': Object.freeze({ attention: 20, tone: -10, volatility: 14 }),
  'station-direct': Object.freeze({ attention: 18, tone: 8, volatility: 8 }),
  conjunction: Object.freeze({ attention: 18, tone: 2, volatility: 10 }),
  trine: Object.freeze({ attention: 14, tone: 10, volatility: 3 }),
  sextile: Object.freeze({ attention: 12, tone: 7, volatility: 2 }),
  square: Object.freeze({ attention: 17, tone: -10, volatility: 12 }),
  opposition: Object.freeze({ attention: 18, tone: -12, volatility: 15 }),
});

const PLANETS = Object.freeze(Object.keys(OCCUPANCY_ATTENTION));
const EVENT_ARRAYS = Object.freeze(['ingresses', 'lunations', 'stations', 'aspects']);
const DAY_MS = 86_400_000;
const MINIMUM_HISTORY_DAYS = 180;

export const REGISTRY_OUTLOOK_METHOD = Object.freeze({
  id: 'zodiacs.registry-symbolic-outlook.v1',
  version: 1,
  posture: 'experimental-symbolic-index',
  formulas: Object.freeze({
    occupancy: 'A planet contributes its disclosed attention weight to the sign it occupies at 12:00 UTC on the first day.',
    eventProximity: 'event multiplier = 1 - 0.25 × elapsed horizon fraction; the multiplier therefore runs from 1.00 to 0.75.',
    ingress: 'attention = (10 + half the planet occupancy weight) × event multiplier; tone = 0.',
    otherEvents: 'attention, tone, and event intensity = disclosed event weight × event multiplier for every directly named sign.',
    totals: 'Sign totals are rounded sums, with attention and event intensity clamped to 0–100 and tone clamped to −100–100.',
    market: 'Liquidity depth compares a sign with the collection median; turnover is 24h volume ÷ indexed liquidity. Neither alters the sky signal.',
  }),
  scoreDefinitions: Object.freeze({
    attention: 'How concentrated the scored sky factors are on a sign.',
    tone: 'The supportive or frictional symbolism assigned to those factors.',
    volatility: 'A symbolic event-intensity index. It is not predicted realized market volatility.',
  }),
  occupancyAttention: OCCUPANCY_ATTENTION,
  eventWeights: EVENT_WEIGHTS,
  horizons: Object.freeze({ daily: 1, weekly: 7 }),
  evaluation: Object.freeze({
    minimumHistoryDays: MINIMUM_HISTORY_DAYS,
    baseline: 'Compare observed associations with persistence and equal-sign baselines on a held-out period.',
    priceMetric: 'Report subsequent price movement descriptively after estimated fees/slippage; do not infer causation.',
    liquidityMetric: 'Report subsequent indexed USD liquidity change descriptively; do not infer causation.',
    publicationRule: 'Publish each symbolic score before its market comparison; never rewrite the historical score.',
  }),
});

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function round(value, digits = 0) {
  const scale = 10 ** digits;
  return Math.round((value + Number.EPSILON) * scale) / scale;
}

function titleCase(value) {
  return String(value)
    .replaceAll('-', ' ')
    .replace(/\b\w/gu, (character) => character.toUpperCase());
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function assertDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(date ?? '')) {
    throw new Error(`Registry outlook date must use YYYY-MM-DD, received ${date}`);
  }
  const instant = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(instant.getTime()) || instant.toISOString().slice(0, 10) !== date) {
    throw new Error(`Registry outlook date is not a real UTC calendar day: ${date}`);
  }
}

function assertIsoInstant(value, label) {
  const date = new Date(value);
  if (typeof value !== 'string' || Number.isNaN(date.getTime()) || date.toISOString() !== value) {
    throw new Error(`${label} must be a canonical ISO instant`);
  }
}

function assertSign(sign, label) {
  if (!REGISTRY_SIGNS.includes(sign)) throw new Error(`${label} has unknown sign ${sign}`);
}

function monthKeysBetween(start, end) {
  const keys = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  while (cursor < end) {
    keys.push(cursor.toISOString().slice(0, 7));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return keys;
}

function normalizeTransitMonths(transitMonths) {
  if (!Array.isArray(transitMonths)) throw new Error('transitMonths must be an array');
  const byMonth = new Map();
  for (const [monthIndex, catalog] of transitMonths.entries()) {
    const label = `transitMonths[${monthIndex}]`;
    if (!isRecord(catalog) || !/^\d{4}-(?:0[1-9]|1[0-2])$/u.test(catalog.month ?? '')) {
      throw new Error(`${label}.month must use YYYY-MM`);
    }
    if (byMonth.has(catalog.month)) throw new Error(`Duplicate transit month ${catalog.month}`);
    for (const key of EVENT_ARRAYS) {
      if (!Array.isArray(catalog[key])) throw new Error(`${label}.${key} must be an array`);
      let prior = '';
      for (const [eventIndex, event] of catalog[key].entries()) {
        const eventLabel = `${label}.${key}[${eventIndex}]`;
        if (!isRecord(event)) throw new Error(`${eventLabel} must be an object`);
        assertIsoInstant(event.at, `${eventLabel}.at`);
        if (event.at.slice(0, 7) !== catalog.month) {
          throw new Error(`${eventLabel}.at must fall inside ${catalog.month}`);
        }
        if (event.at < prior) throw new Error(`${label}.${key} must be sorted by instant`);
        prior = event.at;
        if (key === 'ingresses') {
          if (!PLANETS.includes(event.planet)) throw new Error(`${eventLabel} has unknown planet ${event.planet}`);
          assertSign(event.sign, eventLabel);
        }
        if (key === 'lunations') {
          if (!['new', 'full'].includes(event.type)) throw new Error(`${eventLabel}.type must be new or full`);
          assertSign(event.sign, eventLabel);
        }
        if (key === 'stations') {
          if (!PLANETS.includes(event.planet)) throw new Error(`${eventLabel} has unknown planet ${event.planet}`);
          if (!['retrograde', 'direct'].includes(event.type)) {
            throw new Error(`${eventLabel}.type must be retrograde or direct`);
          }
          assertSign(event.sign, eventLabel);
        }
        if (key === 'aspects') {
          if (!PLANETS.includes(event.a) || !PLANETS.includes(event.b)) {
            throw new Error(`${eventLabel} contains an unknown planet`);
          }
          if (!EVENT_WEIGHTS[event.type]) throw new Error(`${eventLabel} has unsupported aspect ${event.type}`);
          assertSign(event.aSign, `${eventLabel}.aSign`);
          assertSign(event.bSign, `${eventLabel}.bSign`);
        }
      }
    }
    byMonth.set(catalog.month, catalog);
  }
  return byMonth;
}

function normalizeIngressWindows(ingressWindows) {
  if (!Array.isArray(ingressWindows)) throw new Error('ingressWindows must be an array');
  return ingressWindows.map((window, index) => {
    const label = `ingressWindows[${index}]`;
    if (!isRecord(window) || !PLANETS.includes(window.planet)) {
      throw new Error(`${label} must name a supported planet`);
    }
    assertSign(window.sign, label);
    assertIsoInstant(window.from, `${label}.from`);
    if (window.to !== null) {
      assertIsoInstant(window.to, `${label}.to`);
      if (window.to <= window.from) throw new Error(`${label}.to must be after .from`);
    }
    return window;
  });
}

function eventMultiplier(eventAt, startMs, durationMs) {
  const elapsedFraction = clamp((new Date(eventAt).getTime() - startMs) / durationMs, 0, 1);
  return round(1 - (0.25 * elapsedFraction), 4);
}

function points(weight, multiplier) {
  return round(weight * multiplier, 1);
}

function factorCalculation(base, multiplier) {
  const values = [`${base.attention} attention`, `${base.tone} tone`, `${base.volatility} event intensity`];
  return `${values.join(' / ')} × ${multiplier.toFixed(4)} horizon multiplier`;
}

function occupancyFactor(window, referenceAt) {
  const attention = OCCUPANCY_ATTENTION[window.planet];
  return {
    id: `occupancy:${window.planet.toLowerCase()}:${window.sign}:${referenceAt}`,
    kind: 'occupancy',
    at: referenceAt,
    bodies: [window.planet],
    signs: [window.sign],
    label: `${window.planet} in ${SIGN_NAMES[window.sign]}`,
    attentionPoints: attention,
    tonePoints: 0,
    volatilityPoints: 0,
    calculation: `${attention} disclosed ${window.planet} occupancy-attention points`,
    explanation: `${window.planet} occupies ${SIGN_NAMES[window.sign]} at the UTC reference point. This adds symbolic attention, not a directional market claim.`,
    source: 'src/data/ingresses.json',
  };
}

function ingressFactor(event, source, multiplier) {
  const base = {
    ...EVENT_WEIGHTS.ingress,
    attention: EVENT_WEIGHTS.ingress.attention + (OCCUPANCY_ATTENTION[event.planet] / 2),
  };
  return {
    id: `ingress:${event.planet.toLowerCase()}:${event.sign}:${event.at}`,
    kind: 'ingress',
    at: event.at,
    bodies: [event.planet],
    signs: [event.sign],
    label: `${event.planet} enters ${SIGN_NAMES[event.sign]}`,
    attentionPoints: points(base.attention, multiplier),
    tonePoints: points(base.tone, multiplier),
    volatilityPoints: points(base.volatility, multiplier),
    basePoints: base,
    horizonMultiplier: multiplier,
    calculation: factorCalculation(base, multiplier),
    explanation: `The ingress adds attention to ${SIGN_NAMES[event.sign]}. Ingresses are intentionally neutral on price direction.`,
    source,
  };
}

function lunationFactor(event, source, multiplier) {
  const key = `${event.type}-moon`;
  const base = EVENT_WEIGHTS[key];
  const newMoon = event.type === 'new';
  return {
    id: `lunation:${event.type}:${event.sign}:${event.at}`,
    kind: 'lunation',
    at: event.at,
    bodies: ['Sun', 'Moon'],
    signs: [event.sign],
    label: `${newMoon ? 'New' : 'Full'} Moon in ${SIGN_NAMES[event.sign]}`,
    attentionPoints: points(base.attention, multiplier),
    tonePoints: points(base.tone, multiplier),
    volatilityPoints: points(base.volatility, multiplier),
    basePoints: base,
    horizonMultiplier: multiplier,
    calculation: factorCalculation(base, multiplier),
    explanation: newMoon
      ? `A new Moon is scored as symbolic renewal for ${SIGN_NAMES[event.sign]}; that is an astrology convention, not evidence of higher returns.`
      : `A full Moon is scored as culmination and higher symbolic intensity for ${SIGN_NAMES[event.sign]}, without assigning a price direction.`,
    source,
  };
}

function stationFactor(event, source, multiplier) {
  const key = `station-${event.type}`;
  const base = EVENT_WEIGHTS[key];
  return {
    id: `station:${event.planet.toLowerCase()}:${event.type}:${event.sign}:${event.at}`,
    kind: 'station',
    at: event.at,
    bodies: [event.planet],
    signs: [event.sign],
    label: `${event.planet} stations ${event.type} in ${SIGN_NAMES[event.sign]}`,
    attentionPoints: points(base.attention, multiplier),
    tonePoints: points(base.tone, multiplier),
    volatilityPoints: points(base.volatility, multiplier),
    basePoints: base,
    horizonMultiplier: multiplier,
    calculation: factorCalculation(base, multiplier),
    explanation: event.type === 'retrograde'
      ? `The retrograde station is treated as review/friction in ${SIGN_NAMES[event.sign]}; it does not predict a price decline.`
      : `The direct station is treated as release/forward motion in ${SIGN_NAMES[event.sign]}; it does not predict a price gain.`,
    source,
  };
}

function aspectFactor(event, source, multiplier) {
  const base = EVENT_WEIGHTS[event.type];
  const signs = [...new Set([event.aSign, event.bSign])];
  const isSupportive = ['trine', 'sextile'].includes(event.type);
  const isTense = ['square', 'opposition'].includes(event.type);
  const reading = isSupportive ? 'supportive' : isTense ? 'frictional' : 'amplifying';
  return {
    id: `aspect:${event.a.toLowerCase()}:${event.b.toLowerCase()}:${event.type}:${event.at}`,
    kind: 'aspect',
    at: event.at,
    bodies: [event.a, event.b],
    signs,
    label: `${event.a} ${event.type} ${event.b}`,
    attentionPoints: points(base.attention, multiplier),
    tonePoints: points(base.tone, multiplier),
    volatilityPoints: points(base.volatility, multiplier),
    basePoints: base,
    horizonMultiplier: multiplier,
    calculation: factorCalculation(base, multiplier),
    explanation: `The exact ${event.type} is scored as ${reading} for the directly occupied signs (${signs.map((sign) => SIGN_NAMES[sign]).join(' and ')}). This is symbolic scoring, not a causal market mechanism.`,
    source,
  };
}

function factorForEvent(kind, event, source, multiplier) {
  if (kind === 'ingresses') return ingressFactor(event, source, multiplier);
  if (kind === 'lunations') return lunationFactor(event, source, multiplier);
  if (kind === 'stations') return stationFactor(event, source, multiplier);
  return aspectFactor(event, source, multiplier);
}

function numericField(entry, names) {
  for (const name of names) {
    if (entry?.[name] === null || entry?.[name] === undefined || entry?.[name] === '') continue;
    const value = Number(entry[name]);
    if (Number.isFinite(value)) return value;
  }
  return null;
}

function median(values) {
  const ordered = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (ordered.length === 0) return null;
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

function normalizeMarkets(marketBySign) {
  if (marketBySign === undefined || marketBySign === null) return new Map();
  if (!isRecord(marketBySign)) throw new Error('marketBySign must be an object keyed by sign');
  const markets = new Map();
  for (const [sign, entry] of Object.entries(marketBySign)) {
    assertSign(sign, 'marketBySign');
    if (!isRecord(entry)) throw new Error(`marketBySign.${sign} must be an object`);
    const normalized = {
      priceUsd: numericField(entry, ['priceUsd', 'price']),
      change24hPct: numericField(entry, ['change24hPct', 'change24h', 'priceChange24h']),
      marketCapUsd: numericField(entry, ['marketCapUsd', 'marketCap']),
      liquidityUsd: numericField(entry, ['liquidityUsd', 'liquidity']),
      volume24hUsd: numericField(entry, ['volume24hUsd', 'volume24h']),
    };
    for (const [field, value] of Object.entries(normalized)) {
      if (value !== null && field !== 'change24hPct' && value < 0) {
        throw new Error(`marketBySign.${sign}.${field} cannot be negative`);
      }
    }
    markets.set(sign, normalized);
  }
  return markets;
}

function marketContexts(markets) {
  const liquidityMedian = median([...markets.values()].map((market) => market.liquidityUsd));
  const capMedian = median([...markets.values()].map((market) => market.marketCapUsd));
  const bySign = new Map();
  for (const sign of REGISTRY_SIGNS) {
    const market = markets.get(sign);
    if (!market) {
      bySign.set(sign, {
        available: false,
        note: 'No indexed market snapshot was supplied for this sign.',
      });
      continue;
    }
    const liquidityVsMedian = market.liquidityUsd !== null && liquidityMedian > 0
      ? round(market.liquidityUsd / liquidityMedian, 2)
      : null;
    const marketCapVsMedian = market.marketCapUsd !== null && capMedian > 0
      ? round(market.marketCapUsd / capMedian, 2)
      : null;
    const turnover24h = market.volume24hUsd !== null && market.liquidityUsd > 0
      ? round(market.volume24hUsd / market.liquidityUsd, 2)
      : null;
    const liquidityBand = liquidityVsMedian === null
      ? 'unknown'
      : liquidityVsMedian >= 1.5 ? 'deeper' : liquidityVsMedian < 0.67 ? 'thinner' : 'near-median';
    const participationBand = turnover24h === null
      ? 'unknown'
      : turnover24h >= 1 ? 'high' : turnover24h < 0.2 ? 'low' : 'typical';
    bySign.set(sign, {
      available: Object.values(market).some((value) => value !== null),
      ...market,
      liquidityVsCollectionMedian: liquidityVsMedian,
      marketCapVsCollectionMedian: marketCapVsMedian,
      turnover24h,
      liquidityBand,
      participationBand,
      note: 'Descriptive snapshot only; these fields do not alter the symbolic sky score or predict the next period.',
    });
  }
  return {
    medians: {
      liquidityUsd: liquidityMedian === null ? null : round(liquidityMedian, 2),
      marketCapUsd: capMedian === null ? null : round(capMedian, 2),
    },
    bySign,
  };
}

function signalFor({ attention, tone, volatility }) {
  if (attention < 10) return 'quiet';
  if (volatility >= 25 && Math.abs(tone) < 10) return 'charged';
  if (tone >= 12) return 'supportive';
  if (tone <= -12) return 'watchful';
  if (attention >= 25) return 'active';
  return 'steady';
}

function summaryFor(signal, attention, tone, volatility) {
  const attentionCopy = attention >= 50
    ? 'High symbolic attention'
    : attention >= 25 ? 'Elevated symbolic attention' : attention >= 10 ? 'A modest sky emphasis' : 'A quiet sky window';
  const toneCopy = tone >= 12
    ? 'with a supportive event mix'
    : tone <= -12 ? 'with more friction than ease' : 'without a strong directional tone';
  const volatilityCopy = volatility >= 25 ? ' Symbolic intensity is elevated.' : '';
  return `${attentionCopy} for this sign, ${toneCopy}.${volatilityCopy} Signal: ${signal}.`;
}

function normalizeHistory(history) {
  if (history === undefined || history === null) return { daysObserved: 0 };
  if (!isRecord(history)) throw new Error('history must be an object');
  const daysObserved = Number(history.daysObserved ?? 0);
  if (!Number.isInteger(daysObserved) || daysObserved < 0) {
    throw new Error('history.daysObserved must be a non-negative integer');
  }
  return { daysObserved };
}

function evidenceState(history) {
  const remaining = Math.max(0, MINIMUM_HISTORY_DAYS - history.daysObserved);
  return {
    status: remaining === 0 ? 'eligible-for-evaluation' : 'collecting',
    historyDaysObserved: history.daysObserved,
    minimumHistoryDays: MINIMUM_HISTORY_DAYS,
    historyDaysRemaining: remaining,
    directionalForecasts: 'disabled',
    confidence: {
      label: 'not-yet-calibrated',
      score: null,
      reason: remaining === 0
        ? 'The minimum sample exists, but forecasts remain disabled until a held-out evaluation beats the disclosed baselines.'
        : `No predictive accuracy is claimed. ${remaining} more daily observations are required before the first eligible evaluation.`,
    },
  };
}

function marketFreshness(marketAsOf, end) {
  if (marketAsOf === undefined || marketAsOf === null) {
    return { asOf: null, status: 'timestamp-not-supplied', ageHoursAtHorizonEnd: null };
  }
  assertIsoInstant(marketAsOf, 'marketAsOf');
  const ageHours = round((end.getTime() - new Date(marketAsOf).getTime()) / 3_600_000, 1);
  return {
    asOf: marketAsOf,
    status: ageHours < 0 ? 'after-horizon' : ageHours <= 24 ? 'current-for-horizon' : 'stale-for-horizon',
    ageHoursAtHorizonEnd: ageHours,
  };
}

/**
 * Build one reproducible daily or weekly Registry outlook.
 *
 * @param {object} options
 * @param {string} options.date UTC date in YYYY-MM-DD form.
 * @param {'daily'|'weekly'} [options.horizon='daily']
 * @param {object[]} options.transitMonths Parsed transits-YYYY-MM.json files
 *   covering the requested horizon. Missing months are reported, not hidden.
 * @param {object[]} options.ingressWindows Parsed ingresses.json `windows`.
 * @param {object} [options.marketBySign] Optional descriptive live fields keyed
 *   by sign: priceUsd, change24hPct, marketCapUsd, liquidityUsd, volume24hUsd.
 * @param {string} [options.marketAsOf] Canonical ISO timestamp for market data.
 * @param {{daysObserved:number}} [options.history]
 */
export function buildRegistryOutlook({
  date,
  horizon = 'daily',
  transitMonths = [],
  ingressWindows = [],
  marketBySign,
  marketAsOf,
  history,
} = {}) {
  assertDate(date);
  const horizonDays = REGISTRY_OUTLOOK_METHOD.horizons[horizon];
  if (!horizonDays) throw new Error(`Registry outlook horizon must be daily or weekly, received ${horizon}`);

  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(start.getTime() + (horizonDays * DAY_MS));
  const referenceAt = new Date(start.getTime() + (DAY_MS / 2)).toISOString();
  const catalogs = normalizeTransitMonths(transitMonths);
  const windows = normalizeIngressWindows(ingressWindows);
  const expectedMonths = monthKeysBetween(start, end);
  const missingMonths = expectedMonths.filter((month) => !catalogs.has(month));
  const factorsBySign = new Map(REGISTRY_SIGNS.map((sign) => [sign, []]));
  const missingOccupancies = [];

  for (const planet of PLANETS) {
    const window = windows.find((candidate) => (
      candidate.planet === planet
      && candidate.from <= referenceAt
      && (candidate.to === null || referenceAt < candidate.to)
    ));
    if (!window) {
      missingOccupancies.push(planet);
      continue;
    }
    factorsBySign.get(window.sign).push(occupancyFactor(window, referenceAt));
  }

  for (const month of expectedMonths) {
    const catalog = catalogs.get(month);
    if (!catalog) continue;
    const source = `src/data/transits-${month}.json`;
    for (const kind of EVENT_ARRAYS) {
      for (const event of catalog[kind]) {
        const at = new Date(event.at);
        if (at < start || at >= end) continue;
        const multiplier = eventMultiplier(event.at, start.getTime(), end.getTime() - start.getTime());
        const factor = factorForEvent(kind, event, source, multiplier);
        for (const sign of factor.signs) factorsBySign.get(sign).push(factor);
      }
    }
  }

  const markets = normalizeMarkets(marketBySign);
  const contexts = marketContexts(markets);
  const signs = REGISTRY_SIGNS.map((sign) => {
    const factors = factorsBySign.get(sign).sort((a, b) => (
      (b.attentionPoints + b.volatilityPoints) - (a.attentionPoints + a.volatilityPoints)
      || a.at.localeCompare(b.at)
      || a.id.localeCompare(b.id)
    ));
    const attention = clamp(Math.round(factors.reduce((sum, factor) => sum + factor.attentionPoints, 0)), 0, 100);
    const tone = clamp(Math.round(factors.reduce((sum, factor) => sum + factor.tonePoints, 0)), -100, 100);
    const volatility = clamp(Math.round(factors.reduce((sum, factor) => sum + factor.volatilityPoints, 0)), 0, 100);
    const signal = signalFor({ attention, tone, volatility });
    return {
      sign,
      displayName: SIGN_NAMES[sign],
      signal,
      scores: { attention, tone, volatility },
      summary: summaryFor(signal, attention, tone, volatility),
      primaryFactor: factors[0] ?? null,
      factors,
      market: contexts.bySign.get(sign),
    };
  });

  const ranked = [...signs].sort((a, b) => (
    b.scores.attention - a.scores.attention
    || b.scores.volatility - a.scores.volatility
    || REGISTRY_SIGNS.indexOf(a.sign) - REGISTRY_SIGNS.indexOf(b.sign)
  ));
  ranked.forEach((entry, index) => {
    entry.attentionRank = index + 1;
  });

  const eventCoverage = missingMonths.length === 0
    ? 'complete'
    : missingMonths.length === expectedMonths.length ? 'unavailable' : 'partial';
  const occupancyCoverage = missingOccupancies.length === 0
    ? 'complete'
    : missingOccupancies.length === PLANETS.length ? 'unavailable' : 'partial';
  const overallCoverage = eventCoverage === 'complete' && occupancyCoverage === 'complete'
    ? 'complete'
    : eventCoverage === 'unavailable' && occupancyCoverage === 'unavailable' ? 'unavailable' : 'partial';

  return {
    schema: 'zodiacs.registry-outlook.v1',
    date,
    horizon: {
      kind: horizon,
      days: horizonDays,
      from: start.toISOString(),
      toExclusive: end.toISOString(),
      referenceAt,
    },
    method: REGISTRY_OUTLOOK_METHOD,
    coverage: {
      overall: overallCoverage,
      events: eventCoverage,
      occupancies: occupancyCoverage,
      expectedTransitMonths: expectedMonths,
      missingTransitMonths: missingMonths,
      missingOccupancyPlanets: missingOccupancies,
    },
    marketSnapshot: {
      suppliedSigns: markets.size,
      medians: contexts.medians,
      freshness: marketFreshness(marketAsOf, end),
      separationRule: 'Market fields are descriptive and never alter the symbolic sky scores.',
    },
    evidence: evidenceState(normalizeHistory(history)),
    forecast: {
      status: 'research-only',
      priceDirection: null,
      liquidityDirection: null,
      statement: 'This release publishes symbolic attention/tone signals and descriptive market context. It does not claim that planetary movements predict price or liquidity.',
    },
    signs,
    limitations: [
      'Astrological factor weights are disclosed editorial choices, not established financial causes.',
      'A current cross-sectional market snapshot cannot establish predictive power.',
      'Low-liquidity assets can move sharply and quoted execution can differ from displayed prices.',
      'This is research and cultural context, not financial advice.',
    ],
  };
}

/** Build the paired daily and seven-day editions from the same facts. */
export function buildRegistryOutlooks(options = {}) {
  return {
    daily: buildRegistryOutlook({ ...options, horizon: 'daily' }),
    weekly: buildRegistryOutlook({ ...options, horizon: 'weekly' }),
  };
}

/** A compact, deterministic share caption for a sign's published outlook. */
export function formatRegistryOutlookShareText(outlook, sign, url = 'https://zodiacs.org/terminal/') {
  if (!isRecord(outlook) || outlook.schema !== 'zodiacs.registry-outlook.v1') {
    throw new Error('formatRegistryOutlookShareText requires a Registry outlook');
  }
  assertSign(sign, 'share sign');
  const entry = outlook.signs?.find((candidate) => candidate.sign === sign);
  if (!entry) throw new Error(`Registry outlook is missing ${sign}`);
  const horizon = outlook.horizon.kind === 'weekly' ? '7-day' : 'daily';
  return [
    `${entry.displayName} · ${horizon} sky signal: ${titleCase(entry.signal)}`,
    `Attention ${entry.scores.attention}/100 · tone ${entry.scores.tone >= 0 ? '+' : ''}${entry.scores.tone} · event intensity ${entry.scores.volatility}/100`,
    entry.primaryFactor ? `Main factor: ${entry.primaryFactor.label}.` : 'Main factor: no exact event in this window.',
    'Experimental symbolic index — not a price forecast or financial advice.',
    url,
  ].join('\n');
}
