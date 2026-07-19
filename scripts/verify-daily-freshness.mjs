/** Small deployment gate: a verified edition may not silently age in place. */
import { readFile } from 'node:fs/promises';

const index = process.argv.indexOf('--max-age');
const maxAge = Number(index >= 0 ? process.argv[index + 1] : '1');
if (!Number.isInteger(maxAge) || maxAge < 0 || maxAge > 3) {
  throw new Error(`--max-age must be an integer from 0 to 3, received ${maxAge}`);
}
const daily = JSON.parse(await readFile(new URL('../src/data/daily.json', import.meta.url), 'utf8'));
const edition = new Date(`${daily.date}T00:00:00.000Z`);
const now = new Date();
const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
if (Number.isNaN(edition.getTime()) || edition.toISOString().slice(0, 10) !== daily.date) {
  throw new Error(`daily facts carry an invalid UTC date: ${daily.date}`);
}
const age = Math.floor((today - edition.getTime()) / 86_400_000);
if (age < 0 || age > maxAge) {
  throw new Error(`daily edition ${daily.date} has age ${age}; allowed deployment range is 0-${maxAge} UTC days`);
}
console.log(`verify-daily-freshness: PASS — ${daily.date} is ${age} UTC day(s) old`);
