import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { transform } from 'esbuild';
import { describe, expect, it, vi } from 'vitest';

const source = await readFile(new URL('../src/components/EmailCaptureEnhancement.astro', import.meta.url), 'utf8');
const script = source.match(/<script[^>]*>([\s\S]*)<\/script>/)[1]
  .replace('import(enhancementUrl)', 'loadEnhancement()');
const { code } = await transform(script, { loader: 'ts', format: 'cjs' });

function harness(loadEnhancement) {
  const window = new EventTarget();
  const surface = new EventTarget();
  runInNewContext(code, {
    window,
    document: { querySelectorAll: () => [surface] },
    CustomEvent,
    loadEnhancement,
  });
  return { window, surface };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

describe('deferred email capture', () => {
  it('loads once on interaction and leaves the initial page idle', async () => {
    const enhanceEmailCapture = vi.fn();
    const load = vi.fn(async () => ({ enhanceEmailCapture }));
    const { surface } = harness(load);
    expect(load).not.toHaveBeenCalled();
    surface.dispatchEvent(new Event('pointerdown'));
    surface.dispatchEvent(new Event('focusin'));
    await settle();
    expect(load).toHaveBeenCalledTimes(1);
    expect(enhanceEmailCapture).toHaveBeenCalledTimes(1);
  });

  it('initializes with the latest context without rebroadcasting old chart events', async () => {
    let resolveLoad;
    const load = vi.fn(() => new Promise(resolve => { resolveLoad = resolve; }));
    const { window } = harness(load);
    window.dispatchEvent(new CustomEvent('zodiacs:chart-computed', { detail: { mode: 'full', sunSign: 'aries' } }));
    window.dispatchEvent(new CustomEvent('zodiacs:chart-context-cleared'));
    window.dispatchEvent(new CustomEvent('zodiacs:chart-computed', { detail: { mode: 'full', sunSign: 'taurus' } }));
    const enhanceEmailCapture = vi.fn();
    const rebroadcast = vi.fn();
    window.addEventListener('zodiacs:chart-computed', rebroadcast);
    resolveLoad({ enhanceEmailCapture });
    await settle();
    expect(load).toHaveBeenCalledTimes(1);
    expect(enhanceEmailCapture).toHaveBeenCalledWith({ type: 'zodiacs:chart-computed', detail: { mode: 'full', sunSign: 'taurus' } });
    expect(rebroadcast).not.toHaveBeenCalled();
  });

  it('can retry an unavailable chunk on the next interaction', async () => {
    const enhanceEmailCapture = vi.fn();
    const load = vi.fn().mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue({ enhanceEmailCapture });
    const { surface } = harness(load);
    surface.dispatchEvent(new Event('pointerdown'));
    await settle();
    surface.dispatchEvent(new Event('focusin'));
    await settle();
    expect(load).toHaveBeenCalledTimes(2);
    expect(enhanceEmailCapture).toHaveBeenCalledTimes(1);
  });
});
