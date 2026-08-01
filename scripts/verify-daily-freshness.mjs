/** Small deployment gate: a page labeled as current must use today's UTC edition. */
import { readFile } from 'node:fs/promises';
import { assertEditionAge } from './horoscope-freshness-lib.mjs';

const index = process.argv.indexOf('--max-age');
const maxAge = Number(index >= 0 ? process.argv[index + 1] : '0');
const daily = JSON.parse(await readFile(new URL('../src/data/daily.json', import.meta.url), 'utf8'));
const age = assertEditionAge(daily.date, new Date(), maxAge);
console.log(`verify-daily-freshness: PASS — ${daily.date} is ${age} UTC day(s) old`);
