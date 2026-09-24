/**
 * Cards other people sent you, kept beside your saved charts. A sibling
 * store to the profile (the `pairs.ts` pattern): each entry holds the name
 * the sender chose and a canonical positions-only chart, re-encoded on the
 * way in and out so no stray field reaches storage. Device-local only; a
 * received card is never offered for re-sharing and never becomes "you".
 *
 * Every write dispatches `zodiacs:circle` on window.
 */
import { profileAccessAllowed } from '../account-v2/profile-access-reader';
import {
  decodePositionsLink,
  encodePositionsLink,
  type PositionsShareChart,
  type PositionsShareInput,
} from '../share-positions';
import { cleanDisplayName } from './me';
import type { ChartCard } from './card-link';
import { CIRCLE_KEY } from './page-keys';

export { CIRCLE_KEY };
export const MAX_CIRCLE = 40;

export interface CircleEntry {
  id: string;
  name: string;
  chart: PositionsShareChart;
  timeKnown: boolean;
  addedAt: string;
}

function canonicalChart(chart: unknown): PositionsShareChart | null {
  if (!chart || typeof chart !== 'object') return null;
  const token = encodePositionsLink(chart as PositionsShareInput);
  const canonical = token ? decodePositionsLink(token) : null;
  return canonical && JSON.stringify(canonical) === JSON.stringify(chart) ? canonical : null;
}

function parseEntry(value: unknown): CircleEntry | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const entry = value as Record<string, unknown>;
  if (Object.keys(entry).length !== 5) return null;
  if (typeof entry.id !== 'string' || !/^[0-9a-f-]{36}$/u.test(entry.id)) return null;
  if (typeof entry.addedAt !== 'string' || !Number.isFinite(Date.parse(entry.addedAt))) return null;
  const name = entry.name === '' ? '' : cleanDisplayName(entry.name);
  const chart = canonicalChart(entry.chart);
  if (name === null || name !== entry.name || !chart || typeof entry.timeKnown !== 'boolean') return null;
  if ((chart.angles !== null) !== entry.timeKnown) return null;
  return { id: entry.id, name, chart, timeKnown: entry.timeKnown, addedAt: entry.addedAt };
}

export function parseCircle(raw: string | null): CircleEntry[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(parseEntry).filter((entry): entry is CircleEntry => entry !== null).slice(0, MAX_CIRCLE);
  } catch {
    return [];
  }
}

export function loadCircle(): CircleEntry[] {
  if (!profileAccessAllowed()) return [];
  try {
    return parseCircle(localStorage.getItem(CIRCLE_KEY));
  } catch {
    return [];
  }
}

function persist(entries: CircleEntry[]): boolean {
  if (!profileAccessAllowed()) return false;
  try {
    if (entries.length === 0) localStorage.removeItem(CIRCLE_KEY);
    else localStorage.setItem(CIRCLE_KEY, JSON.stringify(entries));
    window.dispatchEvent(new CustomEvent('zodiacs:circle', { detail: entries }));
    return true;
  } catch {
    return false; // storage full / private mode — callers surface a notice
  }
}

/** The same positions arriving twice is the same person: one entry. */
function samePositions(a: PositionsShareChart, b: PositionsShareChart): boolean {
  return encodePositionsLink(a) === encodePositionsLink(b);
}

export function findCircleEntry(entries: readonly CircleEntry[], card: ChartCard): CircleEntry | null {
  return entries.find((entry) => samePositions(entry.chart, card.chart)) ?? null;
}

export type AddCardResult = 'added' | 'updated' | 'full' | 'error';

/** Keep a received card. A repeat of a kept card refreshes its name. */
export function addCard(card: ChartCard, now = new Date()): AddCardResult {
  const chart = canonicalChart(card.chart);
  const name = cleanDisplayName(card.label) ?? '';
  if (!chart || (chart.angles !== null) !== card.timeKnown) return 'error';
  const entries = loadCircle();
  const existing = entries.findIndex((entry) => samePositions(entry.chart, chart));
  if (existing >= 0) {
    const kept = entries[existing];
    entries.splice(existing, 1);
    entries.unshift({ ...kept, name: name || kept.name });
    return persist(entries) ? 'updated' : 'error';
  }
  if (entries.length >= MAX_CIRCLE) return 'full';
  entries.unshift({ id: crypto.randomUUID(), name, chart, timeKnown: card.timeKnown, addedAt: now.toISOString() });
  return persist(entries) ? 'added' : 'error';
}

export function renameCircleEntry(id: string, name: string): boolean {
  const entries = loadCircle();
  const entry = entries.find((candidate) => candidate.id === id);
  const cleaned = cleanDisplayName(name);
  if (!entry || !cleaned) return false;
  entry.name = cleaned;
  return persist(entries);
}

export function removeCircleEntry(id: string): boolean {
  const entries = loadCircle();
  const next = entries.filter((entry) => entry.id !== id);
  return next.length === entries.length ? true : persist(next);
}
