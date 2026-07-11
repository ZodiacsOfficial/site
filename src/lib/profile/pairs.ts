/**
 * localStorage-backed saved comparisons — pairs of charts for the
 * compatibility page. Sibling store to the profile: a side references a
 * saved chart by id where one exists (renames flow through), and inlines
 * the shareable birth input otherwise, so form-entered and link-received
 * sides survive a reload too. Every write dispatches `zodiacs:pairs` on
 * window (the `zodiacs:profile` convention). Device-local only — pairs
 * do not ride the cloud sync.
 *
 * The profile store never imports this module (it rides in every page
 * that touches saved charts; pairs are read only on /compatibility/).
 * Pairs orphaned by a chart deletion are pruned where they're read —
 * `prunePairs` runs when the compatibility island loads the profile.
 */
import type { ShareChartInput } from '../share';

export const PAIRS_KEY = 'zodiacs.pairs.v1';
export const MAX_PAIRS = 12;

export type SavedPairSide =
  | {
      kind: 'chart';
      chartId: string;
      label: string;
      /** Birth-input identity (`date|time|lat|lon`) so the same person
       *  saved once as a chart and once by value dedupes to one pair.
       *  Absent for charts without stored coordinates. */
      birthKey?: string;
    }
  | {
      kind: 'input';
      input: ShareChartInput;
      label: string;
      /** True when the input arrived in someone else's invite link — a
       *  received side is never offered for re-sharing on restore. */
      received?: boolean;
    };

export interface SavedPair {
  id: string;
  createdAt: string;
  a: SavedPairSide;
  b: SavedPairSide;
}

// Storage is user-writable — trust nothing (the decodeChartLink rule).
// One malformed element must not take the island's render down with it.
function isSide(value: unknown): value is SavedPairSide {
  if (!value || typeof value !== 'object') return false;
  const side = value as Record<string, unknown>;
  if (typeof side.label !== 'string') return false;
  if (side.kind === 'chart') return typeof side.chartId === 'string';
  if (side.kind === 'input') {
    return !!side.input && typeof side.input === 'object'
      && typeof (side.input as Record<string, unknown>).date === 'string';
  }
  return false;
}

function isPair(value: unknown): value is SavedPair {
  if (!value || typeof value !== 'object') return false;
  const pair = value as Record<string, unknown>;
  return typeof pair.id === 'string' && isSide(pair.a) && isSide(pair.b);
}

export function loadPairs(): SavedPair[] {
  try {
    const raw = localStorage.getItem(PAIRS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isPair) : [];
  } catch {
    return [];
  }
}

function persist(pairs: SavedPair[]): boolean {
  try {
    localStorage.setItem(PAIRS_KEY, JSON.stringify(pairs));
    window.dispatchEvent(new CustomEvent('zodiacs:pairs', { detail: pairs }));
    return true;
  } catch {
    return false; // storage full / private mode — callers surface a notice
  }
}

/** Identity of one side, for order-insensitive dedupe. A chart side with
 *  a birth key collides with an input side carrying the same birth data —
 *  one person, one identity, however they were entered. */
function sideKey(side: SavedPairSide): string {
  if (side.kind === 'chart') {
    return side.birthKey ? `input:${side.birthKey}` : `chart:${side.chartId}`;
  }
  const { date, time, lat, lon } = side.input;
  return `input:${date}|${time ?? ''}|${lat}|${lon}`;
}

function samePair(a: SavedPair, b: SavedPair): boolean {
  const keysA = [sideKey(a.a), sideKey(a.b)].sort();
  const keysB = [sideKey(b.a), sideKey(b.b)].sort();
  return keysA[0] === keysB[0] && keysA[1] === keysB[1];
}

/** Whether a comparison with these two sides is already stored. */
export function hasPair(pairs: SavedPair[], a: SavedPairSide, b: SavedPairSide): boolean {
  const probe: SavedPair = { id: '', createdAt: '', a, b };
  return pairs.some((existing) => samePair(existing, probe));
}

/** Display labels for a pair's two sides. Chart sides read the LIVE
 *  chart name (renames flow through), trimmed to its handle the way
 *  compact CTAs do ("Cancer Sun · 1990-02-01" → "Cancer Sun"). */
export function pairSideLabels(
  pair: SavedPair,
  charts: readonly { id: string; name: string }[],
): [string, string] {
  const handleOf = (name: string) => name.split('·')[0].trim() || name;
  const labelOf = (side: SavedPairSide) => (side.kind === 'chart'
    ? handleOf(charts.find((c) => c.id === side.chartId)?.name ?? side.label)
    : side.label);
  return [labelOf(pair.a), labelOf(pair.b)];
}

export function savePair(pair: SavedPair): 'saved' | 'exists' | 'full' | 'error' {
  const pairs = loadPairs();
  if (pairs.some((existing) => samePair(existing, pair))) return 'exists';
  if (pairs.length >= MAX_PAIRS) return 'full';
  pairs.unshift(pair);
  return persist(pairs) ? 'saved' : 'error';
}

export function deletePair(id: string): boolean {
  const pairs = loadPairs();
  const next = pairs.filter((pair) => pair.id !== id);
  if (next.length === pairs.length) return true;
  return persist(next);
}

/** Drop pairs referencing charts that no longer exist (deleted here, or
 *  removed by a remote profile merge), so zombies don't eat the cap.
 *  Called with the live chart-id set once the profile has loaded. */
export function prunePairs(chartIds: Set<string>): void {
  const dangling = (side: SavedPairSide) => side.kind === 'chart' && !chartIds.has(side.chartId);
  const pairs = loadPairs();
  const next = pairs.filter((pair) => !dangling(pair.a) && !dangling(pair.b));
  if (next.length !== pairs.length) persist(next);
}
