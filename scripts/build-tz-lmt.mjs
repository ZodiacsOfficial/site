/*
 * Builds src/data/tz-lmt.json: for every IANA time zone name, the instant its
 * local mean time era ended.
 *
 * Before a place adopted a legal time — a national mean time, railway time
 * or standard time — its clocks kept that place's own local mean time. tzdb
 * records that era for each zone's reference location only, so the host's
 * Intl data applies New York's mean time to a birth in Buffalo in 1870, and
 * Paris's to a birth in Brest in 1880: 19.5 and 27.3 minutes wrong. With this
 * table, src/lib/time/localToUtc.ts can apply the birthplace's own mean time
 * (from its longitude) for instants before the era ended, and leave every
 * later instant to Intl.
 *
 * Source: a pinned tzdb release — the data files plus backzone — downloaded
 * once into .cache/ (gitignored) and verified against the pinned SHA-256.
 * Backzone zones replace the main data's links of the same name, because the
 * table answers "when did clocks at this named place stop keeping local mean
 * time", and backzone is where tzdb records that for zones it has merged.
 * (Oslo kept local mean time until 1895; the main data links Oslo to Berlin,
 * which changed in 1893.)
 *
 * A zone's local mean time era is its first line, which tzdb reserves for the
 * reference location's mean time (FORMAT "LMT"), extended through following
 * LMT lines whose offset differs from it by whole days only — a move across
 * the date line, as in Manila in 1844 and Alaska in 1867. A following line
 * with the same offset is a legal adoption of that mean time (Lisbon Mean
 * Time from 1884, Paris Mean Time from 1891, Dublin Mean Time from 1880), not
 * the town's own clock, and ends the era.
 *
 * Output: { tzdb, source, eras: { "<zone>": <era end, Unix seconds> } }, keys
 * sorted. Zones whose first line is not local mean time ("-00" placeholders,
 * fixed offsets) are omitted; the resolver leaves them to Intl.
 *
 *   node scripts/build-tz-lmt.mjs        — refresh when the pinned release changes
 */
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

export const TZDB_VERSION = '2025c';
const TZDB_URL = `https://data.iana.org/time-zones/releases/tzdata${TZDB_VERSION}.tar.gz`;
const TZDB_SHA256 = '4aa79e4effee53fc4029ffe5f6ebe97937282ebcdf386d5d2da91ce84142f957';

const MAIN_FILES = ['africa', 'antarctica', 'asia', 'australasia', 'europe', 'northamerica', 'southamerica', 'etcetera', 'backward'];
const BACKZONE = 'backzone';

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/** zic accepts any unambiguous prefix of a name, case-insensitively. */
function byPrefix(word, names, what) {
  const lower = word.toLowerCase();
  const hits = names.filter((name) => name.startsWith(lower));
  if (hits.length !== 1) throw new Error(`tz-lmt: unrecognised ${what} "${word}"`);
  return names.indexOf(hits[0]);
}

/** "[-]h[:mm[:ss[.frac]]]" → seconds. zic rounds fractional seconds. */
export function parseClock(text) {
  const match = /^(-)?(\d+)(?::(\d{1,2}))?(?::(\d{1,2}(?:\.\d+)?))?$/.exec(text);
  if (!match) throw new Error(`tz-lmt: unrecognised time "${text}"`);
  const seconds = Number(match[2]) * 3600 + Number(match[3] ?? 0) * 60 + Math.round(Number(match[4] ?? 0));
  return match[1] ? -seconds : seconds;
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/** DAY field: "18", "lastSun", "Sun>=8", "Sun<=25" → day of month. */
function parseDay(text, year, month) {
  if (/^\d+$/.test(text)) return Number(text);
  const weekdayOf = (day) => new Date(Date.UTC(year, month, day)).getUTCDay();
  if (/^last/i.test(text)) {
    const weekday = byPrefix(text.slice(4), WEEKDAYS, 'weekday');
    for (let day = daysInMonth(year, month); day > 0; day -= 1) if (weekdayOf(day) === weekday) return day;
  }
  const rule = /^([a-z]+)([<>]=)(\d+)$/i.exec(text);
  if (rule) {
    const weekday = byPrefix(rule[1], WEEKDAYS, 'weekday');
    const step = rule[2] === '>=' ? 1 : -1;
    for (let day = Number(rule[3]); day >= 1 && day <= daysInMonth(year, month); day += step) {
      if (weekdayOf(day) === weekday) return day;
    }
  }
  throw new Error(`tz-lmt: unrecognised day "${text}"`);
}

/**
 * UNTIL fields of a local mean time line → Unix seconds. Wall, standard and
 * universal times differ only by the line's own offset here: an LMT line
 * carries no daylight saving (asserted by the caller).
 */
export function untilToUnixSeconds(fields, stdoffSeconds) {
  const year = Number(fields[0]);
  if (!Number.isInteger(year)) throw new Error(`tz-lmt: unrecognised year "${fields[0]}"`);
  const month = fields[1] ? byPrefix(fields[1], MONTHS, 'month') : 0;
  const day = fields[2] ? parseDay(fields[2], year, month) : 1;
  let clock = fields[3] ?? '0';
  let universal = false;
  const suffix = /[wsugz]$/i.exec(clock);
  if (suffix) {
    universal = /[ugz]/i.test(suffix[0]);
    clock = clock.slice(0, -1);
  }
  const localSeconds = Date.UTC(year, month, day) / 1000 + parseClock(clock);
  return universal ? localSeconds : localSeconds - stdoffSeconds;
}

/**
 * Zone and Link records from one tzdb data file. As in zic, a line continues
 * the open zone whenever the zone's previous line had an UNTIL field.
 */
export function parseTzdb(text) {
  const zones = new Map();
  const links = new Map();
  let open = null;
  for (const raw of text.split('\n')) {
    const line = raw.replace(/#.*/, '').trim();
    if (!line) continue;
    const fields = line.split(/\s+/);
    if (open) {
      open.push(fields);
    } else if (/^z(?:o(?:ne?)?)?$/i.test(fields[0])) {
      open = [fields.slice(2)];
      zones.set(fields[1], open);
    } else if (/^l(?:i(?:nk?)?)?$/i.test(fields[0])) {
      links.set(fields[2], fields[1]);
    }
    // Rule lines are irrelevant to local mean time.
    // [STDOFF, RULES, FORMAT] with no UNTIL is the zone's last line.
    if (open && open.at(-1).length <= 3) open = null;
  }
  return { zones, links };
}

/** The end of a zone's local mean time era, or null when it has none. */
export function lmtEraEnd(lines) {
  const [first] = lines;
  if (!first || first[2] !== 'LMT') return null;
  const firstOffset = parseClock(first[0]);
  let last = 0;
  for (let index = 1; index < lines.length; index += 1) {
    const [stdoff, , format] = lines[index];
    const difference = parseClock(stdoff) - firstOffset;
    if (format !== 'LMT' || difference === 0 || difference % 86400 !== 0) break;
    last = index;
  }
  const line = lines[last];
  if (line[1] !== '-') throw new Error(`tz-lmt: local mean time line with rules "${line[1]}"`);
  if (line.length < 4) throw new Error('tz-lmt: a zone that never leaves local mean time');
  return untilToUnixSeconds(line.slice(3), parseClock(line[0]));
}

/** Backzone replaces the main data's definition of a name; links resolve to zones. */
export function buildEras(main, backzone) {
  const zoneOf = (name, seen = new Set()) => {
    if (seen.has(name)) throw new Error(`tz-lmt: link cycle at ${name}`);
    seen.add(name);
    if (backzone.zones.has(name)) return backzone.zones.get(name);
    if (main.zones.has(name)) return main.zones.get(name);
    const target = backzone.links.get(name) ?? main.links.get(name);
    return target === undefined ? null : zoneOf(target, seen);
  };
  const names = new Set([
    ...main.zones.keys(), ...main.links.keys(), ...backzone.zones.keys(), ...backzone.links.keys(),
  ]);
  const eras = {};
  for (const name of [...names].sort()) {
    const lines = zoneOf(name);
    if (!lines) throw new Error(`tz-lmt: ${name} resolves to no zone`);
    const end = lmtEraEnd(lines);
    if (end !== null) eras[name] = end;
  }
  return eras;
}

/** Minimal ustar reader: the release tarball holds plain files only. */
function untar(buffer) {
  const files = new Map();
  for (let offset = 0; offset + 512 <= buffer.length;) {
    const name = buffer.toString('latin1', offset, offset + 100).replace(/\0.*$/s, '');
    if (!name) break;
    const size = parseInt(buffer.toString('latin1', offset + 124, offset + 136).replace(/\0.*$/s, '').trim() || '0', 8);
    files.set(name.replace(/^\.\//, ''), buffer.subarray(offset + 512, offset + 512 + size).toString('utf8'));
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  return files;
}

async function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const cache = resolve(root, '.cache');
  await mkdir(cache, { recursive: true });
  const archive = resolve(cache, `tzdata${TZDB_VERSION}.tar.gz`);
  try {
    await access(archive);
  } catch {
    console.log(`downloading ${TZDB_URL} …`);
    const response = await fetch(TZDB_URL);
    if (!response.ok) throw new Error(`tz-lmt: download failed (${response.status})`);
    await writeFile(archive, Buffer.from(await response.arrayBuffer()));
  }
  const bytes = await readFile(archive);
  const digest = createHash('sha256').update(bytes).digest('hex');
  if (digest !== TZDB_SHA256) throw new Error(`tz-lmt: ${archive} has sha256 ${digest}, expected ${TZDB_SHA256}`);

  const files = untar(gunzipSync(bytes));
  const version = files.get('version')?.trim();
  if (version !== TZDB_VERSION) throw new Error(`tz-lmt: archive reports version ${version}`);
  const main = { zones: new Map(), links: new Map() };
  for (const file of MAIN_FILES) {
    const parsed = parseTzdb(files.get(file) ?? '');
    for (const [name, lines] of parsed.zones) main.zones.set(name, lines);
    for (const [name, target] of parsed.links) main.links.set(name, target);
  }
  const backzone = parseTzdb(files.get(BACKZONE) ?? '');
  const eras = buildEras(main, backzone);

  const output = {
    tzdb: TZDB_VERSION,
    source: { url: TZDB_URL, sha256: TZDB_SHA256, files: [...MAIN_FILES, BACKZONE] },
    eras,
  };
  const target = resolve(root, 'src/data/tz-lmt.json');
  await writeFile(target, `${JSON.stringify(output, null, 1)}\n`);
  console.log(`tz-lmt: ${Object.keys(eras).length} zone names → src/data/tz-lmt.json (tzdb ${TZDB_VERSION})`);
}

const direct = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (direct) await main();
