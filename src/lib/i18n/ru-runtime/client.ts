import type { RussianRuntimeClientPayload, RussianRuntimePayload } from './schema';

type RussianRuntimeGlobal = typeof globalThis & { __ZDX_RU__?: RussianRuntimeClientPayload };

export function clientRussianRuntime(): RussianRuntimePayload {
  const payload = (globalThis as RussianRuntimeGlobal).__ZDX_RU__;
  if (!payload || payload.locale !== 'ru' || !payload.data) {
    throw new Error('Missing staged Russian runtime payload');
  }
  return payload.data;
}
