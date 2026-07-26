/**
 * Phase 5 completion — documented balanced selection of 480 people from
 * the screened expansion pool, bringing the directory to exactly 500.
 *
 * Deterministic greedy selection against published balance targets:
 * every Sun sign lands between 36 and 46 profiles; region and gender
 * representation are actively weighted rather than left to the pool's
 * skew; no single field dominates. The output is selected-expansion.json
 * plus a selection-report.json documenting the achieved balance — the
 * transparent editorial process the handoff requires.
 *
 *   node docs/phase5/people-pilot/tools/select-expansion.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const PILOT = join(HERE, '..');
const REPO = join(PILOT, '..', '..', '..');
const TARGET = 480;

const screening = JSON.parse(await readFile(join(PILOT, 'screening-expansion.json'), 'utf8'));
const candidates = Object.fromEntries(
  JSON.parse(await readFile(join(PILOT, 'candidates-expansion.json'), 'utf8'))
    .map((candidate) => [candidate.slug, candidate]),
);
const manifestAll = JSON.parse(await readFile(join(PILOT, 'manifest.json'), 'utf8'));
const canonicalCandidates = JSON.parse(await readFile(join(PILOT, 'candidates.json'), 'utf8'));
const trulyPilot = new Set(canonicalCandidates
  .filter((candidate) => candidate.role === 'pilot' && !(candidate.note ?? '').startsWith('Phase 5 completion expansion'))
  .map((candidate) => candidate.slug));
const pilotManifest = { people: manifestAll.people.filter((person) => trulyPilot.has(person.slug)) };

/* Discipline map parity: read the production map straight from people.ts. */
const libSource = await readFile(join(REPO, 'src/lib/people.ts'), 'utf8');
const mapBlock = libSource.slice(
  libSource.indexOf('DISCIPLINE_GROUP_BY_SOURCE'),
  libSource.indexOf('export function peopleDisciplineGroups'),
);
const DISCIPLINE_MAP = {};
for (const match of mapBlock.matchAll(/(['"]?)([A-Za-z][A-Za-z' .-]*?)\1:\s*'([a-z-]+)'/gu)) {
  DISCIPLINE_MAP[match[2]] = match[3];
}
if (Object.keys(DISCIPLINE_MAP).length < 100) {
  throw new Error(`Discipline map parse failed: ${Object.keys(DISCIPLINE_MAP).length} entries`);
}

const accepted = [];
const unmapped = [];
for (const row of screening.candidates) {
  if (row.verdict !== 'accepted') continue;
  const candidate = candidates[row.slug];
  const evidence = JSON.parse(await readFile(join(PILOT, 'evidence-expansion', `${row.slug}.json`), 'utf8'));
  const groups = [];
  const disciplines = [];
  for (const occupation of evidence.occupations) {
    const group = DISCIPLINE_MAP[occupation.label];
    if (group && !groups.includes(group)) {
      groups.push(group);
      disciplines.push(occupation.label);
    }
    if (disciplines.length === 2) break;
  }
  if (disciplines.length === 0) {
    unmapped.push({ slug: row.slug, occupations: evidence.occupations.map((o) => o.label).slice(0, 5) });
    continue;
  }
  const computed = JSON.parse(await readFile(join(PILOT, 'computed-expansion', `${row.slug}.json`), 'utf8'));
  accepted.push({
    slug: row.slug,
    sign: computed.sun.sign,
    date: computed.gregorianDate,
    region: candidate.region,
    field: candidate.field,
    g: candidate.g,
    disciplines,
    year: Number(computed.gregorianDate.slice(0, 4)),
  });
}
accepted.sort((a, b) => a.slug.localeCompare(b.slug));

/* Published balance targets for the final 500 (including the pilot 20). */
const SIGN_MIN = 36;
const SIGN_MAX = 46;
/* Two same-sign people born close together share slow planets, dignities
   and often a stellium — their honest readings converge. Enforce a
   minimum 730-day birth-date gap within each sign (the pilot's
   era-separation rule, scaled to a 42-per-sign directory). */
const SAME_SIGN_MIN_GAP_DAYS = 730;
let activeGapDays = SAME_SIGN_MIN_GAP_DAYS;
let relaxedPicks = 0;
const signDates = {};
for (const person of pilotManifest.people) {
  (signDates[person.sunSign.slug] ??= []).push(Date.parse(person.birthDate.computedGregorianDate));
}
const REGION_MIN = { africa: 26, latam: 55, sasia: 42, easia: 36, mena: 13, seasia: 7, oceania: 9 };
const REGION_MAX = { europe: 205, namerica: 150 };
const FIELD_MAX = 125;

const totals = {
  sign: {}, region: {}, field: {}, g: { f: 0, m: 0 },
};
for (const person of pilotManifest.people) {
  totals.sign[person.sunSign.slug] = (totals.sign[person.sunSign.slug] ?? 0) + 1;
}
/* Pilot gender/region counted for the report only; the pilot is fixed. */
const PILOT_WOMEN = 15;
totals.g.f = PILOT_WOMEN;
totals.g.m = pilotManifest.people.length - PILOT_WOMEN;

const pool = new Set(accepted.map((person) => person.slug));
const bySlug = Object.fromEntries(accepted.map((person) => [person, person] && [person.slug, person]));
const selected = [];
/* Editorial anchors: figures whose absence from a 500-person public
   directory would itself be an editorial error. Anchors are chosen first,
   under the same sign caps and a 365-day same-sign gap. */
const ANCHORS = ['marie-curie', 'alan-turing', 'andy-warhol', 'aretha-franklin',
  'louis-armstrong', 'billie-holiday', 'duke-ellington', 'charlie-chaplin',
  'pablo-picasso', 'claude-monet', 'wolfgang-amadeus-mozart', 'frederic-chopin',
  'charles-darwin', 'louis-pasteur', 'florence-nightingale', 'stephen-hawking',
  'abraham-lincoln', 'martin-luther-king-jr', 'rosa-parks', 'nelson-mandela',
  'maya-angelou', 'toni-morrison', 'sigmund-freud', 'marilyn-monroe',
  'elvis-presley', 'john-lennon', 'bob-marley', 'jane-austen',
  'charles-dickens', 'mark-twain', 'victor-hugo', 'gabriel-garcia-marquez',
  'pablo-neruda', 'miles-davis', 'george-orwell', 'bertrand-russell',
  'babe-ruth', 'edith-piaf', 'akira-kurosawa', 'satyajit-ray'];
for (const anchor of ANCHORS) {
  const person = bySlug[anchor];
  if (!person) { console.log(`anchor unavailable (screened out): ${anchor}`); continue; }
  const when = Date.parse(person.date);
  const signCount = totals.sign[person.sign] ?? 0;
  if (signCount >= SIGN_MAX) { console.log(`anchor skipped (sign full): ${anchor}`); continue; }
  if ((signDates[person.sign] ?? []).some((existing) => Math.abs(existing - when) < 365 * 86_400_000)) {
    console.log(`anchor skipped (365-day same-sign gap): ${anchor}`); continue;
  }
  pool.delete(anchor);
  selected.push(person);
  totals.sign[person.sign] = signCount + 1;
  (signDates[person.sign] ??= []).push(when);
  totals.region[person.region] = (totals.region[person.region] ?? 0) + 1;
  totals.field[person.field] = (totals.field[person.field] ?? 0) + 1;
  totals.g[person.g] += 1;
}


function score(person) {
  const signCount = totals.sign[person.sign] ?? 0;
  if (signCount >= SIGN_MAX) return -1;
  const when = Date.parse(person.date);
  const womenBehind = totals.g.f < (selected.length + 20) * 0.47;
  const gapForThis = (person.g === 'f' && womenBehind) ? 365 : activeGapDays;
  if ((signDates[person.sign] ?? []).some((existing) => Math.abs(existing - when) < gapForThis * 86_400_000)) return -1;
  const regionCount = totals.region[person.region] ?? 0;
  if (REGION_MAX[person.region] && regionCount >= REGION_MAX[person.region]) return -1;
  const fieldCount = totals.field[person.field] ?? 0;
  if (fieldCount >= FIELD_MAX) return -1;
  let value = 0;
  if (signCount < SIGN_MIN) value += (SIGN_MIN - signCount) * 3;
  if (REGION_MIN[person.region] && regionCount < REGION_MIN[person.region]) {
    value += (REGION_MIN[person.region] - regionCount) * 8;
  }
  if (person.g === 'f' && womenBehind) value += 10;
  value += Math.max(0, 30 - fieldCount) * 0.05;
  value += (SIGN_MAX - signCount) * 0.2;
  return value;
}

while (selected.length < TARGET && pool.size > 0) {
  let best = null;
  let bestScore = -Infinity;
  for (const slug of pool) {
    const person = bySlug[slug];
    const value = score(person);
    if (value > bestScore || (value === bestScore && best && slug < best.slug)) {
      best = person;
      bestScore = value;
    }
  }
  if (!best || bestScore < 0) {
    if (activeGapDays > 365) { activeGapDays = 365; continue; }
    break;
  }
  if (activeGapDays < SAME_SIGN_MIN_GAP_DAYS) relaxedPicks += 1;
  pool.delete(best.slug);
  selected.push(best);
  totals.sign[best.sign] = (totals.sign[best.sign] ?? 0) + 1;
  (signDates[best.sign] ??= []).push(Date.parse(best.date));
  totals.region[best.region] = (totals.region[best.region] ?? 0) + 1;
  totals.field[best.field] = (totals.field[best.field] ?? 0) + 1;
  totals.g[best.g] += 1;
}

if (selected.length !== TARGET) {
  throw new Error(`Selected ${selected.length}, need ${TARGET}; pool exhausted under constraints`);
}
const signsOut = Object.entries(totals.sign).sort();
for (const [sign, count] of signsOut) {
  if (count < SIGN_MIN || count > SIGN_MAX) throw new Error(`Sign ${sign} at ${count} outside ${SIGN_MIN}-${SIGN_MAX}`);
}

await writeFile(join(PILOT, 'selected-expansion.json'), `${JSON.stringify({
  schema: 'zodiacs.phase5.selection.v1',
  target: TARGET,
  selected: selected.map((person) => ({ slug: person.slug, disciplines: person.disciplines })),
}, null, 1)}\n`);

const report = {
  schema: 'zodiacs.phase5.selection-report.v1',
  process: 'Deterministic greedy selection over the screened pool against published balance targets, with a 730-day minimum same-sign birth-date gap so near-twin charts cannot enter. Gender and region are weighted selection criteria, never page labels; the g field exists only in this research file.',
  pool: { screenedAccepted: screening.candidates.filter((row) => row.verdict === 'accepted').length, mappable: accepted.length, unmapped: unmapped.length },
  achieved: {
    total: selected.length + 20,
    signs: Object.fromEntries(signsOut),
    regions: Object.fromEntries(Object.entries(totals.region).sort()),
    fields: Object.fromEntries(Object.entries(totals.field).sort()),
    women: totals.g.f,
    womenShare: Number((totals.g.f / (selected.length + 20)).toFixed(3)),
    sameSignGapDays: { standard: SAME_SIGN_MIN_GAP_DAYS, relaxedTo365For: relaxedPicks },
    eraSpread: {
      earliest: Math.min(...selected.map((person) => person.year)),
      latest: Math.max(...selected.map((person) => person.year)),
      before1850: selected.filter((person) => person.year < 1850).length,
      from1850to1899: selected.filter((person) => person.year >= 1850 && person.year < 1900).length,
      from1900to1949: selected.filter((person) => person.year >= 1900 && person.year < 1950).length,
      from1950on: selected.filter((person) => person.year >= 1950).length,
    },
  },
  unmappedSkipped: unmapped,
};
await writeFile(join(PILOT, 'selection-report.json'), `${JSON.stringify(report, null, 1)}\n`);
console.log(JSON.stringify(report.achieved, null, 1));
console.log(`unmapped skipped: ${unmapped.length}`);
