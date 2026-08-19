/**
 * Locks a closed Race season into the Trophy Hall (Zodiac Games R2.3).
 *
 * Reads the PUBLIC standings endpoint (no credential): the current board
 * names the running season; the season before it is fetched from the
 * immutable archive view and, if counted, appended once to
 * src/data/games/champions.json. Nothing is ever edited or removed — the
 * daily site build then publishes the Hall entry and the champion state.
 *
 *   node scripts/close-race-season.mjs                  # live
 *   node scripts/close-race-season.mjs --input x.json   # fixture (dev)
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { championEntryFrom, previousSeasonIdOf } from './race-close-lib.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..');
const championsPath = join(repo, 'src', 'data', 'games', 'champions.json');
const API = 'https://zodiacs.org/api/games';

async function standings(query) {
  const response = await fetch(`${API}?action=standings${query}`, {
    headers: { Accept: 'application/json' },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.error) {
    return { skip: `standings${query || ''} answered ${response.status}${payload?.error ? ` (${payload.error})` : ''}` };
  }
  return { payload };
}

const inputFlag = process.argv.indexOf('--input');
let closedPayload;
let closedId;
if (inputFlag >= 0) {
  closedPayload = JSON.parse(await readFile(process.argv[inputFlag + 1], 'utf8'));
  closedId = closedPayload.seasonId;
} else {
  const current = await standings('');
  if (current.skip) {
    console.log(`close-season: skipped — ${current.skip}`);
    process.exit(0);
  }
  closedId = previousSeasonIdOf(current.payload.seasonId);
}

const champions = JSON.parse(await readFile(championsPath, 'utf8'));
if (champions.seasons.some((entry) => entry.seasonId === closedId)) {
  console.log(`close-season: ${closedId} is already in the Trophy Hall.`);
  process.exit(0);
}

if (!closedPayload) {
  const archived = await standings(`&season=${closedId}`);
  if (archived.skip) {
    console.log(`close-season: skipped — ${archived.skip}`);
    process.exit(0);
  }
  closedPayload = archived.payload;
}

const entry = championEntryFrom(closedPayload);
if (!entry) {
  console.log(`close-season: ${closedId} ended with an empty board — not counted, no champion.`);
  process.exit(0);
}

champions.seasons.push(entry);
await writeFile(championsPath, `${JSON.stringify(champions, null, 2)}\n`);
console.log(`close-season: engraved ${entry.champion} — ${entry.seasonName} Season Champion · ${entry.year} (won by ${entry.marginPoints}).`);
