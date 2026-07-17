export const FIRST_READING_STORAGE_KEY = 'zodiacs.first-reading.v1';

export type FirstReadingStatus = 'not_started' | 'in_progress' | 'dismissed' | 'complete';

export interface FirstReadingProgress {
  version: 1;
  status: FirstReadingStatus;
  /** Zero-based stop in the four-step reading. */
  step: number;
  /** Identifies the person/chart an in-progress reading belongs to. */
  chartKey?: string;
  updatedAt: string;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const EMPTY_FIRST_READING: FirstReadingProgress = Object.freeze({
  version: 1,
  status: 'not_started',
  step: 0,
  updatedAt: '',
});

const STATUSES: ReadonlySet<string> = new Set([
  'not_started', 'in_progress', 'dismissed', 'complete',
]);

export function readFirstReadingProgress(storage: StorageLike): FirstReadingProgress {
  try {
    const raw = storage.getItem(FIRST_READING_STORAGE_KEY);
    if (!raw) return EMPTY_FIRST_READING;
    const value = JSON.parse(raw) as Partial<FirstReadingProgress>;
    if (value.version !== 1 || !value.status || !STATUSES.has(value.status)) {
      return EMPTY_FIRST_READING;
    }
    const step = Number.isInteger(value.step)
      ? Math.max(0, Math.min(3, Number(value.step)))
      : 0;
    const progress: FirstReadingProgress = {
      version: 1,
      status: value.status,
      step,
      updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : '',
    };
    if (typeof value.chartKey === 'string' && value.chartKey !== '') {
      progress.chartKey = value.chartKey;
    }
    return progress;
  } catch {
    return EMPTY_FIRST_READING;
  }
}

export function writeFirstReadingProgress(
  storage: StorageLike,
  progress: Omit<FirstReadingProgress, 'version' | 'updatedAt'>,
  now = new Date(),
): FirstReadingProgress {
  const next: FirstReadingProgress = {
    version: 1,
    status: progress.status,
    step: Math.max(0, Math.min(3, Math.trunc(progress.step))),
    updatedAt: now.toISOString(),
  };
  if (progress.chartKey) next.chartKey = progress.chartKey;
  try {
    storage.setItem(FIRST_READING_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Progress still updates in memory for this session when storage is blocked.
  }
  return next;
}
