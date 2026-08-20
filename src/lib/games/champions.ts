/**
 * The Trophy Hall's committed record (Zodiac Games R2.3). Every closed,
 * counted season gets one immutable entry in src/data/games/champions.json,
 * appended by the season-close workflow and never edited afterward — git
 * history is the tamper evidence. This module validates the file at build
 * time so a malformed entry fails the build instead of publishing quietly.
 */
import championsData from '../../data/games/champions.json';
import { SIGN_SLUGS, signBySlug, type Sign } from '../signs.js';
import { SEASON_ID_PATTERN, previousSeasonInstance, seasonInstanceForId } from './season.js';

export interface ChampionStandingRow {
  sign: string;
  points: number;
}

export interface SeasonChampionEntry {
  seasonId: string;
  seasonName: string;
  year: number;
  /** First instant after the season ended, UTC ms. */
  endedAtUtc: number;
  champion: string;
  runnerUp: string;
  marginPoints: number;
  finalStandings: ChampionStandingRow[];
}

function assertEntry(raw: unknown, index: number): SeasonChampionEntry {
  const entry = raw as SeasonChampionEntry;
  const label = `champions.json seasons[${index}]`;
  if (!entry || typeof entry !== 'object') throw new Error(`${label} is not an object`);
  if (!SEASON_ID_PATTERN.test(entry.seasonId)) throw new Error(`${label} has a malformed seasonId`);
  const season = seasonInstanceForId(entry.seasonId);
  if (entry.seasonName !== season.sign.name) throw new Error(`${label} seasonName mismatch`);
  if (entry.year !== season.startYear) throw new Error(`${label} year mismatch`);
  if (entry.endedAtUtc !== season.endUtcExclusive) throw new Error(`${label} endedAtUtc mismatch`);
  if (!SIGN_SLUGS.includes(entry.champion)) throw new Error(`${label} champion unknown`);
  if (!SIGN_SLUGS.includes(entry.runnerUp)) throw new Error(`${label} runnerUp unknown`);
  if (!Number.isInteger(entry.marginPoints) || entry.marginPoints < 0) {
    throw new Error(`${label} marginPoints invalid`);
  }
  if (!Array.isArray(entry.finalStandings) || entry.finalStandings.length !== 12) {
    throw new Error(`${label} finalStandings must carry all twelve signs`);
  }
  const seen = new Set<string>();
  for (const row of entry.finalStandings) {
    if (!SIGN_SLUGS.includes(row?.sign) || seen.has(row.sign)
      || !Number.isFinite(row?.points) || row.points < 0) {
      throw new Error(`${label} finalStandings row invalid`);
    }
    seen.add(row.sign);
  }
  if (entry.finalStandings[0]!.sign !== entry.champion) {
    throw new Error(`${label} champion must lead its final standings`);
  }
  return entry;
}

/** Every recorded season, oldest first, validated. */
export function championSeasons(): SeasonChampionEntry[] {
  const raw = championsData as { version?: number; seasons?: unknown[] };
  if (raw.version !== 1 || !Array.isArray(raw.seasons)) {
    throw new Error('champions.json must be version 1 with a seasons array');
  }
  const entries = raw.seasons.map(assertEntry);
  for (let index = 1; index < entries.length; index += 1) {
    if (entries[index]!.endedAtUtc <= entries[index - 1]!.endedAtUtc) {
      throw new Error('champions.json seasons must be strictly chronological');
    }
  }
  return entries;
}

export function championSign(entry: SeasonChampionEntry): Sign {
  return signBySlug(entry.champion);
}

/**
 * The champion to announce on the Race page: the entry for the season that
 * closed most recently — shown while its successor season runs, then the
 * next close replaces it.
 */
export function currentAnnouncement(
  entries: SeasonChampionEntry[],
  now: Date | number,
): SeasonChampionEntry | null {
  const previous = previousSeasonInstance(now);
  return entries.find((entry) => entry.seasonId === previous.id) ?? null;
}
