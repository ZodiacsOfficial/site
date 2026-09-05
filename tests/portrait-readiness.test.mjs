import { afterEach, describe, expect, it, vi } from 'vitest';
import { waitForPortraitReadiness } from './portrait-readiness.mjs';

class Portrait extends EventTarget {
  complete = false;
  naturalWidth = 0;
  naturalHeight = 0;
  currentSrc = 'http://127.0.0.1/assets/people/fixture.webp';
  decode = vi.fn().mockResolvedValue(undefined);
  getAttribute(name) { return name === 'src' ? '/assets/people/fixture.webp' : null; }
  loaded() {
    this.complete = true;
    this.naturalWidth = 640;
    this.naturalHeight = 1072;
    this.dispatchEvent(new Event('load'));
  }
}

afterEach(() => vi.useRealTimers());

describe('People portrait readiness', () => {
  it('waits for both a pending resource and its later decode', async () => {
    const image = new Portrait();
    let decoded;
    image.decode.mockReturnValue(new Promise((resolve) => { decoded = resolve; }));
    let settled = false;
    const pending = waitForPortraitReadiness(image).then((result) => { settled = true; return result; });
    await Promise.resolve();
    expect(settled).toBe(false);
    image.loaded();
    await Promise.resolve();
    expect(settled).toBe(false);
    decoded();
    expect(await pending).toMatchObject({ ready: true, error: null, complete: true,
      naturalWidth: 640, naturalHeight: 1072, currentSrc: image.currentSrc });
    expect(image.decode).toHaveBeenCalledOnce();
  });

  it('decodes an already loaded portrait', async () => {
    const image = new Portrait();
    image.loaded();
    expect(await waitForPortraitReadiness(image)).toMatchObject({ ready: true });
    expect(image.decode).toHaveBeenCalledOnce();
  });

  it('fails a completed broken image without treating complete as success', async () => {
    const image = new Portrait();
    image.complete = true;
    expect(await waitForPortraitReadiness(image)).toMatchObject({ ready: false,
      complete: true, naturalWidth: 0, src: '/assets/people/fixture.webp' });
    expect(image.decode).not.toHaveBeenCalled();
  });

  it('records a load error and removes listeners before later events', async () => {
    const image = new Portrait();
    const pending = waitForPortraitReadiness(image);
    image.dispatchEvent(new Event('error'));
    expect(await pending).toMatchObject({ ready: false, error: 'portrait load error' });
    image.loaded();
    expect(image.decode).not.toHaveBeenCalled();
  });

  it('fails a decode rejection even when natural dimensions exist', async () => {
    const image = new Portrait();
    image.loaded();
    image.decode.mockRejectedValue(new Error('decode rejected'));
    expect(await waitForPortraitReadiness(image)).toMatchObject({ ready: false,
      error: 'portrait decode failed: Error: decode rejected', naturalWidth: 640 });
  });

  for (const phase of ['load', 'decode']) {
    it(`bounds a stalled ${phase} without retrying the resource`, async () => {
      vi.useFakeTimers();
      const image = new Portrait();
      if (phase === 'decode') {
        image.loaded();
        image.decode.mockReturnValue(new Promise(() => {}));
      }
      const pending = waitForPortraitReadiness(image, 10_000);
      await vi.advanceTimersByTimeAsync(10_000);
      expect(await pending).toMatchObject({ ready: false, error: 'portrait readiness exceeded 10000ms' });
      expect(image.decode).toHaveBeenCalledTimes(phase === 'decode' ? 1 : 0);
      expect(vi.getTimerCount()).toBe(0);
    });
  }

  it('fails a missing element rather than reporting an empty observation as loaded', async () => {
    expect(await waitForPortraitReadiness(null)).toMatchObject({ ready: false,
      error: 'portrait element missing', src: null, currentSrc: null, naturalWidth: 0 });
  });
});
