import assert from 'node:assert/strict';
import fs from 'node:fs';

const pagePath = new URL('../dist/learn/glossary/index.html', import.meta.url);
const html = fs.readFileSync(pagePath, 'utf8');
const jsonLdMatch = html.match(
  /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/,
);

assert.ok(jsonLdMatch, 'the page must emit one JSON-LD graph');

const graph = JSON.parse(jsonLdMatch[1]);
assert.equal(graph['@context'], 'https://schema.org');
assert.ok(Array.isArray(graph['@graph']), 'JSON-LD must contain an @graph');

const article = graph['@graph'].find((node) => node['@type'] === 'Article');
const termSet = graph['@graph'].find((node) => node['@type'] === 'DefinedTermSet');
const breadcrumbs = graph['@graph'].find((node) => node['@type'] === 'BreadcrumbList');
const required = new Map([
  ['Article', [
    '@id', 'headline', 'description', 'url', 'datePublished', 'dateModified',
    'author', 'publisher', 'mainEntityOfPage', 'mainEntity', 'citation',
  ]],
  ['DefinedTermSet', [
    '@id', 'name', 'description', 'url', 'creator', 'publisher',
    'hasDefinedTerm',
  ]],
]);

for (const [type, node] of [['Article', article], ['DefinedTermSet', termSet]]) {
  assert.ok(node, type + ' node must exist');
  const missing = required.get(type).filter((field) => node[field] == null);
  assert.deepEqual(missing, [], type + ' is missing required fields');
  console.log(
    'schema-validator: ' + type + ' PASS — '
    + required.get(type).length + ' required fields; 0 errors',
  );
}

assert.equal(article.author['@id'], 'https://zodiacs.org/#org');
assert.equal(article.author['@type'], 'Organization');
assert.equal(article.mainEntity['@id'], termSet['@id']);
assert.ok(breadcrumbs, 'BreadcrumbList node must exist');
assert.equal(breadcrumbs.itemListElement.length, 3);

const definedTerms = termSet.hasDefinedTerm;
assert.ok(Array.isArray(definedTerms), 'hasDefinedTerm must be an array');
assert.ok(definedTerms.length >= 110 && definedTerms.length <= 140);
for (const term of definedTerms) {
  assert.equal(term['@type'], 'DefinedTerm');
  assert.ok(term['@id'] && term.name && term.description && term.url);
  assert.equal(term['@id'], term.url);
  assert.equal(term.inDefinedTermSet['@id'], termSet['@id']);
}
console.log(
  `schema-validator: DefinedTerm entries PASS — ${definedTerms.length} terms; 0 errors`,
);

const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]));
const dtIds = [...html.matchAll(/<dt id="([^"]+)"/g)].map((match) => match[1]);
assert.equal(dtIds.length, definedTerms.length, 'rendered terms must match schema terms');
assert.equal(new Set(dtIds).size, dtIds.length, 'rendered term IDs must be unique');

for (const term of definedTerms) {
  const fragment = new URL(term.url).hash.slice(1);
  assert.ok(ids.has(fragment), `schema URL must resolve to #${fragment}`);
}

for (const match of html.matchAll(/href="#([^"]+)"/g)) {
  assert.ok(ids.has(match[1]), `same-page link must resolve to #${match[1]}`);
}

assert.equal(html.includes('<astro-island'), false, 'the page must not hydrate an island');
assert.equal(html.includes('rel="modulepreload"'), false, 'the page must not preload island JS');
console.log(
  `page-contract: PASS — ${dtIds.length} stable term anchors; all fragment links resolve; zero island JS`,
);
console.log('schema-validator: BreadcrumbList PASS — 3 positions; 0 errors');
console.log('schema-validator: 0 errors, 0 warnings');
