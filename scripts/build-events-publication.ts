import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { eventsCatalog } from '../src/lib/events/catalog';
import { buildEventsPublication } from './events-publication-lib';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(repo, 'src/data/events-publication.json');
const publication = buildEventsPublication(eventsCatalog());

await writeFile(output, `${JSON.stringify(publication, null, 2)}\n`);
console.log(
  `events-publication: wrote ${publication.pages.length} page(s) and `
  + `${publication.timeline.length} timeline row(s) → ${output}`,
);
