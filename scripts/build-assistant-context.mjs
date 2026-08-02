/*
 * Builds the cached site guide used by the assistant function.
 *
 * Run under vite-node because the glossary is a TypeScript data module:
 *   vite-node --script scripts/build-assistant-context.mjs
 *
 * The output is committed. It deliberately carries no build timestamp so a
 * second run over the same sources is byte-identical.
 */
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { GLOSSARY } from '../src/data/glossary.ts';
import { CHINESE_ZODIAC_COPY } from '../src/data/chinese-zodiac.ts';
import { DEFAULT_LOCALE, LOCALES, RELEASED_LOCALES } from '../src/lib/i18n/core.ts';
import { EN } from '../src/strings/en.mjs';
import { WIDGET_EN } from '../src/strings/widgets.ts';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_OUTPUT = resolve(repo, 'api/_assistant/context.ts');

export const MIN_CONTEXT_BYTES = 30 * 1024;
export const MAX_CONTEXT_BYTES = 60 * 1024;
export const MIN_KNOWLEDGE_CHUNK_CHARS = 500;
export const MAX_KNOWLEDGE_CHUNK_CHARS = 900;

// These are the English tools and utilities that accept a date, chart, pair,
// or current-sky question. The generator verifies every route has a real page
// and takes its explanation from that page's meta description.
export const TOOL_ROUTES = Object.freeze([
  '/ask/',
  '/baby-zodiac/',
  '/birth-chart/',
  '/birthday/',
  '/compatibility/',
  '/eclipses/',
  '/full-moon-calendar/',
  '/mercury-retrograde/',
  '/moon-phase/',
  '/moon-sign/',
  '/profile/',
  '/retrogrades/',
  '/rising-sign/',
  '/saturn-return/',
  '/solar-return/',
  '/transits/',
  '/widgets/',
]);

export const BANNED_CONSUMER_VOCABULARY = Object.freeze([
  'coin',
  'crypto',
  'cryptocurrency',
  'investment',
  'investor',
  'market',
  'mint',
  'price',
  'sale',
  'token',
  'trade',
  'trading',
  'wallet',
]);

const COLLAPSE = /\s+/g;
// The assistant inventory is English-only. Exclude every declared locale,
// including staged noindex trees such as /ru/, so preview pages can never
// change the committed English context or its route counts.
const LOCALIZED_PAGE_PREFIXES = LOCALES
  .filter((locale) => locale !== DEFAULT_LOCALE)
  .map((locale) => `${locale}/`);
// Reachable does not mean recommendable. Phase 5's reviewed pilot remains
// deliberately absent from all discovery surfaces until its separate
// indexing authorization; the assistant must honor that boundary too.
const UNLISTED_ROUTE_PREFIXES = Object.freeze(['/people/']);

// Rendered pages may contain a small amount of build-clock-dependent copy.
// That copy is useful on the page, where it is rebuilt and freshness-labelled,
// but it is the wrong source for a committed retrieval index: two production
// builds from identical sources would otherwise produce different source IDs.
// Keep the deterministic dated tables and evergreen explanations, and omit
// only the UI fragments whose contents are selected from `new Date()`.
const VOLATILE_RENDERED_CLASSES = Object.freeze(new Set([
  // Current-state callouts on the eclipse, moon, and retrograde pages.
  'rx-now',
  // Current-state and next-event callouts on the events hub.
  'evhub-now',
  // Build-time current-sign line on the ten planet guides.
  'learn-detail__facts',
  // Current/upcoming lunations selected on the moon-phase page.
  'lunations',
  // Active-planet badges and per-window now/ahead labels. The windows and
  // station positions themselves remain in the index.
  'planet__now',
  'rx-table__state',
]));

const VOLATILE_FAQ_QUESTIONS = Object.freeze(new Set([
  'When is the next solar eclipse?',
  'When is the next lunar eclipse?',
  'When is the next full moon?',
  'When is the next Mercury retrograde?',
  'Which planets are retrograde right now?',
]));

const VOLATILE_FAQ_ROUTES = Object.freeze(new Set([
  '/eclipses/',
  '/full-moon-calendar/',
  '/mercury-retrograde/',
  '/retrogrades/',
]));

const VOID_HTML_ELEMENTS = Object.freeze(new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link',
  'meta', 'param', 'source', 'track', 'wbr',
]));

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function clean(value) {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&mdash;', '—')
    .replaceAll('&ndash;', '–')
    .replaceAll('&rsquo;', '’')
    .replaceAll('&lsquo;', '‘')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replace(/&#(\d+);/g, (_match, decimal) => String.fromCodePoint(Number(decimal)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, hexadecimal) => String.fromCodePoint(Number.parseInt(hexadecimal, 16)))
    .replace(COLLAPSE, ' ')
    .trim();
}

function attributeValue(openingTag, attribute) {
  const escaped = attribute.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return openingTag.match(new RegExp(`\\b${escaped}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, 'i'))?.[2] ?? null;
}

function hasClass(openingTag, className) {
  return attributeValue(openingTag, 'class')?.split(/\s+/).includes(className) ?? false;
}

function matchingElementEnd(source, openingIndex, openingTag, tagName) {
  if (VOID_HTML_ELEMENTS.has(tagName) || /\/\s*>$/.test(openingTag)) {
    return openingIndex + openingTag.length;
  }

  const tagPattern = new RegExp(`<\\/?${tagName}\\b[^>]*>`, 'gi');
  tagPattern.lastIndex = openingIndex + openingTag.length;
  let depth = 1;
  for (let match = tagPattern.exec(source); match; match = tagPattern.exec(source)) {
    if (/^<\//.test(match[0])) {
      depth -= 1;
      if (depth === 0) return match.index + match[0].length;
    } else if (!/\/\s*>$/.test(match[0])) {
      depth += 1;
    }
  }
  throw new Error(`Unclosed rendered <${tagName}> element`);
}

function stripRenderedElements(source, predicate) {
  const openingPattern = /<([a-z][\w:-]*)\b[^>]*>/gi;
  let output = '';
  let copiedThrough = 0;
  for (let match = openingPattern.exec(source); match; match = openingPattern.exec(source)) {
    const tagName = match[1].toLowerCase();
    const end = matchingElementEnd(source, match.index, match[0], tagName);
    const element = source.slice(match.index, end);
    if (!predicate({
      element,
      openingTag: match[0],
      tagName,
      text: clean(element),
    })) continue;

    output += source.slice(copiedThrough, match.index);
    copiedThrough = end;
    openingPattern.lastIndex = end;
  }
  return `${output}${source.slice(copiedThrough)}`;
}

/**
 * Remove only build-clock-dependent fragments from rendered main HTML.
 * Route-aware content rules prevent ordinary editorial uses of words such as
 * "next" or "as of" from being discarded.
 */
export function sanitizeRenderedMainHtml(main, sourceName = 'rendered page') {
  let sanitized = stripRenderedElements(main, ({ openingTag }) => (
    [...VOLATILE_RENDERED_CLASSES].some((className) => hasClass(openingTag, className))
  ));

  // The events hub's three-card "Next up" section and its current-state
  // callout are derived from the build instant. All calendar rows remain.
  if (sourceName === '/events/') {
    sanitized = stripRenderedElements(sanitized, ({ openingTag, tagName, text }) => (
      (tagName === 'section' && attributeValue(openingTag, 'aria-labelledby') === 'next-up-head')
      // Once a month becomes past, the hub wraps it in a details element and
      // adds a changing count. Remove that summary while retaining its rows.
      || (tagName === 'summary' && /^Earlier in \d{4}\b/u.test(text))
    ));
  }

  // Placement panels combine stable dignity facts with windows selected
  // relative to the build clock. Preserve the dignity row and remove only
  // the current/upcoming/recent-window rows.
  if (/^\/learn\/placements\/[^/]+\/$/u.test(sourceName)) {
    sanitized = stripRenderedElements(sanitized, ({ openingTag, tagName, element }) => {
      if (tagName !== 'div' || !hasClass(openingTag, 'plc-panel__row')) return false;
      const label = clean(element.match(/<dt\b[^>]*>([\s\S]*?)<\/dt>/i)?.[1] ?? '');
      return /^(?:In .+ now|Then|Next|Most recent eras?)$/u.test(label);
    });
  }

  // Rising profiles print their ruler's degree at the exact build instant.
  // Other rows in the same panel (ruler, element, cadence) are evergreen.
  if (/^\/rising-sign\/[^/]+\/$/u.test(sourceName)) {
    sanitized = stripRenderedElements(sanitized, ({ openingTag, tagName, element }) => {
      if (tagName !== 'div' || !hasClass(openingTag, 'plc-panel__row')) return false;
      const label = clean(element.match(/<dt\b[^>]*>([\s\S]*?)<\/dt>/i)?.[1] ?? '');
      return /\bas of\b/iu.test(label);
    });
  }

  // A handful of FAQ answers interpolate the same current/next status used
  // by the omitted callouts. Remove those details; all timeless FAQs remain.
  if (VOLATILE_FAQ_ROUTES.has(sourceName)) {
    sanitized = stripRenderedElements(sanitized, ({ tagName, element }) => {
      if (tagName !== 'details') return false;
      const question = clean(element.match(/<summary\b[^>]*>([\s\S]*?)<\/summary>/i)?.[1] ?? '');
      return VOLATILE_FAQ_QUESTIONS.has(question);
    });
  }

  return sanitized;
}

async function filesUnder(root, extension = '') {
  const output = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const path = join(root, entry.name);
    if (entry.isDirectory()) output.push(...await filesUnder(path, extension));
    else if (!extension || extname(entry.name) === extension) output.push(path);
  }
  return output.sort();
}

export function frontmatterField(source, field, sourceName = 'content entry') {
  const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
  if (!frontmatter) throw new Error(`Missing frontmatter in ${sourceName}`);
  const match = frontmatter.match(new RegExp(`^${field}:\\s*(.+)$`, 'm'));
  if (!match) throw new Error(`Missing ${field} in ${sourceName}`);
  const raw = match[1].trim();

  if (raw.startsWith('"') && raw.endsWith('"')) return JSON.parse(raw);
  if (raw.startsWith("'") && raw.endsWith("'")) {
    return raw.slice(1, -1).replaceAll("''", "'");
  }
  return raw;
}

function pagePath(file, pagesRoot) {
  const local = relative(pagesRoot, file).replaceAll('\\', '/');
  if (local === 'index.astro') return '/';
  if (local.endsWith('/index.astro')) return `/${local.slice(0, -'index.astro'.length)}`;
  return `/${local.slice(0, -'.astro'.length)}/`;
}

function zodiacDatesDescription(ingresses) {
  const currentYear = Number(ingresses.generatedAt.slice(0, 4));
  if (!Number.isInteger(currentYear)) throw new Error('Invalid ingress generatedAt year');
  return `The twelve tropical zodiac signs in one table: exact longitude ranges, correspondences, hemisphere seasons, and year-exact Sun ingress instants for ${currentYear} and ${currentYear + 1}.`;
}

function monthLabel(month) {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) throw new Error(`Invalid horoscope month: ${month}`);
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    timeZone: 'UTC',
    year: 'numeric',
  }).format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1)));
}

function signName(sign) {
  return `${sign[0].toUpperCase()}${sign.slice(1)}`;
}

function staticDescription(route, source, { ingresses, latestHoroscopeMonth }) {
  const literal = source.match(/<Base\b[\s\S]*?\bdescription="([^"]+)"/i)?.[1];
  if (literal) return clean(literal);

  const catalogKey = source.match(/<Base\b[\s\S]*?\bdescription=\{EN\[['"]([^'"]+)['"]\]\}/i)?.[1];
  if (catalogKey && EN[catalogKey]) return clean(EN[catalogKey]);

  if (source.includes('<LocalizedDisclosurePage locale="en"')) {
    return clean(EN['disclosure.metaDescription']);
  }

  const chineseCatalogKey = source.match(/<Base\b[\s\S]*?\bdescription=\{CHINESE_ZODIAC_COPY\.([a-zA-Z0-9_]+)\}/i)?.[1];
  if (chineseCatalogKey && CHINESE_ZODIAC_COPY[chineseCatalogKey]) {
    return clean(CHINESE_ZODIAC_COPY[chineseCatalogKey]);
  }

  const widgetCatalogKey = source.match(/<Base\b[\s\S]*?\bdescription=\{WIDGET_EN\.([a-zA-Z0-9_]+)\}/i)?.[1];
  if (widgetCatalogKey && WIDGET_EN[widgetCatalogKey]) {
    return clean(WIDGET_EN[widgetCatalogKey]);
  }

  if (route === '/horoscopes/') {
    return `Dated daily horoscopes for every sign, with the exact UTC edition date printed on the page and links to tomorrow, weekly, ${monthLabel(latestHoroscopeMonth)} monthly, love, career, and year-ahead readings.`;
  }
  if (route === '/ask/' && /<AskPage\s+locale=["']en["']\s*\/>/i.test(source)) {
    return 'Ask a reflective astrology guide grounded in Zodiacs sources and deterministic chart facts. Choose whether to attach a privacy-safe chart payload.';
  }
  if (route === '/learn/zodiac-dates/') return zodiacDatesDescription(ingresses);

  const named = source.match(/const description\s*=\s*(['"])([\s\S]*?)\1\s*;/)?.[2];
  if (named) return clean(named);
  throw new Error(`Could not read the Base meta description for ${route}`);
}

async function loadContentEntries(root, routeFor) {
  const entries = [];
  for (const file of await filesUnder(root, '.mdx')) {
    const source = await readFile(file, 'utf8');
    const local = relative(root, file).replaceAll('\\', '/').slice(0, -'.mdx'.length);
    entries.push({
      id: local,
      route: routeFor(local, source),
      title: frontmatterField(source, 'title', file),
      description: frontmatterField(source, 'description', file),
      source,
    });
  }
  return entries.sort((a, b) => compareText(a.route, b.route));
}

async function loadHoroscopes(root) {
  const all = [];
  for (const file of await filesUnder(root, '.mdx')) {
    const source = await readFile(file, 'utf8');
    // The horoscope routes render the latest NON-DRAFT month; the site guide
    // must describe the same month a visitor actually sees.
    if (/^draft:\s*true$/m.test(source.split(/\r?\n---(?:\r?\n|$)/)[0] ?? '')) continue;
    const sign = frontmatterField(source, 'sign', file);
    const month = frontmatterField(source, 'month', file);
    all.push({
      sign,
      month,
      title: `${signName(sign)} horoscope for ${monthLabel(month)}`,
      description: `${signName(sign)} astrology themes grounded in the dated transits and lunations of ${monthLabel(month)}.`,
      source,
    });
  }
  const latestMonth = all.map((entry) => entry.month).sort().at(-1);
  if (!latestMonth) throw new Error('Horoscope collection is empty');
  const current = all.filter((entry) => entry.month === latestMonth)
    .sort((a, b) => compareText(a.sign, b.sign));
  if (current.length !== 12) {
    throw new Error(`Latest horoscope month ${latestMonth} has ${current.length} signs`);
  }
  return { latestMonth, current };
}

async function loadStaticPages(repoRoot, context) {
  const pagesRoot = resolve(repoRoot, 'src/pages');
  const pages = [];
  for (const file of await filesUnder(pagesRoot, '.astro')) {
    const local = relative(pagesRoot, file).replaceAll('\\', '/');
    if (LOCALIZED_PAGE_PREFIXES.some((prefix) => local.startsWith(prefix))) continue;
    if (local.startsWith('embed/')) continue;
    if (local.includes('[')) continue;
    if (local === '404.astro') continue;
    const route = pagePath(file, pagesRoot);
    if (UNLISTED_ROUTE_PREFIXES.some((prefix) => route.startsWith(prefix))) continue;
    // Registry-only, feature-flagged utility: keep it out of the consumer
    // astrology assistant and its deliberately strict vocabulary boundary.
    if (route.startsWith('/registry/')) continue;
    // Labeled sample pages for event-template review: never part of the
    // recommendable site inventory.
    if (route.startsWith('/events/preview/')) continue;
    // Capability exchange shell: /c/{secret}/ is private, one-use transport,
    // never a page the assistant should recommend or describe.
    if (route.startsWith('/c/')) continue;
    const source = await readFile(file, 'utf8');
    pages.push({
      route,
      title: clean(
        source.match(/<Base\b[\s\S]*?\btitle="([^"]+)"/i)?.[1]
          ?? source.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]
          ?? route,
      ),
      description: staticDescription(route, source, context),
      source,
    });
  }
  return pages.sort((a, b) => compareText(a.route, b.route));
}

export function extractLearnTopics(source) {
  const topics = [];
  const pattern = /<a\s+class="tile clusters__card"\s+href="([^"]+)">([\s\S]*?)<\/a>/g;
  for (const match of source.matchAll(pattern)) {
    const body = match[2];
    const title = clean(body.match(/<strong>([\s\S]*?)<\/strong>/)?.[1] ?? '');
    const description = clean(body.match(/<p>([\s\S]*?)<\/p>/)?.[1] ?? '');
    if (!title || !description) throw new Error(`Incomplete learn topic ${match[1]}`);
    topics.push({ route: match[1], title, description });
  }
  if (!topics.length) throw new Error('No learn topics found');
  return topics;
}

export function extractCanonicalLabels(strategy) {
  const section = strategy.match(/## 4\. Voice & microcopy([\s\S]*?)(?=\n## 5\.)/)?.[1];
  if (!section) throw new Error('docs/STRATEGY.md §4 was not found');
  const labels = [];
  for (const match of section.matchAll(/"([^"]+)"/g)) {
    if (!labels.includes(match[1])) labels.push(match[1]);
  }
  if (labels.length < 10) throw new Error(`Expected at least 10 canonical labels; found ${labels.length}`);
  return labels;
}

function routeList(routes, perLine = 8) {
  const lines = [];
  for (let index = 0; index < routes.length; index += perLine) {
    lines.push(routes.slice(index, index + perLine).join(', '));
  }
  return lines.join('\n');
}

function compactDescription(value, maxLength = 42) {
  const firstSentence = clean(value).split(/(?<=[.!?])\s/, 1)[0];
  const firstClause = firstSentence.split(/\s(?:—|–)\s|:\s|;\s/, 1)[0].trim();
  if (firstClause.length <= maxLength) {
    return /[.!?]$/.test(firstClause) ? firstClause : `${firstClause}.`;
  }
  const words = firstClause.split(' ');
  let output = '';
  for (const word of words) {
    const next = output ? `${output} ${word}` : word;
    if (next.length > maxLength - 1) break;
    output = next;
  }
  return `${output.replace(/[.,;:!?]+$/, '')}…`;
}

function pageLines(entries, { compact = false } = {}) {
  return entries
    .map((entry) => `- ${entry.route} — ${compact ? compactDescription(entry.description) : clean(entry.description)}`)
    .join('\n');
}

function birthdayLines(entries, signNames) {
  return entries.map((entry) => {
    const description = clean(entry.description);
    const signs = signNames
      .map((sign) => ({ sign, index: description.search(new RegExp(`\\b${sign}\\b`, 'i')) }))
      .filter(({ index }) => index >= 0)
      .sort((left, right) => left.index - right.index)
      .map(({ sign }) => sign);
    if (!signs.length) throw new Error(`Birthday meta description names no sign: ${entry.route}`);
    return `- ${entry.route} — ${signs.join('/')} birthday guide.`;
  }).join('\n');
}

function bannedVocabulary(text) {
  return BANNED_CONSUMER_VOCABULARY.filter((word) => (
    new RegExp(`\\b${word}(?:s)?\\b`, 'i').test(text)
  ));
}

/** Split a rendered-readable page into deterministic 500–900 character blocks. */
export function chunkKnowledgeText(value) {
  const normalized = clean(value);
  if (normalized.length < MIN_KNOWLEDGE_CHUNK_CHARS) return [];

  const words = normalized.split(' ');
  let chunkCount = Math.ceil(normalized.length / MAX_KNOWLEDGE_CHUNK_CHARS);
  while (chunkCount > 1 && normalized.length / chunkCount < MIN_KNOWLEDGE_CHUNK_CHARS) {
    chunkCount -= 1;
  }

  const chunks = [];
  let cursor = 0;
  for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex += 1) {
    const chunksLeft = chunkCount - chunkIndex;
    const remaining = words.slice(cursor).join(' ');
    const target = Math.min(
      MAX_KNOWLEDGE_CHUNK_CHARS,
      Math.max(MIN_KNOWLEDGE_CHUNK_CHARS, Math.round(remaining.length / chunksLeft)),
    );
    let end = cursor;
    let length = 0;
    while (end < words.length) {
      const nextLength = length + (length ? 1 : 0) + words[end].length;
      if (nextLength > target && end > cursor) break;
      length = nextLength;
      end += 1;
    }
    chunks.push(words.slice(cursor, end).join(' '));
    cursor = end;
  }

  // Word boundaries can leave the final block a few characters short. Move
  // whole words from its predecessor so every committed block stays in band.
  for (let index = chunks.length - 1; index > 0; index -= 1) {
    while (chunks[index].length < MIN_KNOWLEDGE_CHUNK_CHARS) {
      const previousWords = chunks[index - 1].split(' ');
      if (previousWords.length < 2) break;
      chunks[index] = `${previousWords.pop()} ${chunks[index]}`;
      chunks[index - 1] = previousWords.join(' ');
    }
  }

  return chunks.filter((chunk) => (
    chunk.length >= MIN_KNOWLEDGE_CHUNK_CHARS
      && chunk.length <= MAX_KNOWLEDGE_CHUNK_CHARS
  ));
}

function renderedHtmlPath(renderedRoot, route) {
  if (route === '/') return resolve(renderedRoot, 'index.html');
  return resolve(renderedRoot, route.slice(1), 'index.html');
}

function localizedRoute(route, locale) {
  if (locale === DEFAULT_LOCALE) return route;
  return route === '/' ? `/${locale}/` : `/${locale}${route}`;
}

/** Text the visitor can actually read inside the rendered page landmark. */
export function renderedMainText(html, sourceName = 'rendered page') {
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1];
  if (main === undefined) throw new Error(`Missing rendered <main> in ${sourceName}`);
  const visibleMain = main
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(?:style|script|template|svg|noscript)\b[\s\S]*?<\/(?:style|script|template|svg|noscript)>/gi, ' ');
  return clean(sanitizeRenderedMainHtml(visibleMain, sourceName)
    .replace(/<br\s*\/?\s*>/gi, '. ')
    .replace(/<\/(?:h[1-6]|p|li|dt|dd|blockquote|section|article|div)>/gi, ' '));
}

function renderedTitle(html, fallback) {
  const heading = clean(html.match(/<main\b[^>]*>[\s\S]*?<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? '');
  const title = clean(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '')
    .replace(/\s*[|·—-]\s*Zodiacs(?:\.org)?\s*$/i, '')
    .trim();
  return {
    title: title || heading || clean(fallback),
    heading: heading || title || clean(fallback),
  };
}

async function renderedKnowledgeEntry(renderedRoot, entry, locale) {
  const route = localizedRoute(entry.route, locale);
  const file = renderedHtmlPath(renderedRoot, route);
  let html;
  try {
    html = await readFile(file, 'utf8');
  } catch (error) {
    if (locale !== DEFAULT_LOCALE && error?.code === 'ENOENT') return null;
    throw new Error(`Missing rendered page for assistant source ${route}: ${error?.message ?? error}`);
  }
  const text = renderedMainText(html, route);
  const labels = renderedTitle(html, entry.title);
  return { route, locale, text, ...labels };
}

async function knowledgeIndexFor(entries, renderedRoot) {
  const uniqueEntries = [...new Map(entries.map((entry) => [entry.route, entry])).values()];
  const renderedEntries = [];
  for (const entry of uniqueEntries) {
    for (const locale of RELEASED_LOCALES) {
      const rendered = await renderedKnowledgeEntry(renderedRoot, entry, locale);
      if (rendered) renderedEntries.push(rendered);
    }
  }

  const chunks = renderedEntries.flatMap((entry) => (
    chunkKnowledgeText(entry.text).map((chunk, index) => {
      const digest = createHash('sha256')
        .update(`${entry.locale}\n${entry.route}\n${index}\n${chunk}`)
        .digest('hex');
      return {
        id: `src_${digest.slice(0, 20)}`,
        path: entry.route,
        title: entry.title,
        heading: entry.heading,
        locale: entry.locale,
        text: chunk,
      };
    })
  ));
  const hash = createHash('sha256').update(JSON.stringify(chunks)).digest('hex');
  return { version: 1, hash, chunks };
}

export async function generateAssistantContext({ repoRoot = repo } = {}) {
  const contentRoot = resolve(repoRoot, 'src/content');
  const horoscopeData = await loadHoroscopes(resolve(contentRoot, 'horoscopes'));
  const ingresses = JSON.parse(await readFile(resolve(repoRoot, 'src/data/ingresses.json'), 'utf8'));
  const staticPages = await loadStaticPages(repoRoot, {
    ingresses,
    latestHoroscopeMonth: horoscopeData.latestMonth,
  });

  const guides = await loadContentEntries(
    resolve(contentRoot, 'guides'),
    (id) => `/${id}/`,
  );
  const learn = await loadContentEntries(
    resolve(contentRoot, 'learn'),
    (id) => id.startsWith('rising/')
      ? `/rising-sign/${id.slice('rising/'.length)}/`
      : `/learn/${id}/`,
  );
  const pairs = await loadContentEntries(
    resolve(contentRoot, 'pairs'),
    (id) => `/compatibility/${id}/`,
  );
  const birthdays = await loadContentEntries(
    resolve(contentRoot, 'birthdays'),
    (id) => `/birthday/${id}/`,
  );

  const staticByRoute = new Map(staticPages.map((entry) => [entry.route, entry]));
  for (const route of TOOL_ROUTES) {
    if (!staticByRoute.has(route)) throw new Error(`Tool route has no static page: ${route}`);
  }

  const learnSource = await readFile(resolve(repoRoot, 'src/pages/learn/index.astro'), 'utf8');
  const topics = extractLearnTopics(learnSource);
  const strategy = await readFile(resolve(repoRoot, 'docs/STRATEGY.md'), 'utf8');
  const labels = extractCanonicalLabels(strategy);
  const labelLines = labels.map((label) => `- ${label}`).join('\n');

  const horoscopeLabel = monthLabel(horoscopeData.latestMonth);
  const dailyHoroscopePages = horoscopeData.current.map(({ sign, source }) => ({
    route: `/horoscopes/${sign}/`,
    title: `${signName(sign)} daily horoscope`,
    description: `${signName(sign)} daily horoscope. Use the exact UTC edition date printed on the page; call it “today” only when that date matches the current UTC date.`,
    source,
  }));
  const monthlyHoroscopePages = horoscopeData.current.map(({ sign, source }) => ({
    route: `/horoscopes/${sign}/monthly/`,
    title: `${signName(sign)} monthly horoscope`,
    description: `${signName(sign)} in ${horoscopeLabel}, grounded in the month's dated transits and lunations.`,
    source,
  }));

  const rising = learn.filter((entry) => entry.id.startsWith('rising/'));
  const focusedLearn = learn.filter((entry) => !entry.id.startsWith('rising/') && !entry.id.startsWith('placements/'));
  const placements = learn.filter((entry) => entry.id.startsWith('placements/'));
  const tools = TOOL_ROUTES.map((route) => staticByRoute.get(route));
  const evergreen = staticPages.filter((entry) => !TOOL_ROUTES.includes(entry.route));
  const glossaryNames = [...GLOSSARY]
    .map((entry) => entry.term)
    .sort(compareText);
  const signNames = guides.map((entry) => entry.title.split(/[ :]/, 1)[0]);
  if (new Set(signNames).size !== 12) throw new Error('Could not derive the twelve sign names from guide metadata');
  const consumerRoutes = new Set([
    ...staticPages,
    ...guides,
    ...dailyHoroscopePages,
    ...monthlyHoroscopePages,
    ...learn,
    ...pairs,
    ...birthdays,
  ].map((entry) => entry.route));

  const context = [
    'SITE CONTEXT — ZODIACS.ORG',
    '',
    'Zodiacs.org is a free astrology reference. Chart calculations run in the visitor’s browser. Positions are computed astronomy; meanings are interpretation.',
    'Chart calculation does not send birth fields to a chart API. Saved charts are local-first; optional account sync uploads only the charts a person chooses, including their birth details, to that person’s account. Ask Zodiacs sends chat messages and explicitly selected, placements-only chart facts transiently to OpenAI only after the person confirms the exact preview; store is disabled for the model request, though OpenAI abuse-monitoring retention may still apply. It never sends the saved name, chart ID, birth date, birth time, birth place, or coordinates.',
    'Historical civil time uses the IANA/ICU history supplied by the visitor’s browser or device runtime, so historical coverage and tzdb version depend on that host. When birth time is unknown, the site uses 12:00 local civil time as a reference for body positions, omits the rising sign, angles, and houses, and flags uncertainty if the Moon changes signs during that local date.',
    'The site has released English, Spanish, Portuguese, French, and Italian routes. The canonical inventory below lists English routes once. Prefer retrieved material in the active locale when it exists; when it does not, label the canonical English fallback explicitly and never invent a localized link.',
    '',
    'CANONICAL LABELS',
    'Use these labels from docs/STRATEGY.md §4 when they fit:',
    labelLines,
    '- “the Twelve” means the twelve signs as canonical records in the registry.',
    '- The records bridge is: “{sign} also exists as one of the Twelve — a canonical record in the registry” → “View the record →”.',
    '',
    'TOOLS AND UTILITIES',
    'These lines use each live page’s meta description to state what it computes or provides:',
    pageLines(tools),
    '',
    'LEARN-HUB TOPICS',
    topics.map((topic) => `- ${topic.route} — ${topic.title}: ${topic.description}`).join('\n'),
    '',
    'PAGE INVENTORY — EVERGREEN PAGES AND HUBS',
    pageLines(evergreen, { compact: true }),
    '',
    'PAGE INVENTORY — THE TWELVE SIGN GUIDES',
    pageLines(guides, { compact: true }),
    '',
    'PAGE INVENTORY — DAILY AND MONTHLY HOROSCOPES',
    'The hub and stable sign routes publish a dated daily edition. Treat “today” as an exact UTC-date claim: use it only when the edition date printed on the page matches the current UTC date. If it does not match, name the printed date and say the current edition is pending rather than relabeling stale copy. Monthly readings use the /monthly/ subroutes.',
    pageLines([...dailyHoroscopePages, ...monthlyHoroscopePages], { compact: true }),
    '',
    'PAGE INVENTORY — PLANETS, HOUSES, AND ASPECTS',
    pageLines(focusedLearn, { compact: true }),
    '',
    'PAGE INVENTORY — RISING-SIGN PROFILES',
    pageLines(rising, { compact: true }),
    '',
    'PAGE INVENTORY — PLANET-IN-SIGN PLACEMENTS',
    pageLines(placements, { compact: true }),
    '',
    'COMPATIBILITY PAGE FAMILY',
    `Every route below is a live sign-pair guide. Its one-line description is condensed from that page's meta description; use /compatibility/ when the visitor wants a comparison of two full charts.`,
    pageLines(pairs, { compact: true }),
    '',
    'BIRTHDAY PAGE FAMILY',
    `Every route below is a live date guide. Each one-line description names the sign or boundary signs from that page's meta description. The pages verify the Sun sign across 1940–2030, give degree spans and decans, and include year tables on sign-boundary dates.`,
    birthdayLines(birthdays, signNames),
    '',
    'REGISTRY WING',
    '- /registry/ — The registry of the twelve signs: canonical records, provenance, and the Astrofolio catalogue.',
    '- /thesis/ — The Nº 09 essay: zodiac history and identity meet public digital ownership and Solana performance; supporting disclosures follow.',
    '- /sdk/ — Open tools for charts, icons, and the registry interface.',
    '',
    'GLOSSARY TERMS',
    'The definitions live at /learn/glossary/#slug. These are the names available there:',
    routeList(glossaryNames, 12),
    '',
    'ANSWERING BOUNDARIES',
    '- For calculation details and privacy, use /methodology/ and /privacy/.',
    '- For a visitor’s own placements, use only an attached chart summary. Otherwise send them to /birth-chart/.',
    '- /birth-chart/ computes Sun through Pluto, the True Node, ASC and MC, houses, and the five major aspects in the browser.',
    '- /transits/ compares the moving sky with a natal chart within 3° of exact.',
    '- /compatibility/ compares two full charts; sign-pair pages are a simpler Sun-sign baseline.',
    '- /learn/zodiac-dates/ uses the tropical zodiac and gives Sun ingress instants in UTC.',
  ].join('\n');

  const duplicatedLocale = LOCALIZED_PAGE_PREFIXES.find((prefix) => context.includes(`/${prefix}`));
  if (duplicatedLocale) {
    throw new Error(`Assistant context duplicates localized routes under /${duplicatedLocale}`);
  }
  const missingDescriptions = [...consumerRoutes]
    .filter((route) => !context.includes(`- ${route} —`));
  if (missingDescriptions.length) {
    throw new Error(`Assistant context has routes without descriptions: ${missingDescriptions.join(', ')}`);
  }
  const banned = bannedVocabulary(context);
  if (banned.length) throw new Error(`Assistant context contains banned vocabulary: ${banned.join(', ')}`);
  const size = Buffer.byteLength(context);
  if (size < MIN_CONTEXT_BYTES || size > MAX_CONTEXT_BYTES) {
    throw new Error(`Assistant context is ${size} bytes; expected ${MIN_CONTEXT_BYTES}–${MAX_CONTEXT_BYTES}`);
  }

  const knowledgeIndex = await knowledgeIndexFor([
    ...staticPages,
    ...guides,
    ...learn,
    ...pairs,
    ...birthdays,
    ...dailyHoroscopePages,
    ...monthlyHoroscopePages,
  ], resolve(repoRoot, 'dist'));
  if (!knowledgeIndex.chunks.length) throw new Error('Assistant knowledge index is empty');

  return {
    context,
    knowledgeIndex,
    counts: {
      birthdays: birthdays.length,
      consumerRoutes: consumerRoutes.size,
      glossary: glossaryNames.length,
      guides: guides.length,
      learn: learn.length,
      pairs: pairs.length,
      staticPages: staticPages.length,
      tools: tools.length,
    },
  };
}

function asTypeScript(context, knowledgeIndex) {
  const escaped = context
    .replaceAll('\\', '\\\\')
    .replaceAll('`', '\\`')
    .replaceAll('${', '\\${');
  return `// Generated by scripts/build-assistant-context.mjs. Do not hand-edit.\n`
    + `export const ASSISTANT_CONTEXT = \`${escaped}\`;\n\n`
    + `export const ASSISTANT_KNOWLEDGE_INDEX = ${JSON.stringify(knowledgeIndex, null, 2)} as const;\n`;
}

export async function buildAssistantContext({ repoRoot = repo, output = DEFAULT_OUTPUT } = {}) {
  const result = await generateAssistantContext({ repoRoot });
  const source = asTypeScript(result.context, result.knowledgeIndex);
  await writeFile(output, source, 'utf8');
  return { ...result, source };
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  const result = await buildAssistantContext();
  console.log(
    `assistant-context: ${Buffer.byteLength(result.context)} bytes`
    + ` · ${result.knowledgeIndex.chunks.length} knowledge chunks`
    + ` · ${result.counts.staticPages} static pages`
    + ` · ${result.counts.learn} learn guides`
    + ` · ${result.counts.glossary} glossary terms`,
  );
}
