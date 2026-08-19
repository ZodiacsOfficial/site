/**
 * Season-close helpers (Zodiac Games R2.3), plain JS so the close workflow
 * runs them without a bundler. The season id math mirrors
 * src/lib/games/season.ts, which pins it with tests on both sides.
 */

export const ZODIAC_ORDER = Object.freeze([
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
]);

export const SEASON_ID_PATTERN =
  /^(aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces)-20[0-9]{2}$/;

/**
 * The id of the season that closed immediately before the given one.
 * Seasons follow zodiac order through the calendar year; only the step
 * back from Aquarius crosses into the prior year, because Capricorn's
 * instance is named for the December it starts in.
 */
export function previousSeasonIdOf(seasonId) {
  const match = SEASON_ID_PATTERN.exec(seasonId ?? '');
  if (!match) throw new Error(`Malformed season id: ${seasonId}`);
  const sign = match[1];
  const year = Number(seasonId.slice(sign.length + 1));
  const index = ZODIAC_ORDER.indexOf(sign);
  const previousSign = ZODIAC_ORDER[(index + 11) % 12];
  const previousYear = sign === 'aquarius' ? year - 1 : year;
  return `${previousSign}-${previousYear}`;
}

/**
 * Builds the immutable Trophy Hall entry from a CLOSED season's archived
 * standings payload. Returns null for an uncounted season (nobody scored) —
 * an empty board crowns no champion.
 */
export function championEntryFrom(payload) {
  if (!payload || payload.closed !== true) {
    throw new Error('A champion entry requires a closed-season payload.');
  }
  const standings = payload.standings;
  if (!Array.isArray(standings) || standings.length !== 12) {
    throw new Error('A champion entry requires the full 12-sign board.');
  }
  if (standings.every((row) => row.points === 0)) return null;
  return {
    seasonId: payload.seasonId,
    seasonName: payload.seasonName,
    year: Number(payload.seasonId.slice(payload.seasonSign.length + 1)),
    endedAtUtc: payload.seasonEndsAt,
    champion: standings[0].sign,
    runnerUp: standings[1].sign,
    marginPoints: standings[0].points - standings[1].points,
    finalStandings: standings.map(({ sign, points }) => ({ sign, points })),
  };
}
