/**
 * Drafts the weekly State of the Race (Zodiac Games R2.2).
 *
 * Reads the PUBLIC standings endpoint (no credential — the same JSON every
 * visitor's browser fetches), compares against the previous committed
 * snapshot, and writes two files under docs/race-recaps/:
 *
 *   history.json            — rolling weekly snapshots (mover math input)
 *   {seasonId}-w{week}.md   — the review bundle for every platform
 *
 * NOTHING here posts anywhere. The weekly workflow commits the draft and
 * opens a GitHub issue so a person can review, edit, and post by hand.
 *
 *   node scripts/build-race-recap.mjs                 # live standings
 *   node scripts/build-race-recap.mjs --input x.json  # fixture (tests/dev)
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildRecap, draftDocument } from './race-recap-lib.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..');
const outDir = join(repo, 'docs', 'race-recaps');
const historyPath = join(outDir, 'history.json');
const STANDINGS_URL = 'https://zodiacs.org/api/games?action=standings';
const HISTORY_LIMIT = 60;

const inputFlag = process.argv.indexOf('--input');
let payload;
if (inputFlag >= 0) {
  payload = JSON.parse(await readFile(process.argv[inputFlag + 1], 'utf8'));
} else {
  const response = await fetch(STANDINGS_URL, { headers: { Accept: 'application/json' } });
  payload = await response.json();
  if (!response.ok || payload?.error) {
    // The Games are switched off or unreachable — an honest skip, not a
    // fabricated recap. The workflow treats "no draft file" as "no issue".
    console.log(`race-recap: skipped — standings answered ${response.status}${payload?.error ? ` (${payload.error})` : ''}`);
    process.exit(0);
  }
}

let history = [];
try {
  const parsed = JSON.parse(await readFile(historyPath, 'utf8'));
  if (Array.isArray(parsed)) history = parsed;
} catch {
  // First run: no history yet.
}

const previous = history.at(-1) ?? null;
const recap = buildRecap(payload, previous);

if (previous
  && previous.seasonId === recap.seasonId
  && previous.isoYear === recap.isoYear
  && previous.isoWeek === recap.isoWeek) {
  console.log(`race-recap: week ${recap.isoWeek} already stamped — nothing new to draft.`);
  process.exit(0);
}

const draftPath = join(outDir, `${recap.seasonId}-w${recap.isoWeek}.md`);
await mkdir(outDir, { recursive: true });
await writeFile(draftPath, `${draftDocument(recap)}\n`);
await writeFile(
  historyPath,
  `${JSON.stringify([...history, recap.snapshot].slice(-HISTORY_LIMIT), null, 2)}\n`,
);

console.log(`race-recap: drafted ${draftPath}`);
console.log(`race-recap: subject — ${recap.subject}`);
