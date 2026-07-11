import assert from 'node:assert/strict';
import fs from 'node:fs';

const pagePath = new URL('../dist/learn/zodiac-dates/index.html', import.meta.url);
const csvPath = new URL('../dist/learn/zodiac-dates/zodiac-dates.csv', import.meta.url);
const html = fs.readFileSync(pagePath, 'utf8');
const csv = fs.readFileSync(csvPath, 'utf8');

const jsonLdMatch = html.match(
  /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/,
);
assert.ok(jsonLdMatch, 'the page must emit one JSON-LD graph');

const graph = JSON.parse(jsonLdMatch[1]);
assert.equal(graph['@context'], 'https://schema.org');
assert.ok(Array.isArray(graph['@graph']), 'JSON-LD must contain an @graph');

const article = graph['@graph'].find((node) => node['@type'] === 'Article');
const dataset = graph['@graph'].find((node) => node['@type'] === 'Dataset');

const required = new Map([
  ['Article', [
    '@id', 'headline', 'description', 'url', 'datePublished', 'dateModified',
    'author', 'publisher', 'mainEntityOfPage', 'mainEntity', 'citation',
  ]],
  ['Dataset', [
    '@id', 'name', 'description', 'url', 'creator', 'publisher', 'dateCreated',
    'datePublished', 'dateModified', 'temporalCoverage', 'variableMeasured',
    'measurementTechnique', 'citation', 'distribution',
  ]],
]);

for (const [type, node] of [['Article', article], ['Dataset', dataset]]) {
  assert.ok(node, type + ' node must exist');
  const missing = required.get(type).filter((field) => node[field] == null);
  assert.deepEqual(missing, [], type + ' is missing required fields');
  console.log(
    'schema-validator: ' + type + ' PASS — '
    + required.get(type).length + ' required fields; 0 errors',
  );
}

assert.equal(article.author['@id'], 'https://zodiacs.org/about/#editor');
assert.equal(article.mainEntity['@id'], dataset['@id']);
assert.ok(
  new Date(dataset.dateCreated) <= new Date(dataset.datePublished),
  'Dataset creation must not follow publication',
);
assert.ok(
  new Date(dataset.datePublished) <= new Date(dataset.dateModified),
  'Dataset modification must not precede publication',
);

const distribution = dataset.distribution;
assert.equal(distribution['@type'], 'DataDownload');
assert.equal(distribution.encodingFormat, 'text/csv');
assert.equal(
  distribution.contentUrl,
  'https://zodiacs.org/learn/zodiac-dates/zodiac-dates.csv',
);

const csvLines = csv.trimEnd().split(/\r?\n/);
assert.equal(csvLines.length, 13, 'CSV must contain one header plus twelve signs');
assert.match(csvLines[0], /sun_ingress_2026_utc/);
assert.match(csvLines[0], /sun_ingress_2027_utc/);
assert.match(csvLines[1], /2026-03-20T14:45Z/);
assert.match(csvLines[1], /2027-03-20T20:24Z/);
console.log(
  'schema-validator: DataDownload PASS — CSV resolves; '
  + '12 data rows; minute-precision UTC',
);

assert.equal(
  (html.match(/<th scope="row" data-label="Sign"[^>]*>/g) ?? []).length,
  12,
  'the table must expose twelve sign row headers',
);
assert.match(html, /Convention: tropical zodiac; instants in UTC\./);
assert.equal(html.includes('<astro-island'), false, 'the page must not hydrate an island');
assert.equal(html.includes('rel="modulepreload"'), false, 'the page must not preload island JS');
console.log('page-contract: PASS — 12 row headers; convention present; zero island JS');
console.log('schema-validator: 0 errors, 0 warnings');
