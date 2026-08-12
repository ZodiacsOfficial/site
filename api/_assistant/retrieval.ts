import * as ContextModule from './context.js';
import type {
  CanonicalSource,
  ConversationMessage,
  ReleasedLocale,
} from './contracts.js';

export interface AssistantKnowledgeChunk {
  id: string;
  path: string;
  title: string;
  heading: string;
  locale: ReleasedLocale;
  text: string;
}

export interface AssistantKnowledgeIndex {
  version: 1;
  hash: string;
  chunks: AssistantKnowledgeChunk[];
}

export interface RetrievedKnowledge {
  chunks: AssistantKnowledgeChunk[];
  sources: CanonicalSource[];
  sourceIds: Set<string>;
  usedEnglishFallback: boolean;
}

const RELEASED_LOCALES = new Set(['en', 'es', 'pt', 'fr', 'it']);
const SOURCE_ID_RE = /^[a-z0-9][a-z0-9:._/-]{0,159}$/;
const SOURCE_PATH_RE = /^\/$|^\/[a-z0-9][a-z0-9/_-]*\/$/;
const MAX_RETRIEVED_CHUNKS = 6;
const MAX_CHUNKS_PER_PATH = 2;
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for', 'from', 'how',
  'i', 'in', 'is', 'it', 'me', 'my', 'of', 'on', 'or', 'that', 'the', 'this',
  'to', 'what', 'when', 'where', 'which', 'who', 'why', 'with', 'you', 'your',
  'de', 'del', 'el', 'en', 'es', 'la', 'las', 'los', 'mi', 'para', 'por', 'que',
  'como', 'da', 'do', 'e', 'em', 'o', 'os', 'um', 'uma', 'le', 'les', 'des',
  'du', 'et', 'je', 'mon', 'ma', 'un', 'une', 'di', 'il', 'lo', 'gli', 'che',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validChunk(value: unknown): value is AssistantKnowledgeChunk {
  if (!isRecord(value)) return false;
  return typeof value.id === 'string'
    && SOURCE_ID_RE.test(value.id)
    && typeof value.path === 'string'
    && value.path.length <= 200
    && SOURCE_PATH_RE.test(value.path)
    && typeof value.title === 'string'
    && value.title.trim().length > 0
    && value.title.length <= 200
    && typeof value.heading === 'string'
    && value.heading.length <= 200
    && typeof value.locale === 'string'
    && RELEASED_LOCALES.has(value.locale)
    && typeof value.text === 'string'
    && value.text.trim().length > 0
    && value.text.length <= 4_000;
}

function moduleIndex(): AssistantKnowledgeIndex | null {
  const candidate = (ContextModule as unknown as { ASSISTANT_KNOWLEDGE_INDEX?: unknown })
    .ASSISTANT_KNOWLEDGE_INDEX;
  if (!isRecord(candidate)
    || candidate.version !== 1
    || typeof candidate.hash !== 'string'
    || !Array.isArray(candidate.chunks)) return null;
  const chunks = candidate.chunks.filter(validChunk);
  return chunks.length ? { version: 1, hash: candidate.hash, chunks } : null;
}

function titleFromPath(path: string): string {
  if (path === '/') return 'Zodiacs.org';
  const segment = path.split('/').filter(Boolean).at(-1) ?? 'Zodiacs.org';
  return segment.split('-').map((word) => `${word[0]?.toUpperCase() ?? ''}${word.slice(1)}`).join(' ');
}

function compatibilityIndex(): AssistantKnowledgeIndex {
  const text = typeof (ContextModule as { ASSISTANT_CONTEXT?: unknown }).ASSISTANT_CONTEXT === 'string'
    ? (ContextModule as { ASSISTANT_CONTEXT: string }).ASSISTANT_CONTEXT
    : '';
  const byPath = new Map<string, AssistantKnowledgeChunk>();
  for (const line of text.split(/\r?\n/)) {
    const match = /^- (\/(?:[a-z0-9/_-]*\/)?)(?:\s+—\s+)(.+)$/i.exec(line.trim());
    if (!match || !SOURCE_PATH_RE.test(match[1]!)) continue;
    const path = match[1]!;
    if (byPath.has(path)) continue;
    byPath.set(path, {
      id: `site:${path}`,
      path,
      title: titleFromPath(path),
      heading: '',
      locale: 'en',
      text: match[2]!.trim(),
    });
  }
  return { version: 1, hash: 'legacy-context', chunks: [...byPath.values()] };
}

export function assistantKnowledgeIndex(): AssistantKnowledgeIndex {
  return moduleIndex() ?? compatibilityIndex();
}

function tokens(value: string): string[] {
  return (value.normalize('NFKD').toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function canonicalPath(path: string): string {
  const localized = /^\/(es|pt|fr|it)(\/.*)$/.exec(path);
  return localized ? localized[2]! : path;
}

function queryText(messages: readonly ConversationMessage[]): string {
  const userMessages = messages.filter((message) => message.role === 'user');
  const latest = userMessages.at(-1)?.content ?? '';
  const previous = userMessages.at(-2)?.content ?? '';
  return `${latest} ${latest} ${previous}`;
}

/** Small, deterministic BM25-style retriever; no user content leaves the function. */
export function retrieveKnowledge(
  messages: readonly ConversationMessage[],
  locale: ReleasedLocale,
  pagePath?: string,
  index: AssistantKnowledgeIndex = assistantKnowledgeIndex(),
): RetrievedKnowledge {
  const candidates = index.chunks.filter((chunk) => chunk.locale === locale || chunk.locale === 'en');
  const queryTokens = tokens(queryText(messages));
  const querySet = new Set(queryTokens);
  const queryFrequency = new Map<string, number>();
  for (const token of queryTokens) queryFrequency.set(token, (queryFrequency.get(token) ?? 0) + 1);
  const documentTokens = candidates.map((chunk) => tokens(`${chunk.title} ${chunk.heading} ${chunk.text}`));
  const averageLength = documentTokens.reduce((sum, list) => sum + list.length, 0) / Math.max(1, documentTokens.length);
  const documentFrequency = new Map<string, number>();
  for (const list of documentTokens) {
    for (const token of new Set(list)) {
      if (querySet.has(token)) documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
    }
  }

  const ranked = candidates.map((chunk, indexNumber) => {
    const list = documentTokens[indexNumber]!;
    const frequencies = new Map<string, number>();
    for (const token of list) {
      if (querySet.has(token)) frequencies.set(token, (frequencies.get(token) ?? 0) + 1);
    }
    let lexicalScore = 0;
    for (const token of querySet) {
      const frequency = frequencies.get(token) ?? 0;
      if (!frequency) continue;
      const df = documentFrequency.get(token) ?? 0;
      const idf = Math.log(1 + ((candidates.length - df + 0.5) / (df + 0.5)));
      const denominator = frequency + 1.2 * (0.25 + 0.75 * (list.length / Math.max(1, averageLength)));
      lexicalScore += (queryFrequency.get(token) ?? 1) * idf * ((frequency * 2.2) / denominator);
    }
    let score = lexicalScore;
    if (chunk.locale === locale) score += 0.25;
    // Active-page context may rank genuinely matching material higher, but a
    // route alone is never evidence. This keeps /ask/ from manufacturing
    // coverage for an unrelated or unsupported question.
    if (lexicalScore > 0 && pagePath && chunk.path === pagePath) score += 8;
    else if (lexicalScore > 0 && pagePath && canonicalPath(chunk.path) === canonicalPath(pagePath)) score += 5;
    return { chunk, score };
  }).filter(({ score }) => score >= 0.55)
    .sort((left, right) => right.score - left.score || left.chunk.id.localeCompare(right.chunk.id));

  const selected: AssistantKnowledgeChunk[] = [];
  const perPath = new Map<string, number>();
  for (const { chunk } of ranked) {
    const page = canonicalPath(chunk.path);
    if ((perPath.get(page) ?? 0) >= MAX_CHUNKS_PER_PATH) continue;
    selected.push(chunk);
    perPath.set(page, (perPath.get(page) ?? 0) + 1);
    if (selected.length === MAX_RETRIEVED_CHUNKS) break;
  }

  const sources = selected.map((chunk): CanonicalSource => ({
    id: chunk.id,
    path: chunk.path,
    title: chunk.title,
    ...(chunk.heading ? { heading: chunk.heading } : {}),
  }));
  return {
    chunks: selected,
    sources,
    sourceIds: new Set(selected.map((chunk) => chunk.id)),
    usedEnglishFallback: locale !== 'en' && selected.some((chunk) => chunk.locale === 'en'),
  };
}

export function knowledgePrompt(retrieved: RetrievedKnowledge, locale: ReleasedLocale): string {
  if (!retrieved.chunks.length) {
    return 'SITE KNOWLEDGE: no relevant reviewed passage was retrieved. Say coverage is limited; do not guess or invent a route.';
  }
  return [
    `SITE KNOWLEDGE${retrieved.usedEnglishFallback ? ` (canonical English fallback; answer in ${locale})` : ''}:`,
    ...retrieved.chunks.map((chunk) => (
      `[${chunk.id}] ${chunk.title}${chunk.heading ? ` — ${chunk.heading}` : ''} (${chunk.path})\n${chunk.text}`
    )),
  ].join('\n\n');
}
