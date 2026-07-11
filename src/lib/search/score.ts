/**
 * Search ranking over /search-index.json entries — pure functions, no DOM.
 * Kept apart from the dialog so the ranking is unit-testable and the
 * dialog module stays presentational.
 */
export interface SearchEntry {
  path: string;
  title: string;
  description: string;
  kind: string;
}

/** Mild preference for destinations over reference when scores tie. */
const KIND_BOOST: Record<string, number> = {
  tool: 1.5,
  sign: 1.5,
  learn: 1,
  term: 1,
  pairing: 0.5,
  horoscope: 0.5,
  page: 0,
};

const wordBoundary = (haystack: string, needle: string) =>
  new RegExp(`(?:^|[^a-z0-9])${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(haystack);

/**
 * Score one entry against pre-lowercased query tokens. 0 = not a match.
 * Every token must hit the title or the description; titles dominate.
 */
export function scoreEntry(entry: SearchEntry, tokens: string[]): number {
  const title = entry.title.toLowerCase();
  const description = entry.description.toLowerCase();
  let score = 0;
  for (const token of tokens) {
    if (title === token) score += 8;
    else if (title.startsWith(token)) score += 5;
    else if (wordBoundary(title, token)) score += 3;
    else if (title.includes(token)) score += 2;
    else if (wordBoundary(description, token)) score += 1;
    else if (description.includes(token)) score += 0.5;
    else return 0;
  }
  return score + (KIND_BOOST[entry.kind] ?? 0);
}

/** Rank the index for a query; empty below two characters. */
export function searchIndex(entries: SearchEntry[], query: string, limit = 10): SearchEntry[] {
  const trimmed = query.trim().toLowerCase();
  if (trimmed.length < 2) return [];
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  return entries
    .map((entry) => ({ entry, score: scoreEntry(entry, tokens) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score
      || a.entry.path.length - b.entry.path.length
      || a.entry.path.localeCompare(b.entry.path))
    .slice(0, limit)
    .map((x) => x.entry);
}
