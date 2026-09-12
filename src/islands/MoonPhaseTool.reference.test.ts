import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import * as engine from '../lib/engine/full';
import { moonPhaseName } from '../lib/engine/lite';
import { localDateContainsUtc, resolveLocalToUtc } from '../lib/time/localToUtc';
import { signForLongitude } from '../lib/signs';
import { t, type CatalogLocale } from '../lib/i18n';

// Execute the exact caller with controlled state and loader boundaries. The
// separate native driver covers Preact rendering, visibility and ownership.
const source = readFileSync(new URL('./MoonPhaseTool.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('MoonPhaseTool.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const functions = new Map<string, string>();
function visit(node: ts.Node) {
  if (ts.isFunctionDeclaration(node) && ['lookup', 'moonIlluminationFromAngle'].includes(node.name?.text ?? '')) {
    functions.set(node.name!.text, node.getText(ast));
  }
  ts.forEachChild(node, visit);
}
visit(ast);
if (functions.size !== 2) throw new Error('Moon lookup functions not found');
const execute = new Function('context', `with(context){${ts.transpile([...functions.values()].join('\n'), {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
})};return lookup({preventDefault(){}});}`);
type Result = { phase: ReturnType<typeof moonPhaseName>; angle: number; illum: number; lon: number; caption: string };
type Input = { date: string; time: string; zone: string | null; locale?: CatalogLocale };
async function capture({ date, time, zone, locale = 'en' }: Input) {
  const calls: Array<{ body: string; utc: string; value: number }> = [];
  const resolutions: string[][] = [];
  const state: { result: Result | null; error: string; busy: boolean } = { result: null, error: '', busy: false };
  await execute({ date, time, city: zone ? { tz: zone } : null, locale, t, moonPhaseName,
    lookupRevisionRef: { current: 0 }, focusAfterComputeRef: { current: false },
    setBusy: (value: boolean) => { state.busy = value; },
    setError: (value: string) => { state.error = value; },
    setResult: (value: Result | null) => { state.result = value; },
    loadEngine: async () => ({ ...engine, bodyLongitude: (...args: Parameters<typeof engine.bodyLongitude>) => {
      const value = engine.bodyLongitude(...args); calls.push({ body: args[0], utc: args[1].toISOString(), value }); return value;
    } }),
    resolveLocalToUtc: (...args: Parameters<typeof resolveLocalToUtc>) => { resolutions.push(args); return resolveLocalToUtc(...args); },
    localDateContainsUtc, calculationError: (_error: unknown, _locale: string, fallback: string) => fallback,
    console: { error() {} },
  });
  return { ...state, calls, resolutions };
}
const controls: Array<[string, Input]> = [
  ['UTC singleton', { date: '1990-01-04', time: '', zone: null }],
  ['local former two signs', { date: '1990-01-01', time: '', zone: 'Europe/London' }],
  ['Toronto omitted member', { date: '1919-03-31', time: '', zone: 'America/Toronto' }],
  ['Juneau returned member', { date: '1867-10-18', time: '', zone: 'America/Juneau' }],
  ['same-date noon gap', { date: '2000-01-15', time: '', zone: 'Africa/Khartoum' }],
  ['known local gap', { date: '2000-01-15', time: '12:00', zone: 'Africa/Khartoum' }],
  ['known UTC', { date: '2000-01-15', time: '08:30', zone: null }],
  ['known skipped date', { date: '2011-12-30', time: '08:30', zone: 'Pacific/Apia' }],
];

describe('Moon phase reference result', () => {
  it.each(controls)('%s preserves every primary value and omits endpoint confidence work', async (_name, input) => {
    const actual = await capture(input);
    const utc = input.zone ? resolveLocalToUtc(input.date, input.time || '12:00', input.zone).utc
      : new Date(`${input.date}T${input.time || '12:00'}:00Z`);
    const lon = engine.bodyLongitude('Moon', utc), sun = engine.bodyLongitude('Sun', utc);
    const angle = (((lon - sun) % 360) + 360) % 360;
    expect(actual.error).toBe('');
    expect(actual.busy).toBe(false);
    const { caption, ...numerical } = actual.result!;
    expect(JSON.stringify(numerical)).toBe(JSON.stringify({ phase: moonPhaseName(utc), angle,
      illum: (1 - Math.cos((angle * Math.PI) / 180)) / 2, lon }));
    expect(actual.calls).toEqual([{ body: 'Moon', utc: utc.toISOString(), value: lon }, { body: 'Sun', utc: utc.toISOString(), value: sun }]);
    expect(actual.resolutions).toEqual(input.zone ? [[input.date, input.time || '12:00', input.zone]] : []);
    expect(caption).toBe(input.time ? input.zone ? '' : t('en', 'utcTimeCaption')
      : t('en', input.zone ? 'referenceLocalCaption' : 'referenceUtcCaption'));
  });

  it('retains the actual 13:00 local gap result without promising a noon clock', async () => {
    const actual = await capture({ date: '2000-01-15', time: '', zone: 'Africa/Khartoum' });
    expect(actual.calls[0].utc).toBe('2000-01-15T10:00:00.000Z');
    expect(new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Khartoum', hour: '2-digit', hourCycle: 'h23' })
      .format(new Date(actual.calls[0].utc))).toBe('13');
    expect(actual.result!.caption).not.toMatch(/12:00|noon|midday|exact/i);
  });

  it.each([
    ['2011-12-30', 'Pacific/Apia'], ['1993-08-21', 'Pacific/Kwajalein'],
    ['1994-12-31', 'Pacific/Kiritimati'], ['1844-12-31', 'Pacific/Guam'],
  ])('keeps %s %s refusal before all numerical work', async (date, zone) => {
    const actual = await capture({ date, time: '', zone });
    expect(actual.result).toBeNull(); expect(actual.calls).toEqual([]);
    expect(actual.error).toBe(t('en', 'localDateReferenceError'));
  });

  it.each(['en', 'es', 'fr', 'it', 'pt', 'ru'] as const)('%s captures the local and UTC reference qualification', async locale => {
    for (const zone of [null, 'Europe/London']) {
      const actual = await capture({ date: '1990-01-01', time: '', zone, locale });
      expect(actual.result!.caption).toBe(t(locale, zone ? 'referenceLocalCaption' : 'referenceUtcCaption'));
      expect(actual.result!.caption).not.toMatch(/12:00|12 h/);
    }
  });

  it.each([
    ['2024-01-09', ['Waning Crescent', 'Waning Crescent', 'New Moon']],
    ['2024-01-16', ['Waxing Crescent', 'First Quarter', 'First Quarter']],
    ['2024-04-07', ['Waning Crescent', 'New Moon', 'New Moon']],
    ['2024-01-01', ['Waning Gibbous', 'Waning Gibbous', 'Waning Gibbous']],
  ])('preserves the existing finite phase-category witness for %s', (date, phases) => {
    expect(['00:00', '12:00', '23:59'].map(time => moonPhaseName(new Date(`${date}T${time}:00Z`)))).toEqual(phases);
  });

  it.each([
    ['1919-03-31', 'America/Toronto', '1919-03-31T04:30:00Z', 'pisces', 'aries'],
    ['1867-10-18', 'America/Juneau', '1867-10-19T00:31:13Z', 'cancer', 'gemini'],
  ])('retains the omitted member of %s as a counterexample, not a complete range', async (date, zone, instant, sign, reference) => {
    const actual = await capture({ date, time: '', zone });
    expect(localDateContainsUtc(date, new Date(instant), zone)).toBe(true);
    expect(signForLongitude(engine.bodyLongitude('Moon', new Date(instant))).slug).toBe(sign);
    expect(signForLongitude(actual.result!.lon).slug).toBe(reference);
    expect(actual.result).not.toHaveProperty('altLon');
  });
});
