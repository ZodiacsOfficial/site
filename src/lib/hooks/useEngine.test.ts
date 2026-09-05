import { describe, expect, it, vi } from 'vitest';
import { createEngineLoader, type EngineModule } from './useEngine';
import { ModuleLoadError } from '../module-load';

const engine = { computeChart: vi.fn() } as unknown as EngineModule;

describe('lazy engine request recovery', () => {
  it('does not request the ephemeris until needed, and shares pending and successful requests', async () => {
    const importer = vi.fn().mockResolvedValue(engine);
    const load = createEngineLoader(importer);
    expect(importer).not.toHaveBeenCalled();
    const first = load();
    expect(load()).toBe(first);
    expect(await first).toBe(engine);
    expect(load()).toBe(first);
    expect(importer).toHaveBeenCalledOnce();
  });

  it('evicts a failed request so another interaction can recover', async () => {
    const cause = new TypeError('offline');
    const importer = vi.fn().mockRejectedValueOnce(cause).mockResolvedValue(engine);
    const load = createEngineLoader(importer);
    const failed = load();
    expect(load()).toBe(failed);
    await expect(failed).rejects.toMatchObject({ name: 'ModuleLoadError', cause });
    const next = load();
    expect(next).not.toBe(failed);
    await expect(next).resolves.toBe(engine);
    expect(importer).toHaveBeenCalledTimes(2);
  });

  it('continues reporting a browser-cached module failure, never a fake engine', async () => {
    const importer = vi.fn().mockRejectedValue(new Error('cached module failure'));
    const load = createEngineLoader(importer);
    await expect(load()).rejects.toBeInstanceOf(ModuleLoadError);
    await expect(load()).rejects.toBeInstanceOf(ModuleLoadError);
    expect(importer).toHaveBeenCalledTimes(2);
  });

  it('observes a fire-and-forget warm-up failure without keeping it in the cache', async () => {
    const importer = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(engine);
    const load = createEngineLoader(importer);
    void load();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await expect(load()).resolves.toBe(engine);
  });
});
