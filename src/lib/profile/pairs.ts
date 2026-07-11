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
  | { kind: 'chart'; chartId: string; label: string }
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

export function loadPairs(): SavedPair[] {
  try {
    const raw = localStorage.getItem(PAIRS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedPair[]) : [];
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

/** Identity of one side, for order-insensitive dedupe. */
function sideKey(side: SavedPairSide): string {
  if (side.kind === 'chart') return `chart:${side.chartId}`;
  const { date, time, lat, lon } = side.input;
  return `input:${date}|${time ?? ''}|${lat}|${lon}`;
}

function samePair(a: SavedPair, b: SavedPair): boolean {
  const keysA = [sideKey(a.a), sideKey(a.b)].sort();
  const keysB = [sideKey(b.a), sideKey(b.b)].sort();
  return keysA[0] === keysB[0] && keysA[1] === keysB[1];
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
