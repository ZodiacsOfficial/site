/** Immutable local metadata around an existing SDK envelope; no legacy projection. */
import {
  parseNatalEnvelope,
  serializeNatalEnvelope,
  type NatalEnvelope,
} from '@zodiacs/engine/receipt';
import { isAccountV2Id } from '../account-v2/storage-identity';

export const SAVED_NATAL_RECORD_SCHEMA = 'zodiacs.saved-natal.v1';
export const MAX_SAVED_NATAL_RECORDS = 40;
export const MAX_SAVED_NATAL_LABEL_CODE_POINTS = 120;

export interface SavedNatalRecord {
  readonly schema: typeof SAVED_NATAL_RECORD_SCHEMA;
  readonly ownerKey: string;
  readonly id: string;
  readonly createdAt: string;
  readonly label?: string;
  /** SDK JSON only; includes private birth data and unauthenticated claims. */
  readonly envelopeJson: string;
}

export type SavedNatalRecordParseResult =
  | { readonly ok: true; readonly record: SavedNatalRecord }
  | { readonly ok: false; readonly code: 'corrupt-record' | 'unsupported-record' };

export function isSavedNatalOwnerKey(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const prefix = value.startsWith('account:') ? 'account:' : value.startsWith('guest:') ? 'guest:' : null;
  return prefix !== null && isSavedNatalId(value.slice(prefix.length));
}

export function isSavedNatalId(value: unknown): value is string {
  return typeof value === 'string' && value.length === 36 && isAccountV2Id(value);
}

function validLabel(value: unknown): value is string | undefined {
  return value === undefined || (typeof value === 'string'
    && value.length <= MAX_SAVED_NATAL_LABEL_CODE_POINTS * 2
    && [...value].length <= MAX_SAVED_NATAL_LABEL_CODE_POINTS
    && new TextEncoder().encode(value).length <= 512
    && value.trim().length > 0 && !/[\u0000-\u001f\u007f-\u009f]/u.test(value));
}

function validTimestamp(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value;
}

/** Snapshot existing validated receipt content before the caller starts storage. */
export function createSavedNatalRecord(
  ownerKey: string,
  id: string,
  createdAt: string,
  envelope: Readonly<NatalEnvelope>,
  label?: string,
): SavedNatalRecord | null {
  try {
    if (!isSavedNatalOwnerKey(ownerKey) || !isSavedNatalId(id)
      || !validTimestamp(createdAt) || !validLabel(label)) return null;
    const envelopeJson = serializeNatalEnvelope(envelope);
    return Object.freeze({ schema: SAVED_NATAL_RECORD_SCHEMA, ownerKey, id, createdAt,
      ...(label === undefined ? {} : { label }), envelopeJson });
  } catch { return null; }
}

/** Validate only this outer record; all inner validation belongs to the SDK. */
export function parseSavedNatalRecord(value: unknown, ownerKey: string): SavedNatalRecordParseResult {
  const corrupt = { ok: false, code: 'corrupt-record' } as const;
  try {
    if (!isSavedNatalOwnerKey(ownerKey) || !value || typeof value !== 'object'
      || Object.getPrototypeOf(value) !== Object.prototype) return corrupt;
    const schema = Object.getOwnPropertyDescriptor(value, 'schema');
    if (schema?.enumerable && 'value' in schema && typeof schema.value === 'string'
      && schema.value.length <= 128
      && /^zodiacs\.saved-natal\.v(?:[2-9]|[1-9]\d+)$/u.exec(schema.value)?.[0] === schema.value) {
      return { ok: false, code: 'unsupported-record' };
    }
    const keys = Reflect.ownKeys(value);
    if (keys.length < 5 || keys.length > 6 || keys.some((key) => typeof key !== 'string')) return corrupt;
    const fields: Record<string, unknown> = {};
    for (const key of keys as string[]) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor?.enumerable || !('value' in descriptor)
        || !['schema', 'ownerKey', 'id', 'createdAt', 'label', 'envelopeJson'].includes(key)) return corrupt;
      fields[key] = descriptor.value;
    }
    if (fields.schema !== SAVED_NATAL_RECORD_SCHEMA || fields.ownerKey !== ownerKey
      || !isSavedNatalId(fields.id) || !validTimestamp(fields.createdAt)
      || !validLabel(fields.label) || (Object.hasOwn(fields, 'label') && fields.label === undefined)
      || typeof fields.envelopeJson !== 'string') return corrupt;
    const parsed = parseNatalEnvelope(fields.envelopeJson);
    if (!parsed.ok) return { ok: false, code: parsed.code === 'unsupported_version'
      || parsed.code === 'unsupported_feature' ? 'unsupported-record' : 'corrupt-record' };
    return { ok: true, record: Object.freeze({ schema: SAVED_NATAL_RECORD_SCHEMA,
      ownerKey, id: fields.id, createdAt: fields.createdAt,
      ...(fields.label === undefined ? {} : { label: fields.label }), envelopeJson: fields.envelopeJson }) };
  } catch { return corrupt; }
}
