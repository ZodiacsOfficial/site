/**
 * Phase 5A pilot research fetcher — allowed sources only.
 *
 * Reads candidates.json (English Wikipedia titles chosen editorially) and
 * writes one filtered evidence record per candidate under ../evidence/.
 * Sources: Wikidata API, English Wikipedia API, Wikimedia Commons API.
 * No astrology site, celebrity database, search snippet, or general web
 * page is contacted. Full article prose is never stored — only the
 * factual claims, revision identifiers, and licence metadata needed to
 * reproduce an accepted fact.
 *
 *   node docs/phase5/people-pilot/tools/fetch-evidence.mjs
 *
 * This is reviewed research tooling, not production code. It is never
 * invoked by a build; the committed evidence records are the only input
 * a future static generator may read.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const PILOT = join(HERE, '..');
const UA = 'Zodiacs.org Phase 5 research (admin@zodiacs.org)';

const GREGORIAN = 'http://www.wikidata.org/entity/Q1985727';
const JULIAN = 'http://www.wikidata.org/entity/Q1985786';

async function api(url) {
  const response = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} — ${url}`);
  return response.json();
}

function calendarModel(uri) {
  if (uri === GREGORIAN) return 'proleptic-gregorian';
  if (uri === JULIAN) return 'proleptic-julian';
  return `unknown:${uri}`;
}

/** Wikidata precision 11 = day, 10 = month, 9 = year. */
function precisionLabel(precision) {
  return { 11: 'day', 10: 'month', 9: 'year' }[precision] ?? `code-${precision}`;
}

function bestClaim(claims, property) {
  const list = claims?.[property] ?? [];
  const preferred = list.filter((claim) => claim.rank === 'preferred');
  const normal = list.filter((claim) => claim.rank === 'normal');
  const chosen = preferred.length > 0 ? preferred : normal;
  return { chosen, total: list.length };
}

async function entities(ids) {
  const out = {};
  for (let index = 0; index < ids.length; index += 40) {
    const batch = ids.slice(index, index + 40);
    const url = 'https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&languages=en'
      + `&ids=${batch.join('|')}`;
    const data = await api(url);
    Object.assign(out, data.entities ?? {});
  }
  return out;
}

async function entitiesByTitle(titles) {
  const out = {};
  for (let index = 0; index < titles.length; index += 20) {
    const batch = titles.slice(index, index + 20);
    const url = 'https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&languages=en'
      + `&sites=enwiki&titles=${batch.map(encodeURIComponent).join('|')}`;
    const data = await api(url);
    Object.assign(out, data.entities ?? {});
  }
  return out;
}

async function wikipediaRevisions(titles) {
  const out = {};
  for (let index = 0; index < titles.length; index += 20) {
    const batch = titles.slice(index, index + 20);
    const url = 'https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2'
      + '&prop=revisions&rvprop=ids|timestamp&redirects=1'
      + `&titles=${batch.map(encodeURIComponent).join('|')}`;
    const data = await api(url);
    for (const page of data.query?.pages ?? []) {
      out[page.title] = {
        pageId: page.pageid,
        revisionId: page.revisions?.[0]?.revid ?? null,
        revisionTimestamp: page.revisions?.[0]?.timestamp ?? null,
      };
    }
    for (const item of data.query?.normalized ?? []) out[item.from] = out[item.to] ?? null;
    for (const item of data.query?.redirects ?? []) out[item.from] = out[item.to] ?? null;
  }
  return out;
}

async function commonsFile(fileName) {
  const url = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2'
    + '&prop=imageinfo&iiprop=url|extmetadata|size'
    + `&titles=${encodeURIComponent(`File:${fileName}`)}`;
  const data = await api(url);
  const page = data.query?.pages?.[0];
  const info = page?.imageinfo?.[0];
  if (!info) return null;
  const meta = info.extmetadata ?? {};
  const plain = (value) => {
    if (typeof value !== 'string') return null;
    const text = value
      .replace(/<[^>]*>/gu, '')
      .replace(/&amp;/gu, '&').replace(/&lt;/gu, '<').replace(/&gt;/gu, '>')
      .replace(/&quot;/gu, '"').replace(/&#0?39;|&apos;/gu, "'").replace(/&nbsp;/gu, ' ')
      .replace(/\s+/gu, ' ')
      .trim();
    // Commons markup often yields the same credit twice ("X" inside a
    // span, then again as plain text). Collapse an exact doubling.
    const half = text.length / 2;
    if (text.length % 2 === 0 && text.slice(0, half) === text.slice(half)) return text.slice(0, half);
    return text;
  };
  return {
    file: `File:${fileName}`,
    filePage: page.canonicalurl ?? `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(fileName)}`,
    descriptionUrl: info.descriptionurl ?? null,
    width: info.width ?? null,
    height: info.height ?? null,
    licenseShortName: plain(meta.LicenseShortName?.value),
    licenseUrl: meta.LicenseUrl?.value ?? null,
    artist: plain(meta.Artist?.value),
    credit: plain(meta.Credit?.value),
    usageTerms: plain(meta.UsageTerms?.value),
    attributionRequired: plain(meta.AttributionRequired?.value),
    restrictions: plain(meta.Restrictions?.value),
  };
}

const candidates = JSON.parse(await readFile(join(PILOT, 'candidates.json'), 'utf8'));
const titles = candidates.map((candidate) => candidate.enwiki);
const retrievedAt = new Date().toISOString();

console.log(`Fetching ${titles.length} candidates from Wikidata / Wikipedia / Commons…`);
const byTitle = await entitiesByTitle(titles);
const revisions = await wikipediaRevisions(titles);

const people = Object.values(byTitle).filter((entity) => entity.id?.startsWith('Q'));
const placeIds = new Set();
const occupationIds = new Set();
const countryIds = new Set();
for (const entity of people) {
  for (const claim of bestClaim(entity.claims, 'P19').chosen) {
    const id = claim.mainsnak?.datavalue?.value?.id;
    if (id) placeIds.add(id);
  }
  for (const claim of entity.claims?.P106 ?? []) {
    const id = claim.mainsnak?.datavalue?.value?.id;
    if (id) occupationIds.add(id);
  }
}
const placeEntities = await entities([...placeIds]);
for (const place of Object.values(placeEntities)) {
  for (const claim of place.claims?.P17 ?? []) {
    const id = claim.mainsnak?.datavalue?.value?.id;
    if (id) countryIds.add(id);
  }
  // One administrative step up, for the documented coordinate fallback.
  for (const claim of place.claims?.P131 ?? []) {
    const id = claim.mainsnak?.datavalue?.value?.id;
    if (id) placeIds.add(id);
  }
}
const parentEntities = await entities([...placeIds].filter((id) => !placeEntities[id]));
Object.assign(placeEntities, parentEntities);
const labelEntities = await entities([...occupationIds, ...countryIds]);

function labelOf(id) {
  return labelEntities[id]?.labels?.en?.value ?? placeEntities[id]?.labels?.en?.value ?? id;
}

function coordinatesOf(entityId, depth = 0) {
  const entity = placeEntities[entityId];
  if (!entity || depth > 2) return null;
  const claim = bestClaim(entity.claims, 'P625').chosen[0];
  const value = claim?.mainsnak?.datavalue?.value;
  if (value) {
    return {
      sourceEntity: entityId,
      sourceEntityLabel: entity.labels?.en?.value ?? entityId,
      latitude: value.latitude,
      longitude: value.longitude,
      precision: value.precision ?? null,
      escalationSteps: depth,
    };
  }
  const parent = bestClaim(entity.claims, 'P131').chosen[0]?.mainsnak?.datavalue?.value?.id;
  return parent ? coordinatesOf(parent, depth + 1) : null;
}

await mkdir(join(PILOT, 'evidence'), { recursive: true });
const summary = [];

for (const candidate of candidates) {
  const entity = Object.values(byTitle).find((value) => (
    value.sitelinks?.enwiki?.title === candidate.enwiki
  )) ?? byTitle[candidate.qid ?? ''];
  if (!entity?.id) {
    summary.push({ enwiki: candidate.enwiki, status: 'no-wikidata-entity' });
    continue;
  }

  const birth = bestClaim(entity.claims, 'P569');
  const birthValue = birth.chosen[0]?.mainsnak?.datavalue?.value;
  const birthPlaceClaim = bestClaim(entity.claims, 'P19');
  const birthPlaceId = birthPlaceClaim.chosen[0]?.mainsnak?.datavalue?.value?.id ?? null;
  const deathValue = bestClaim(entity.claims, 'P570').chosen[0]?.mainsnak?.datavalue?.value;
  const imageFile = bestClaim(entity.claims, 'P18').chosen[0]?.mainsnak?.datavalue?.value ?? null;

  // Distinct claim values, so a second-ranked contradiction is visible.
  const allBirthValues = (entity.claims?.P569 ?? []).map((claim) => {
    const value = claim.mainsnak?.datavalue?.value;
    return value ? { time: value.time, precision: value.precision, calendar: calendarModel(value.calendarmodel), rank: claim.rank } : null;
  }).filter(Boolean);
  const distinctBirthDates = [...new Set(allBirthValues
    .filter((value) => value.precision === 11)
    .map((value) => `${value.time}|${value.calendar}`))];

  const record = {
    schema: 'zodiacs.phase5.evidence.v1',
    slug: candidate.slug,
    qid: entity.id,
    displayName: candidate.displayName ?? entity.labels?.en?.value ?? null,
    wikidataLabel: entity.labels?.en?.value ?? null,
    wikidataDescription: entity.descriptions?.en?.value ?? null,
    retrievedAtUtc: retrievedAt,
    sources: {
      wikidata: {
        entityUrl: `https://www.wikidata.org/wiki/${entity.id}`,
        propertiesUsed: ['P569', 'P19', 'P625', 'P106', 'P18', 'P570', 'P17', 'P131'],
        lastrevid: entity.lastrevid ?? null,
      },
      wikipedia: {
        language: 'en',
        title: entity.sitelinks?.enwiki?.title ?? candidate.enwiki,
        articleUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent((entity.sitelinks?.enwiki?.title ?? candidate.enwiki).replace(/ /gu, '_'))}`,
        pageId: revisions[candidate.enwiki]?.pageId ?? null,
        revisionId: revisions[candidate.enwiki]?.revisionId ?? null,
        revisionTimestamp: revisions[candidate.enwiki]?.revisionTimestamp ?? null,
      },
    },
    birth: {
      claimCount: birth.total,
      distinctDayPrecisionValues: distinctBirthDates,
      allValues: allBirthValues,
      time: birthValue?.time ?? null,
      precision: birthValue ? precisionLabel(birthValue.precision) : null,
      calendarModel: birthValue ? calendarModel(birthValue.calendarmodel) : null,
      timeOfDay: null,
      timeOfDayEvidence: 'none — Wikidata carries no birth-time claim for this person',
    },
    death: deathValue
      ? { time: deathValue.time, precision: precisionLabel(deathValue.precision), calendarModel: calendarModel(deathValue.calendarmodel) }
      : null,
    living: !deathValue,
    birthPlace: birthPlaceId
      ? {
        entity: birthPlaceId,
        label: placeEntities[birthPlaceId]?.labels?.en?.value ?? null,
        entityUrl: `https://www.wikidata.org/wiki/${birthPlaceId}`,
        country: (() => {
          const id = bestClaim(placeEntities[birthPlaceId]?.claims, 'P17').chosen[0]?.mainsnak?.datavalue?.value?.id;
          return id ? { entity: id, label: labelOf(id) } : null;
        })(),
        claimCount: birthPlaceClaim.total,
        coordinates: coordinatesOf(birthPlaceId),
      }
      : null,
    occupations: (entity.claims?.P106 ?? [])
      .map((claim) => claim.mainsnak?.datavalue?.value?.id)
      .filter(Boolean)
      .map((id) => ({ entity: id, label: labelOf(id) })),
    portrait: imageFile ? await commonsFile(imageFile) : null,
  };

  await writeFile(
    join(PILOT, 'evidence', `${candidate.slug}.json`),
    `${JSON.stringify(record, null, 2)}\n`,
    'utf8',
  );
  summary.push({
    slug: candidate.slug,
    qid: entity.id,
    birth: record.birth.time,
    precision: record.birth.precision,
    calendar: record.birth.calendarModel,
    distinctDates: distinctBirthDates.length,
    place: record.birthPlace?.label ?? null,
    coords: record.birthPlace?.coordinates
      ? `${record.birthPlace.coordinates.latitude},${record.birthPlace.coordinates.longitude} (+${record.birthPlace.coordinates.escalationSteps})`
      : 'MISSING',
    portrait: record.portrait?.licenseShortName ?? 'none',
  });
}

console.table(summary);
console.log(`\nRetrieved at ${retrievedAt}`);
