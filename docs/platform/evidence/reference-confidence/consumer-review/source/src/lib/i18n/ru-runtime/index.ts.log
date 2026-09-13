import { clientRussianRuntime } from './client.js';
import { serverRussianRuntime } from './server.js';
import type { RussianRuntimePayload } from './schema.js';

/** Server data during Astro rendering; page-local serialized data in browsers. */
export function russianRuntime(): RussianRuntimePayload {
  return import.meta.env.SSR ? serverRussianRuntime() : clientRussianRuntime();
}

export type { RussianRuntimeClientPayload, RussianRuntimePayload } from './schema.js';
