import { EDITORIAL_METADATA } from '../src/lib/editorial-metadata.mjs';

const hasType = (node, type) => Array.isArray(node?.['@type'])
  ? node['@type'].includes(type) : node?.['@type'] === type;

/** Validate the built graph against its source-controlled editorial owner. */
export function editorialGraphErrors(path, nodes) {
  const owner = EDITORIAL_METADATA[path];
  if (!owner) return [];
  const errors = [];
  const owners = nodes.filter((node) => hasType(node, owner.type));
  if (owners.length !== 1) errors.push(`needs exactly one ${owner.type} owner`);
  if (owner.type === 'CollectionPage' && nodes.some((node) => hasType(node, 'Article'))) {
    errors.push('collection hub must not also emit Article');
  }
  for (const node of owners) {
    if (node.dateModified !== `${owner.modified}T00:00:00.000Z`) errors.push('dateModified must match editorial receipt');
    if (Object.hasOwn(node, 'datePublished')) errors.push('unknown datePublished must be omitted');
  }
  return errors;
}

/** Every editorial owner must have exactly one matching sitemap entry. */
export function editorialSitemapErrors(xml) {
  const errors = [];
  const blocks = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/gu)].map((match) => match[1]);
  for (const [path, owner] of Object.entries(EDITORIAL_METADATA)) {
    const matches = blocks.filter((block) => block.includes(`<loc>https://zodiacs.org${path}</loc>`));
    if (matches.length !== 1) errors.push(`${path}: needs exactly one sitemap entry`);
    else if (!matches[0].includes(`<lastmod>${owner.modified}</lastmod>`)) errors.push(`${path}: sitemap date differs from editorial receipt`);
  }
  return errors;
}
