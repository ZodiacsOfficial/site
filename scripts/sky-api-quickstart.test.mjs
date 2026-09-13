import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

// Execute the exact standalone source shown by the developer page.
const source = readFileSync(new URL('../src/lib/sky-api/examples/today.mjs', import.meta.url), 'utf8');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const execute = new AsyncFunction('fetch', 'Date', 'console', source);
const snapshot = {
  schema: 'zodiacs.sky-api.today.v1',
  date: '2026-09-07',
  snapshotAt: '2026-09-07T12:00:00.000Z',
  generatedAt: '2026-09-07T01:00:00.000Z',
  summary: 'Synthetic daily edition',
  bodies: [{ body: 'Sun', position: '14°53′ Virgo', retrograde: false }],
};

function reader(payload = snapshot, now = '2026-09-07T18:00:00.000Z', status = 200) {
  const json = vi.fn(async () => payload);
  const fetcher = vi.fn(async () => ({ ok: status >= 200 && status < 300, status, json }));
  const output = { log: vi.fn() };
  class Clock extends Date {
    constructor(value) { super(value === undefined ? now : value); }
  }
  return { json, fetcher, output, run: () => execute(fetcher, Clock, output) };
}

describe('literal public sky quick start', () => {
  it.each([
    '2026-09-07T01:00:00.000Z',
    '2026-09-07T23:59:59.000Z',
    '2026-09-08T00:30:00.000+07:00',
  ])('accepts the current UTC edition at %s and displays its snapshot', async (now) => {
    const check = reader(snapshot, now);
    await check.run();
    expect(check.output.log).toHaveBeenCalledWith('Computed positions for 2026-09-07T12:00:00.000Z');
    expect(check.output.log).toHaveBeenCalledWith('Sun', '14°53′ Virgo', '');
  });

  it('rejects HTTP errors before decoding or displaying data', async () => {
    const check = reader(snapshot, undefined, 503);
    await expect(check.run()).rejects.toThrow('HTTP 503');
    expect(check.json).not.toHaveBeenCalled();
    expect(check.output.log).not.toHaveBeenCalled();
  });

  it.each([
    null,
    { ...snapshot, schema: 'zodiacs.sky-api.planet.v1' },
    { ...snapshot, snapshotAt: null },
    { ...snapshot, bodies: null },
    { ...snapshot, bodies: [] },
    { ...snapshot, bodies: [null] },
    { ...snapshot, bodies: [{ ...snapshot.bodies[0], body: null }] },
    { ...snapshot, bodies: [{ ...snapshot.bodies[0], position: null }] },
    { ...snapshot, bodies: [{ ...snapshot.bodies[0], retrograde: 'false' }] },
    { ...snapshot, bodies: [42] },
  ])('rejects the wrong payload kind or missing required shape', async (payload) => {
    const check = reader(payload);
    await expect(check.run()).rejects.toThrow('Unexpected sky payload');
    expect(check.output.log).not.toHaveBeenCalled();
  });

  it.each(['2026-09-06', '2026-09-08', '2026-02-30'])('rejects edition %s despite a recent build timestamp', async (date) => {
    const check = reader({ ...snapshot, date, generatedAt: '2026-09-07T17:59:59.000Z' });
    await expect(check.run()).rejects.toThrow('is not current');
    expect(check.output.log).not.toHaveBeenCalled();
  });

  it.each(['2026-09-07T13:00:00.000Z', '2026-09-06T12:00:00.000Z', 'not-an-instant'])('rejects inconsistent snapshot %s', async (snapshotAt) => {
    const check = reader({ ...snapshot, snapshotAt });
    await expect(check.run()).rejects.toThrow('Unexpected sky snapshot time');
    expect(check.output.log).not.toHaveBeenCalled();
  });

  it('expires the old edition at UTC midnight', async () => {
    const check = reader(snapshot, '2026-09-08T00:00:00.000Z');
    await expect(check.run()).rejects.toThrow('is not current');
    expect(check.output.log).not.toHaveBeenCalled();
  });
});
