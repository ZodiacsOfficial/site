/** Validate the structured-data contracts over a completed production build. */
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, relative, resolve, sep } from 'node:path';
import { WEB_APPLICATION_PATHS } from '../src/strings/seo.en.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(repo, 'dist');
const signSlugs = new Set([
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
]);
const failures = [];
let documentCount = 0;
let nodeCount = 0;

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? htmlFiles(path) : (entry.name.endsWith('.html') ? [path] : []);
  }));
  return nested.flat();
}

function attr(html, name, value) {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  return tags.some((tag) => {
    const get = (key) => tag.match(new RegExp(`\\b${key}=(?:"([^"]*)"|'([^']*)')`, 'i'))?.slice(1).find(Boolean);
    return get(name)?.toLowerCase() === value && get('content')?.toLowerCase().includes('noindex');
  });
}

function canonicalPath(html) {
  const href = html.match(/<link\b[^>]*rel=(?:"canonical"|'canonical')[^>]*href=(?:"([^"]+)"|'([^']+)')/i)
    ?.slice(1).find(Boolean)
    ?? html.match(/<link\b[^>]*href=(?:"([^"]+)"|'([^']+)')[^>]*rel=(?:"canonical"|'canonical')/i)
      ?.slice(1).find(Boolean);
  if (!href) return null;
  try {
    const url = new URL(href, 'https://zodiacs.org');
    return url.origin === 'https://zodiacs.org' ? url.pathname : null;
  } catch {
    return null;
  }
}

function structuredDocuments(html, label) {
  const documents = [];
  const scripts = html.matchAll(/<script\b[^>]*type=(?:"application\/ld\+json"|'application\/ld\+json')[^>]*>([\s\S]*?)<\/script>/gi);
  for (const match of scripts) {
    try {
      const document = JSON.parse(match[1]);
      if (document['@context'] !== 'https://schema.org') {
        failures.push(`${label}: JSON-LD document is missing the schema.org context`);
      }
      documents.push(document);
    } catch (error) {
      failures.push(`${label}: invalid JSON-LD — ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return documents;
}

function nodesOf(documents) {
  return documents.flatMap((document) => Array.isArray(document['@graph']) ? document['@graph'] : [document]);
}

function hasType(node, type) {
  return Array.isArray(node?.['@type']) ? node['@type'].includes(type) : node?.['@type'] === type;
}

function validateBreadcrumb(node, label, pathname) {
  const items = node.itemListElement;
  if (!Array.isArray(items) || items.length < 2) {
    failures.push(`${label}: BreadcrumbList needs at least two ListItem entries`);
    return;
  }
  items.forEach((item, index) => {
    if (!hasType(item, 'ListItem') || item.position !== index + 1 || typeof item.name !== 'string') {
      failures.push(`${label}: invalid breadcrumb item at position ${index + 1}`);
    }
    const target = item.item ?? item.url;
    try {
      if (new URL(target).origin !== 'https://zodiacs.org') throw new Error('foreign origin');
    } catch {
      failures.push(`${label}: breadcrumb ${index + 1} has an invalid item URL`);
    }
  });
  const lastTarget = items.at(-1)?.item ?? items.at(-1)?.url;
  try {
    if (new URL(lastTarget).pathname !== pathname) {
      failures.push(`${label}: final breadcrumb does not resolve to ${pathname}`);
    }
  } catch {
    // The malformed target was already reported above.
  }
}

function validateArticle(node, label) {
  for (const field of ['headline', 'url', 'image']) {
    if (!(field in node)) failures.push(`${label}: Article is missing ${field}`);
  }
  if (!node.author || !node.publisher) failures.push(`${label}: Article needs author and publisher`);
}

function validateApplication(node, label) {
  for (const field of ['name', 'url', 'description', 'applicationCategory', 'operatingSystem']) {
    if (typeof node[field] !== 'string' || !node[field]) failures.push(`${label}: WebApplication is missing ${field}`);
  }
  if (node.isAccessibleForFree !== true) failures.push(`${label}: WebApplication must declare free access`);
  if (String(node.offers?.price) !== '0') failures.push(`${label}: WebApplication must expose a zero-price Offer`);
}

for (const file of await htmlFiles(dist)) {
  const html = await readFile(file, 'utf8');
  const label = relative(dist, file).split(sep).join('/');
  const pathname = canonicalPath(html);
  if (!pathname || attr(html, 'name', 'robots')) continue;

  const documents = structuredDocuments(html, label);
  const nodes = nodesOf(documents);
  documentCount += documents.length;
  nodeCount += nodes.length;

  if (pathname !== '/') {
    const breadcrumb = nodes.find((node) => hasType(node, 'BreadcrumbList'));
    if (!breadcrumb) failures.push(`${label}: indexable page is missing BreadcrumbList`);
    else validateBreadcrumb(breadcrumb, label, pathname);
  }

  if (pathname === '/') {
    const website = nodes.find((node) => hasType(node, 'WebSite'));
    const organization = nodes.find((node) => hasType(node, 'Organization'));
    const faq = nodes.find((node) => hasType(node, 'FAQPage'));
    if (!website) failures.push(`${label}: homepage is missing WebSite`);
    if (!organization) failures.push(`${label}: homepage is missing Organization`);
    if (!Array.isArray(organization?.sameAs) || organization.sameAs.length < 1) {
      failures.push(`${label}: homepage Organization needs sameAs profiles`);
    }
    if (!faq || !Array.isArray(faq.mainEntity) || faq.mainEntity.length < 1) {
      failures.push(`${label}: homepage is missing its FAQPage questions`);
    }
  }

  const topLevelSlug = pathname.split('/').filter(Boolean);
  const needsArticle = topLevelSlug.length === 1 && signSlugs.has(topLevelSlug[0]);
  const learnContent = pathname.startsWith('/learn/')
    && (pathname === '/learn/how-to-read-a-birth-chart/'
      || pathname === '/learn/zodiac-dates/'
      || pathname === '/learn/glossary/'
      || topLevelSlug.length >= 3);
  if (needsArticle || learnContent) {
    const article = nodes.find((node) => hasType(node, 'Article'));
    if (!article) failures.push(`${label}: sign/learn content is missing Article`);
    else validateArticle(article, label);
  }

  if (WEB_APPLICATION_PATHS.includes(pathname)) {
    const application = nodes.find((node) => hasType(node, 'WebApplication'));
    if (!application) failures.push(`${label}: tool page is missing WebApplication`);
    else validateApplication(application, label);
  }
}

if (failures.length) {
  console.error(`validate-schema: ${failures.length} failure(s)`);
  failures.forEach((failure) => console.error(`  - ${failure}`));
  process.exit(1);
}

console.log(`validate-schema: OK — ${documentCount} JSON-LD documents, ${nodeCount} graph nodes, 0 errors`);
