import { h } from 'preact';
import { render } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import SavedRecordsPanel, { describeRecord } from './SavedRecordsPanel';
import { SAVED_RECORDS_COPY } from './saved-records-copy';
import type { SavedNatalRecord } from '../lib/profile/saved-record';

const record = (envelope: unknown, label?: string): SavedNatalRecord => ({
  schema: 'zodiacs.saved-natal.v1', ownerKey: 'guest:30000000-0000-4000-8000-000000000003',
  id: '40000000-0000-4000-8000-000000000004', createdAt: '2026-09-14T10:00:00.000Z',
  ...(label === undefined ? {} : { label }), envelopeJson: JSON.stringify(envelope),
});

describe('SavedRecordsPanel', () => {
  it('renders nothing on the server and with the feature off', () => {
    expect(render(h(SavedRecordsPanel, { enabled: false, locale: 'en' }))).toBe('');
    // Enabled but not yet hydrated: a loading shell that names the surface honestly.
    const html = render(h(SavedRecordsPanel, { enabled: true, locale: 'en' }));
    expect(html).toContain('data-saved-records-state="loading"');
    expect(html).toContain(SAVED_RECORDS_COPY.en.heading);
    expect(html).toContain('never part of account sync');
  });

  it('describes a record from its exact bytes without recalculating', () => {
    expect(describeRecord(record({ receipt: { timeKnown: true, instant: '1990-06-15T13:30:00.000Z',
      localResolution: { date: '1990-06-15', time: '14:30', timeZone: 'Europe/London' } } })))
      .toEqual({ date: '1990-06-15', time: '14:30', zone: 'Europe/London' });
    expect(describeRecord(record({ receipt: { timeKnown: false, instant: '1990-06-15T11:00:00.000Z',
      localResolution: { date: '1990-06-15', time: '12:00', timeZone: 'Europe/London' } } })))
      .toEqual({ date: '1990-06-15', time: null, zone: 'Europe/London' });
    expect(describeRecord(record({ receipt: { timeKnown: true, instant: '2001-12-21T09:00:00.000Z', localResolution: null } })))
      .toEqual({ date: '2001-12-21', time: '09:00 UTC', zone: null });
    expect(describeRecord({ ...record({}), envelopeJson: '{not json' })).toEqual({ date: '', time: null, zone: null });
  });

  it('keeps every locale catalog complete and free of engineering terms', () => {
    const keys = Object.keys(SAVED_RECORDS_COPY.en);
    for (const locale of ['es', 'pt', 'fr', 'it', 'ru'] as const) {
      expect(Object.keys(SAVED_RECORDS_COPY[locale])).toEqual(keys);
      for (const key of keys) {
        const value = SAVED_RECORDS_COPY[locale][key as keyof typeof SAVED_RECORDS_COPY.en];
        const text = typeof value === 'function' ? `${value(1)} ${value(2)} ${value(5)}` : value;
        expect(text, `${locale}.${key}`).not.toMatch(/capabilit|journal|admission|generation|receipt codec/iu);
      }
    }
    // Every locale carries its own text: a key that silently fell back to English would read the same.
    for (const locale of ['es', 'pt', 'fr', 'it', 'ru'] as const) {
      for (const key of keys) {
        const own = SAVED_RECORDS_COPY[locale][key as keyof typeof SAVED_RECORDS_COPY.en];
        const english = SAVED_RECORDS_COPY.en[key as keyof typeof SAVED_RECORDS_COPY.en];
        const a = typeof own === 'function' ? own(2) : own;
        const b = typeof english === 'function' ? english(2) : english;
        expect(a, `${locale}.${key} is untranslated`).not.toBe(b);
      }
    }
    expect(SAVED_RECORDS_COPY.ru.count(1)).toBe('1 запись');
    expect(SAVED_RECORDS_COPY.ru.count(3)).toBe('3 записи');
    expect(SAVED_RECORDS_COPY.ru.count(11)).toBe('11 записей');
    expect(SAVED_RECORDS_COPY.en.count(2)).toBe('2 records');
  });
});
