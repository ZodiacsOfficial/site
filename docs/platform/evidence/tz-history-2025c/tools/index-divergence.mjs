/*
 * For each time zone in the city index, compares the pinned history before
 * 1970 (src/data/tz-history/2025c/) with the host's Intl data at 12:00 UTC on
 * every day from 1900-01-01 to 1969-12-31, and writes the zones that differ
 * on any of those days. Run from the repository root:
 *
 *   node docs/platform/evidence/tz-history-2025c/tools/index-divergence.mjs > docs/platform/evidence/tz-history-2025c/index-divergence.json
 */
import { readdirSync, readFileSync } from 'node:fs';

const directory = 'src/data/tz-history/2025c';
const zones = {};
for (const file of readdirSync(directory)) {
  if (file !== 'excluded.json') Object.assign(zones, JSON.parse(readFileSync(`${directory}/${file}`, 'utf8')).zones);
}
const index = JSON.parse(readFileSync('public/data/cities/index.json', 'utf8'));
const formats = new Map();
const host = (zone, ms) => {
  if (!formats.has(zone)) formats.set(zone, new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'longOffset' }));
  const name = formats.get(zone).formatToParts(ms).find((part) => part.type === 'timeZoneName').value;
  const match = /GMT([+-])(\d\d):(\d\d)(?::(\d\d))?/.exec(name);
  return match ? (match[1] === '-' ? -1 : 1) * (Number(match[2]) * 3600 + Number(match[3]) * 60 + Number(match[4] ?? 0)) : 0;
};
const pinned = (history, seconds) => {
  let at = 0;
  while (at < history.t.length && history.t[at] <= seconds) at += 1;
  return history.o[at];
};
const divergent = {};
for (const zone of index.tz) {
  let days = 0;
  let first = null;
  let last = null;
  let largest = 0;
  for (let seconds = Date.UTC(1900, 0, 1, 12) / 1000; seconds < 0; seconds += 86_400) {
    const difference = Math.abs(pinned(zones[zone], seconds) - host(zone, seconds * 1000));
    if (!difference) continue;
    const day = new Date(seconds * 1000).toISOString().slice(0, 10);
    days += 1;
    first ??= day;
    last = day;
    largest = Math.max(largest, difference);
  }
  if (days) divergent[zone] = { days, first, last, largestMinutes: Math.round(largest / 60 * 100) / 100 };
}
const names = Object.keys(divergent);
console.log(JSON.stringify({
  measured: { host: `Node ${process.versions.node}, ICU ${process.versions.icu}, tzdb ${process.versions.tz}`, days: '1900-01-01 to 1969-12-31 at 12:00 UTC' },
  indexZones: index.tz.length,
  divergentZones: names.length,
  divergentByAnHourOrMore: names.filter((name) => divergent[name].largestMinutes >= 60).length,
  divergent,
}, null, 1));
