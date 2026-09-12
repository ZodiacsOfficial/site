import { describe, expect, it } from 'vitest';
import { parseNatalEnvelope, serializeNatalEnvelope } from '@zodiacs/engine/receipt';
import { computePortableChart } from '../engine/portable';
import { selfChartPutWire } from '../account-v2/chart-wire';
import type { SavedChart } from './schema';
import {
  createSavedNatalRecord, isSavedNatalId, isSavedNatalOwnerKey,
  parseSavedNatalRecord, SAVED_NATAL_RECORD_SCHEMA,
} from './saved-record';

const ID = '10000000-0000-4000-8000-000000000001';
const OWNER = `account:${ID}`;
const WHEN = '2026-09-08T00:00:00.000Z';
const calculation = computePortableChart({ utc: '2001-12-21T08:30:00-00:00',
  latitude: 78.2232, longitude: 15.6267, houseSystem: 'placidus', timeKnown: false },
{ sourceInstant: '2001-12-21T08:30:00-00:00', extensions: { test: { value: 'synthetic' } } });
const make = (label?: string) => createSavedNatalRecord(OWNER, ID, WHEN, calculation.envelope, label)!;

describe('immutable saved natal record', () => {
  it.each([undefined, 'Synthetic local label'])('round-trips with optional label %s', (label) => {
    const record = make(label);
    expect(record).not.toBeNull();
    expect(Object.isFrozen(record)).toBe(true);
    expect(parseSavedNatalRecord(record, OWNER)).toEqual({ ok: true, record });
    expect(record.envelopeJson).toBe(serializeNatalEnvelope(calculation.envelope));
    expect(parseNatalEnvelope(record.envelopeJson)).toEqual({ ok: true, envelope: calculation.envelope });
    expect(record.envelopeJson).not.toContain(ID);
    expect(record.envelopeJson).not.toContain('Synthetic local label');
    expect(Object.keys(record).sort()).toEqual(['schema', 'ownerKey', 'id', 'createdAt', 'envelopeJson', ...(label ? ['label'] : [])].sort());
  });

  it.each(['2', '9', '10', '11', '100'])('preserves future v%s records with changed fields', (version) => {
    expect(parseSavedNatalRecord({ schema: `zodiacs.saved-natal.v${version}`, future: 'opaque' }, OWNER))
      .toEqual({ ok: false, code: 'unsupported-record' });
  });

  it.each(['\n', '\r', '\r\n', ' ', '\u2028'])('rejects UUID and owner suffix %j', (suffix) => {
    expect(isSavedNatalId(ID + suffix)).toBe(false);
    expect(isSavedNatalOwnerKey(OWNER + suffix)).toBe(false);
    expect(createSavedNatalRecord(OWNER + suffix, ID, WHEN, calculation.envelope)).toBeNull();
    expect(createSavedNatalRecord(OWNER, ID + suffix, WHEN, calculation.envelope)).toBeNull();
  });

  it('accepts explicit canonical guest and account IDs without discovery or normalization', () => {
    expect(isSavedNatalOwnerKey(OWNER)).toBe(true);
    expect(isSavedNatalOwnerKey(`guest:${ID}`)).toBe(true);
    for (const value of ['', ID, 'account:', `other:${ID}`, OWNER.toUpperCase()]) expect(isSavedNatalOwnerKey(value)).toBe(false);
  });

  it('bounds labels without leaking them into the receipt', () => {
    for (const label of ['', ' ', '\ttext', 'text\n', 'x'.repeat(121), '😀'.repeat(121)]) expect(make(label)).toBeNull();
    expect(make('😀'.repeat(120))?.label).toBe('😀'.repeat(120));
    expect(make('  exact text  ')?.label).toBe('  exact text  ');
  });

  it('rejects malformed metadata, extra fields, accessors and wrong owners', () => {
    const record = make('label');
    for (const value of [null, [], { ...record, extra: true }, { ...record, id: 'bad' },
      { ...record, createdAt: '2026-02-30T00:00:00.000Z' }, { ...record, label: undefined },
      { ...record, schema: SAVED_NATAL_RECORD_SCHEMA + '\n' }]) {
      expect(parseSavedNatalRecord(value, OWNER)).toEqual({ ok: false, code: 'corrupt-record' });
    }
    expect(parseSavedNatalRecord(record, `guest:${ID}`)).toEqual({ ok: false, code: 'corrupt-record' });
    let reads = 0;
    const accessor = Object.defineProperty({ ...record }, 'envelopeJson', { enumerable: true, get() { reads++; throw new Error('private'); } });
    expect(parseSavedNatalRecord(accessor, OWNER)).toEqual({ ok: false, code: 'corrupt-record' });
    expect(reads).toBe(0);
  });

  it('delegates inner future-version/feature/corrupt detection to the existing SDK codec', () => {
    const record = make('label');
    const original = JSON.parse(record.envelopeJson);
    for (const envelope of [{ ...original, schema: 'zodiacs.natal-envelope.draft-v2' },
      { ...original, requiredFeatures: ['future-feature'] }]) {
      expect(parseSavedNatalRecord({ ...record, envelopeJson: JSON.stringify(envelope) }, OWNER))
        .toEqual({ ok: false, code: 'unsupported-record' });
    }
    for (const envelopeJson of ['{broken', 'x'.repeat(65537), record.envelopeJson.replace('"timeKnown":false', '"timeKnown":true')]) {
      expect(parseSavedNatalRecord({ ...record, envelopeJson }, OWNER)).toEqual({ ok: false, code: 'corrupt-record' });
    }
  });

  it('cannot pass an immutable richer record through the existing v1 upload preparation', () => {
    expect(selfChartPutWire(make() as unknown as SavedChart, ID, ID, 0)).toBeNull();
  });
});
