export type EngineModule = typeof import('../engine/full');
export type EngineLoader = () => Promise<EngineModule>;

let enginePromise: Promise<EngineModule> | null = null;

/** Load the full ephemeris once, on demand, across every hydrated island. */
export const loadEngine: EngineLoader = () => (
  enginePromise ??= import('../engine/full')
);

/** Stable lazy engine loader for island event handlers and warm-up effects. */
export function useEngine(): EngineLoader {
  return loadEngine;
}
