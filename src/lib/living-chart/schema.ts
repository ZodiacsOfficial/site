import { isAccountV2Id } from '../account-v2/storage-identity';
import { parseLivingForecastSnapshot } from './forecast-snapshot';
import { livingChartOwnerKey } from './owner';
import {
  LIVING_CHART_MOMENT_SCHEMA,
  type CreateLivingMomentInput,
  type LivingChartOwnerScope,
  type LivingMomentCategory,
  type LivingMomentConflictCopyV1,
  type LivingMomentSyncState,
  type LivingMomentTimePrecision,
  type LivingMomentV1,
} from './types';

export const MAX_LIVING_MOMENT_NOTE_CHARACTERS = 500;
export const MAX_LIVING_MOMENT_NOTE_BYTES = 2_000;
export const MAX_ACTIVE_LIVING_MOMENTS = 250;

export const LIVING_MOMENT_CATEGORIES = [
  'work',
  'relationships',
  'home',
  'creativity',
  'change',
  'wellbeing',
  'other',
] as const satisfies readonly LivingMomentCategory[];

export const LIVING_MOMENT_TIME_PRECISIONS = [
  'exact',
  'approximate',
  'date_only',
] as const satisfies readonly LivingMomentTimePrecision[];

export const LIVING_MOMENT_SYNC_STATES = [
  'local',
  'queued',
  'synced',
  'conflict',
  'deleted',
] as const satisfies readonly LivingMomentSyncState[];

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/u;
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const FORMAT_CONTROL = /\p{Cf}/u;

function isRecord(input: unknown): input is Record<string, unknown> {
  return Boolean(input) && typeof input === 'object' && !Array.isArray(input);
}

function hasOnlyKeys(input: Record<string, unknown>, allowed: readonly string[]): boolean {
  const set = new Set(allowed);
  return Object.keys(input).every((key) => set.has(key));
}

function hasKeys(input: Record<string, unknown>, required: readonly string[]): boolean {
  return required.every((key) => Object.prototype.hasOwnProperty.call(input, key));
}

function validCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = DATE.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return year >= 1800
    && year <= 2199
    && parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
}

function canonicalInstant(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 32) return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value ? value : null;
}

function canonicalOwner(value: unknown): LivingChartOwnerScope | null {
  if (!isRecord(value)) return null;
  if (value.kind === 'guest'
    && Object.keys(value).sort().join(',') === 'kind,vaultId'
    && isAccountV2Id(value.vaultId)) {
    return { kind: 'guest', vaultId: value.vaultId.toLowerCase() };
  }
  if (value.kind === 'account'
    && Object.keys(value).sort().join(',') === 'accountId,kind'
    && isAccountV2Id(value.accountId)) {
    return { kind: 'account', accountId: value.accountId.toLowerCase() };
  }
  return null;
}

function validNoteCharacters(value: string): boolean {
  if (FORMAT_CONTROL.test(value)) return false;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if ((code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d)
      || (code >= 0x7f && code <= 0x9f)) {
      return false;
    }
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return false;
    }
  }
  return true;
}

export function normalizeLivingMomentNote(value: unknown): string | undefined | null {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/\r\n?/gu, '\n').trim();
  if (!normalized) return undefined;
  return [...normalized].length <= MAX_LIVING_MOMENT_NOTE_CHARACTERS
    && new TextEncoder().encode(normalized).byteLength <= MAX_LIVING_MOMENT_NOTE_BYTES
    && validNoteCharacters(normalized)
    ? normalized
    : null;
}

function validOccurrence(
  value: unknown,
  precision: LivingMomentTimePrecision,
): value is string {
  return precision === 'date_only'
    ? validCalendarDate(value)
    : canonicalInstant(value) !== null;
}

function positiveRevision(value: unknown, minimum: number): value is number {
  return Number.isSafeInteger(value) && (value as number) >= minimum;
}

function freezeMoment(moment: LivingMomentV1): LivingMomentV1 {
  Object.freeze(moment.owner);
  if (moment.conflictCopy) Object.freeze(moment.conflictCopy);
  return Object.freeze(moment);
}

function parseConflictCopy(
  input: unknown,
  owner: LivingChartOwnerScope,
  id: string,
): LivingMomentConflictCopyV1 | null {
  if (!isRecord(input)
    || !hasOnlyKeys(input, [
      'serverRevision', 'primaryChartId', 'occurredAt', 'timePrecision', 'category', 'note',
      'forecast', 'reflectionQuestionId', 'createdAt', 'updatedAt',
    ])
    || !positiveRevision(input.serverRevision, 1)) return null;
  const parsed = parseLivingMoment({
    schema: LIVING_CHART_MOMENT_SCHEMA,
    id,
    owner,
    primaryChartId: input.primaryChartId,
    occurredAt: input.occurredAt,
    timePrecision: input.timePrecision,
    ...(input.category === undefined ? {} : { category: input.category }),
    ...(input.note === undefined ? {} : { note: input.note }),
    forecast: input.forecast,
    reflectionQuestionId: input.reflectionQuestionId,
    revision: 1,
    baseRevision: 0,
    syncState: 'local',
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    deletedAt: null,
  });
  if (!parsed) return null;
  return {
    serverRevision: input.serverRevision,
    primaryChartId: parsed.primaryChartId,
    occurredAt: parsed.occurredAt,
    timePrecision: parsed.timePrecision,
    ...(parsed.category === undefined ? {} : { category: parsed.category }),
    ...(parsed.note === undefined ? {} : { note: parsed.note }),
    forecast: parsed.forecast,
    reflectionQuestionId: parsed.reflectionQuestionId,
    createdAt: parsed.createdAt,
    updatedAt: parsed.updatedAt,
  };
}

export function parseLivingMoment(input: unknown): LivingMomentV1 | null {
  if (!isRecord(input) || !hasOnlyKeys(input, [
    'schema',
    'id',
    'owner',
    'primaryChartId',
    'occurredAt',
    'timePrecision',
    'category',
    'note',
    'forecast',
    'reflectionQuestionId',
    'revision',
    'baseRevision',
    'syncState',
    'createdAt',
    'updatedAt',
    'deletedAt',
    'conflictCopy',
  ]) || !hasKeys(input, [
    'schema',
    'id',
    'owner',
    'primaryChartId',
    'occurredAt',
    'timePrecision',
    'forecast',
    'reflectionQuestionId',
    'revision',
    'baseRevision',
    'syncState',
    'createdAt',
    'updatedAt',
    'deletedAt',
  ])) return null;

  if (input.schema !== LIVING_CHART_MOMENT_SCHEMA
    || !isAccountV2Id(input.id)
    || !isAccountV2Id(input.primaryChartId)
    || typeof input.timePrecision !== 'string'
    || !LIVING_MOMENT_TIME_PRECISIONS.includes(input.timePrecision as LivingMomentTimePrecision)
    || !validOccurrence(input.occurredAt, input.timePrecision as LivingMomentTimePrecision)
    || (input.category !== undefined && (
      typeof input.category !== 'string'
      || !LIVING_MOMENT_CATEGORIES.includes(input.category as LivingMomentCategory)
    ))
    || typeof input.reflectionQuestionId !== 'string'
    || !IDENTIFIER.test(input.reflectionQuestionId)
    || !positiveRevision(input.revision, 1)
    || !positiveRevision(input.baseRevision, 0)
    || typeof input.syncState !== 'string'
    || !LIVING_MOMENT_SYNC_STATES.includes(input.syncState as LivingMomentSyncState)) return null;

  const owner = canonicalOwner(input.owner);
  const forecast = parseLivingForecastSnapshot(input.forecast);
  const note = normalizeLivingMomentNote(input.note);
  const createdAt = canonicalInstant(input.createdAt);
  const updatedAt = canonicalInstant(input.updatedAt);
  const deletedAt = input.deletedAt === null ? null : canonicalInstant(input.deletedAt);
  const conflictCopy = input.conflictCopy === undefined
    ? undefined
    : parseConflictCopy(input.conflictCopy, owner!, String(input.id));
  if (!owner
    || !forecast
    || forecast.chartId !== input.primaryChartId.toLowerCase()
    || note === null
    || (input.note !== undefined && note !== input.note)
    || (note === undefined && input.category === undefined)
    || !createdAt
    || !updatedAt
    || updatedAt < createdAt
    || deletedAt === undefined
    || (input.conflictCopy !== undefined && conflictCopy === null)
    || (input.syncState !== 'conflict' && conflictCopy !== undefined)
    || (input.syncState === 'deleted' ? deletedAt === null : deletedAt !== null)) return null;

  const moment: LivingMomentV1 = {
    schema: LIVING_CHART_MOMENT_SCHEMA,
    id: input.id.toLowerCase(),
    owner,
    primaryChartId: input.primaryChartId.toLowerCase(),
    occurredAt: input.occurredAt,
    timePrecision: input.timePrecision as LivingMomentTimePrecision,
    ...(input.category === undefined ? {} : { category: input.category as LivingMomentCategory }),
    ...(note === undefined ? {} : { note }),
    forecast,
    reflectionQuestionId: input.reflectionQuestionId,
    revision: input.revision,
    baseRevision: input.baseRevision,
    syncState: input.syncState as LivingMomentSyncState,
    createdAt,
    updatedAt,
    deletedAt: deletedAt ?? null,
    ...(conflictCopy ? { conflictCopy } : {}),
  };
  return livingChartOwnerKey(moment.owner) ? freezeMoment(moment) : null;
}

export function createLivingMomentRecord(
  owner: LivingChartOwnerScope,
  input: CreateLivingMomentInput,
  id: string,
  now: string,
): LivingMomentV1 | null {
  const note = normalizeLivingMomentNote(input.note);
  if (note === null) return null;
  return parseLivingMoment({
    schema: LIVING_CHART_MOMENT_SCHEMA,
    id,
    owner,
    primaryChartId: input.primaryChartId,
    occurredAt: input.occurredAt,
    timePrecision: input.timePrecision,
    ...(input.category === undefined ? {} : { category: input.category }),
    ...(note === undefined ? {} : { note }),
    forecast: input.forecast,
    reflectionQuestionId: input.reflectionQuestionId,
    revision: 1,
    baseRevision: 0,
    syncState: 'local',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });
}
