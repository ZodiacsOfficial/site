/**
 * "Compare" from your people. A saved chart already has a device-local
 * compatibility link (`/compatibility/?a=…&b=…`). A received card has no
 * saved chart to point at, so it becomes a saved comparison — your chart
 * by reference, their card as a positions-only side — and opens through
 * the existing `?pair=` deep link. The comparison then also appears with
 * your other saved comparisons, and a repeat reuses it.
 */
import { hasPair, loadPairs, positionsPairSide, savePair, type SavedPair, type SavedPairSide } from './pairs';
import { chartHandle } from './your-people';
import type { CircleEntry } from './circle';
import type { SavedChart } from './schema';

export function savedCompareHref(self: SavedChart, otherId: string): string {
  return `/compatibility/?a=${encodeURIComponent(self.id)}&b=${encodeURIComponent(otherId)}`;
}

function selfSide(self: SavedChart): SavedPairSide {
  // Same identity rule as the compatibility page, so a comparison saved
  // there and one opened here are recognised as one pair.
  const birthKey = self.birth.place
    ? `${self.birth.date}|${self.birth.time ?? ''}|${self.birth.place.lat}|${self.birth.place.lon}`
    : undefined;
  return { kind: 'chart', chartId: self.id, label: chartHandle(self.name), ...(birthKey ? { birthKey } : {}) };
}

export type CardComparison = { href: string } | 'full' | 'error';

export function openCardComparison(self: SavedChart, entry: CircleEntry, now = new Date()): CardComparison {
  const a = selfSide(self);
  const b = positionsPairSide(entry.chart, entry.name || 'Their chart');
  if (!b) return 'error';
  const find = () => loadPairs().find((pair) => hasPair([pair], a, b)) ?? null;
  const existing = find();
  if (existing) return { href: `/compatibility/?pair=${encodeURIComponent(existing.id)}` };
  const pair: SavedPair = { id: crypto.randomUUID(), createdAt: now.toISOString(), a, b };
  const result = savePair(pair);
  if (result === 'saved') return { href: `/compatibility/?pair=${encodeURIComponent(pair.id)}` };
  if (result === 'exists') {
    const again = find();
    return again ? { href: `/compatibility/?pair=${encodeURIComponent(again.id)}` } : 'error';
  }
  return result;
}
