export const LIVING_CHART_MOMENT_SCHEMA = 'zodiacs.living-chart.moment.v1' as const;
export const LIVING_CHART_FORECAST_SCHEMA = 'zodiacs.living-chart.today-forecast.v1' as const;
export const LIVING_CHART_EXPORT_SCHEMA = 'zodiacs.living-chart.export.v1' as const;

export type LivingChartOwnerScope =
  | { kind: 'guest'; vaultId: string }
  | { kind: 'account'; accountId: string };

export type LivingMomentCategory =
  | 'work'
  | 'relationships'
  | 'home'
  | 'creativity'
  | 'change'
  | 'wellbeing'
  | 'other';

export type LivingMomentTimePrecision = 'exact' | 'approximate' | 'date_only';

export type LivingMomentSyncState =
  | 'local'
  | 'queued'
  | 'synced'
  | 'conflict'
  | 'deleted';

export type LivingChartSyncPhase =
  | 'disabled'
  | 'checking'
  | 'signed_out'
  | 'device_only'
  | 'ready'
  | 'syncing'
  | 'offline'
  | 'error'
  | 'conflict';

export interface LivingChartSyncStatus {
  phase: LivingChartSyncPhase;
  /** Last server-confirmed sync, never a speculative local timestamp. */
  lastSyncedAt: string | null;
  pendingCount: number;
  conflictCount: number;
  message: string;
}

export type LivingForecastSource = 'personalized' | 'sun_sign' | 'quiet';

export interface LivingForecastLineV1 {
  /** Stable within one dated forecast snapshot. */
  id: string;
  text: string;
  /** Human-readable factual basis frozen with the line. */
  receipt: string;
}

export interface LivingForecastSnapshotV1 {
  schema: typeof LIVING_CHART_FORECAST_SCHEMA;
  editionDate: string;
  chartId: string;
  source: LivingForecastSource;
  generatorVersion: string;
  capturedAt: string;
  lines: LivingForecastLineV1[];
}

export interface LivingMomentConflictCopyV1 {
  serverRevision: number;
  primaryChartId: string;
  occurredAt: string;
  timePrecision: LivingMomentTimePrecision;
  category?: LivingMomentCategory;
  note?: string;
  forecast: LivingForecastSnapshotV1;
  reflectionQuestionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLivingForecastSnapshotInput {
  editionDate: string;
  chartId: string;
  source: LivingForecastSource;
  generatorVersion: string;
  capturedAt?: string;
  lines: LivingForecastLineV1[];
}

export interface LivingMomentV1 {
  schema: typeof LIVING_CHART_MOMENT_SCHEMA;
  id: string;
  owner: LivingChartOwnerScope;
  primaryChartId: string;
  occurredAt: string;
  timePrecision: LivingMomentTimePrecision;
  category?: LivingMomentCategory;
  note?: string;
  forecast: LivingForecastSnapshotV1;
  reflectionQuestionId: string;
  /** Monotonic device-side record revision. */
  revision: number;
  /** Last server revision observed by a future sync adapter; zero means none. */
  baseRevision: number;
  syncState: LivingMomentSyncState;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  /** Server copy retained locally until the person explicitly resolves a conflict. */
  conflictCopy?: LivingMomentConflictCopyV1;
}

export interface CreateLivingMomentInput {
  /** Optional only for explicit guest-import/replay paths. A new UUID is otherwise generated. */
  id?: string;
  primaryChartId: string;
  occurredAt: string;
  timePrecision: LivingMomentTimePrecision;
  category?: LivingMomentCategory;
  note?: string;
  forecast: LivingForecastSnapshotV1;
  reflectionQuestionId: string;
}

export type UpdateLivingMomentInput = Partial<Pick<
  CreateLivingMomentInput,
  | 'primaryChartId'
  | 'occurredAt'
  | 'timePrecision'
  | 'category'
  | 'note'
  | 'forecast'
  | 'reflectionQuestionId'
>>;

export interface LivingChartExportV1 {
  schema: typeof LIVING_CHART_EXPORT_SCHEMA;
  exportedAt: string;
  ownerKind: LivingChartOwnerScope['kind'];
  moments: Array<Omit<LivingMomentV1, 'owner' | 'baseRevision' | 'syncState' | 'deletedAt'>>;
}

export type LivingChartChangeOperation =
  | 'create'
  | 'update'
  | 'delete'
  | 'sync'
  | 'import'
  | 'clear'
  | 'invalidate';

export interface LivingChartChangeDetail {
  operation: LivingChartChangeOperation;
  owner: LivingChartOwnerScope | null;
  momentId: string | null;
}
