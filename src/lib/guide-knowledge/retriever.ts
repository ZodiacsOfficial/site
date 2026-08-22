import {
  GUIDE_KNOWLEDGE_ENTRIES,
  GUIDE_KNOWLEDGE_VERSION,
  type GuideKnowledgeEntry,
} from './catalog.js';

const encoder = new TextEncoder();
const MAX_RESULTS = 4;
const MAX_FACT_BYTES = 16 * 1024;
const TOKEN = /[\p{L}\p{N}]+/gu;
const NON_CONSUMER_TOPIC = /\b(?:astrofolio|crypto(?:currency)?|markets?|prices?|registry|tokens?|trading|wallets?)\b/iu;

export interface GuideKnowledgeSelection {
  version: typeof GUIDE_KNOWLEDGE_VERSION;
  entries: GuideKnowledgeEntry[];
  allowedPaths: string[];
}

function terms(value: string): Set<string> {
  return new Set((value.toLocaleLowerCase('en-US').match(TOKEN) ?? [])
    .filter((term) => term.length > 1));
}

function score(
  entry: GuideKnowledgeEntry,
  query: string,
  queryTerms: Set<string>,
  pageId: string | null,
): number {
  let result = pageId === entry.id ? 100 : 0;
  const namedAt = query.indexOf(entry.id);
  if (namedAt >= 0) result += 75 - Math.min(namedAt, 50);
  const titleTerms = terms(entry.title);
  const topicTerms = terms(entry.topics.join(' '));
  const factTerms = terms(entry.facts);
  for (const term of queryTerms) {
    if (titleTerms.has(term)) result += 8;
    if (topicTerms.has(term)) result += 5;
    if (factTerms.has(term)) result += 1;
  }
  return result;
}

/**
 * Selects a deterministic, byte-bounded public grounding set. No query or
 * selection is stored or logged by this module.
 */
export function selectGuideKnowledge(
  query: string,
  pageSourceId: string | null = null,
): GuideKnowledgeSelection {
  const pageId = pageSourceId?.startsWith('page:') ? pageSourceId.slice(5) : null;
  const normalizedQuery = query.toLocaleLowerCase('en-US');
  if (NON_CONSUMER_TOPIC.test(normalizedQuery)) {
    const entry = GUIDE_KNOWLEDGE_ENTRIES.find(({ id }) => id === 'astrology-method')!;
    return {
      version: GUIDE_KNOWLEDGE_VERSION,
      entries: [entry],
      allowedPaths: [entry.canonicalPath],
    };
  }
  const queryTerms = terms(normalizedQuery);
  const ranked = GUIDE_KNOWLEDGE_ENTRIES
    .map((entry, index) => ({
      entry,
      index,
      score: score(entry, normalizedQuery, queryTerms, pageId),
    }))
    .filter(({ score: value }) => value > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index);

  if (!ranked.length) {
    ranked.push({
      entry: GUIDE_KNOWLEDGE_ENTRIES.find(({ id }) => id === 'astrology-method')!,
      index: 0,
      score: 1,
    });
  }

  const entries: GuideKnowledgeEntry[] = [];
  let bytes = 0;
  for (const { entry } of ranked) {
    if (entries.length >= MAX_RESULTS) break;
    const nextBytes = encoder.encode(entry.facts).byteLength;
    if (bytes + nextBytes > MAX_FACT_BYTES) continue;
    entries.push(entry);
    bytes += nextBytes;
  }
  return {
    version: GUIDE_KNOWLEDGE_VERSION,
    entries,
    allowedPaths: [...new Set(entries.map(({ canonicalPath }) => canonicalPath))],
  };
}

export function resolveGuidePageKnowledge(sourceId: string): GuideKnowledgeEntry | null {
  if (!/^page:[a-z0-9]+(?:[._-][a-z0-9]+)*$/u.test(sourceId)) return null;
  const id = sourceId.slice(5);
  return GUIDE_KNOWLEDGE_ENTRIES.find((entry) => entry.id === id) ?? null;
}
