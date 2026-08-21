/** Shared contract for the committed People public-demand snapshot. */
export const PEOPLE_INDEX_DEMAND_TARGET = 100;

export const PEOPLE_INDEX_DEMAND_METRIC =
  'Twelve-month English Wikipedia reader pageviews. This is a public-demand proxy, not Google search volume or a claim about the people.';

export const PEOPLE_INDEX_DEMAND_WINDOW = Object.freeze({
  from: '2025-08-01',
  to: '2026-07-31',
  completeMonths: 12,
});

export const PEOPLE_INDEX_DEMAND_SOURCE = Object.freeze({
  name: 'Wikimedia REST API — English Wikipedia pageviews',
  endpoint: 'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/',
  project: 'en.wikipedia',
  access: 'all-access',
  agent: 'user',
  granularity: 'monthly',
});

export function peopleIndexDemandMonthTimestamps() {
  const cursor = new Date(`${PEOPLE_INDEX_DEMAND_WINDOW.from}T00:00:00.000Z`);
  const end = new Date(`${PEOPLE_INDEX_DEMAND_WINDOW.to}T00:00:00.000Z`);
  const timestamps = [];
  while (cursor <= end) {
    timestamps.push(
      `${cursor.getUTCFullYear()}${String(cursor.getUTCMonth() + 1).padStart(2, '0')}0100`,
    );
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  if (timestamps.length !== PEOPLE_INDEX_DEMAND_WINDOW.completeMonths) {
    throw new Error('People index-demand window does not contain the declared complete months');
  }
  return timestamps;
}

function hasCanonicalPostWindowTimestamp(value) {
  if (typeof value !== 'string') return false;
  const generated = new Date(value);
  const windowEnd = new Date(`${PEOPLE_INDEX_DEMAND_WINDOW.to}T23:59:59.999Z`);
  return !Number.isNaN(generated.valueOf())
    && generated.toISOString() === value
    && generated > windowEnd;
}

export function wikipediaArticleTitle(person) {
  const articleUrl = person.sources?.wikipedia?.articleUrl;
  if (!articleUrl) throw new Error(`${person.slug}: missing Wikipedia article URL`);
  const title = decodeURIComponent(new URL(articleUrl).pathname.replace(/^\/wiki\//u, ''));
  if (!title) throw new Error(`${person.slug}: invalid Wikipedia article URL`);
  return title;
}

export function validatePeopleIndexDemand({ evidence, deceased }) {
  const deceasedSlugs = new Set(deceased.map((person) => person.slug));
  const deceasedBySlug = new Map(deceased.map((person) => [person.slug, person]));
  if (evidence.schema !== 'zodiacs.phase5.people-index-demand.v1') {
    throw new Error(`Unsupported People index-demand evidence: ${evidence.schema}`);
  }
  if (evidence.generatedBy !== 'scripts/build-people-index-demand.mjs --refresh'
      || !hasCanonicalPostWindowTimestamp(evidence.generatedAtUtc)
      || JSON.stringify(evidence.source) !== JSON.stringify(PEOPLE_INDEX_DEMAND_SOURCE)
      || evidence.metric !== PEOPLE_INDEX_DEMAND_METRIC
      || JSON.stringify(evidence.window) !== JSON.stringify(PEOPLE_INDEX_DEMAND_WINDOW)
      || evidence.target !== PEOPLE_INDEX_DEMAND_TARGET
      || evidence.population !== 'All 497 reviewed deceased profiles; living profiles remain separately protected.'
      || evidence.tieBreak !== 'slug ascending'
      || evidence.people.length !== deceased.length) {
    throw new Error('People index-demand evidence has the wrong provenance, target, or population');
  }
  if (new Set(evidence.people.map((person) => person.slug)).size !== deceased.length
      || evidence.people.some((person) => (
        !deceasedSlugs.has(person.slug)
        || person.title !== wikipediaArticleTitle(deceasedBySlug.get(person.slug))
        || !Number.isSafeInteger(person.rank)
        || person.rank < 1
        || !Number.isSafeInteger(person.views)
        || person.views < 0
      ))) {
    throw new Error('People index-demand evidence does not cover the exact deceased population');
  }
  const sorted = [...evidence.people]
    .sort((a, b) => b.views - a.views || a.slug.localeCompare(b.slug));
  if (sorted.some((person, index) => (
    person.slug !== evidence.people[index].slug
    || person.views !== evidence.people[index].views
    || person.rank !== index + 1
  ))) {
    throw new Error('People index-demand evidence is not rank-exact');
  }
}
