const DATE_RANGE_PATTERN = /^(\d{2})-(\d{2}) to (\d{2})-(\d{2})$/;

function utcMonthDay(date) {
  return (date.getUTCMonth() + 1) * 100 + date.getUTCDate();
}

function rangeMonthDay(month, day, source) {
  const date = new Date(Date.UTC(2000, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error(`Invalid Registry zodiac date range: ${source}`);
  }
  return month * 100 + day;
}

/** Convert the public Registry date ranges into the resolver's immutable input. */
export function seasonsFromRegistry(registry) {
  if (!Array.isArray(registry?.assets) || registry.assets.length !== 12) {
    throw new Error('Astrofolio season resolution requires all 12 Registry assets');
  }

  const seasons = registry.assets.map((asset) => {
    const range = asset?.metadata?.dateRange;
    const match = typeof range === 'string' ? DATE_RANGE_PATTERN.exec(range) : null;
    if (!asset?.sign || !match) {
      throw new Error(`Registry asset ${asset?.sign ?? 'unknown'} has no valid date range`);
    }
    const [, startMonth, startDay, endMonth, endDay] = match.map((value, index) => (
      index === 0 ? value : Number(value)
    ));
    return Object.freeze({
      sign: asset.sign,
      displayName: asset.displayName,
      dateRange: range,
      start: rangeMonthDay(startMonth, startDay, range),
      end: rangeMonthDay(endMonth, endDay, range),
    });
  });

  if (new Set(seasons.map(({ sign }) => sign)).size !== 12) {
    throw new Error('Registry zodiac signs must be unique');
  }
  return Object.freeze(seasons);
}

/**
 * Resolve a Date/string/epoch to its tropical zodiac season using UTC only.
 * The function has no clock or locale dependency: callers supply both the
 * instant and Registry-derived ranges, so build output is deterministic.
 */
export function resolveAstrofolioSeasonUtc(input, seasons) {
  const date = input instanceof Date ? new Date(input.getTime()) : new Date(input);
  if (!Number.isFinite(date.getTime())) throw new TypeError('Astrofolio season requires a valid date');
  if (!Array.isArray(seasons) || seasons.length !== 12) {
    throw new TypeError('Astrofolio season requires 12 Registry-derived ranges');
  }

  const monthDay = utcMonthDay(date);
  const matches = seasons.filter(({ start, end }) => (
    start <= end
      ? monthDay >= start && monthDay <= end
      : monthDay >= start || monthDay <= end
  ));
  if (matches.length !== 1) {
    throw new Error(`Expected one Registry zodiac season for UTC month-day ${monthDay}; found ${matches.length}`);
  }
  return matches[0];
}
