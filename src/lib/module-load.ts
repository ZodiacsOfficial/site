/** A failed code download is different from invalid birth details. */
export class ModuleLoadError extends Error {
  constructor(cause: unknown) {
    super('Calculation module unavailable', { cause });
    this.name = 'ModuleLoadError';
  }
}

export async function loadModule<T>(load: () => Promise<T>): Promise<T> {
  try {
    return await load();
  } catch (cause) {
    throw new ModuleLoadError(cause);
  }
}

/** Share successful imports without retaining a rejected application promise.
 * Native module caches may still require the explicit reload shown by callers. */
export function createModuleLoader<T>(importModule: () => Promise<T>): () => Promise<T> {
  let modulePromise: Promise<T> | null = null;
  return () => {
    if (!modulePromise) {
      const pending = loadModule(importModule);
      modulePromise = pending;
      // Optional focus warm-ups must observe their own rejection too.
      void pending.catch(() => {
        if (modulePromise === pending) modulePromise = null;
      });
    }
    return modulePromise;
  };
}
