import { isAccountV2Id } from '../account-v2/storage-identity';
import {
  LIVING_CHART_FORECAST_SCHEMA,
  type CreateLivingForecastSnapshotInput,
  type LivingForecastLineV1,
  type LivingForecastSnapshotV1,
  type LivingForecastSource,
} from './types';

export const MAX_LIVING_FORECAST_LINES = 3;

const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const VERSION = /^[A-Za-z0-9][A-Za-z0-9._+-]{0,63}$/u;
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/u;
const FORECAST_SOURCES = new Set<LivingForecastSource>(['personalized', 'sun_sign', 'quiet']);
const SINGLE_LINE_CONTROL = /[\p{Cc}\p{Cf}]/u;

function validDate(value: unknown): value is string {
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

function boundedSingleLine(
  value: unknown,
  maximumCharacters: number,
  maximumBytes: number,
): string | null {
  if (typeof value !== 'string'
    || value !== value.trim()
    || value.length < 1
    || [...value].length > maximumCharacters
    || new TextEncoder().encode(value).byteLength > maximumBytes
    || SINGLE_LINE_CONTROL.test(value)) return null;
  return value;
}

function parseLine(input: unknown): LivingForecastLineV1 | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const row = input as Record<string, unknown>;
  if (Object.keys(row).sort().join(',') !== 'id,receipt,text') return null;
  const id = boundedSingleLine(row.id, 128, 128);
  const text = boundedSingleLine(row.text, 1_200, 4_800);
  const receipt = boundedSingleLine(row.receipt, 800, 3_200);
  return id && ID.test(id) && text && receipt ? { id, text, receipt } : null;
}

function freezeSnapshot(snapshot: LivingForecastSnapshotV1): LivingForecastSnapshotV1 {
  for (const line of snapshot.lines) Object.freeze(line);
  Object.freeze(snapshot.lines);
  return Object.freeze(snapshot);
}

export function parseLivingForecastSnapshot(input: unknown): LivingForecastSnapshotV1 | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const value = input as Record<string, unknown>;
  if (Object.keys(value).sort().join(',') !== [
    'capturedAt',
    'chartId',
    'editionDate',
    'generatorVersion',
    'lines',
    'schema',
    'source',
  ].sort().join(',')) return null;
  if (value.schema !== LIVING_CHART_FORECAST_SCHEMA
    || !validDate(value.editionDate)
    || !isAccountV2Id(value.chartId)
    || typeof value.source !== 'string'
    || !FORECAST_SOURCES.has(value.source as LivingForecastSource)
    || !Array.isArray(value.lines)
    || value.lines.length < 1
    || value.lines.length > MAX_LIVING_FORECAST_LINES) return null;
  const generatorVersion = boundedSingleLine(value.generatorVersion, 64, 64);
  const capturedAt = canonicalInstant(value.capturedAt);
  const lines = value.lines.map(parseLine);
  if (!generatorVersion || !VERSION.test(generatorVersion) || !capturedAt
    || lines.some((line) => line === null)) return null;
  const parsedLines = lines as LivingForecastLineV1[];
  if (new Set(parsedLines.map((line) => line.id)).size !== parsedLines.length) return null;
  return freezeSnapshot({
    schema: LIVING_CHART_FORECAST_SCHEMA,
    editionDate: value.editionDate,
    chartId: value.chartId.toLowerCase(),
    source: value.source as LivingForecastSource,
    generatorVersion,
    capturedAt,
    lines: parsedLines,
  });
}

export function createLivingForecastSnapshot(
  input: CreateLivingForecastSnapshotInput,
  now: () => Date = () => new Date(),
): LivingForecastSnapshotV1 | null {
  return parseLivingForecastSnapshot({
    schema: LIVING_CHART_FORECAST_SCHEMA,
    ...input,
    capturedAt: input.capturedAt ?? now().toISOString(),
  });
}
