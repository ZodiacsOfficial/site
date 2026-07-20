import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import committed from '../src/data/events-publication.json';
import { eventsCatalog } from '../src/lib/events/catalog';
import { buildEventsPublication } from './events-publication-lib';

const expected = buildEventsPublication(eventsCatalog());
const actual = committed as unknown;

if (JSON.stringify(actual) !== JSON.stringify(expected)) {
  console.error('events-publication: committed receipt is stale; run npm run data:events:build');
  process.exit(1);
}

const repo = fileURLToPath(new URL('..', import.meta.url));
const cards = [
  ...(expected.hub.indexEligible ? [expected.hub.card] : []),
  ...expected.pages.map((event) => event.card),
];
let cardBytes = 0;
for (const card of cards) {
  let cardStat;
  try {
    cardStat = await stat(resolve(repo, 'public', card.replace(/^\//, '')));
  } catch {
    console.error(`events-publication: missing generated OG card ${card}`);
    process.exit(1);
  }
  if (!cardStat.isFile() || cardStat.size < 1_024) {
    console.error(`events-publication: invalid generated OG card ${card} (${cardStat.size} bytes)`);
    process.exit(1);
  }
  cardBytes += cardStat.size;
}

console.log(
  `events-publication: OK — ${expected.pages.length} approved page(s), `
  + `${expected.timeline.length} public timeline row(s), ${cards.length} OG card(s) `
  + `(${(cardBytes / 1024 / 1024).toFixed(2)}MiB), fixtures and post-2027 pages withheld`,
);
