/*
 * Brief v1 M3's rule for step 1.12: "the 98-zone divergence list resolves to
 * backzone truth". The list (../tzdb-divergence-98.json) is the audit's: for
 * each zone, up to three segments where the host's TZif files (Debian tzdata
 * 2025b, built with backzone) and Node's Intl (tzdb 2025c, default build)
 * disagree, with the disagreement in minutes.
 *
 * For each segment, a birth at 12:00 local time inside the segment is
 * resolved twice: with a longitude (the site's birthplace path, which reads
 * the pinned history before 1970) and without (the host's history). Their
 * offsets should differ by exactly the listed disagreement. The longitude is
 * the zone's own mean-time meridian where tz-lmt.json has one (wrapped into
 * -180..180), so the birthplace's mean time cannot be what moves the result.
 * Run from the repository root:
 *
 *   npx vite-node --script docs/platform/evidence/engine-beyond-swiss/corpora/tools/divergence-list-check.ts \
 *     > docs/platform/evidence/engine-beyond-swiss/corpora/tzdb-divergence-98-check.json
 */
import { readFileSync } from 'node:fs';
import { prepareLocalTime, resolveLocalToUtc } from '../../../../../../src/lib/time/localToUtc';

const list = JSON.parse(readFileSync('docs/platform/evidence/engine-beyond-swiss/corpora/tzdb-divergence-98.json', 'utf8'));
const lmt = JSON.parse(readFileSync('src/data/tz-lmt.json', 'utf8'));
const { excluded } = JSON.parse(readFileSync('src/data/tz-history/2025c/excluded.json', 'utf8'));
const DAY = 86_400_000;

const rows = [];
for (const zone of list.zones) {
  for (const segment of zone.sample) {
    const from = Date.parse(`${segment.from}T00:00:00Z`);
    const to = Date.parse(`${segment.to}T00:00:00Z`);
    // The list gives whole dates; a segment of a day or two may not hold 12:00
    // on either date, so both are tried. Longer ones are sampled in the middle.
    const short = segment.days <= 2;
    const dates = (short ? [from, to] : [from + Math.floor((to - from) / DAY / 2) * DAY])
      .map((ms) => new Date(ms).toISOString().slice(0, 10));
    // tz-lmt.json's offsets run from -12 to +14 hours; wrapped to a longitude.
    const meridian = typeof lmt.offsets[zone.tz] === 'number' ? lmt.offsets[zone.tz] / 240 : 0;
    const longitude = ((meridian + 540) % 360) - 180;
    let date = dates[0];
    let moved = 0;
    for (const candidate of dates) {
      await prepareLocalTime(candidate, zone.tz);
      const pinned = resolveLocalToUtc(candidate, '12:00', zone.tz, { longitude });
      const host = resolveLocalToUtc(candidate, '12:00', zone.tz);
      date = candidate;
      moved = Math.round((pinned.offsetMinutes - host.offsetMinutes) * 60) / 60;
      if (Math.abs(moved - segment.tzifMinusIcuMinutes) < 1e-9) break;
    }
    const kind = Number(date.slice(0, 4)) >= 1970
      ? 'after 1970'
      : Object.prototype.hasOwnProperty.call(excluded, zone.tz) ? 'excluded name' : 'before 1970';
    rows.push({
      zone: zone.tz, date, short, listedMinutes: segment.tzifMinusIcuMinutes, movedMinutes: moved,
      kind, agrees: Math.abs(moved - segment.tzifMinusIcuMinutes) < 1e-9,
    });
  }
}

const count = (filter) => rows.filter(filter).length;
const summary = {
  zones: list.zones.length,
  segments: rows.length,
  before1970: count((row) => row.kind === 'before 1970'),
  before1970Agree: count((row) => row.kind === 'before 1970' && row.agrees),
  excludedName: count((row) => row.kind === 'excluded name'),
  after1970: count((row) => row.kind === 'after 1970'),
};
process.stdout.write(`${JSON.stringify({
  note: 'Output of tools/divergence-list-check.ts. "before 1970" rows are the rule; "excluded name" and "after 1970" rows are left to the host by design (src/data/tz-history/2025c/excluded.json) and are expected to move 0.',
  host: { node: process.version, icu: process.versions.icu, tz: process.versions.tz },
  summary,
  disagreements: rows.filter((row) => row.kind === 'before 1970' && !row.agrees),
  rows,
}, null, 1)}\n`);
