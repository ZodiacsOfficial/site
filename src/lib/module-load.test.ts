import { describe, expect, it, vi } from 'vitest';
import { createModuleLoader, loadModule, ModuleLoadError } from './module-load';

describe('optional calculation module loading', () => {
  it.each(['synchronous', 'asynchronous'])('classifies a %s import failure and preserves its cause', async (mode) => {
    const cause = new TypeError('Network unavailable');
    await expect(loadModule(() => {
      if (mode === 'synchronous') throw cause;
      return Promise.reject(cause);
    })).rejects.toMatchObject({ name: 'ModuleLoadError', cause });
  });

  it('does not reclassify an error raised by a successfully loaded calculation', async () => {
    const calculate = () => { throw new RangeError('Invalid birth date'); };
    const module = await loadModule(async () => ({ calculate }));
    expect(() => module.calculate()).toThrow(RangeError);
    expect(() => module.calculate()).not.toThrow(ModuleLoadError);
  });

  it('lets an observed focus warm-up fail before a later return scan succeeds', async () => {
    const result = { saturnReturns: vi.fn() };
    const importer = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(result);
    const load = createModuleLoader(importer);
    void load();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(await load()).toBe(result);
    expect(await load()).toBe(result);
    expect(importer).toHaveBeenCalledTimes(2);
  });
});
