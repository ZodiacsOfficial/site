import { afterEach, describe, expect, it } from 'vitest';
import { RUSSIAN_RUNTIME } from './server';
import { clientRussianRuntime } from './client';
import type { RussianRuntimeClientPayload } from './schema';

type RussianRuntimeGlobal = typeof globalThis & { __ZDX_RU__?: RussianRuntimeClientPayload };
const runtimeGlobal = globalThis as RussianRuntimeGlobal;

afterEach(() => {
  Reflect.deleteProperty(runtimeGlobal, '__ZDX_RU__');
});

describe('staged Russian runtime payload', () => {
  it('fails closed when a Russian preview page did not serialize the payload', () => {
    expect(() => clientRussianRuntime()).toThrow('Missing staged Russian runtime payload');
  });

  it('reads the exact page-local payload without a bundled fallback', () => {
    runtimeGlobal.__ZDX_RU__ = { locale: 'ru', data: RUSSIAN_RUNTIME };
    const runtime = clientRussianRuntime();

    expect(runtime.signs.names.aquarius).toBe('Водолей');
    expect(runtime.astrology.planets['North Node']).toBe('Северный узел');
    expect(runtime.chart.wheelActions.guide).toBe('Пройти экскурсию');
    expect(runtime.plurals.aspects.many).toBe('{n} аспектов');
    expect(JSON.parse(JSON.stringify(runtime))).toEqual(runtime);
  });
});
