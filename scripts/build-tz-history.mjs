/*
 * Builds src/data/tz-history/<release>/<bucket>.json: every IANA time zone
 * name's offset history before 1970, from the pinned tzdb release with its
 * backzone records.
 *
 * Browsers carry the default build of tzdb, which merges zones that have
 * agreed since 1970 and so gives many places another city's clocks before
 * then: on Node 22 (ICU 78.2, tzdb 2025c) Stockholm keeps Berlin's history,
 * +2:00 at noon on 1 July 1947, where Sweden kept +1:00. backzone keeps each
 * place's own history. src/lib/time/localToUtc.ts reads these files for a
 * birth whose instant falls before 1970, and the browser's data after.
 *
 * zic compiles the data, so its rule semantics are never reimplemented here.
 * It is given the main data files and backzone, without `backward` (whose
 * links would collide with backzone's zones), and each name then resolves
 * as scripts/build-tz-lmt.mjs resolves it (zoneNames), so the two tables
 * agree about what a name means. Each compiled file's 64-bit data is read
 * and kept as the offsets in force before 1970: the offset before the first
 * transition, then each transition that changes the offset.
 *
 * The browser's data takes over at 1970, so a name is left out when its
 * pinned history differs from the default build (the main files with
 * `backward`, which is what browsers carry) at any instant from 1970 on:
 * backzone keeps Harbin at +8:30 until 1980, for example, and the old
 * rule-based WET and EET, and a hand-off at 1970 would jump. A name the
 * default build lacks (Asia/Hanoi) is left out too, as the browser cannot
 * resolve it at all. `excluded` lists them.
 *
 * tzdb writes "-00" for a place with no local time yet (uninhabited: the
 * Kerguelen Islands before 1950, Antarctic stations before they opened).
 * That is not a UTC offset, so such a span is stored as null, and the
 * resolver reads the browser's offset there instead.
 *
 * Output: 64 files, 00.json to 63.json, each holding the names whose FNV-1a
 * hash of the lower-cased name falls in it (historyBucket; the resolver's
 * loader hashes the same way and, as Intl does, ignores letter case), so a
 * birth loads about a kilobyte, not a continent:
 * { tzdb, zones: { "<name>": { source, t: [transition, Unix seconds, …],
 * o: [offset before t[0], after t[0], …, seconds east, or null for "-00"] } } };
 * and excluded.json, the names left out and why.
 *
 * The data matches backzone's own rule, "Links in this file point to zones
 * in this file, superseding links in the file 'backward'", as the Makefile's
 * check_zishrink overlay build applies it. `make PACKRATDATA=backzone`
 * resolves twelve names otherwise (Arctic/Longyearbyen to Berlin, for
 * example), as does a build with PACKRATLIST=zone.tab (America/Coral_Harbour
 * to Atikokan).
 *
 *   node scripts/build-tz-history.mjs          — refresh when the pinned release changes
 *   node scripts/build-tz-history.mjs --check  — exit 1 if the committed files differ
 *
 * Needs zic (libc-bin on Debian and Ubuntu) and the pinned release, which it
 * downloads once into .cache/ like build-tz-lmt.mjs; CI runs --check in its
 * own job (site-check.yml, tz-data-drift) for that reason, not in the offline
 * drift job. scripts/build-tz-history.test.mjs checks the committed files
 * offline.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BACKZONE, MAIN_FILES, TZDB_VERSION, loadRelease, zoneNames } from './build-tz-lmt.mjs';

/** Offsets from 1970-01-01T00:00:00Z on are the host's. */
export const HISTORY_END = 0;

/** The 64-bit data block of a TZif file (RFC 8536): transitions, their types, and each type's offset and designation. */
export function readTzif(buffer) {
  if (buffer.toString('latin1', 0, 4) !== 'TZif') throw new Error('tz-history: not a TZif file');
  const counts = (at) => [0, 1, 2, 3, 4, 5].map((index) => buffer.readUInt32BE(at + 20 + index * 4));
  const [isutcnt, isstdcnt, leapcnt, timecnt, typecnt, charcnt] = counts(0);
  if (buffer[4] < 0x32) throw new Error('tz-history: TZif version 1 has no 64-bit data');
  const v1 = timecnt * 5 + typecnt * 6 + charcnt + leapcnt * 8 + isstdcnt + isutcnt;
  const header = 44 + v1;
  if (buffer.toString('latin1', header, header + 4) !== 'TZif') throw new Error('tz-history: missing second TZif header');
  const [, , , times, types, chars] = counts(header);
  let at = header + 44;
  const t = [];
  for (let index = 0; index < times; index += 1, at += 8) t.push(Number(buffer.readBigInt64BE(at)));
  const typeOf = [...buffer.subarray(at, at + times)];
  at += times;
  const offsets = [];
  const designationAt = [];
  for (let index = 0; index < types; index += 1, at += 6) {
    offsets.push(buffer.readInt32BE(at));
    designationAt.push(buffer[at + 5]);
  }
  const text = buffer.toString('latin1', at, at + chars);
  const designations = designationAt.map((start) => text.slice(start, text.indexOf('\0', start)));
  return { t, typeOf, offsets, designations };
}

/** The offsets in force before HISTORY_END: type 0's before the first transition, then each change; null where tzdb writes "-00". */
export function historyBefore({ t, typeOf, offsets, designations = [] }) {
  const offsetOf = (type) => (designations[type] === '-00' ? null : offsets[type]);
  const o = [offsetOf(0)];
  const kept = [];
  for (let index = 0; index < t.length; index += 1) {
    if (t[index] >= HISTORY_END) break;
    const offset = offsetOf(typeOf[index]);
    // zic's "big bang" transition to type 0, and any transition that keeps the offset, change nothing here.
    if (offset === o.at(-1)) continue;
    kept.push(t[index]);
    o.push(offset);
  }
  return { t: kept, o };
}

export const HISTORY_BUCKETS = 64;

/** The file a name's history is in: 32-bit FNV-1a of the lower-cased name, modulo HISTORY_BUCKETS, two digits. */
export function historyBucket(name) {
  const key = name.toLowerCase();
  let hash = 0x811c9dc5;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return String(hash % HISTORY_BUCKETS).padStart(2, '0');
}

/** The offsets a compiled zone shows from HISTORY_END on, as [instant, offset] from HISTORY_END itself. */
function historyFrom({ t, typeOf, offsets }) {
  let at = offsets[0];
  const changes = [];
  for (let index = 0; index < t.length; index += 1) {
    if (t[index] <= HISTORY_END) at = offsets[typeOf[index]];
    else changes.push([t[index], offsets[typeOf[index]]]);
  }
  return JSON.stringify([[HISTORY_END, at], ...changes].filter(([, offset], index, all) => index === 0 || offset !== all[index - 1][1]));
}

function compile(files, sources) {
  const work = mkdtempSync(join(tmpdir(), 'tz-history-'));
  try {
    for (const file of sources) writeFileSync(join(work, file), files.get(file));
    const out = join(work, 'zoneinfo');
    execFileSync('zic', ['-d', out, ...sources.map((file) => join(work, file))], { stdio: ['ignore', 'ignore', 'pipe'] });
    const compiled = new Map();
    const walk = (directory, prefix) => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const name = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) walk(join(directory, entry.name), name);
        else compiled.set(name, readTzif(readFileSync(join(directory, entry.name))));
      }
    };
    walk(out, '');
    return compiled;
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

export async function buildHistory(root) {
  const { files, main, backzone } = await loadRelease(root);
  const pinned = compile(files, MAIN_FILES.filter((file) => file !== 'backward').concat(BACKZONE));
  const browser = compile(files, MAIN_FILES);
  const { names, zoneOf } = zoneNames(main, backzone);
  const buckets = Array.from({ length: HISTORY_BUCKETS }, () => ({}));
  const excluded = {};
  const folded = new Set();
  for (const name of names) {
    // The loader matches names without regard to case, as Intl does.
    if (folded.has(name.toLowerCase())) throw new Error(`tz-history: two names differ only in case: ${name}`);
    folded.add(name.toLowerCase());
    const source = zoneOf(name);
    const tzif = source && pinned.get(source);
    if (!tzif) throw new Error(`tz-history: ${name} (${source}) did not compile`);
    const host = browser.get(name);
    if (!host) {
      excluded[name] = 'not in the default build';
      continue;
    }
    if (historyFrom(tzif) !== historyFrom(host)) {
      excluded[name] = `pinned history (${source}) differs from the default build after 1970`;
      continue;
    }
    buckets[Number(historyBucket(name))][name] = { source, ...historyBefore(tzif) };
  }
  const output = new Map();
  buckets.forEach((zones, bucket) => {
    output.set(`${String(bucket).padStart(2, '0')}.json`, `${JSON.stringify({ tzdb: TZDB_VERSION, zones })}\n`);
  });
  output.set('excluded.json', `${JSON.stringify({ tzdb: TZDB_VERSION, excluded }, null, 1)}\n`);
  return output;
}

async function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const target = resolve(root, 'src/data/tz-history', TZDB_VERSION);
  const output = await buildHistory(root);
  if (process.argv.includes('--check')) {
    let committed = [];
    try { committed = readdirSync(target).sort(); } catch { /* none yet */ }
    const differ = [...output.keys()].sort().join() !== committed.join()
      || [...output].some(([file, text]) => readFileSync(join(target, file), 'utf8') !== text);
    if (differ) {
      console.error(`tz-history: src/data/tz-history/${TZDB_VERSION}/ differs from tzdb ${TZDB_VERSION}; run node scripts/build-tz-history.mjs`);
      process.exit(1);
    }
    console.log(`tz-history: src/data/tz-history/${TZDB_VERSION}/ matches tzdb ${TZDB_VERSION}`);
    return;
  }
  rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });
  let names = 0;
  for (const [file, text] of output) {
    writeFileSync(join(target, file), text);
    names += Object.keys(JSON.parse(text).zones ?? {}).length;
  }
  console.log(`tz-history: ${names} zone names in ${output.size} files → src/data/tz-history/${TZDB_VERSION}/`);
}

const direct = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (direct) await main();
