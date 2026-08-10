import { searchIndex, type SearchEntry } from '../search/score';

export const SEARCH_TOOL_NAME = 'zodiacs.search' as const;
export const SEARCH_RESULT_LIMIT = 5;

export const SEARCH_INPUT_SCHEMA = {
  type: 'object',
  properties: {
    query: {
      type: 'string',
      minLength: 2,
      maxLength: 200,
      pattern: '\\S[\\s\\S]*\\S',
      description: 'Words to find on zodiacs.org.',
    },
  },
  required: ['query'],
  additionalProperties: false,
} as const;

export interface WebMcpSearchResult {
  title: string;
  path: string;
  kind: string;
  description: string;
}

export type WebMcpSearchEnvelope =
  | { ok: true; data: { results: WebMcpSearchResult[] } }
  | {
    ok: false;
    error: {
      code: 'INVALID_INPUT' | 'INDEX_UNAVAILABLE';
      message: string;
    };
  };

interface FetchResponseLike {
  ok: boolean;
  json(): Promise<unknown>;
}

export type SearchFetch = (
  input: string,
  init?: { credentials?: 'same-origin'; headers?: Record<string, string> },
) => Promise<FetchResponseLike>;

export interface WebMcpSearchDependencies {
  fetch?: SearchFetch;
}

const INVALID_INPUT: WebMcpSearchEnvelope = Object.freeze({
  ok: false,
  error: Object.freeze({
    code: 'INVALID_INPUT',
    message: 'The query must contain between 2 and 200 characters and no other fields.',
  }),
});

const INDEX_UNAVAILABLE: WebMcpSearchEnvelope = Object.freeze({
  ok: false,
  error: Object.freeze({
    code: 'INDEX_UNAVAILABLE',
    message: 'The site search index is unavailable.',
  }),
});

function isValidInput(input: unknown): input is { query: string } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return false;
  const record = input as Record<string, unknown>;
  if (Object.keys(record).length !== 1 || typeof record.query !== 'string') return false;
  const rawLength = Array.from(record.query).length;
  const trimmedLength = Array.from(record.query.trim()).length;
  return rawLength <= 200 && trimmedLength >= 2;
}

function isSearchEntry(value: unknown): value is SearchEntry {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const entry = value as Record<string, unknown>;
  return typeof entry.path === 'string'
    && entry.path.startsWith('/')
    && !entry.path.startsWith('//')
    && typeof entry.title === 'string'
    && typeof entry.description === 'string'
    && typeof entry.kind === 'string'
    && (entry.keywords === undefined
      || (Array.isArray(entry.keywords) && entry.keywords.every((word) => typeof word === 'string')));
}

export function rankConsumerSearchEntries(
  entries: SearchEntry[],
  query: string,
): WebMcpSearchResult[] {
  // Page titles tend to use singular nouns while callers naturally ask for
  // "charts", "trines", or "eclipses". Feed that narrow variation into the
  // existing scorer; its weights and deterministic tie-breaks stay unchanged.
  const normalizedQuery = query.replace(/\S+/g, (token) => (
    token.length > 5 && token.endsWith('s') && !token.endsWith('ss')
      ? token.slice(0, -1)
      : token
  ));
  return searchIndex(
    entries.filter((entry) => (
      entry.kind !== 'terminal'
      && entry.kind !== 'registry'
      && !/^\/(?:terminal|registry|thesis|sdk|archive|collect)(?:\/|$)/.test(entry.path)
    )),
    normalizedQuery,
    SEARCH_RESULT_LIMIT,
  ).map(({ title, path, kind, description }) => ({ title, path, kind, description }));
}

export async function executeWebMcpSearch(
  input: unknown,
  dependencies: WebMcpSearchDependencies = {},
): Promise<WebMcpSearchEnvelope> {
  if (!isValidInput(input)) return INVALID_INPUT;

  const fetchIndex = dependencies.fetch ?? (globalThis.fetch as SearchFetch | undefined);
  if (!fetchIndex) return INDEX_UNAVAILABLE;

  try {
    const response = await fetchIndex('/search-index.json', {
      credentials: 'same-origin',
      headers: { accept: 'application/json' },
    });
    if (!response.ok) return INDEX_UNAVAILABLE;
    const value = await response.json();
    if (!Array.isArray(value) || !value.every(isSearchEntry)) return INDEX_UNAVAILABLE;
    return {
      ok: true,
      data: { results: rankConsumerSearchEntries(value, input.query) },
    };
  } catch {
    return INDEX_UNAVAILABLE;
  }
}
