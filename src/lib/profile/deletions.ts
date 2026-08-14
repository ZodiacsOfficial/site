import { profileAccessAllowed } from '../account-v2/profile-access-reader';

export const PROFILE_DELETIONS_KEY = 'zodiacs.profile.deletions.v1';

export interface ChartDeletion {
  id: string;
  deletedAt: string;
}

export function loadChartDeletions(): ChartDeletion[] {
  if (!profileAccessAllowed()) return [];
  try {
    const raw = localStorage.getItem(PROFILE_DELETIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return normalizeDeletions(parsed);
  } catch {
    return [];
  }
}

export function replaceChartDeletions(deletions: ChartDeletion[]): boolean {
  if (!profileAccessAllowed()) return false;
  try {
    localStorage.setItem(PROFILE_DELETIONS_KEY, JSON.stringify(normalizeDeletions(deletions)));
    return true;
  } catch {
    return false;
  }
}

export function recordChartDeletion(id: string, deletedAt = new Date().toISOString()): boolean {
  const deletions = loadChartDeletions();
  deletions.push({ id, deletedAt });
  return replaceChartDeletions(deletions);
}

export function clearChartDeletion(id: string): boolean {
  return replaceChartDeletions(loadChartDeletions().filter((d) => d.id !== id));
}

function normalizeDeletions(values: unknown[]): ChartDeletion[] {
  const latest = new Map<string, ChartDeletion>();
  for (const value of values) {
    if (!isChartDeletion(value)) continue;
    const existing = latest.get(value.id);
    if (!existing || timestamp(value.deletedAt) > timestamp(existing.deletedAt)) {
      latest.set(value.id, value);
    }
  }
  return Array.from(latest.values()).sort((a, b) => timestamp(b.deletedAt) - timestamp(a.deletedAt));
}

function isChartDeletion(value: unknown): value is ChartDeletion {
  if (!value || typeof value !== 'object') return false;
  const deletion = value as Partial<ChartDeletion>;
  return typeof deletion.id === 'string' &&
    deletion.id.length > 0 &&
    typeof deletion.deletedAt === 'string' &&
    Number.isFinite(Date.parse(deletion.deletedAt));
}

function timestamp(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
