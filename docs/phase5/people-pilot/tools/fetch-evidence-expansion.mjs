/**
 * Phase 5 completion — batch evidence fetcher for the 500-person expansion.
 *
 * Same allowed sources and record shape as fetch-evidence.mjs, scaled to
 * hundreds of candidates with batching, throttling, and resume. Reads
 * candidates-expansion.json; writes evidence-expansion/{slug}.json.
 * Run by a person; never part of a build.
 *
 *   node docs/phase5/people-pilot/tools/fetch-evidence-expansion.mjs
 */
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const PILOT = join(HERE, '..');
const OUT = join(PILOT, 'evidence-expansion');
const UA = 'Zodiacs.org Phase 5 research (admin@zodiacs.org)';
const GREGORIAN = 'http://www.wikidata.org/entity/Q1985727';
const JULIAN = 'http://www.wikidata.org/entity/Q1985786';

const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

async function api(url, attempt = 0) {
  const response = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (response.status === 429 || response.status >= 500) {
    if (attempt >= 4) throw new Error(`${response.status} after retries — ${url.slice(0, 120)}`);
    await sleep(1500 * (attempt + 1));
    return api(url, attempt + 1);
  }
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} — ${url.slice(0, 160)}`);
  return response.json();
}

const calendarModel = (uri) => (uri === GREGORIAN ? 'proleptic-gregorian'
  : uri === JULIAN ? 'proleptic-julian' : `unknown:${uri}`);
const precisionLabel = (precision) => ({ 11: 'day', 10: 'month', 9: 'year' }[precision] ?? `code-${precision}`);

function bestClaim(claims, property) {
  const list = claims?.[property] ?? [];
  const preferred = list.filter((claim) => claim.rank === 'preferred');
  const normal = list.filter((claim) => claim.rank === 'normal');
  return { chosen: preferred.length > 0 ? preferred : normal, total: list.length };
}

async function entities(ids) {
  const out = {};
  for (let index = 0; index < ids.length; index += 45) {
    const batch = ids.slice(index, index + 45);
    const data = await api('https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&languages=en'
      + `&ids=${batch.join('|')}`);
    Object.assign(out, data.entities ?? {});
    await sleep(120);
  }
  return out;
}

async function commonsFile(fileName) {
  const data = await api('https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2'
    + '&prop=imageinfo&iiprop=url|extmetadata|size'
    + `&titles=${encodeURIComponent(`File:${fileName}`)}`);
  const page = data.query?.pages?.[0];
  const info = page?.imageinfo?.[0];
  if (!info) return null;
  const meta = info.extmetadata ?? {};
  const plain = (value) => {
    if (typeof value !== 'string') return null;
    const text = value.replace(/<[^>]*>/gu, '')
      .replace(/&amp;/gu, '&').replace(/&lt;/gu, '<').replace(/&gt;/gu, '>')
      .replace(/&quot;/gu, '"').replace(/&#0?39;|&apos;/gu, "'").replace(/&nbsp;/gu, ' ')
      .replace(/\s+/gu, ' ').trim();
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

const candidates = JSON.parse(await readFile(join(PILOT, 'candidates-expansion.json'), 'utf8'));
await mkdir(OUT, { recursive: true });
const done = new Set((await readdir(OUT)).map((file) => file.replace(/\.json$/u, '')));
const todo = candidates.filter((candidate) => !done.has(candidate.slug));
console.log(`Candidates: ${candidates.length}; already fetched: ${done.size}; to fetch: ${todo.length}`);
if (todo.length === 0) process.exit(0);

/* 1 — resolve entities + revisions for all pending titles */
const byTitle = {};
const revisions = {};
for (let index = 0; index < todo.length; index += 40) {
  const batch = todo.slice(index, index + 40).map((candidate) => candidate.enwiki);
  const data = await api('https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&languages=en'
    + `&sites=enwiki&titles=${batch.map(encodeURIComponent).join('|')}`);
  for (const entity of Object.values(data.entities ?? {})) {
    const title = entity.sitelinks?.enwiki?.title;
    if (title && entity.id?.startsWith('Q')) byTitle[title] = entity;
  }
  const rev = await api('https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2'
    + '&prop=revisions&rvprop=ids|timestamp&redirects=1'
    + `&titles=${batch.map(encodeURIComponent).join('|')}`);
  const redirect = {};
  for (const item of rev.query?.normalized ?? []) redirect[item.from] = item.to;
  for (const item of rev.query?.redirects ?? []) redirect[redirect[item.from] ? item.from : item.from] = item.to;
  const resolved = (from) => {
    let title = from;
    for (let hop = 0; hop < 3; hop += 1) {
      const next = (rev.query?.normalized ?? []).find((n) => n.from === title)?.to
        ?? (rev.query?.redirects ?? []).find((r) => r.from === title)?.to;
      if (!next) break;
      title = next;
    }
    return title;
  };
  for (const original of batch) {
    const page = (rev.query?.pages ?? []).find((p) => p.title === resolved(original));
    if (page && !page.missing) {
      revisions[original] = {
        title: page.title,
        pageId: page.pageid,
        revisionId: page.revisions?.[0]?.revid ?? null,
        revisionTimestamp: page.revisions?.[0]?.timestamp ?? null,
      };
    }
  }
  console.log(`  resolved ${Math.min(index + 40, todo.length)}/${todo.length}`);
  await sleep(150);
}

/* 2 — collect place / occupation / country entities */
const placeIds = new Set();
const labelIds = new Set();
for (const entity of Object.values(byTitle)) {
  for (const claim of bestClaim(entity.claims, 'P19').chosen) {
    const id = claim.mainsnak?.datavalue?.value?.id;
    if (id) placeIds.add(id);
  }
  for (const claim of (entity.claims?.P106 ?? []).slice(0, 12)) {
    const id = claim.mainsnak?.datavalue?.value?.id;
    if (id) labelIds.add(id);
  }
}
const placeEntities = await entities([...placeIds]);
for (const place of Object.values(placeEntities)) {
  for (const claim of place.claims?.P17 ?? []) {
    const id = claim.mainsnak?.datavalue?.value?.id;
    if (id) labelIds.add(id);
  }
  for (const claim of bestClaim(place.claims, 'P131').chosen.slice(0, 1)) {
    const id = claim.mainsnak?.datavalue?.value?.id;
    if (id) placeIds.add(id);
  }
}
Object.assign(placeEntities, await entities([...placeIds].filter((id) => !placeEntities[id])));
const labelEntities = await entities([...labelIds]);
const labelOf = (id) => labelEntities[id]?.labels?.en?.value ?? placeEntities[id]?.labels?.en?.value ?? id;

function coordinatesOf(entityId, depth = 0) {
  const entity = placeEntities[entityId];
  if (!entity || depth > 2) return null;
  const value = bestClaim(entity.claims, 'P625').chosen[0]?.mainsnak?.datavalue?.value;
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

/* 3 — write one evidence record per candidate */
const retrievedAt = new Date().toISOString();
let written = 0;
for (const candidate of todo) {
  const revision = revisions[candidate.enwiki];
  const entity = revision ? byTitle[revision.title] ?? byTitle[candidate.enwiki] : byTitle[candidate.enwiki];
  if (!entity?.id) {
    await writeFile(join(OUT, `${candidate.slug}.json`),
      `${JSON.stringify({ schema: 'zodiacs.phase5.evidence.v1', slug: candidate.slug, status: 'no-wikidata-entity' }, null, 1)}\n`);
    continue;
  }
  const birth = bestClaim(entity.claims, 'P569');
  const birthValue = birth.chosen[0]?.mainsnak?.datavalue?.value;
  const birthPlaceClaim = bestClaim(entity.claims, 'P19');
  const birthPlaceId = birthPlaceClaim.chosen[0]?.mainsnak?.datavalue?.value?.id ?? null;
  const deathValue = bestClaim(entity.claims, 'P570').chosen[0]?.mainsnak?.datavalue?.value;
  const imageFile = bestClaim(entity.claims, 'P18').chosen[0]?.mainsnak?.datavalue?.value ?? null;
  const allBirthValues = (entity.claims?.P569 ?? []).map((claim) => {
    const value = claim.mainsnak?.datavalue?.value;
    return value ? { time: value.time, precision: value.precision, calendar: calendarModel(value.calendarmodel), rank: claim.rank } : null;
  }).filter(Boolean);

  let portrait = null;
  if (imageFile) {
    try {
      portrait = await commonsFile(imageFile);
      await sleep(110);
    } catch (error) {
      portrait = null;
      console.log(`  portrait metadata failed for ${candidate.slug}: ${String(error).slice(0, 90)}`);
    }
  }

  const record = {
    schema: 'zodiacs.phase5.evidence.v1',
    slug: candidate.slug,
    qid: entity.id,
    displayName: candidate.displayName,
    wikidataLabel: entity.labels?.en?.value ?? null,
    wikidataDescription: entity.descriptions?.en?.value ?? null,
    retrievedAtUtc: retrievedAt,
    selection: { region: candidate.region, field: candidate.field },
    sources: {
      wikidata: {
        entityUrl: `https://www.wikidata.org/wiki/${entity.id}`,
        propertiesUsed: ['P569', 'P19', 'P625', 'P106', 'P18', 'P570', 'P17', 'P131'],
        lastrevid: entity.lastrevid ?? null,
      },
      wikipedia: {
        language: 'en',
        title: revision?.title ?? candidate.enwiki,
        articleUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent((revision?.title ?? candidate.enwiki).replace(/ /gu, '_'))}`,
        pageId: revision?.pageId ?? null,
        revisionId: revision?.revisionId ?? null,
        revisionTimestamp: revision?.revisionTimestamp ?? null,
      },
    },
    birth: {
      claimCount: birth.total,
      distinctDayPrecisionValues: [...new Set(allBirthValues
        .filter((value) => value.precision === 11)
        .map((value) => `${value.time}|${value.calendar}`))],
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
    occupations: (entity.claims?.P106 ?? []).slice(0, 12)
      .map((claim) => claim.mainsnak?.datavalue?.value?.id)
      .filter(Boolean)
      .map((id) => ({ entity: id, label: labelOf(id) })),
    portrait,
  };
  await writeFile(join(OUT, `${candidate.slug}.json`), `${JSON.stringify(record, null, 1)}\n`, 'utf8');
  written += 1;
  if (written % 50 === 0) console.log(`  written ${written}/${todo.length}`);
}
console.log(`Done: ${written} records at ${retrievedAt}`);
