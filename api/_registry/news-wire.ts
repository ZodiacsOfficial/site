import { createHash } from 'node:crypto';

export const REGISTRY_NEWS_SCHEMA = 'registry-news.v1' as const;
export const REGISTRY_NEWS_FRESHNESS_DAYS = 45;
export const REGISTRY_NEWS_MAX_FEED_BYTES = 1_500_000;
export const REGISTRY_NEWS_MAX_REDIRECTS = 2;
export const REGISTRY_NEWS_DEFAULT_TIMEOUT_MS = 4_500;
export const REGISTRY_NEWS_MAX_ITEMS = 40;

const DAY_MS = 86_400_000;
const FUTURE_TOLERANCE_MS = 6 * 60 * 60 * 1_000;
const MAX_ITEMS_PER_SOURCE = 30;
const MAX_PARSED_BLOCKS = 60;
const MAX_TITLE_CHARACTERS = 240;
const MAX_AUTHOR_CHARACTERS = 120;
const MAX_URL_CHARACTERS = 2_048;

export type RegistryNewsSourceType = 'astrology-news' | 'astronomy';

export interface RegistryNewsItem {
  id: string;
  sourceType: RegistryNewsSourceType;
  publisher: string;
  publishedAt: string;
  title: string;
  url: string;
  author: string | null;
  topics: string[];
}

export interface RegistryNewsResponse {
  schema: typeof REGISTRY_NEWS_SCHEMA;
  updatedAt: string;
  items: RegistryNewsItem[];
}

export interface RegistryNewsSource {
  id: string;
  publisher: string;
  sourceType: RegistryNewsSourceType;
  url: string;
  /** Exact hosts accepted for the feed itself and its redirects. */
  feedHosts: readonly string[];
  /** Exact hosts accepted for canonical article links in the feed. */
  articleHosts: readonly string[];
  /** Astronomy feeds must match at least one factual sky/space topic. */
  requireTopicMatch: boolean;
}

export const REGISTRY_NEWS_SOURCES: readonly RegistryNewsSource[] = Object.freeze([
  Object.freeze({
    id: 'the-astrology-podcast',
    publisher: 'The Astrology Podcast',
    sourceType: 'astrology-news',
    url: 'https://theastrologypodcast.com/feed/podcast/',
    feedHosts: Object.freeze(['theastrologypodcast.com', 'www.theastrologypodcast.com']),
    articleHosts: Object.freeze(['theastrologypodcast.com', 'www.theastrologypodcast.com']),
    requireTopicMatch: false,
  }),
  Object.freeze({
    id: 'the-mountain-astrologer',
    publisher: 'The Mountain Astrologer',
    sourceType: 'astrology-news',
    url: 'https://mountainastrologer.com/feed/',
    feedHosts: Object.freeze(['mountainastrologer.com', 'www.mountainastrologer.com']),
    articleHosts: Object.freeze(['mountainastrologer.com', 'www.mountainastrologer.com']),
    requireTopicMatch: false,
  }),
  Object.freeze({
    id: 'the-astrological-association',
    publisher: 'The Astrological Association',
    sourceType: 'astrology-news',
    url: 'https://www.astrologicalassociation.com/category/news/feed/',
    feedHosts: Object.freeze(['www.astrologicalassociation.com', 'astrologicalassociation.com']),
    articleHosts: Object.freeze(['www.astrologicalassociation.com', 'astrologicalassociation.com']),
    requireTopicMatch: false,
  }),
  Object.freeze({
    id: 'nasa',
    publisher: 'NASA',
    sourceType: 'astronomy',
    url: 'https://www.nasa.gov/news-release/feed/',
    feedHosts: Object.freeze(['www.nasa.gov', 'nasa.gov']),
    articleHosts: Object.freeze([
      'www.nasa.gov',
      'nasa.gov',
      'science.nasa.gov',
      'earthobservatory.nasa.gov',
    ]),
    requireTopicMatch: true,
  }),
  Object.freeze({
    id: 'jpl',
    publisher: 'NASA Jet Propulsion Laboratory',
    sourceType: 'astronomy',
    url: 'https://www.jpl.nasa.gov/feeds/news/',
    feedHosts: Object.freeze(['www.jpl.nasa.gov', 'jpl.nasa.gov']),
    articleHosts: Object.freeze(['www.jpl.nasa.gov', 'jpl.nasa.gov']),
    requireTopicMatch: true,
  }),
]);

interface ParsedFeedItem {
  guid: string;
  title: string;
  url: string;
  author: string | null;
  publishedAt: string;
  topics: string[];
}

export interface RegistryNewsFeedCacheEntry {
  etag: string | null;
  lastModified: string | null;
  items: RegistryNewsItem[];
}

export type RegistryNewsFeedCache = Map<string, RegistryNewsFeedCacheEntry>;

export interface RegistryNewsDependencies {
  fetcher?: typeof fetch;
  now?: () => number;
  timeoutMs?: number;
  sources?: readonly RegistryNewsSource[];
  cache?: RegistryNewsFeedCache;
  onSourceError?: (source: RegistryNewsSource, error: unknown) => void;
}

export interface RegistryNewsCollection {
  response: RegistryNewsResponse;
  successfulSources: number;
}

const DEFAULT_FEED_CACHE: RegistryNewsFeedCache = new Map();

const TOPIC_RULES: readonly [string, RegExp][] = [
  ['aries', /\baries\b/i],
  ['taurus', /\btaurus\b/i],
  ['gemini', /\bgemini\b/i],
  ['cancer', /\bcancer\b/i],
  ['leo', /\bleo\b/i],
  ['virgo', /\bvirgo\b/i],
  ['libra', /\blibra\b/i],
  ['scorpio', /\bscorpio\b/i],
  ['sagittarius', /\bsagittarius\b/i],
  ['capricorn', /\bcapricorn\b/i],
  ['aquarius', /\baquarius\b/i],
  ['pisces', /\bpisces\b/i],
  ['sun', /\b(?:sun|solar)\b/i],
  ['moon', /\b(?:moon|lunar|lunation)\b/i],
  ['mercury', /\bmercury\b/i],
  ['venus', /\bvenus\b/i],
  ['mars', /\bmars\b/i],
  ['jupiter', /\bjupiter\b/i],
  ['saturn', /\bsaturn\b/i],
  ['uranus', /\buranus\b/i],
  ['neptune', /\bneptune\b/i],
  ['pluto', /\bpluto\b/i],
  ['eclipse', /\beclips(?:e|es|ed|ing)\b/i],
  ['retrograde', /\bretrograde\b/i],
  ['aspect', /\b(?:aspect|conjunction|opposition|trine|square|sextile|ingress|station)\b/i],
  ['comet', /\bcomets?\b/i],
  ['asteroid', /\basteroids?\b/i],
  ['meteor', /\bmeteors?\b/i],
  ['aurora', /\bauroras?\b/i],
  ['planetary-science', /\b(?:planet|planets|planetary|exoplanet|exoplanets)\b/i],
  ['sky', /\b(?:sky|skies|stargazing|telescope)\b/i],
  ['spaceflight', /\b(?:orbit|orbital|spacecraft|mission|flyby)\b/i],
  ['stars', /\b(?:star|stars|stellar|constellation)\b/i],
  ['deep-space', /\b(?:galaxy|galaxies|universe|cosmos|nebula|black hole)\b/i],
];

function boundedText(value: string, maxCharacters: number): string {
  const characters = Array.from(value);
  return characters.length <= maxCharacters
    ? value
    : characters.slice(0, maxCharacters).join('');
}

function decodeEntity(entity: string): string {
  const named: Record<string, string> = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    nbsp: ' ',
    quot: '"',
  };
  if (entity in named) return named[entity];
  const numeric = entity.startsWith('#x') || entity.startsWith('#X')
    ? Number.parseInt(entity.slice(2), 16)
    : entity.startsWith('#')
      ? Number.parseInt(entity.slice(1), 10)
      : Number.NaN;
  if (!Number.isInteger(numeric)
    || numeric <= 0
    || numeric > 0x10ffff
    || (numeric >= 0xd800 && numeric <= 0xdfff)) return '';
  return String.fromCodePoint(numeric);
}

export function sanitizeFeedText(value: string, maxCharacters: number): string {
  const withoutCdata = value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1');
  const withoutMarkup = withoutCdata.replace(/<[^>]*>/g, ' ');
  const decoded = withoutMarkup.replace(/&([a-zA-Z]+|#[0-9]+|#x[0-9a-fA-F]+);/g, (_match, entity) => (
    decodeEntity(String(entity))
  ));
  return boundedText(
    decoded
      // Encoded markup must not survive into a consumer that renders unsafely.
      .replace(/<[^>]*>/g, ' ')
      .replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
    maxCharacters,
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function elementValues(block: string, name: string): string[] {
  const safeName = escapeRegExp(name);
  const expression = new RegExp(
    `<(?:(?:[A-Za-z_][\\w.-]*):)?${safeName}\\b[^>]*>([\\s\\S]*?)<\\/(?:(?:[A-Za-z_][\\w.-]*):)?${safeName}\\s*>`,
    'gi',
  );
  const values: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = expression.exec(block)) && values.length < 32) values.push(match[1] ?? '');
  return values;
}

function firstElementValue(block: string, names: readonly string[]): string {
  for (const name of names) {
    const value = elementValues(block, name)[0];
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return '';
}

function attributeValue(markup: string, name: string): string {
  const safeName = escapeRegExp(name);
  const match = new RegExp(`\\b${safeName}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, 'i').exec(markup);
  return match?.[2] ?? '';
}

function atomLink(block: string): string {
  const expression = /<(?:(?:[A-Za-z_][\w.-]*):)?link\b[^>]*>/gi;
  let match: RegExpExecArray | null;
  let fallback = '';
  while ((match = expression.exec(block))) {
    const tag = match[0];
    const href = attributeValue(tag, 'href');
    if (!href) continue;
    const rel = attributeValue(tag, 'rel').toLowerCase();
    if (!fallback) fallback = href;
    if (!rel || rel === 'alternate') return href;
  }
  return fallback;
}

function categoryValues(block: string): string[] {
  const bodyCategories = elementValues(block, 'category');
  const atomCategories: string[] = [];
  const expression = /<(?:(?:[A-Za-z_][\w.-]*):)?category\b[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = expression.exec(block)) && atomCategories.length < 32) {
    const term = attributeValue(match[0], 'term');
    if (term) atomCategories.push(term);
  }
  return [...bodyCategories, ...atomCategories]
    .map((value) => sanitizeFeedText(value, 80))
    .filter(Boolean);
}

function itemBlocks(xml: string): string[] {
  const collect = (name: 'item' | 'entry'): string[] => {
    const expression = new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}\\s*>`, 'gi');
    const blocks: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = expression.exec(xml)) && blocks.length < MAX_PARSED_BLOCKS) {
      blocks.push(match[1] ?? '');
    }
    return blocks;
  };
  const rss = collect('item');
  return rss.length > 0 ? rss : collect('entry');
}

function canonicalArticleUrl(value: string, allowedHosts: readonly string[]): string | null {
  const plain = sanitizeFeedText(value, MAX_URL_CHARACTERS);
  if (!plain || plain.length > MAX_URL_CHARACTERS) return null;
  let url: URL;
  try {
    url = new URL(plain);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:'
    || url.username
    || url.password
    || (url.port && url.port !== '443')
    || !allowedHosts.includes(url.hostname.toLowerCase())) return null;
  url.hash = '';
  for (const parameter of [...url.searchParams.keys()]) {
    if (/^(?:utm_.+|fbclid|gclid)$/i.test(parameter)) url.searchParams.delete(parameter);
  }
  return url.toString();
}

function topicsFor(source: RegistryNewsSource, title: string, categories: readonly string[]): string[] {
  const haystack = `${title} ${categories.join(' ')}`;
  const matches = TOPIC_RULES
    .filter(([, expression]) => expression.test(haystack))
    .map(([topic]) => topic)
    .slice(0, 5);
  if (source.requireTopicMatch && matches.length === 0) return [];
  return [source.sourceType === 'astronomy' ? 'astronomy' : 'astrology', ...matches]
    .filter((topic, index, values) => values.indexOf(topic) === index)
    .slice(0, 6);
}

function itemIdentity(source: RegistryNewsSource, guid: string, url: string): string {
  return createHash('sha256')
    .update(`${source.id}\u0000${guid || url}`)
    .digest('hex')
    .slice(0, 24);
}

function validPublishedAt(value: string, now: number): string | null {
  const timestamp = Date.parse(sanitizeFeedText(value, 120));
  if (!Number.isFinite(timestamp)) return null;
  if (timestamp > now + FUTURE_TOLERANCE_MS) return null;
  if (timestamp < now - REGISTRY_NEWS_FRESHNESS_DAYS * DAY_MS) return null;
  return new Date(timestamp).toISOString();
}

/** Parse only headline metadata. Descriptions, content, media, and enclosures are never returned. */
export function parseRegistryNewsFeed(
  source: RegistryNewsSource,
  xml: string,
  now: number,
): RegistryNewsItem[] {
  if (new TextEncoder().encode(xml).byteLength > REGISTRY_NEWS_MAX_FEED_BYTES) {
    throw new RangeError('Feed exceeds the byte limit.');
  }
  if (/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(xml)) {
    throw new TypeError('DTD and entity declarations are not accepted.');
  }

  const parsed: ParsedFeedItem[] = [];
  for (const block of itemBlocks(xml)) {
    if (parsed.length >= MAX_ITEMS_PER_SOURCE) break;
    const title = sanitizeFeedText(firstElementValue(block, ['title']), MAX_TITLE_CHARACTERS);
    const publishedAt = validPublishedAt(
      firstElementValue(block, ['pubDate', 'published', 'updated', 'date']),
      now,
    );
    const url = canonicalArticleUrl(
      firstElementValue(block, ['link']) || atomLink(block),
      source.articleHosts,
    );
    if (!title || !publishedAt || !url) continue;

    const categories = categoryValues(block);
    const topics = topicsFor(source, title, categories);
    if (topics.length === 0) continue;
    let author = sanitizeFeedText(
      firstElementValue(block, ['creator', 'author']),
      MAX_AUTHOR_CHARACTERS,
    );
    // Atom nests a name element inside author.
    if (!author) {
      const authorBlock = firstElementValue(block, ['author']);
      author = sanitizeFeedText(firstElementValue(authorBlock, ['name']), MAX_AUTHOR_CHARACTERS);
    }
    const guid = sanitizeFeedText(firstElementValue(block, ['guid', 'id']), MAX_URL_CHARACTERS);
    parsed.push({ guid, title, url, author: author || null, publishedAt, topics });
  }

  const seenGuids = new Set<string>();
  const seenUrls = new Set<string>();
  return parsed.flatMap((item) => {
    if (seenUrls.has(item.url) || (item.guid && seenGuids.has(item.guid))) return [];
    seenUrls.add(item.url);
    if (item.guid) seenGuids.add(item.guid);
    return [{
      id: itemIdentity(source, item.guid, item.url),
      sourceType: source.sourceType,
      publisher: source.publisher,
      publishedAt: item.publishedAt,
      title: item.title,
      url: item.url,
      author: item.author,
      topics: item.topics,
    }];
  });
}

function validatedFeedUrl(source: RegistryNewsSource, input: string): URL {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new TypeError('Feed URL is invalid.');
  }
  if (url.protocol !== 'https:'
    || url.username
    || url.password
    || (url.port && url.port !== '443')
    || !source.feedHosts.includes(url.hostname.toLowerCase())) {
    throw new TypeError('Feed URL is outside its exact hostname allowlist.');
  }
  return url;
}

function timeoutMilliseconds(value: number | undefined): number {
  if (!Number.isFinite(value)) return REGISTRY_NEWS_DEFAULT_TIMEOUT_MS;
  return Math.min(Math.max(Math.floor(value!), 1), 8_000);
}

async function readBodyWithinLimit(response: Response): Promise<string> {
  const declaredLength = response.headers.get('content-length');
  if (declaredLength && /^\d+$/.test(declaredLength)
    && Number(declaredLength) > REGISTRY_NEWS_MAX_FEED_BYTES) {
    throw new RangeError('Feed exceeds the declared byte limit.');
  }
  if (!response.body) return '';

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!value) continue;
      received += value.byteLength;
      if (received > REGISTRY_NEWS_MAX_FEED_BYTES) {
        await reader.cancel('Feed exceeds the byte limit.');
        throw new RangeError('Feed exceeds the byte limit.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(body);
}

function acceptedFeedContentType(response: Response): boolean {
  const value = (response.headers.get('content-type') ?? '').toLowerCase();
  return /^(?:application\/(?:rss\+xml|atom\+xml|xml)|text\/xml)(?:\s*;|$)/.test(value);
}

async function fetchFeedResponse(
  source: RegistryNewsSource,
  fetcher: typeof fetch,
  headers: Record<string, string>,
  signal: AbortSignal,
): Promise<Response> {
  let current = validatedFeedUrl(source, source.url);
  for (let redirects = 0; redirects <= REGISTRY_NEWS_MAX_REDIRECTS; redirects += 1) {
    const response = await fetcher(current, {
      method: 'GET',
      headers,
      redirect: 'manual',
      signal,
      cache: 'no-store',
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    if (redirects === REGISTRY_NEWS_MAX_REDIRECTS) {
      throw new RangeError('Feed exceeded the redirect limit.');
    }
    const location = response.headers.get('location');
    if (!location) throw new TypeError('Feed redirect has no location.');
    current = validatedFeedUrl(source, new URL(location, current).toString());
  }
  throw new RangeError('Feed exceeded the redirect limit.');
}

export async function fetchRegistryNewsSource(
  source: RegistryNewsSource,
  dependencies: RegistryNewsDependencies = {},
): Promise<RegistryNewsItem[]> {
  const fetcher = dependencies.fetcher ?? fetch;
  const cache = dependencies.cache ?? DEFAULT_FEED_CACHE;
  const cached = cache.get(source.id);
  const headers: Record<string, string> = {
    Accept: 'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8',
    'User-Agent': 'Zodiacs.org Registry Research/1.0 (+https://zodiacs.org/terminal/research/)',
  };
  if (cached?.etag) headers['If-None-Match'] = cached.etag;
  if (cached?.lastModified) headers['If-Modified-Since'] = cached.lastModified;

  const controller = new AbortController();
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
      reject(new Error('Feed request timed out.'));
    }, timeoutMilliseconds(dependencies.timeoutMs));
  });

  const operation = async (): Promise<RegistryNewsItem[]> => {
    const response = await fetchFeedResponse(source, fetcher, headers, controller.signal);
    if (response.status === 304) {
      if (!cached) throw new Error('Feed returned 304 without a cached representation.');
      return cached.items.filter((item) => (
        Date.parse(item.publishedAt)
          >= (dependencies.now ?? Date.now)() - REGISTRY_NEWS_FRESHNESS_DAYS * DAY_MS
      ));
    }
    if (!response.ok) throw new Error(`Feed returned HTTP ${response.status}.`);
    if (!acceptedFeedContentType(response)) throw new TypeError('Feed returned a non-XML content type.');
    const xml = await readBodyWithinLimit(response);
    const items = parseRegistryNewsFeed(source, xml, (dependencies.now ?? Date.now)());
    if (!timedOut) {
      cache.set(source.id, {
        etag: response.headers.get('etag'),
        lastModified: response.headers.get('last-modified'),
        items,
      });
    }
    return items;
  };

  try {
    return await Promise.race([operation(), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function collectRegistryNews(
  dependencies: RegistryNewsDependencies = {},
): Promise<RegistryNewsCollection> {
  const sources = dependencies.sources ?? REGISTRY_NEWS_SOURCES;
  const results = await Promise.all(sources.map(async (source) => {
    try {
      return { ok: true as const, items: await fetchRegistryNewsSource(source, dependencies) };
    } catch (error) {
      dependencies.onSourceError?.(source, error);
      return { ok: false as const, items: [] as RegistryNewsItem[] };
    }
  }));

  const byUrl = new Map<string, RegistryNewsItem>();
  for (const item of results.flatMap((result) => result.items)) {
    const current = byUrl.get(item.url);
    if (!current || item.publishedAt > current.publishedAt) byUrl.set(item.url, item);
  }
  const items = [...byUrl.values()]
    .sort((left, right) => right.publishedAt.localeCompare(left.publishedAt)
      || left.publisher.localeCompare(right.publisher)
      || left.title.localeCompare(right.title))
    .slice(0, REGISTRY_NEWS_MAX_ITEMS);
  const now = (dependencies.now ?? Date.now)();

  return {
    response: {
      schema: REGISTRY_NEWS_SCHEMA,
      updatedAt: new Date(now).toISOString(),
      items,
    },
    successfulSources: results.filter((result) => result.ok).length,
  };
}
